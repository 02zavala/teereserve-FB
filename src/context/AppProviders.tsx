
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
    
    // Clean service workers in development
    if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => 
        registrations.forEach(registration => registration.unregister())
      );
    }
  }, []);

  return (
    <AuthProvider>
      {children}
      <Toaster />
    </AuthProvider>
  )
}
