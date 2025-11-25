import { logger } from './logger';

// Global error handler for unhandled errors and promise rejections
export class GlobalErrorHandler {
  private static instance: GlobalErrorHandler;
  private isInitialized = false;
  private recoveringChunk = false;

  private constructor() {}

  public static getInstance(): GlobalErrorHandler {
    if (!GlobalErrorHandler.instance) {
      GlobalErrorHandler.instance = new GlobalErrorHandler();
    }
    return GlobalErrorHandler.instance;
  }

  public initialize(): void {
    if (this.isInitialized) {
      return;
    }

    // Handle uncaught JavaScript errors
    window.addEventListener('error', this.handleError.bind(this));

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', this.handlePromiseRejection.bind(this));

    // Handle resource loading errors
    window.addEventListener('error', this.handleResourceError.bind(this), true);

    this.isInitialized = true;
    logger.info('Global error handler initialized', 'GlobalErrorHandler');
  }

  private isChunkLoadErrorMessage(message: string): boolean {
    const msg = message.toLowerCase();
    return (
      msg.includes('chunkloaderror') ||
      msg.includes('loading chunk') ||
      msg.includes('csschunkloaderror') ||
      msg.includes('failed to fetch dynamically imported module')
    );
  }

  private attemptChunkRecovery(): void {
    if (this.recoveringChunk) return;
    this.recoveringChunk = true;

    try {
      console.warn('ChunkLoadError detected. Attempting recovery by reloading...');
      // In dev, make sure any service workers are unregistered to avoid stale caches
      if (process.env.NODE_ENV === 'development' && 'serviceWorker' in navigator) {
        navigator.serviceWorker
          .getRegistrations()
          .then((regs) => Promise.all(regs.map((r) => r.unregister().catch(() => {}))))
          .catch(() => {});
      }
    } finally {
      // Give a brief moment for unregister promises then reload
      setTimeout(() => {
        try {
          window.location.reload();
        } catch {}
      }, 150);

      // Reset flag after a short delay to prevent lock-in
      setTimeout(() => {
        this.recoveringChunk = false;
      }, 2500);
    }
  }

  private handleError(event: ErrorEvent): void {
    const error = event.error || new Error(event.message);

    // Auto-recover from stale bundle/chunk load failures
    if (this.isChunkLoadErrorMessage(error.message)) {
      logger.warn('Detected chunk loading error; forcing full page reload', 'GlobalErrorHandler');
      this.attemptChunkRecovery();
      event.preventDefault();
      return;
    }
    
    logger.error(
      `Uncaught error: ${event.message}`,
      error,
      'GlobalErrorHandler',
      {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        type: 'uncaught-error'
      }
    );

    // Prevent default browser error handling for non-critical errors
    if (!this.isCriticalError(error)) {
      event.preventDefault();
    }
  }

  private handlePromiseRejection(event: PromiseRejectionEvent): void {
    const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
    const errorMessage = error.message;

    // Auto-recover from stale bundle/chunk load failures
    if (this.isChunkLoadErrorMessage(errorMessage)) {
      logger.warn('Detected chunk loading error (promise rejection); reloading', 'GlobalErrorHandler');
      this.attemptChunkRecovery();
      event.preventDefault();
      return;
    }
    
    // Verificar si es un error offline de Firestore
    const isFirestoreOfflineError = 
      errorMessage.includes('Failed to get document because the client is offline') ||
      errorMessage.includes('Could not reach Cloud Firestore backend') ||
      errorMessage.includes('Fetching auth token failed') ||
      errorMessage.includes('auth/network-request-failed');

    if (isFirestoreOfflineError) {
      // Log como warning para errores offline
      logger.warn(
        `Firestore offline mode: ${error.message}`,
        'GlobalErrorHandler',
        {
          reason: event.reason,
          type: 'firestore-offline',
          severity: 'low'
        }
      );
    } else {
      // Log como error para otros casos
      logger.error(
        `Unhandled promise rejection: ${error.message}`,
        error,
        'GlobalErrorHandler',
        {
          reason: event.reason,
          type: 'unhandled-promise-rejection'
        }
      );
    }

    // Prevent default browser handling
    event.preventDefault();
  }

  private handleResourceError(event: Event): void {
    const target = event.target as HTMLElement;
    
    if (target && target !== (window as any)) {
      const tagName = target.tagName?.toLowerCase();
      const src = (target as any).src || (target as any).href;
      
      // Filter out Google Analytics errors - these are non-critical
      if (src && (
        src.includes('googletagmanager.com') || 
        src.includes('google-analytics.com') ||
        src.includes('gtag/js') ||
        src.includes('stats.g.doubleclick.net')
      )) {
        const serviceType = 'Google Analytics';
        
        // Use console.info for AdBlock scenarios
        console.info(`${serviceType} blocked by ad blocker or privacy filter - this is normal and doesn't affect functionality`);
        return;
      }
      
      // Create a proper error object for other resource loading failures
      const resourceError = new Error(`Failed to load ${tagName} resource: ${src || 'unknown source'}`);
      
      logger.error(
        `Resource loading failed: ${tagName}`,
        resourceError,
        'GlobalErrorHandler',
        {
          tagName,
          src,
          type: 'resource-error'
        }
      );
    }
  }

  private isCriticalError(error: Error): boolean {
    // Define patterns for critical errors that should crash the app
    const criticalPatterns = [
      /chunk.*failed/i,
      /loading.*chunk.*failed/i,
      /network.*error/i,
      /script.*error/i
    ];

    return criticalPatterns.some(pattern => pattern.test(error.message));
  }

  public destroy(): void {
    if (!this.isInitialized) {
      return;
    }

    window.removeEventListener('error', this.handleError.bind(this));
    window.removeEventListener('unhandledrejection', this.handlePromiseRejection.bind(this));
    window.removeEventListener('error', this.handleResourceError.bind(this), true);

    this.isInitialized = false;
    logger.info('Global error handler destroyed', 'GlobalErrorHandler');
  }
}

// Error classification and handling utilities
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  sessionId?: string;
  feature?: string;
  severity?: ErrorSeverity;
  recoverable?: boolean;
  metadata?: Record<string, any>;
}

export class ErrorClassifier {
  public static classifyError(error: Error, context?: ErrorContext): ErrorSeverity {
    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || '';

    // Critical errors
    if (
      message.includes('chunk') ||
      message.includes('network') ||
      message.includes('cors') ||
      stack.includes('firebase') ||
      context?.component === 'auth'
    ) {
      return ErrorSeverity.CRITICAL;
    }

    // High severity errors
    if (
      message.includes('permission') ||
      message.includes('unauthorized') ||
      message.includes('payment') ||
      context?.feature === 'booking'
    ) {
      return ErrorSeverity.HIGH;
    }

    // Medium severity errors
    if (
      message.includes('validation') ||
      message.includes('timeout') ||
      message.includes('rate limit')
    ) {
      return ErrorSeverity.MEDIUM;
    }

    // Low severity errors (default)
    return ErrorSeverity.LOW;
  }
}

export const initializeErrorHandling = (): void => {
  const globalHandler = GlobalErrorHandler.getInstance();
  globalHandler.initialize();
};

export const destroyErrorHandling = (): void => {
  const globalHandler = GlobalErrorHandler.getInstance();
  globalHandler.destroy();
};