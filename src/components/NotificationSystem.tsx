'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { X, Bell, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

// Notification Types
export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  persistent?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// Notification Context
interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  removeNotification: (id: string) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  showToast: (type: NotificationType, title: string, message: string, duration?: number) => void;
  showModal: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Toast Component
interface ToastProps {
  notification: Notification;
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ notification, onClose }) => {
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

  const getBgColor = () => {
    switch (notification.type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
    }
  };

  return (
    <div className={cn(
      'fixed top-4 right-4 z-50 w-96 p-4 rounded-lg border shadow-lg transition-all duration-300 ease-in-out',
      getBgColor()
    )}>
      <div className="flex items-start space-x-3">
        {getIcon()}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-gray-900">{notification.title}</h4>
          <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
          {notification.action && (
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={notification.action.onClick}
            >
              {notification.action.label}
            </Button>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

// Notification Bell Component
interface NotificationBellProps {
  onClick: () => void;
  className?: string;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ onClick, className }) => {
  const { unreadCount } = useNotifications();

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn('relative', className)}
      onClick={onClick}
    >
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <Badge
          variant="destructive"
          className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </Badge>
      )}
    </Button>
  );
};

// Notification Panel Component
interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationPanel: React.FC<NotificationPanelProps> = ({ isOpen, onClose }) => {
  const { notifications, markAsRead, markAllAsRead, clearAll, removeNotification } = useNotifications();

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Ahora';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    return `${days}d`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            Notificaciones
            <div className="flex space-x-2">
              <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                Marcar todas como leídas
              </Button>
              <Button variant="ghost" size="sm" onClick={clearAll}>
                Limpiar
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-96 overflow-y-auto space-y-2">
          {notifications.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Bell className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No hay notificaciones</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <Card
                key={notification.id}
                className={cn(
                  'cursor-pointer transition-colors',
                  !notification.read && 'bg-blue-50 border-blue-200'
                )}
                onClick={() => markAsRead(notification.id)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-sm">{notification.title}</CardTitle>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500">
                        {formatTime(notification.timestamp)}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeNotification(notification.id);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <CardDescription className="text-sm">
                    {notification.message}
                  </CardDescription>
                  {notification.action && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        notification.action!.onClick();
                      }}
                    >
                      {notification.action.label}
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Notification Provider Component
interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [toasts, setToasts] = useState<Notification[]>([]);
  const [modalNotification, setModalNotification] = useState<Notification | null>(null);

  const addNotification = (notificationData: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const notification: Notification = {
      ...notificationData,
      id: Date.now().toString(),
      timestamp: new Date(),
      read: false
    };

    setNotifications(prev => [notification, ...prev]);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const showToast = (type: NotificationType, title: string, message: string, duration: number = 5000) => {
    const toast: Notification = {
      id: Date.now().toString(),
      type,
      title,
      message,
      timestamp: new Date(),
      read: false
    };

    setToasts(prev => [...prev, toast]);

    // Auto remove toast after duration
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== toast.id));
    }, duration);
  };

  const showModal = (notificationData: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const notification: Notification = {
      ...notificationData,
      id: Date.now().toString(),
      timestamp: new Date(),
      read: false
    };

    setModalNotification(notification);
    addNotification(notificationData);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    addNotification,
    removeNotification,
    markAsRead,
    markAllAsRead,
    clearAll,
    showToast,
    showModal
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      
      {/* Render Toasts */}
      {toasts.map((toast, index) => (
        <div
          key={toast.id}
          style={{ top: `${1 + index * 6}rem` }}
          className="fixed right-4 z-50"
        >
          <Toast
            notification={toast}
            onClose={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
          />
        </div>
      ))}

      {/* Modal Notification */}
      {modalNotification && (
        <Dialog open={true} onOpenChange={() => setModalNotification(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{modalNotification.title}</DialogTitle>
              <DialogDescription>{modalNotification.message}</DialogDescription>
            </DialogHeader>
            {modalNotification.action && (
              <div className="flex justify-end space-x-2 mt-4">
                <Button variant="outline" onClick={() => setModalNotification(null)}>
                  Cerrar
                </Button>
                <Button onClick={modalNotification.action.onClick}>
                  {modalNotification.action.label}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </NotificationContext.Provider>
  );
};

// Hook to use notifications
export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

// Utility functions for common notification types
export const notificationUtils = {
  success: (title: string, message: string) => ({ type: 'success' as const, title, message }),
  error: (title: string, message: string) => ({ type: 'error' as const, title, message }),
  warning: (title: string, message: string) => ({ type: 'warning' as const, title, message }),
  info: (title: string, message: string) => ({ type: 'info' as const, title, message })
};