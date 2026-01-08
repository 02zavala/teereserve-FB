'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { weatherService, WeatherData } from '@/lib/weather-service';
import { 
  Thermometer, 
  Droplets, 
  Wind, 
  Eye, 
  Gauge, 
  Sun,
  RefreshCw,
  MapPin,
  AlertTriangle
} from 'lucide-react';

interface WeatherProps {
  location?: {
    lat: number;
    lng: number;
    name?: string;
  };
  className?: string;
}

export function Weather({ location, className }: WeatherProps) {
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchWeatherData = async (force = false) => {
    try {
      setLoading(true);
      setError(null);
      
      const data = location 
        ? await weatherService.getWeatherData(location, { force })
        : await weatherService.getLosCabosWeather({ force });
      
      setWeatherData(data);
      setLastUpdated(new Date());
    } catch (err) {
      setError('Error al cargar datos del clima');
      console.error('Weather fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Si cambia la ubicación, limpiar caché para evitar datos antiguos
    weatherService.clearCache();
    fetchWeatherData(true);
  }, [location]);

  const handleRefresh = () => {
    fetchWeatherData(true);
  };

  if (loading) {
    return <WeatherSkeleton className={className} />;
  }

  if (error || !weatherData) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sun className="h-5 w-5" />
            Clima
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-2">
              {error || 'No se pudieron cargar los datos del clima'}
            </p>
            <button
              onClick={handleRefresh}
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 mx-auto"
            >
              <RefreshCw className="h-4 w-4" />
              Reintentar
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const uvInfo = weatherService.getUVDescription(weatherData.uvIndex);

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sun className="h-5 w-5" />
            Clima
            {location?.name && (
              <span className="text-sm font-normal text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {location.name}
              </span>
            )}
            {weatherData?.isDemo && (
              <Badge variant="outline" className="ml-2 text-xs">Demo</Badge>
            )}
          </CardTitle>
          <button
            onClick={handleRefresh}
            className="text-muted-foreground hover:text-foreground transition-colors"
            title="Actualizar clima"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Temperatura actual */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">
              {weatherService.getWeatherIcon(weatherData.icon)}
            </span>
            <div>
              <div className="text-2xl font-bold">
                {weatherData.temperature}°C
              </div>
              <div className="text-sm text-muted-foreground">
                Sensación {weatherData.feelsLike}°C
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-medium">
              {weatherData.description}
            </div>
          </div>
        </div>

        {/* Métricas del clima */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <Droplets className="h-4 w-4 text-blue-500" />
            <span className="text-muted-foreground">Humedad:</span>
            <span className="font-medium">{weatherData.humidity}%</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Wind className="h-4 w-4 text-gray-500" />
            <span className="text-muted-foreground">Viento:</span>
            <span className="font-medium">{weatherData.windSpeed} km/h</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-gray-500" />
            <span className="text-muted-foreground">Visibilidad:</span>
            <span className="font-medium">{weatherData.visibility} km</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Gauge className="h-4 w-4 text-gray-500" />
            <span className="text-muted-foreground">Presión:</span>
            <span className="font-medium">{weatherData.pressure} hPa</span>
          </div>
        </div>

        {/* Índice UV */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Índice UV:</span>
          <div className="flex items-center gap-2">
            <Badge 
              variant="secondary" 
              className={`text-xs ${
                uvInfo.color === 'green' ? 'bg-green-100 text-green-800' :
                uvInfo.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                uvInfo.color === 'orange' ? 'bg-orange-100 text-orange-800' :
                uvInfo.color === 'red' ? 'bg-red-100 text-red-800' :
                'bg-purple-100 text-purple-800'
              }`}
            >
              {weatherData.uvIndex} - {uvInfo.level}
            </Badge>
          </div>
        </div>

        {/* Pronóstico por horas */}
        <div>
          <h4 className="text-sm font-medium mb-2">Próximas horas</h4>
          <div className="grid grid-cols-4 gap-2">
            {weatherData.hourlyForecast.map((hour, index) => (
              <div key={index} className="text-center">
                <div className="text-xs text-muted-foreground mb-1">
                  {hour.time}
                </div>
                <div className="text-lg mb-1">
                  {weatherService.getWeatherIcon(hour.icon)}
                </div>
                <div className="text-sm font-medium">
                  {hour.temperature}°
                </div>
                {typeof hour.precipitationProbability === 'number' && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Prob. precipitación: {hour.precipitationProbability}%
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Alertas meteorológicas */}
        {Array.isArray(weatherData.alerts) && weatherData.alerts.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              Alertas meteorológicas
            </h4>
            <div className="space-y-2">
              {weatherData.alerts.map((alert, idx) => (
                <div key={idx} className="rounded border p-2">
                  <div className="text-sm font-semibold">{alert.event}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(alert.start * 1000).toLocaleString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                    {' '}–{' '}
                    {new Date(alert.end * 1000).toLocaleString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                    {alert.sender_name ? ` · ${alert.sender_name}` : ''}
                  </div>
                  {alert.description && (
                    <div className="text-xs mt-1 text-muted-foreground whitespace-pre-line">
                      {alert.description}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Última actualización */}
        {lastUpdated && (
          <div className="text-xs text-muted-foreground text-center pt-2 border-t">
            Actualizado: {lastUpdated.toLocaleTimeString('es-ES', {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function WeatherSkeleton({ className }: { className?: string }) {
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Sun className="h-5 w-5" />
          Clima
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Temperatura actual skeleton */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded" />
            <div>
              <Skeleton className="h-8 w-16 mb-1" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
          <Skeleton className="h-4 w-16" />
        </div>

        {/* Métricas skeleton */}
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-8" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default Weather;