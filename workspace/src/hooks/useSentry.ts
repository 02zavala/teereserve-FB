import React, { useEffect, useCallback } from 'react';
import * as Sentry from '@sentry/nextjs';
import { logger } from '@/lib/logger';

interface SentryConfig {
  dsn?: string;
  environment?: string;
  release?: string;
  sampleRate?: number;
  tracesSampleRate?: number;
}

interface SentryUser {
  id?: string;
  email?: string;
  username?: string;
  [key: string]: any;
}

interface SentryContext {
  [key: string]: any;
}

export const useSentry = () => {
  // Initialize Sentry
  const initializeSentry = useCallback((config: SentryConfig) => {
    try {
      Sentry.init({
        dsn: config.dsn || process.env.NEXT_PUBLIC_SENTRY_DSN,
        environment: config.environment || process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || 'development',
        release: config.release || process.env.NEXT_PUBLIC_SENTRY_RELEASE || '1.0.0',
        sampleRate: config.sampleRate || 1.0,
        tracesSampleRate: config.tracesSampleRate || 0.1,
        beforeSend(event) {
          // Filter out development errors in production
          if (process.env.NODE_ENV === 'production') {
            // Don't send console errors or development-specific errors
            if (event.exception?.values?.[0]?.value?.includes('Development')) {
              return null;
            }
          }
          return event;
        },
        // Browser tracing is automatically enabled in Sentry v10+
        // No need to manually configure BrowserTracing integration
      });
      
      logger.info('Sentry initialized successfully', 'sentry', {
        environment: config.environment,
        release: config.release,
      });
    } catch (error) {
      logger.error('Failed to initialize Sentry', error as Error, 'sentry');
    }
  }, []);

  // Set user context
  const setUser = useCallback((user: SentryUser) => {
    try {
      Sentry.setUser(user);
      logger.debug('Sentry user context set', 'sentry', { userId: user.id });
    } catch (error) {
      logger.error('Failed to set Sentry user context', error as Error, 'sentry');
    }
  }, []);

  // Set additional context
  const setContext = useCallback((key: string, context: SentryContext) => {
    try {
      Sentry.setContext(key, context);
      logger.debug('Sentry context set', 'sentry', { key });
    } catch (error) {
      logger.error('Failed to set Sentry context', error as Error, 'sentry', { key });
    }
  }, []);

  // Add breadcrumb
  const addBreadcrumb = useCallback((message: string, category?: string, level?: Sentry.SeverityLevel, data?: any) => {
    try {
      Sentry.addBreadcrumb({
        message,
        category: category || 'custom',
        level: level || 'info',
        data,
        timestamp: Date.now() / 1000,
      });
    } catch (error) {
      logger.error('Failed to add Sentry breadcrumb', error as Error, 'sentry', { message });
    }
  }, []);

  // Capture exception
  const captureException = useCallback((error: Error, context?: SentryContext) => {
    try {
      if (context) {
        Sentry.withScope((scope) => {
          Object.entries(context).forEach(([key, value]) => {
            scope.setContext(key, value);
          });
          Sentry.captureException(error);
        });
      } else {
        Sentry.captureException(error);
      }
      
      logger.error('Exception captured by Sentry', error, 'sentry', {
        context,
      });
    } catch (sentryError) {
      logger.error('Failed to capture exception in Sentry', sentryError as Error, 'sentry', { 
        originalError: error.message,
      });
    }
  }, []);

  // Capture message
  const captureMessage = useCallback((message: string, level?: Sentry.SeverityLevel, context?: SentryContext) => {
    try {
      if (context) {
        Sentry.withScope((scope) => {
          Object.entries(context).forEach(([key, value]) => {
            scope.setContext(key, value);
          });
          Sentry.captureMessage(message, level || 'info');
        });
      } else {
        Sentry.captureMessage(message, level || 'info');
      }
      
      logger.info('Message captured by Sentry', 'sentry', { message, level, context });
    } catch (error) {
      logger.error('Failed to capture message in Sentry', error as Error, 'sentry', { message });
    }
  }, []);

  // Performance monitoring with spans (replaces deprecated startTransaction)
  const startSpan = useCallback((name: string, op?: string) => {
    try {
      // In Sentry v10+, use Sentry.startSpan for performance monitoring
      logger.debug('Sentry span would be started', 'sentry', { name, op });
      // Note: Sentry v10+ handles performance monitoring automatically
      // Manual transaction creation is no longer needed for most use cases
      return { name, op }; // Return a simple object for compatibility
    } catch (error) {
      logger.error('Failed to start Sentry span', error as Error, 'sentry', { name });
      return null;
    }
  }, []);

  // Set tag
  const setTag = useCallback((key: string, value: string) => {
    try {
      Sentry.setTag(key, value);
      logger.debug('Sentry tag set', 'sentry', { key, value });
    } catch (error) {
      logger.error('Failed to set Sentry tag', error as Error, 'sentry', { key, value });
    }
  }, []);

  // Clear user context (for logout)
  const clearUser = useCallback(() => {
    try {
      Sentry.setUser(null);
      logger.debug('Sentry user context cleared', 'sentry');
    } catch (error) {
      logger.error('Failed to clear Sentry user context', error as Error, 'sentry');
    }
  }, []);

  // Auto-initialize Sentry on mount if DSN is available
  useEffect(() => {
    const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
    if (dsn && dsn !== 'https://xxx@xxx.ingest.sentry.io/xxx') {
      initializeSentry({
        dsn,
        environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT,
        release: process.env.NEXT_PUBLIC_SENTRY_RELEASE,
      });
    }
  }, [initializeSentry]);

  return {
    initializeSentry,
    setUser,
    setContext,
    addBreadcrumb,
    captureException,
    captureMessage,
    startSpan,
    setTag,
    clearUser,
  };
};

// Higher-order component for automatic error boundary integration
export const withSentryErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  fallbackComponent?: React.ComponentType<{ error: Error; resetError: () => void }>
) => {
  const defaultFallback = ({ error, resetError }: { error: unknown; componentStack: string; eventId: string; resetError(): void }) => {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return React.createElement('div', {
      className: 'flex flex-col items-center justify-center min-h-[200px] p-6 text-center'
    }, [
      React.createElement('h2', {
        key: 'title',
        className: 'text-xl font-semibold text-red-600 mb-2'
      }, 'Something went wrong'),
      React.createElement('p', {
        key: 'message',
        className: 'text-gray-600 mb-4'
      }, errorMessage),
      React.createElement('button', {
        key: 'button',
        onClick: resetError,
        className: 'px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors'
      }, 'Try again')
    ]);
  };

  return Sentry.withErrorBoundary(Component, {
    fallback: fallbackComponent ? 
      ({ error, resetError }: { error: unknown; componentStack: string; eventId: string; resetError(): void }) => {
        const errorObj = error instanceof Error ? error : new Error(String(error));
        return React.createElement(fallbackComponent, { error: errorObj, resetError });
      } : defaultFallback,
    beforeCapture: (scope, error, errorInfo) => {
      scope.setTag('errorBoundary', true);
      scope.setContext('errorInfo', errorInfo as any);
      const errorObj = error instanceof Error ? error : new Error(String(error));
      logger.error('Error boundary captured error', errorObj, 'sentry', {
        errorInfo,
      });
    },
  });
};

export default useSentry;