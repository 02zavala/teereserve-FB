
"use client";

import { AppProviders } from '@/context/AppProviders';
import { ThemeProvider } from '@/components/layout/ThemeProvider';
import { OnboardingProvider } from '@/components/onboarding/OnboardingProvider';
import { PageErrorBoundary } from '@/components/error/ErrorBoundary';
import { FirebaseErrorHandler } from '@/components/FirebaseErrorHandler';
import { initializeErrorHandling } from '@/lib/error-handler';
import { initGA4 } from '@/lib/analytics';
import { Suspense, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import type { Locale } from '@/i18n-config';

// Desregistrar Service Workers en desarrollo
if (process.env.NODE_ENV === 'development') {
  import('@/lib/sw-unregister');
}

interface ClientLayoutProps {
  children: React.ReactNode;
  lang: Locale;
}

export function ClientLayout({ children, lang }: ClientLayoutProps) {
  // Initialize global error handling and analytics
  useEffect(() => {
    initializeErrorHandling();
    
    // Initialize Google Analytics 4 with error handling
    if (typeof window !== 'undefined') {
      try {
        // Verificar conectividad antes de inicializar
        if (!navigator.onLine) {
          console.log('📴 GA4: Saltando inicialización (sin conexión)');
          return;
        }
        
        // Usar setTimeout para evitar bloqueos en el render
        const timeoutId = setTimeout(() => {
          try {
            initGA4();
          } catch (error: any) {
            // Manejar errores específicos de GA4
            if (error?.message?.includes('Failed to fetch') || 
                error?.message?.includes('fetch') ||
                error?.name === 'TypeError' ||
                error?.message?.includes('network')) {
              console.log('📴 GA4: Inicialización fallida silenciosamente (modo offline)');
              return;
            }
            console.warn('⚠️ GA4: Error de inicialización:', error);
          }
        }, 200);

        return () => clearTimeout(timeoutId);
      } catch (error: any) {
        console.log('📴 GA4: Error en configuración inicial (modo offline)');
      }
    }
  }, []);

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <AppProviders>
        <OnboardingProvider lang={lang}>
          <PageErrorBoundary>
            <FirebaseErrorHandler>
              <Suspense fallback={
                  <div className="flex h-screen w-full items-center justify-center">
                      <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  </div>
              }>
                  {children}
              </Suspense>
            </FirebaseErrorHandler>
          </PageErrorBoundary>
        </OnboardingProvider>
      </AppProviders>
    </ThemeProvider>
  );
}
