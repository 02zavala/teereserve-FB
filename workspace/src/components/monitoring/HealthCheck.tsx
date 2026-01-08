'use client';

import React, { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';
import { useSentry } from '@/hooks/useSentry';

interface HealthStatus {
  status: 'healthy' | 'warning' | 'error';
  timestamp: number;
  checks: {
    database: boolean;
    api: boolean;
    storage: boolean;
    auth: boolean;
    logging: boolean;
    sentry: boolean;
  };
  metrics: {
    responseTime: number;
    memoryUsage?: number;
    errorRate: number;
  };
  errors: string[];
}

interface HealthCheckProps {
  interval?: number; // Check interval in milliseconds
  showDetails?: boolean;
  onStatusChange?: (status: HealthStatus) => void;
}

export const HealthCheck: React.FC<HealthCheckProps> = ({
  interval = 30000, // 30 seconds default
  showDetails = false,
  onStatusChange,
}) => {
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const { captureException, addBreadcrumb } = useSentry();

  const performHealthCheck = async (): Promise<HealthStatus> => {
    const startTime = Date.now();
    const errors: string[] = [];
    const checks = {
      database: false,
      api: false,
      storage: false,
      auth: false,
      logging: false,
      sentry: false,
    };

    try {
      // Check API endpoint
      try {
        const response = await fetch('/api/health', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        checks.api = response.ok;
        if (!response.ok) {
          errors.push(`API check failed: ${response.status}`);
        }
      } catch (error) {
        errors.push(`API check error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // Check Firebase Auth
      try {
        // Simple check to see if Firebase is initialized
        if (typeof window !== 'undefined' && (window as any).firebase) {
          checks.auth = true;
        } else {
          // Check if we can import Firebase
          const { auth } = await import('@/lib/firebase');
          checks.auth = !!auth;
        }
      } catch (error) {
        errors.push(`Auth check error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // Check Storage (Firebase Storage)
      try {
        const { storage } = await import('@/lib/firebase');
        checks.storage = !!storage;
      } catch (error) {
        errors.push(`Storage check error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // Check Database (Firestore)
      try {
        const { db } = await import('@/lib/firebase');
        checks.database = !!db;
      } catch (error) {
        errors.push(`Database check error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // Check Logging System
      try {
        logger.debug('Health check - logging system test');
        checks.logging = true;
      } catch (error) {
        errors.push(`Logging check error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // Check Sentry
      try {
        if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
          addBreadcrumb('Health check - Sentry test', 'health');
          checks.sentry = true;
        } else {
          checks.sentry = false;
          errors.push('Sentry DSN not configured');
        }
      } catch (error) {
        errors.push(`Sentry check error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      const responseTime = Date.now() - startTime;
      const healthyChecks = Object.values(checks).filter(Boolean).length;
      const totalChecks = Object.values(checks).length;
      const errorRate = errors.length / totalChecks;

      let status: 'healthy' | 'warning' | 'error';
      if (healthyChecks === totalChecks) {
        status = 'healthy';
      } else if (healthyChecks >= totalChecks * 0.7) {
        status = 'warning';
      } else {
        status = 'error';
      }

      const healthStatus: HealthStatus = {
        status,
        timestamp: Date.now(),
        checks,
        metrics: {
          responseTime,
          errorRate,
        },
        errors,
      };

      // Log health status
      if (status === 'error') {
        logger.error('Health check failed', undefined, 'health-check', healthStatus);
      } else if (status === 'warning') {
        logger.warn('Health check warning', 'health-check', healthStatus);
      } else {
        logger.info('Health check passed', 'health-check', healthStatus);
      }

      return healthStatus;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Health check system error', error instanceof Error ? error : new Error(errorMessage), 'health-check');
      captureException(error instanceof Error ? error : new Error(errorMessage));
      
      return {
        status: 'error',
        timestamp: Date.now(),
        checks,
        metrics: {
          responseTime: Date.now() - startTime,
          errorRate: 1,
        },
        errors: [`System error: ${errorMessage}`],
      };
    }
  };

  const runHealthCheck = async () => {
    if (isChecking) return;
    
    setIsChecking(true);
    try {
      const status = await performHealthCheck();
      setHealthStatus(status);
      onStatusChange?.(status);
    } catch (error) {
      logger.error('Failed to run health check', error instanceof Error ? error : new Error(String(error)), 'health-check');
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    // Run initial health check
    runHealthCheck();

    // Set up interval for periodic checks
    const intervalId = setInterval(runHealthCheck, interval);

    return () => clearInterval(intervalId);
  }, [interval]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-100';
      case 'warning':
        return 'text-yellow-600 bg-yellow-100';
      case 'error':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return '✅';
      case 'warning':
        return '⚠️';
      case 'error':
        return '❌';
      default:
        return '❓';
    }
  };

  if (!showDetails && healthStatus?.status === 'healthy') {
    return null; // Don't show anything if healthy and details not requested
  }

  return (
    <div className="health-check p-4 border rounded-lg shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">System Health</h3>
        <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(healthStatus?.status || 'unknown')}`}>
          {getStatusIcon(healthStatus?.status || 'unknown')} {healthStatus?.status || 'Checking...'}
        </div>
      </div>

      {isChecking && (
        <div className="flex items-center text-blue-600 mb-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
          Checking system health...
        </div>
      )}

      {healthStatus && showDetails && (
        <div className="space-y-4">
          {/* Service Checks */}
          <div>
            <h4 className="font-medium mb-2">Service Status</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {Object.entries(healthStatus.checks).map(([service, isHealthy]) => (
                <div key={service} className="flex items-center space-x-2">
                  <span className={isHealthy ? 'text-green-600' : 'text-red-600'}>
                    {isHealthy ? '✅' : '❌'}
                  </span>
                  <span className="capitalize text-sm">{service}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Metrics */}
          <div>
            <h4 className="font-medium mb-2">Metrics</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Response Time:</span>
                <span className="ml-2 font-mono">{healthStatus.metrics.responseTime}ms</span>
              </div>
              <div>
                <span className="text-gray-600">Error Rate:</span>
                <span className="ml-2 font-mono">{(healthStatus.metrics.errorRate * 100).toFixed(1)}%</span>
              </div>
            </div>
          </div>

          {/* Errors */}
          {healthStatus.errors.length > 0 && (
            <div>
              <h4 className="font-medium mb-2 text-red-600">Issues</h4>
              <ul className="space-y-1">
                {healthStatus.errors.map((error, index) => (
                  <li key={index} className="text-sm text-red-600 bg-red-50 p-2 rounded">
                    {error}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Last Check */}
          <div className="text-xs text-gray-500">
            Last checked: {new Date(healthStatus.timestamp).toLocaleString()}
          </div>
        </div>
      )}

      {!showDetails && healthStatus && (
        <button
          onClick={() => setHealthStatus({ ...healthStatus })} // Force re-render to show details
          className="text-sm text-blue-600 hover:text-blue-800 underline"
        >
          View Details
        </button>
      )}
    </div>
  );
};

export default HealthCheck;