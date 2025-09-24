import { logger } from './logger';

export interface WeatherData {
  temperature: number;
  feelsLike: number;
  description: string;
  humidity: number;
  windSpeed: number;
  visibility: number;
  pressure: number;
  uvIndex: number;
  icon: string;
  hourlyForecast: HourlyForecast[];
}

export interface HourlyForecast {
  time: string;
  temperature: number;
  icon: string;
  description: string;
}

export interface WeatherLocation {
  lat: number;
  lng: number;
  name?: string;
}

class WeatherService {
  private readonly API_KEY = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY || 'demo';
  private readonly BASE_URL = 'https://api.openweathermap.org/data/2.5';
  private readonly ONE_CALL_URL = 'https://api.openweathermap.org/data/3.0/onecall';
  
  // Cache para evitar demasiadas llamadas a la API
  private cache = new Map<string, { data: WeatherData; timestamp: number }>();
  private readonly CACHE_DURATION = 10 * 60 * 1000; // 10 minutos

  /**
   * Obtiene datos del clima para una ubicación específica
   */
  async getWeatherData(location: WeatherLocation): Promise<WeatherData> {
    const cacheKey = `${location.lat},${location.lng}`;
    const cached = this.cache.get(cacheKey);
    
    // Verificar cache
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    try {
      // Si no hay API key, devolver datos de ejemplo
      if (this.API_KEY === 'demo') {
        return this.getDemoWeatherData(location);
      }

      // Llamar a la API de OpenWeatherMap
      const response = await fetch(
        `${this.ONE_CALL_URL}?lat=${location.lat}&lon=${location.lng}&appid=${this.API_KEY}&units=metric&exclude=minutely,alerts`
      );

      if (!response.ok) {
        throw new Error(`Weather API error: ${response.status}`);
      }

      const data = await response.json();
      const weatherData = this.parseWeatherData(data);
      
      // Guardar en cache
      this.cache.set(cacheKey, {
        data: weatherData,
        timestamp: Date.now()
      });

      return weatherData;
    } catch (error) {
      logger.error('Error fetching weather data:', error);
      
      // En caso de error, devolver datos de ejemplo
      return this.getDemoWeatherData(location);
    }
  }

  /**
   * Obtiene datos del clima para Los Cabos (ubicación por defecto)
   */
  async getLosCabosWeather(): Promise<WeatherData> {
    return this.getWeatherData({
      lat: 22.8909,
      lng: -109.9124,
      name: 'Los Cabos'
    });
  }

  /**
   * Parsea la respuesta de la API de OpenWeatherMap
   */
  private parseWeatherData(data: any): WeatherData {
    const current = data.current;
    const hourly = data.hourly.slice(0, 4); // Próximas 4 horas

    return {
      temperature: Math.round(current.temp),
      feelsLike: Math.round(current.feels_like),
      description: this.capitalizeFirst(current.weather[0].description),
      humidity: current.humidity,
      windSpeed: Math.round(current.wind_speed * 3.6), // Convertir m/s a km/h
      visibility: Math.round(current.visibility / 1000), // Convertir m a km
      pressure: current.pressure,
      uvIndex: Math.round(current.uvi),
      icon: current.weather[0].icon,
      hourlyForecast: hourly.map((hour: any) => ({
        time: new Date(hour.dt * 1000).toLocaleTimeString('es-ES', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        temperature: Math.round(hour.temp),
        icon: hour.weather[0].icon,
        description: this.capitalizeFirst(hour.weather[0].description)
      }))
    };
  }

  /**
   * Devuelve datos de ejemplo cuando no hay API key o hay error
   */
  private getDemoWeatherData(location: WeatherLocation): WeatherData {
    const now = new Date();
    const hours = [
      new Date(now.getTime() + 0 * 60 * 60 * 1000),
      new Date(now.getTime() + 3 * 60 * 60 * 1000),
      new Date(now.getTime() + 6 * 60 * 60 * 1000),
      new Date(now.getTime() + 9 * 60 * 60 * 1000)
    ];

    return {
      temperature: 28,
      feelsLike: 31,
      description: 'Soleado',
      humidity: 65,
      windSpeed: 12,
      visibility: 10,
      pressure: 1013,
      uvIndex: 8,
      icon: '01d',
      hourlyForecast: hours.map((hour, index) => ({
        time: hour.toLocaleTimeString('es-ES', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        temperature: 28 + index,
        icon: '01d',
        description: 'Soleado'
      }))
    };
  }

  /**
   * Capitaliza la primera letra de una cadena
   */
  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Obtiene el icono de clima apropiado para mostrar
   */
  getWeatherIcon(iconCode: string): string {
    const iconMap: { [key: string]: string } = {
      '01d': '☀️', // clear sky day
      '01n': '🌙', // clear sky night
      '02d': '⛅', // few clouds day
      '02n': '☁️', // few clouds night
      '03d': '☁️', // scattered clouds
      '03n': '☁️',
      '04d': '☁️', // broken clouds
      '04n': '☁️',
      '09d': '🌧️', // shower rain
      '09n': '🌧️',
      '10d': '🌦️', // rain day
      '10n': '🌧️', // rain night
      '11d': '⛈️', // thunderstorm
      '11n': '⛈️',
      '13d': '❄️', // snow
      '13n': '❄️',
      '50d': '🌫️', // mist
      '50n': '🌫️'
    };

    return iconMap[iconCode] || '☀️';
  }

  /**
   * Obtiene la descripción del índice UV
   */
  getUVDescription(uvIndex: number): { level: string; color: string } {
    if (uvIndex <= 2) return { level: 'Bajo', color: 'green' };
    if (uvIndex <= 5) return { level: 'Moderado', color: 'yellow' };
    if (uvIndex <= 7) return { level: 'Alto', color: 'orange' };
    if (uvIndex <= 10) return { level: 'Muy Alto', color: 'red' };
    return { level: 'Extremo', color: 'purple' };
  }
}

export const weatherService = new WeatherService();