
"use client";

import { useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster"
import { AuthProvider } from '@/context/AuthContext'
import { installResourceErrorHandlers } from '@/utils/resource-errors';

// Simple logger wrapper
const Logger = {
  error: (message: string, meta?: any) => {
    console.error(`[GlobalErrorHandler] ${message}`, meta || {});
  }
};

export function AppProviders({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Install resource error handlers
    installResourceErrorHandlers(Logger);
    
    // Clean service workers in development with proper error handling
    if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Wait for document to be ready
      const cleanServiceWorkers = async () => {
        try {
          if (document.readyState === 'loading') {
            await new Promise(resolve => {
              document.addEventListener('DOMContentLoaded', resolve, { once: true });
            });
          }
          
          const registrations = await navigator.serviceWorker.getRegistrations();
          await Promise.all(
            registrations.map(registration => 
              registration.unregister().catch(err => 
                console.warn('Failed to unregister service worker:', err)
              )
            )
          );
        } catch (error) {
          console.warn('Error cleaning service workers:', error);
        }
      };
      
      cleanServiceWorkers();
    }
  }, []);

  return (
    <AuthProvider>
      {children}
      <Toaster />
    </AuthProvider>
  )
}
