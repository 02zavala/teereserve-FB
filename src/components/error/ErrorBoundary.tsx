import React, { Component, ErrorInfo, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { logger, logError } from '../../lib/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
  level?: 'page' | 'section' | 'component';
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
}

export class ErrorBoundary extends Component<Props, State> {
  private retryCount = 0;
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return {
      hasError: true,
      error,
      errorId
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError } = this.props;
    
    // Log error details
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Update state with error info
    this.setState({ errorInfo });
    
    // Call custom error handler if provided
    if (onError) {
      onError(error, errorInfo);
    }

    // Log to external service (implement based on your logging system)
    this.logErrorToService(error, errorInfo);
  }

  private logErrorToService = (error: Error, errorInfo: ErrorInfo) => {
    // Log using the centralized logging system
    logError(error, {
      componentStack: errorInfo.componentStack,
      errorId: this.state.errorId,
      level: this.props.level || 'component',
      retryCount: this.retryCount
    }, `ErrorBoundary-${this.props.level || 'component'}`);
  };

  private handleRetry = () => {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        errorId: ''
      });
    }
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private renderErrorDetails = () => {
    const { error, errorInfo, errorId } = this.state;
    const { showDetails = false } = this.props;

    if (!showDetails || !error) return null;

    return (
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border"
      >
        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
          Detalles del Error
        </h4>
        <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
          <div>
            <strong>ID:</strong> {errorId}
          </div>
          <div>
            <strong>Mensaje:</strong> {error.message}
          </div>
          {error.stack && (
            <div>
              <strong>Stack:</strong>
              <pre className="mt-1 whitespace-pre-wrap bg-gray-100 dark:bg-gray-700 p-2 rounded text-xs overflow-x-auto">
                {error.stack}
              </pre>
            </div>
          )}
          {errorInfo?.componentStack && (
            <div>
              <strong>Component Stack:</strong>
              <pre className="mt-1 whitespace-pre-wrap bg-gray-100 dark:bg-gray-700 p-2 rounded text-xs overflow-x-auto">
                {errorInfo.componentStack}
              </pre>
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  private renderErrorUI = () => {
    const { level = 'component' } = this.props;
    const { error, errorId } = this.state;
    const canRetry = this.retryCount < this.maxRetries;

    const errorMessages = {
      page: {
        title: 'Error en la Página',
        description: 'Ha ocurrido un error inesperado al cargar esta página.',
        icon: AlertTriangle
      },
      section: {
        title: 'Error en la Sección',
        description: 'Esta sección no se pudo cargar correctamente.',
        icon: AlertTriangle
      },
      component: {
        title: 'Error del Componente',
        description: 'Este componente ha encontrado un error.',
        icon: Bug
      }
    };

    const config = errorMessages[level];
    const Icon = config.icon;

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`flex items-center justify-center ${
          level === 'page' ? 'min-h-screen' : 'min-h-[200px]'
        }`}
      >
        <Card className={`w-full max-w-md mx-4 ${
          level === 'page' ? 'shadow-lg' : 'shadow-sm'
        }`}>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-full">
                <Icon className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {config.title}
            </CardTitle>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              {config.description}
            </p>
            {errorId && (
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                ID: {errorId}
              </p>
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {canRetry && (
                <Button
                  onClick={this.handleRetry}
                  className="w-full"
                  variant="default"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reintentar ({this.maxRetries - this.retryCount} intentos restantes)
                </Button>
              )}
              
              {level === 'page' && (
                <>
                  <Button
                    onClick={this.handleGoHome}
                    className="w-full"
                    variant="outline"
                  >
                    <Home className="h-4 w-4 mr-2" />
                    Ir al Inicio
                  </Button>
                  <Button
                    onClick={this.handleReload}
                    className="w-full"
                    variant="outline"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Recargar Página
                  </Button>
                </>
              )}
            </div>
            
            {this.renderErrorDetails()}
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  render() {
    const { hasError } = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      return fallback || this.renderErrorUI();
    }

    return children;
  }
}

// Higher-order component for easier usage
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
};

// Specialized error boundaries for different contexts
export const PageErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary level="page" showDetails={process.env.NODE_ENV === 'development'}>
    {children}
  </ErrorBoundary>
);

export const SectionErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary level="section">
    {children}
  </ErrorBoundary>
);

export const ComponentErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary level="component">
    {children}
  </ErrorBoundary>
);

// Hook for programmatic error reporting
export const useErrorHandler = () => {
  const reportError = React.useCallback((error: Error, context?: string) => {
    logger.error(
      `Manual error report: ${error.message}`,
      error,
      context || 'useErrorHandler',
      { manual: true }
    );
  }, []);

  const reportWarning = React.useCallback((message: string, context?: string, data?: any) => {
    logger.warn(message, context || 'useErrorHandler', data);
  }, []);

  const reportInfo = React.useCallback((message: string, context?: string, data?: any) => {
    logger.info(message, context || 'useErrorHandler', data);
  }, []);

  return { reportError, reportWarning, reportInfo };
};