import { logger } from './logger';

export interface ServiceStatus {
  isHealthy: boolean;
  lastError?: string;
  lastErrorTime?: Date;
  retryCount: number;
  lastSuccessTime?: Date;
}

export interface FallbackConfig {
  maxRetries: number;
  retryDelay: number;
  healthCheckInterval: number;
  fallbackEnabled: boolean;
}

class FallbackService {
  private services: Map<string, ServiceStatus> = new Map();
  private configs: Map<string, FallbackConfig> = new Map();
  private healthCheckIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    // Default configurations for different services
    this.setServiceConfig('stripe', {
      maxRetries: 3,
      retryDelay: 2000,
      healthCheckInterval: 60000, // 1 minute
      fallbackEnabled: true
    });

    this.setServiceConfig('google-maps', {
      maxRetries: 2,
      retryDelay: 1000,
      healthCheckInterval: 30000, // 30 seconds
      fallbackEnabled: true
    });

    this.setServiceConfig('email', {
      maxRetries: 3,
      retryDelay: 5000,
      healthCheckInterval: 120000, // 2 minutes
      fallbackEnabled: true
    });

    this.setServiceConfig('firebase', {
      maxRetries: 5,
      retryDelay: 1000,
      healthCheckInterval: 30000,
      fallbackEnabled: false // Firebase is critical
    });
  }

  setServiceConfig(serviceName: string, config: FallbackConfig) {
    this.configs.set(serviceName, config);
    
    // Initialize service status if not exists
    if (!this.services.has(serviceName)) {
      this.services.set(serviceName, {
        isHealthy: true,
        retryCount: 0
      });
    }
  }

  getServiceStatus(serviceName: string): ServiceStatus | null {
    return this.services.get(serviceName) || null;
  }

  markServiceError(serviceName: string, error: string) {
    const status = this.services.get(serviceName);
    if (!status) return;

    const config = this.configs.get(serviceName);
    if (!config) return;

    status.isHealthy = false;
    status.lastError = error;
    status.lastErrorTime = new Date();
    status.retryCount = Math.min(status.retryCount + 1, config.maxRetries);

    this.services.set(serviceName, status);

    logger.error(`Service ${serviceName} marked as unhealthy`, {
      error,
      retryCount: status.retryCount,
      maxRetries: config.maxRetries
    });

    // Start health check if not already running
    this.startHealthCheck(serviceName);
  }

  markServiceHealthy(serviceName: string) {
    const status = this.services.get(serviceName);
    if (!status) return;

    status.isHealthy = true;
    status.lastError = undefined;
    status.lastErrorTime = undefined;
    status.retryCount = 0;
    status.lastSuccessTime = new Date();

    this.services.set(serviceName, status);

    logger.info(`Service ${serviceName} marked as healthy`);

    // Stop health check
    this.stopHealthCheck(serviceName);
  }

  shouldUseService(serviceName: string): boolean {
    const status = this.services.get(serviceName);
    const config = this.configs.get(serviceName);
    
    if (!status || !config) return true;

    // If service is healthy, use it
    if (status.isHealthy) return true;

    // If fallback is disabled, always try to use the service
    if (!config.fallbackEnabled) return true;

    // If we haven't exceeded max retries, try again
    return status.retryCount < config.maxRetries;
  }

  shouldRetry(serviceName: string): boolean {
    const status = this.services.get(serviceName);
    const config = this.configs.get(serviceName);
    
    if (!status || !config) return false;

    return status.retryCount < config.maxRetries;
  }

  getRetryDelay(serviceName: string): number {
    const config = this.configs.get(serviceName);
    const status = this.services.get(serviceName);
    
    if (!config || !status) return 1000;

    // Exponential backoff
    return config.retryDelay * Math.pow(2, status.retryCount);
  }

  private startHealthCheck(serviceName: string) {
    if (this.healthCheckIntervals.has(serviceName)) return;

    const config = this.configs.get(serviceName);
    if (!config) return;

    const interval = setInterval(async () => {
      await this.performHealthCheck(serviceName);
    }, config.healthCheckInterval);

    this.healthCheckIntervals.set(serviceName, interval);
  }

  private stopHealthCheck(serviceName: string) {
    const interval = this.healthCheckIntervals.get(serviceName);
    if (interval) {
      clearInterval(interval);
      this.healthCheckIntervals.delete(serviceName);
    }
  }

  private async performHealthCheck(serviceName: string) {
    try {
      let isHealthy = false;

      switch (serviceName) {
        case 'stripe':
          isHealthy = await this.checkStripeHealth();
          break;
        case 'google-maps':
          isHealthy = await this.checkGoogleMapsHealth();
          break;
        case 'email':
          isHealthy = await this.checkEmailHealth();
          break;
        case 'firebase':
          isHealthy = await this.checkFirebaseHealth();
          break;
        default:
          logger.warn(`Unknown service for health check: ${serviceName}`);
          return;
      }

      if (isHealthy) {
        this.markServiceHealthy(serviceName);
      }
    } catch (error) {
      logger.error(`Health check failed for ${serviceName}`, error as Error);
    }
  }

  private async checkStripeHealth(): Promise<boolean> {
    try {
      if (!process.env.STRIPE_SECRET_KEY) return false;

      const response = await fetch('https://api.stripe.com/v1/account', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        },
        signal: AbortSignal.timeout(5000)
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  private async checkGoogleMapsHealth(): Promise<boolean> {
    try {
      if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) return false;

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`,
        {
          method: 'HEAD',
          signal: AbortSignal.timeout(5000)
        }
      );

      return response.ok;
    } catch {
      return false;
    }
  }

  private async checkEmailHealth(): Promise<boolean> {
    try {
      if (!process.env.RESEND_API_KEY) return false;

      const response = await fetch('https://api.resend.com/domains', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        },
        signal: AbortSignal.timeout(5000)
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  private async checkFirebaseHealth(): Promise<boolean> {
    try {
      // Client-side Firebase health check - check if we can access Firestore
      if (typeof window !== 'undefined') {
        // We're on the client side, use Firebase client SDK
        const { db } = await import('./firebase');
        const { collection, limit, getDocs, query } = await import('firebase/firestore');
        await getDocs(query(collection(db, '_health'), limit(1)));
        return true;
      } else {
        // We're on the server side, use Firebase Admin SDK
        const { db } = await import('./firebase-admin');
        await db.collection('_health').limit(1).get();
        return true;
      }
    } catch {
      return false;
    }
  }

  // Get fallback options for different services
  getFallbackOptions(serviceName: string): any {
    switch (serviceName) {
      case 'stripe':
        return {
          paymentMethods: ['bank_transfer', 'cash', 'check'],
          message: 'Pagos con tarjeta temporalmente no disponibles. Puedes usar transferencia bancaria o pago en efectivo.'
        };
      
      case 'google-maps':
        return {
          alternatives: ['apple_maps', 'openstreetmap'],
          message: 'Mapa no disponible. Puedes abrir la ubicación en tu aplicación de mapas preferida.'
        };
      
      case 'email':
        return {
          alternatives: ['sms', 'push_notification', 'in_app_notification'],
          message: 'Notificaciones por email temporalmente no disponibles. Te notificaremos por otros medios.'
        };
      
      default:
        return {
          message: 'Servicio temporalmente no disponible. Inténtalo más tarde.'
        };
    }
  }

  // Cleanup method
  destroy() {
    this.healthCheckIntervals.forEach(interval => clearInterval(interval));
    this.healthCheckIntervals.clear();
  }
}

// Export singleton instance
export const fallbackService = new FallbackService();

// Export utility functions
export const withFallback = async <T>(
  serviceName: string,
  operation: () => Promise<T>,
  fallbackOperation?: () => Promise<T>
): Promise<T> => {
  if (!fallbackService.shouldUseService(serviceName)) {
    if (fallbackOperation) {
      logger.info(`Using fallback for service: ${serviceName}`);
      return await fallbackOperation();
    }
    throw new Error(`Service ${serviceName} is unavailable and no fallback provided`);
  }

  try {
    const result = await operation();
    fallbackService.markServiceHealthy(serviceName);
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    fallbackService.markServiceError(serviceName, errorMessage);

    if (fallbackService.shouldRetry(serviceName)) {
      const delay = fallbackService.getRetryDelay(serviceName);
      logger.info(`Retrying service ${serviceName} in ${delay}ms`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      return await withFallback(serviceName, operation, fallbackOperation);
    }

    if (fallbackOperation) {
      logger.info(`Using fallback for service: ${serviceName}`);
      return await fallbackOperation();
    }

    throw error;
  }
};