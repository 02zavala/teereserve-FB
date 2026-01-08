"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Loader2, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { loadingSpinner, skeletonPulse, fadeIn } from '@/lib/animations';

type LoadingSize = 'sm' | 'md' | 'lg' | 'xl';
type LoadingVariant = 'spinner' | 'dots' | 'pulse' | 'skeleton' | 'progress';
type LoadingState = 'loading' | 'success' | 'error' | 'idle';

interface LoadingProps {
  size?: LoadingSize;
  variant?: LoadingVariant;
  state?: LoadingState;
  message?: string;
  progress?: number;
  className?: string;
  fullScreen?: boolean;
  overlay?: boolean;
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-12 h-12',
};

const messageSizeClasses = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
  xl: 'text-lg',
};

export function Loading({
  size = 'md',
  variant = 'spinner',
  state = 'loading',
  message,
  progress,
  className = '',
  fullScreen = false,
  overlay = false,
}: LoadingProps) {
  const renderIcon = () => {
    switch (state) {
      case 'success':
        return <CheckCircle className={`${sizeClasses[size]} text-green-500`} />;
      case 'error':
        return <AlertCircle className={`${sizeClasses[size]} text-red-500`} />;
      case 'loading':
        return renderLoadingVariant();
      default:
        return null;
    }
  };

  const renderLoadingVariant = () => {
    switch (variant) {
      case 'spinner':
        return (
          <motion.div {...loadingSpinner}>
            <Loader2 className={`${sizeClasses[size]} text-blue-500`} />
          </motion.div>
        );
      
      case 'dots':
        return <LoadingDots size={size} />;
      
      case 'pulse':
        return (
          <motion.div
            className={`${sizeClasses[size]} bg-blue-500 rounded-full`}
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.7, 1, 0.7],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        );
      
      case 'progress':
        return <ProgressBar progress={progress} size={size} />;
      
      case 'skeleton':
        return <SkeletonLoader size={size} />;
      
      default:
        return (
          <motion.div {...loadingSpinner}>
            <Loader2 className={`${sizeClasses[size]} text-blue-500`} />
          </motion.div>
        );
    }
  };

  const content = (
    <motion.div
      {...fadeIn}
      className={`flex flex-col items-center justify-center gap-3 ${className}`}
    >
      {renderIcon()}
      {message && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className={`${messageSizeClasses[size]} text-gray-600 dark:text-gray-300 text-center max-w-xs`}
        >
          {message}
        </motion.p>
      )}
    </motion.div>
  );

  if (fullScreen) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-white dark:bg-gray-900"
      >
        {content}
      </motion.div>
    );
  }

  if (overlay) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm"
      >
        {content}
      </motion.div>
    );
  }

  return content;
}

function LoadingDots({ size }: { size: LoadingSize }) {
  const dotSize = {
    sm: 'w-1 h-1',
    md: 'w-1.5 h-1.5',
    lg: 'w-2 h-2',
    xl: 'w-3 h-3',
  };

  return (
    <div className="flex gap-1">
      {[0, 1, 2].map((index) => (
        <motion.div
          key={index}
          className={`${dotSize[size]} bg-blue-500 rounded-full`}
          animate={{
            y: [0, -8, 0],
            opacity: [0.7, 1, 0.7],
          }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: index * 0.1,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

function ProgressBar({ progress = 0, size }: { progress?: number; size: LoadingSize }) {
  const barHeight = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
    xl: 'h-4',
  };

  const barWidth = {
    sm: 'w-16',
    md: 'w-24',
    lg: 'w-32',
    xl: 'w-40',
  };

  return (
    <div className={`${barWidth[size]} ${barHeight[size]} bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden`}>
      <motion.div
        className="h-full bg-blue-500 rounded-full"
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      />
    </div>
  );
}

function SkeletonLoader({ size }: { size: LoadingSize }) {
  const skeletonSize = {
    sm: 'w-16 h-4',
    md: 'w-24 h-6',
    lg: 'w-32 h-8',
    xl: 'w-40 h-10',
  };

  return (
    <motion.div
      className={`${skeletonSize[size]} bg-gray-200 dark:bg-gray-700 rounded`}
      {...skeletonPulse}
    />
  );
}

// Componente para botones con loading
export function LoadingButton({
  children,
  loading = false,
  disabled = false,
  size = 'md',
  variant = 'primary',
  className = '',
  ...props
}: {
  children: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  size?: LoadingSize;
  variant?: 'primary' | 'secondary' | 'outline';
  className?: string;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onDrag' | 'onDragStart' | 'onDragEnd' | 'onAnimationStart' | 'onAnimationEnd'>) {
  const baseClasses = 'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
    xl: 'px-8 py-4 text-lg',
  };

  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 disabled:bg-blue-300',
    secondary: 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500 disabled:bg-gray-300',
    outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-500 disabled:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800',
  };

  return (
    <motion.button
      whileHover={{ scale: disabled || loading ? 1 : 1.02 }}
      whileTap={{ scale: disabled || loading ? 1 : 0.98 }}
      className={`
        ${baseClasses}
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        ${(disabled || loading) ? 'cursor-not-allowed opacity-60' : ''}
        ${className}
      `}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0 }}
        >
          <Loader2 className={`${sizeClasses[size === 'sm' ? 'sm' : 'md']} animate-spin`} />
        </motion.div>
      )}
      <span className={loading ? 'opacity-70' : ''}>
        {children}
      </span>
    </motion.button>
  );
}

// Hook para manejar estados de loading
export function useLoading(initialState = false) {
  const [loading, setLoading] = React.useState(initialState);
  const [error, setError] = React.useState<string | null>(null);

  const startLoading = React.useCallback(() => {
    setLoading(true);
    setError(null);
  }, []);

  const stopLoading = React.useCallback(() => {
    setLoading(false);
  }, []);

  const setLoadingError = React.useCallback((errorMessage: string) => {
    setLoading(false);
    setError(errorMessage);
  }, []);

  const withLoading = React.useCallback(async <T,>(asyncFn: () => Promise<T>): Promise<T> => {
    startLoading();
    try {
      const result = await asyncFn();
      stopLoading();
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setLoadingError(errorMessage);
      throw err;
    }
  }, [startLoading, stopLoading, setLoadingError]);

  return {
    loading,
    error,
    startLoading,
    stopLoading,
    setError: setLoadingError,
    withLoading,
  };
}

// Componente para páginas con loading
export function PageLoading({ message = 'Cargando...' }: { message?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loading
        size="lg"
        variant="spinner"
        message={message}
      />
    </div>
  );
}

// Componente para secciones con loading
export function SectionLoading({ 
  message = 'Cargando...', 
  height = 'h-32',
  className = '' 
}: { 
  message?: string; 
  height?: string;
  className?: string;
}) {
  return (
    <div className={`${height} flex items-center justify-center ${className}`}>
      <Loading
        size="md"
        variant="spinner"
        message={message}
      />
    </div>
  );
}