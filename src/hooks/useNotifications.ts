'use client';

import { useEffect, useState } from 'react';
import { messaging } from '@/lib/firebase';
import { getToken, onMessage } from 'firebase/messaging';
import { useToast } from '@/hooks/use-toast';

interface NotificationPayload {
  title?: string;
  body?: string;
  icon?: string;
  data?: Record<string, any>;
}

export function useNotifications() {
  const [token, setToken] = useState<string | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const { toast } = useToast();

  // Request notification permission
  const requestPermission = async (): Promise<boolean> => {
    try {
      const permission = await Notification.requestPermission();
      setPermission(permission);
      return permission === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  };

  // Get FCM token
  const getNotificationToken = async (): Promise<string | null> => {
    try {
      const messagingInstance = await messaging;
      if (!messagingInstance) {
        console.warn('Firebase Messaging not available');
        return null;
      }

      const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
      if (!vapidKey) {
        console.warn('VAPID key not configured');
        return null;
      }

      const currentToken = await getToken(messagingInstance, {
        vapidKey: vapidKey
      });

      if (currentToken) {
        setToken(currentToken);
        return currentToken;
      } else {
        console.log('No registration token available.');
        return null;
      }
    } catch (error) {
      console.error('An error occurred while retrieving token:', error);
      return null;
    }
  };

  // Initialize notifications
  const initializeNotifications = async () => {
    if (typeof window === 'undefined') return;

    // Check current permission
    setPermission(Notification.permission);

    // If permission is granted, get token
    if (Notification.permission === 'granted') {
      await getNotificationToken();
    }

    // Set up foreground message listener
    const messagingInstance = await messaging;
    if (messagingInstance) {
      onMessage(messagingInstance, (payload) => {
        console.log('Message received in foreground:', payload);
        
        const notification = payload.notification;
        if (notification) {
          // Show toast notification for foreground messages
          toast({
            title: notification.title || 'Nueva notificación',
            description: notification.body || '',
            duration: 5000,
          });

          // Also show browser notification if permission is granted
          if (Notification.permission === 'granted') {
            new Notification(notification.title || 'TeeReserve', {
              body: notification.body || '',
              icon: notification.icon || '/icon.png',
              badge: '/icon.png',
              tag: 'teereserve-notification',
              data: payload.data
            });
          }
        }
      });
    }
  };

  // Send token to server (to be implemented)
  const saveTokenToServer = async (token: string, userId?: string) => {
    try {
      // TODO: Implement API call to save token to Firestore
      // This would typically save to a user's document or a separate tokens collection
      console.log('Token to save:', token, 'for user:', userId);
    } catch (error) {
      console.error('Error saving token to server:', error);
    }
  };

  useEffect(() => {
    initializeNotifications();
  }, []);

  return {
    token,
    permission,
    requestPermission,
    getNotificationToken,
    saveTokenToServer,
    isSupported: typeof window !== 'undefined' && 'Notification' in window
  };
}

export default useNotifications;