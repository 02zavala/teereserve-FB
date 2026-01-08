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
  // Señala si los datos provienen del modo demo (sin API key real)
  isDemo?: boolean;
  // Alertas meteorológicas si están disponibles
  alerts?: WeatherAlert[];
}

export interface HourlyForecast {
  time: string;
  temperature: number;
  icon: string;
  description: string;
  // Probabilidad de precipitación (0-100)
  precipitationProbability?: number;
}

export interface WeatherAlert {
  event: string;
  description: string;
  start: number;
  end: number;
  sender_name?: string;
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
   * Limpia la caché de clima (útil tras cambiar API key)
   */
  clearCache() {
    this.cache.clear();
    logger.info('WeatherService: caché limpiada');
  }

  // Helper: reintentos con retroceso exponencial para llamadas de red
  private async fetchWithRetry(
    url: string,
    options: RequestInit = {},
    retries = 3,
    backoffMs = 500
  ): Promise<Response> {
    let attempt = 0;
    let lastResponse: Response | null = null;
    let lastError: any = null;

    while (attempt <= retries) {
      try {
        const resp = await fetch(url, options);
        // Si es 2xx/3xx devolvemos inmediatamente
        if (resp.ok) return resp;
        // Para 4xx no reintentamos (errores de cliente como API key inválida), devolvemos para que el caller haga fallback
        if (resp.status >= 400 && resp.status < 500) return resp;
        // Para 5xx guardamos y reintentamos
        lastResponse = resp;
      } catch (err) {
        // Error de red (timeout, DNS, etc.), guardamos y reintentamos
        lastError = err;
      }

      attempt++;
      if (attempt > retries) break;
      const delay = backoffMs * Math.pow(2, attempt - 1);
      await new Promise((res) => setTimeout(res, delay));
    }

    // Si tenemos una respuesta 5xx tras agotar reintentos, la devolvemos para permitir la lógica de fallback
    if (lastResponse) return lastResponse;
    // Si solo hubo errores de red, devolvemos una Response 503 para permitir fallback en el caller
    return new Response(null, { status: 503, statusText: 'Network Error' });
  }

  /**
   * Obtiene datos del clima para una ubicación específica
   */
  async getWeatherData(location: WeatherLocation, options?: { force?: boolean }): Promise<WeatherData> {
    const force = options?.force === true;
    const cacheKey = `${location.lat},${location.lng}`;
    const cached = this.cache.get(cacheKey);

    // Verificar cache (solo si no se fuerza)
    if (!force && cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    try {
      // Si no hay API key, devolver datos de ejemplo
      if (this.API_KEY === 'demo') {
        logger.warn('WeatherService: utilizando datos DEMO por falta de NEXT_PUBLIC_OPENWEATHER_API_KEY');
        return this.getDemoWeatherData(location);
      }

      // Primero intentar One Call 3.0 (permitimos alerts)
      const urlV3 = `${this.ONE_CALL_URL}?lat=${location.lat}&lon=${location.lng}&appid=${this.API_KEY}&units=metric&exclude=minutely`;
      const responseV3 = await this.fetchWithRetry(urlV3);

      let weatherData: WeatherData | null = null;

      if (responseV3.ok) {
        const data = await responseV3.json();
        logger.info('WeatherService: datos obtenidos de One Call 3.0');
        weatherData = this.parseWeatherData(data);
      } else {
        // Fallback a One Call 2.5 si 3.0 falla (común con claves gratuitas)
        logger.warn(`WeatherService: One Call 3.0 falló con status ${responseV3.status}. Probando One Call 2.5...`);
        const urlV25 = `${this.BASE_URL}/onecall?lat=${location.lat}&lon=${location.lng}&appid=${this.API_KEY}&units=metric&exclude=minutely`;
        const responseV25 = await this.fetchWithRetry(urlV25);
        if (responseV25.ok) {
          const data25 = await responseV25.json();
          logger.info('WeatherService: datos obtenidos de One Call 2.5');
          weatherData = this.parseWeatherData(data25);
        } else {
          // Fallback final: combinar endpoints /weather (actual) y /forecast (próximas horas)
          logger.warn(`WeatherService: One Call 2.5 falló con status ${responseV25.status}. Probando /weather + /forecast...`);
          const urlCurrent = `${this.BASE_URL}/weather?lat=${location.lat}&lon=${location.lng}&appid=${this.API_KEY}&units=metric`;
          const urlForecast = `${this.BASE_URL}/forecast?lat=${location.lat}&lon=${location.lng}&appid=${this.API_KEY}&units=metric`;
          const [respCurrent, respForecast] = await Promise.all([
            this.fetchWithRetry(urlCurrent),
            this.fetchWithRetry(urlForecast)
          ]);

          if (respCurrent.ok && respForecast.ok) {
            const [currentData, forecastData] = await Promise.all([
              respCurrent.json(),
              respForecast.json()
            ]);
            logger.info('WeatherService: datos obtenidos de /weather + /forecast');
            weatherData = this.parseWeatherDataFromCombined(currentData, forecastData);
          } else {
            throw new Error(`Weather API error: v3=${responseV3.status}, v2.5=${responseV25.status}, current=${respCurrent.status}, forecast=${respForecast.status}`);
          }
        }
      }

      // Guardar en cache y devolver (reemplaza caché si force)
      this.cache.set(cacheKey, {
        data: weatherData!,
        timestamp: Date.now()
      });
      return weatherData!;
    } catch (error) {
      logger.error('Error fetching weather data:', error);

      // En caso de error, devolver datos de ejemplo
      return this.getDemoWeatherData(location);
    }
  }

  /**
   * Obtiene datos del clima para Los Cabos (ubicación por defecto)
   */
  async getLosCabosWeather(options?: { force?: boolean }): Promise<WeatherData> {
    return this.getWeatherData({
      lat: 22.8909,
      lng: -109.9124,
      name: 'Los Cabos'
    }, options);
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
        description: this.capitalizeFirst(hour.weather[0].description),
        precipitationProbability: Math.round(((hour.pop ?? 0) as number) * 100)
      })),
      isDemo: false,
      alerts: Array.isArray(data.alerts) ? data.alerts.map((a: any) => ({
        event: a.event,
        description: a.description,
        start: a.start,
        end: a.end,
        sender_name: a.sender_name
      })) : []
    };
  }

  private parseWeatherDataFromCombined(currentData: any, forecastData: any): WeatherData {
    // currentData: /weather, forecastData: /forecast (3-hour step)
    const current = currentData;
    const list = Array.isArray(forecastData?.list) ? forecastData.list.slice(0, 4) : [];

    return {
      temperature: Math.round(current.main?.temp ?? 0),
      feelsLike: Math.round(current.main?.feels_like ?? current.main?.temp ?? 0),
      description: this.capitalizeFirst(current.weather?.[0]?.description ?? 'Desconocido'),
      humidity: Math.round(current.main?.humidity ?? 0),
      windSpeed: Math.round((current.wind?.speed ?? 0) * 3.6), // m/s -> km/h
      visibility: Math.round((current.visibility ?? 0) / 1000), // m -> km
      pressure: Math.round(current.main?.pressure ?? 0),
      uvIndex: 0, // /weather no incluye UVI; opcionalmente podríamos consultar /uvi pero se deprecó. Dejar 0.
      icon: current.weather?.[0]?.icon ?? '01d',
      hourlyForecast: list.map((item: any) => ({
        time: new Date(item.dt * 1000).toLocaleTimeString('es-ES', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        temperature: Math.round(item.main?.temp ?? 0),
        icon: item.weather?.[0]?.icon ?? '01d',
        description: this.capitalizeFirst(item.weather?.[0]?.description ?? '—'),
        precipitationProbability: Math.round(((item.pop ?? 0) as number) * 100)
      })),
      isDemo: false,
      alerts: []
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
        description: 'Soleado',
        precipitationProbability: 0
      })),
      isDemo: true,
      alerts: []
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