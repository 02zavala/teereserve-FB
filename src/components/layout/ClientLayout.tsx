
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
    
    // Initialize Google Analytics 4
    if (typeof window !== 'undefined') {
      initGA4();
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
