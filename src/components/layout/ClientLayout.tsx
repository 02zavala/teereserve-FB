
"use client";

import { ThemeProvider } from '@/components/layout/ThemeProvider';
import { OnboardingProvider } from '@/components/onboarding/OnboardingProvider';
import { PageErrorBoundary } from '@/components/error/ErrorBoundary';
import { FirebaseErrorHandler } from '@/components/FirebaseErrorHandler';
import { initializeErrorHandling } from '@/lib/error-handler';
import { initGA4 } from '@/lib/analytics';
import { Suspense, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import type { Locale } from '@/i18n-config';
import { useAuth } from '@/context/AuthContext';
import { usePathname, useRouter } from 'next/navigation';

// Desregistrar Service Workers en desarrollo
if (process.env.NODE_ENV === 'development') {
  import('@/lib/sw-unregister');
}

interface ClientLayoutProps {
  children: React.ReactNode;
  lang: Locale;
}

// Mover el guard a un subcomponente envuelto por AppProviders
function EmailVerificationGuard({ children, lang }: { children: React.ReactNode; lang: Locale }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const requireVerification = process.env.NEXT_PUBLIC_REQUIRE_EMAIL_VERIFICATION === 'true';

  useEffect(() => {
    if (!requireVerification) return;
    if (loading) return;
    if (!user) return;
    const path = pathname || '';
    const isAllowed =
      path.includes('/verify-email') ||
      path.includes('/login') ||
      path.includes('/signup');
    if (!user.emailVerified && !isAllowed) {
      router.push(`/${lang}/verify-email`);
    }
  }, [requireVerification, user, loading, pathname, lang, router]);

  return <>{children}</>;
}

export function ClientLayout({ children, lang }: ClientLayoutProps) {
  // Initialize global error handling and analytics
  // Eliminar uso directo de useAuth aquí: el provider está más abajo
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
      <OnboardingProvider lang={lang}>
        <PageErrorBoundary>
          <FirebaseErrorHandler>
            <EmailVerificationGuard lang={lang}>
              <Suspense fallback={
                  <div className="flex h-screen w-full items-center justify-center">
                      <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  </div>
              }>
                  {children}
              </Suspense>
            </EmailVerificationGuard>
          </FirebaseErrorHandler>
        </PageErrorBoundary>
      </OnboardingProvider>
    </ThemeProvider>
  );
}
