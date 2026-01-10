
import type { Metadata, Viewport } from 'next'
import { Playfair_Display, PT_Sans } from 'next/font/google'
import './globals.css'
import { cn } from '@/lib/utils'
import { ClientLayout } from '@/components/layout/ClientLayout'
import { MaintenanceOverlay } from '@/components/MaintenanceOverlay'
import { GoogleAnalytics } from '@/components/analytics/GoogleAnalytics'
import { VisitTracker } from '@/components/analytics/VisitTracker'
import type { Locale } from '@/i18n-config'
import { AppProviders } from '@/context/AppProviders'
import { headers } from 'next/headers'

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
  params: Promise<{ lang?: string }>;
}

export default async function RootLayout({
  children,
  params,
}: RootLayoutProps) {
  const resolvedParams = await params;
  const lang = (resolvedParams?.lang as Locale) || 'en';
  
  // Obtener nonce de los headers
  const headersList = await headers();
  const nonce = headersList.get('x-nonce') || undefined;
  
  const gaId = process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID;
  const gaDisabled = process.env.NEXT_PUBLIC_DISABLE_ANALYTICS === 'true';
  
  const IS_MAINTENANCE_MODE = false;
  
  return (
    <html lang={lang} suppressHydrationWarning>
      <body
        className={cn(
          'min-h-screen bg-background font-body antialiased',
          fontHeadline.variable,
          fontBody.variable
        )}
      >
        {gaId && !gaDisabled && <GoogleAnalytics gaId={gaId} nonce={nonce} />}
        
        {/* Visit Tracking */}
        <VisitTracker enabled={true} debounceMs={1000} />
        
        <AppProviders>
          {IS_MAINTENANCE_MODE && <MaintenanceOverlay />}
          <ClientLayout lang={lang} nonce={nonce}>
            {children}
          </ClientLayout>
        </AppProviders>
      </body>
    </html>
  )
}
