
"use client";

import { useState, useEffect, useRef } from 'react';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import { Skeleton } from './ui/skeleton';
import { MapPin, AlertCircle, ExternalLink, RefreshCw } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { logger } from '@/lib/logger';

const containerStyle = {
  width: '100%',
  height: '100%'
};

interface CourseMapProps {
    lat: number;
    lng: number;
    name: string;
}

const libraries: ("maps" | "marker")[] = ["maps", "marker"];

export function CourseMap({ lat, lng, name }: CourseMapProps) {
  const [mapLoaded, setMapLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [errorType, setErrorType] = useState<'network' | 'api' | 'unknown'>('unknown');
  const [retryCount, setRetryCount] = useState(0);
  const mapRef = useRef<HTMLDivElement>(null);

  // Función para abrir en Google Maps
  const openInGoogleMaps = () => {
    const url = `https://www.google.com/maps?q=${lat},${lng}`;
    window.open(url, '_blank');
    logger.info('Opened location in Google Maps', { lat, lng, name });
  };

  // Función para abrir en Apple Maps (iOS/macOS)
  const openInAppleMaps = () => {
    const url = `http://maps.apple.com/?q=${lat},${lng}`;
    window.open(url, '_blank');
    logger.info('Opened location in Apple Maps', { lat, lng, name });
  };

  // Detectar si es dispositivo Apple
  const isAppleDevice = () => {
    return /iPad|iPhone|iPod|Mac/.test(navigator.userAgent);
  };
  
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries: libraries
  });

  const center = { lat, lng };

  // Detectar tipo de error y manejar estados
  useEffect(() => {
    if (loadError) {
      // Determinar tipo de error
      if (!navigator.onLine) {
        setErrorType('network');
      } else if (loadError.message?.includes('RefererNotAllowedMapError')) {
        setErrorType('api');
      } else {
        setErrorType('unknown');
      }
      
      setHasError(true);
      setMapLoaded(false);
      
      // Log del error para debugging
      logger.error('Google Maps load error', {
        error: loadError.message,
        errorType,
        retryCount,
        lat,
        lng,
        name
      });
    } else if (isLoaded && !hasError) {
      // Delay para asegurar que el mapa se renderice correctamente
      const timer = setTimeout(() => {
        setMapLoaded(true);
        setHasError(false);
        setRetryCount(0); // Reset retry count on success
        logger.info('Google Maps loaded successfully', { lat, lng, name });
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [isLoaded, loadError, errorType, retryCount, lat, lng, name]);

  const handleRetry = () => {
    if (retryCount >= 3) {
      logger.warn('Max retry attempts reached for Google Maps', { retryCount, lat, lng, name });
      return;
    }

    setIsRetrying(true);
    setHasError(false);
    setRetryCount(prev => prev + 1);
    
    logger.info('Retrying Google Maps load', { retryCount: retryCount + 1, lat, lng, name });
    
    // Recargar la página después de un breve delay
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  // Get error message based on error type
  const getErrorMessage = () => {
    switch (errorType) {
      case 'network':
        return 'Sin conexión a internet. Verifica tu conexión y vuelve a intentar.';
      case 'api':
        return 'Servicio de mapas temporalmente no disponible. Puedes abrir la ubicación en tu app de mapas preferida.';
      default:
        return 'Mapa no disponible temporalmente. Usa los enlaces para ver la ubicación.';
    }
  };

  // Get retry button text
  const getRetryButtonText = () => {
    if (isRetrying) return 'Cargando...';
    if (retryCount >= 3) return 'Máximo de intentos alcanzado';
    return `Intentar de nuevo ${retryCount > 0 ? `(${retryCount}/3)` : ''}`;
  };

  // Mostrar fallback si hay error o no se puede cargar
  if (hasError || (loadError && !isRetrying)) {
    return (
      <Card className="w-full h-full flex items-center justify-center bg-muted/50">
        <CardContent className="text-center p-6">
          <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="font-semibold text-lg mb-2">{name}</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Ubicación: {lat.toFixed(4)}, {lng.toFixed(4)}
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-4">
            <AlertCircle className="h-4 w-4" />
            <span>{getErrorMessage()}</span>
          </div>
          
          {errorType === 'network' && (
            <p className="text-xs text-muted-foreground mb-4">
              Estado de conexión: {navigator.onLine ? 'En línea' : 'Sin conexión'}
            </p>
          )}
          
          <div className="space-y-3">
            {/* Retry button */}
            <Button 
              onClick={handleRetry}
              disabled={isRetrying || retryCount >= 3}
              variant="outline"
              size="sm"
              className="w-full"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRetrying ? 'animate-spin' : ''}`} />
              {getRetryButtonText()}
            </Button>
            
            {/* External maps buttons */}
            <div className="flex gap-2">
              <Button 
                onClick={openInGoogleMaps}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Google Maps
              </Button>
              
              {isAppleDevice() && (
                <Button 
                  onClick={openInAppleMaps}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Apple Maps
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isLoaded || !mapLoaded) {
    return <Skeleton className="w-full h-full" />;
  }

  return (
    <div ref={mapRef} className="w-full h-full">
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={14}
        onLoad={() => {
          // Mapa cargado exitosamente
        }}
      >
        <Marker position={center} title={name} />
      </GoogleMap>
    </div>
  );
}

export default CourseMap;
