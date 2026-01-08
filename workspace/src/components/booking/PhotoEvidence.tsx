'use client';

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Camera, Upload, X, Check, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PhotoEvidenceProps {
  onPhotoCapture: (photoData: string) => void;
  onPhotoRemove: () => void;
  capturedPhoto?: string;
  disabled?: boolean;
}

export function PhotoEvidence({ 
  onPhotoCapture, 
  onPhotoRemove, 
  capturedPhoto, 
  disabled = false 
}: PhotoEvidenceProps) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const startCamera = async () => {
    try {
      setError(null);
      setIsCapturing(true);

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'environment' // Usar cámara trasera si está disponible
        }
      });

      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('No se pudo acceder a la cámara. Verifica los permisos.');
      setIsCapturing(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCapturing(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Configurar el canvas con las dimensiones del video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Dibujar el frame actual del video en el canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convertir a base64
    const photoData = canvas.toDataURL('image/jpeg', 0.8);
    
    onPhotoCapture(photoData);
    stopCamera();

    toast({
      title: "Fotografía capturada",
      description: "La evidencia fotográfica ha sido registrada exitosamente.",
    });
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Error",
        description: "Por favor selecciona un archivo de imagen válido.",
        variant: "destructive",
      });
      return;
    }

    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "La imagen es demasiado grande. Máximo 5MB.",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      onPhotoCapture(result);
      
      toast({
        title: "Imagen cargada",
        description: "La evidencia fotográfica ha sido cargada exitosamente.",
      });
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = () => {
    onPhotoRemove();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    toast({
      title: "Fotografía eliminada",
      description: "La evidencia fotográfica ha sido removida.",
    });
  };

  if (capturedPhoto) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Check className="h-4 w-4 text-green-600" />
            Evidencia Fotográfica Capturada
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <img 
              src={capturedPhoto} 
              alt="Evidencia fotográfica" 
              className="w-full h-48 object-cover rounded-md border"
            />
            {!disabled && (
              <Button
                variant="destructive"
                size="sm"
                className="absolute top-2 right-2"
                onClick={removePhoto}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Esta fotografía será incluida como evidencia en caso de disputas.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Camera className="h-4 w-4" />
          Evidencia Fotográfica (Opcional)
        </CardTitle>
        <CardDescription>
          Captura una fotografía como evidencia adicional del check-in
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isCapturing ? (
          <div className="space-y-3">
            <div className="relative">
              <video
                ref={videoRef}
                className="w-full h-48 object-cover rounded-md border bg-black"
                autoPlay
                playsInline
                muted
              />
              <canvas
                ref={canvasRef}
                className="hidden"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={capturePhoto} className="flex-1">
                <Camera className="mr-2 h-4 w-4" />
                Capturar Foto
              </Button>
              <Button variant="outline" onClick={stopCamera}>
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-2">
              <Button 
                onClick={startCamera} 
                variant="outline" 
                disabled={disabled}
                className="w-full"
              >
                <Camera className="mr-2 h-4 w-4" />
                Tomar Fotografía
              </Button>
              
              <Button 
                variant="outline" 
                disabled={disabled}
                onClick={() => fileInputRef.current?.click()}
                className="w-full"
              >
                <Upload className="mr-2 h-4 w-4" />
                Subir Imagen
              </Button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />

            <p className="text-xs text-muted-foreground">
              La fotografía ayudará a proporcionar evidencia adicional en caso de disputas de pago.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}