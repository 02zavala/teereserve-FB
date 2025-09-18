'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { logger } from '../lib/logger';

export const useLogger = (context?: string) => {
  const log = useMemo(() => ({
    debug: (message: string, data?: any) => logger.debug(message, context, data),
    info: (message: string, data?: any) => logger.info(message, context, data),
    warn: (message: string, data?: any) => logger.warn(message, context, data),
    error: (message: string, error?: Error, data?: any) => logger.error(message, error, context, data),
    fatal: (message: string, error?: Error, data?: any) => logger.fatal(message, error, context, data)
  }), [context]);

  useEffect(() => {
    // Log component mount
    if (context) {
      logger.debug(`Component mounted: ${context}`, context);
    }

    return () => {
      // Log component unmount
      if (context) {
        logger.debug(`Component unmounted: ${context}`, context);
      }
    };
  }, [context]);

  return log;
};

export const logError = (error: Error, errorInfo?: any, context?: string) => {
  logger.error(
    `React Error: ${error.message}`,
    error,
    context || 'React',
    {
      errorInfo,
      stack: error.stack,
      componentStack: errorInfo?.componentStack
    }
  );
};