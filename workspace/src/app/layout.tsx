
import type { Metadata, Viewport } from 'next'
import { Playfair_Display, PT_Sans } from 'next/font/google'
import './globals.css'
import { cn } from '@/lib/utils'
import { ClientLayout } from '@/components/layout/ClientLayout'
import { MaintenanceOverlay } from '@/components/MaintenanceOverlay'
import { GoogleAnalytics } from '@/components/analytics/GoogleAnalytics'
import { VisitTracker } from '@/components/analytics/VisitTracker' // NUEVO: Importar tracker de visitas
import type { Locale } from '@/i18n-config'
import { AppProviders } from '@/context/AppProviders'
import Script from 'next/script'

const fontHeadline = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-headline',
})

const fontBody = PT_Sans({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-body',
})

export const metadata: Metadata = {
  title: 'TeeReserve Golf - Premium Golf Booking in Los Cabos',
  description: 'Book premium golf courses in Los Cabos, Mexico. Discover the best tee times, exclusive courses, and unforgettable golf experiences.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: ['/favicon.ico', '/favicon.svg'],
    apple: '/apple-touch-icon.svg',
    shortcut: '/favicon.ico',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

interface RootLayoutProps {
  children: React.ReactNode;
  params: Promise<{ lang: Locale }>;
}

export default async function RootLayout({
  children,
  params,
}: RootLayoutProps) {
  const { lang } = await params;
  const gaId = process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID;
  const gaDisabled = process.env.NEXT_PUBLIC_DISABLE_ANALYTICS === 'true';
  
  // URGENTE: MODO MANTENIMIENTO ACTIVADO
  // Cambiar a false para desactivar
  const IS_MAINTENANCE_MODE = true;
  
  return (
    <html lang={lang} suppressHydrationWarning>
      <body
        className={cn(
          'min-h-screen bg-background font-body antialiased',
          fontHeadline.variable,
          fontBody.variable
        )}
      >
        {IS_MAINTENANCE_MODE && <MaintenanceOverlay />}
        {gaId && !gaDisabled && <GoogleAnalytics gaId={gaId} />}
        <Script src={`https://www.googletagmanager.com/gtag/js?id=G-LZ0Y4R86E7`} strategy="afterInteractive" />
        <Script id="gtag-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-LZ0Y4R86E7');
          `}
        </Script>
        
        {/* Visit Tracking - NUEVO */}
        <VisitTracker enabled={true} debounceMs={1000} />
        
        <AppProviders>
          <ClientLayout lang={lang}>
            {children}
          </ClientLayout>
        </AppProviders>
      </body>
    </html>
  )
}
