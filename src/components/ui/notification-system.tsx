"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { notificationSlideIn } from '@/lib/animations';

type NotificationType = 'success' | 'error' | 'warning' | 'info';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
  persistent?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id'>) => string;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((notification: Omit<Notification, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newNotification: Notification = {
      ...notification,
      id,
      duration: notification.duration ?? 5000,
    };

    setNotifications(prev => [...prev, newNotification]);

    // Auto-remove notification if not persistent
    if (!notification.persistent && newNotification.duration! > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, newNotification.duration);
    }

    return id;
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  return (
    <NotificationContext.Provider value={{
      notifications,
      addNotification,
      removeNotification,
      clearAll
    }}>
      {children}
      <NotificationContainer />
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

// Hook para notificaciones comunes
export function useToast() {
  const { addNotification } = useNotifications();

  const toast = useMemo(() => ({
    success: (title: string, message?: string, options?: Partial<Notification>) => 
      addNotification({ type: 'success', title, message, ...options }),
    
    error: (title: string, message?: string, options?: Partial<Notification>) => 
      addNotification({ type: 'error', title, message, persistent: true, ...options }),
    
    warning: (title: string, message?: string, options?: Partial<Notification>) => 
      addNotification({ type: 'warning', title, message, ...options }),
    
    info: (title: string, message?: string, options?: Partial<Notification>) => 
      addNotification({ type: 'info', title, message, ...options }),
    
    promise: async <T,>(
      promise: Promise<T>,
      {
        loading,
        success,
        error,
      }: {
        loading: string;
        success: string | ((data: T) => string);
        error: string | ((error: any) => string);
      }
    ) => {
      const loadingId = addNotification({
        type: 'info',
        title: loading,
        persistent: true,
      });

      try {
        const data = await promise;
        removeNotification(loadingId);
        addNotification({
          type: 'success',
          title: typeof success === 'function' ? success(data) : success,
        });
        return data;
      } catch (err) {
        removeNotification(loadingId);
        addNotification({
          type: 'error',
          title: typeof error === 'function' ? error(err) : error,
          persistent: true,
        });
        throw err;
      }
    },
  }), [addNotification]);

  const { removeNotification } = useNotifications();

  return { ...toast, dismiss: removeNotification };
}

function NotificationContainer() {
  const { notifications } = useNotifications();

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full">
      <AnimatePresence>
        {notifications.map((notification) => (
          <NotificationItem key={notification.id} notification={notification} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function NotificationItem({ notification }: { notification: Notification }) {
  const { removeNotification } = useNotifications();
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!notification.persistent && notification.duration! > 0) {
      const interval = setInterval(() => {
        setProgress(prev => {
          const newProgress = prev - (100 / (notification.duration! / 100));
          return Math.max(0, newProgress);
        });
      }, 100);

      return () => clearInterval(interval);
    }
  }, [notification.duration, notification.persistent]);

  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'info':
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const getColorClasses = () => {
    switch (notification.type) {
      case 'success':
        return 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950';
      case 'error':
        return 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950';
      case 'info':
        return 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950';
    }
  };

  return (
    <motion.div
      {...notificationSlideIn}
      layout
      className={`
        relative overflow-hidden rounded-lg border p-4 shadow-lg backdrop-blur-sm
        ${getColorClasses()}
      `}
    >
      {/* Progress bar */}
      {!notification.persistent && notification.duration! > 0 && (
        <motion.div
          className="absolute bottom-0 left-0 h-1 bg-current opacity-30"
          initial={{ width: '100%' }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.1, ease: 'linear' }}
        />
      )}

      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          {getIcon()}
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {notification.title}
          </h4>
          {notification.message && (
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              {notification.message}
            </p>
          )}
          {notification.action && (
            <div className="mt-2">
              <button
                onClick={notification.action.onClick}
                className="text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
              >
                {notification.action.label}
              </button>
            </div>
          )}
        </div>

        <button
          onClick={() => removeNotification(notification.id)}
          className="flex-shrink-0 rounded-md p-1 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-gray-500 dark:hover:text-gray-300"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  );
}

// Componente para mostrar notificaciones inline
export function InlineNotification({
  type,
  title,
  message,
  onDismiss,
  className = '',
}: {
  type: NotificationType;
  title: string;
  message?: string;
  onDismiss?: () => void;
  className?: string;
}) {
  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'info':
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const getColorClasses = () => {
    switch (type) {
      case 'success':
        return 'border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200';
      case 'error':
        return 'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50 text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-200';
      case 'info':
        return 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`
        rounded-lg border p-4 ${getColorClasses()} ${className}
      `}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          {getIcon()}
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium">
            {title}
          </h4>
          {message && (
            <p className="mt-1 text-sm opacity-90">
              {message}
            </p>
          )}
        </div>

        {onDismiss && (
          <button
            onClick={onDismiss}
            className="flex-shrink-0 rounded-md p-1 opacity-70 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-current"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </motion.div>
  );
}

// Hook para notificaciones de formulario
export function useFormNotifications() {
  const toast = useToast();

  return {
    success: (message: string = 'Operación completada exitosamente') => 
      toast.success('Éxito', message),
    
    error: (error: any) => {
      const message = error?.message || error?.toString() || 'Ha ocurrido un error inesperado';
      toast.error('Error', message);
    },
    
    validation: (errors: string[]) => {
      toast.warning('Errores de validación', errors.join(', '));
    },
    
    loading: (message: string = 'Procesando...') => 
      toast.info('Cargando', message, { persistent: true }),
  };
}