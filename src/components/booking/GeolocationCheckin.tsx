'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MapPin, Camera, Clock, CheckCircle, AlertTriangle, Loader2, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Booking, GolfCourse } from '@/types';

interface GeolocationCheckinProps {
  booking: Booking;
  course: GolfCourse;
  onCheckinComplete: (evidenceData: CheckinEvidence) => void;
  onCancel?: () => void;
}

interface CheckinEvidence {
  timestamp: string;
  location: {
    latitude: number;
    longitude: number;
    accuracy: number;
    altitude?: number;
    heading?: number;
    speed?: number;
  };
  deviceInfo: {
    userAgent: string;
    platform: string;
    language: string;
    timezone: string;
    screenResolution: string;
  };
  distanceToVenue: number;
  photos?: string[]; // Base64 encoded photos
  ipAddress?: string;
  verificationStatus: 'verified' | 'approximate' | 'failed';
}

interface LocationState {
  loading: boolean;
  position: GeolocationPosition | null;
  error: string | null;
  distanceToVenue: number | null;
  isWithinRange: boolean;
}

const VENUE_RADIUS_METERS = 500; // 500 metros de radio para considerar "en el campo"
const MAX_ACCURACY_METERS = 100; // Máxima precisión aceptable

export function GeolocationCheckin({ booking, course, onCheckinComplete, onCancel }: GeolocationCheckinProps) {
  const { toast } = useToast();
  const [locationState, setLocationState] = useState<LocationState>({
    loading: false,
    position: null,
    error: null,
    distanceToVenue: null,
    isWithinRange: false
  });
  const [photos, setPhotos] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Calcular distancia entre dos puntos geográficos (fórmula de Haversine)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Radio de la Tierra en metros
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  };

  // Obtener ubicación del usuario
  const getCurrentLocation = async (): Promise<void> => {
    if (!navigator.geolocation) {
      setLocationState(prev => ({ ...prev, error: 'Geolocalización no soportada en este dispositivo' }));
      return;
    }

    setLocationState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 60000 // 1 minuto
          }
        );
      });

      // Calcular distancia al campo de golf
      const courseLat = course.latLng?.lat;
      const courseLng = course.latLng?.lng;
      if (typeof courseLat !== 'number' || typeof courseLng !== 'number') {
        setLocationState({
          loading: false,
          position,
          error: 'Este campo no tiene coordenadas configuradas (lat/lng).',
          distanceToVenue: null,
          isWithinRange: false
        });
        toast({
          title: 'Coordenadas no disponibles',
          description: 'El curso no tiene latitud/longitud. Configúralas para habilitar el check-in.',
          variant: 'destructive'
        });
        return;
      }

      const distance = calculateDistance(
        position.coords.latitude,
        position.coords.longitude,
        courseLat,
        courseLng
      );

      const isWithinRange = distance <= VENUE_RADIUS_METERS;
      const hasGoodAccuracy = position.coords.accuracy <= MAX_ACCURACY_METERS;

      setLocationState({
        loading: false,
        position,
        error: null,
        distanceToVenue: distance,
        isWithinRange: isWithinRange && hasGoodAccuracy
      });

      if (!hasGoodAccuracy) {
        toast({
          title: "Precisión de ubicación baja",
          description: `La precisión actual es de ${Math.round(position.coords.accuracy)}m. Se recomienda una precisión menor a ${MAX_ACCURACY_METERS}m.`,
          variant: "destructive"
        });
      }

    } catch (error: any) {
      let errorMessage = 'Error desconocido al obtener ubicación';
      
      if (error.code === 1) {
        errorMessage = 'Permisos de ubicación denegados. Por favor, permite el acceso a tu ubicación.';
      } else if (error.code === 2) {
        errorMessage = 'Ubicación no disponible. Verifica tu conexión GPS.';
      } else if (error.code === 3) {
        errorMessage = 'Tiempo de espera agotado. Intenta nuevamente.';
      }

      setLocationState(prev => ({ ...prev, loading: false, error: errorMessage }));
    }
  };

  // Inicializar cámara
  const initializeCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment', // Cámara trasera preferida
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setShowCamera(true);
      }
    } catch (error) {
      toast({
        title: "Error de cámara",
        description: "No se pudo acceder a la cámara. Las fotos son opcionales.",
        variant: "destructive"
      });
    }
  };

  // Tomar foto
  const takePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);

    const photoData = canvas.toDataURL('image/jpeg', 0.8);
    setPhotos(prev => [...prev, photoData]);

    toast({
      title: "Foto capturada",
      description: `Foto ${photos.length + 1} guardada como evidencia.`
    });
  };

  // Cerrar cámara
  const closeCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  };

  // Recopilar información del dispositivo
  const getDeviceInfo = () => {
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      screenResolution: `${screen.width}x${screen.height}`
    };
  };

  // Completar check-in
  const completeCheckin = async () => {
    if (!locationState.position || !locationState.isWithinRange) {
      toast({
        title: "Check-in no válido",
        description: "Debes estar dentro del campo de golf para hacer check-in.",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Obtener IP del usuario (opcional)
      let ipAddress: string | undefined;
      try {
        const ipResponse = await fetch('/api/log-user-ip');
        const ipData = await ipResponse.json();
        ipAddress = ipData.ip;
      } catch (error) {
        console.warn('No se pudo obtener la IP del usuario:', error);
      }

      const evidenceData: CheckinEvidence = {
        timestamp: new Date().toISOString(),
        location: {
          latitude: locationState.position.coords.latitude,
          longitude: locationState.position.coords.longitude,
          accuracy: locationState.position.coords.accuracy,
          altitude: locationState.position.coords.altitude || undefined,
          heading: locationState.position.coords.heading || undefined,
          speed: locationState.position.coords.speed || undefined
        },
        deviceInfo: getDeviceInfo(),
        distanceToVenue: locationState.distanceToVenue || 0,
        photos: photos.length > 0 ? photos : undefined,
        ipAddress,
        verificationStatus: locationState.position.coords.accuracy <= 50 ? 'verified' : 'approximate'
      };

      await onCheckinComplete(evidenceData);

      toast({
        title: "Check-in completado",
        description: "Tu presencia ha sido verificada exitosamente.",
      });

    } catch (error) {
      console.error('Error completing check-in:', error);
      toast({
        title: "Error en check-in",
        description: "Hubo un problema al completar el check-in. Intenta nuevamente.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
      closeCamera();
    }
  };

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      closeCamera();
    };
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            Check-in por Geolocalización
          </CardTitle>
          <CardDescription>
            Verifica tu presencia en {course.name} para completar el check-in de tu reserva.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Estado de ubicación */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">Estado de ubicación:</span>
              {locationState.loading ? (
                <Badge variant="secondary">
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Obteniendo ubicación...
                </Badge>
              ) : locationState.position ? (
                <Badge variant={locationState.isWithinRange ? "default" : "destructive"}>
                  {locationState.isWithinRange ? (
                    <>
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Ubicación verificada
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Fuera del rango
                    </>
                  )}
                </Badge>
              ) : (
                <Badge variant="outline">Sin ubicación</Badge>
              )}
            </div>

            {locationState.distanceToVenue !== null && (
              <div className="text-sm text-muted-foreground">
                Distancia al campo: {Math.round(locationState.distanceToVenue)}m
                {locationState.position && (
                  <span className="ml-2">
                    (Precisión: ±{Math.round(locationState.position.coords.accuracy)}m)
                  </span>
                )}
              </div>
            )}

            {locationState.error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{locationState.error}</AlertDescription>
              </Alert>
            )}
          </div>

          {/* Botón para obtener ubicación */}
          {!locationState.position && (
            <Button 
              onClick={getCurrentLocation} 
              disabled={locationState.loading}
              className="w-full"
            >
              {locationState.loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Obteniendo ubicación...
                </>
              ) : (
                <>
                  <MapPin className="h-4 w-4 mr-2" />
                  Verificar mi ubicación
                </>
              )}
            </Button>
          )}

          {/* Sección de fotos opcionales */}
          {locationState.isWithinRange && (
            <div className="space-y-3 border-t pt-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">Evidencia fotográfica (opcional):</span>
                <Badge variant="outline">{photos.length} foto(s)</Badge>
              </div>
              
              {!showCamera ? (
                <Button 
                  variant="outline" 
                  onClick={initializeCamera}
                  className="w-full"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Tomar foto del campo
                </Button>
              ) : (
                <div className="space-y-3">
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    className="w-full rounded-lg"
                  />
                  <div className="flex gap-2">
                    <Button onClick={takePhoto} className="flex-1">
                      <Camera className="h-4 w-4 mr-2" />
                      Capturar
                    </Button>
                    <Button variant="outline" onClick={closeCamera}>
                      Cerrar cámara
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Botón de check-in */}
          <div className="flex gap-2 pt-4">
            <Button 
              onClick={completeCheckin}
              disabled={!locationState.isWithinRange || isProcessing}
              className="flex-1"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Completar Check-in
                </>
              )}
            </Button>
            
            {onCancel && (
              <Button variant="outline" onClick={onCancel}>
                Cancelar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Canvas oculto para captura de fotos */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
}