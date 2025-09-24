
import type { Metadata, Viewport } from 'next'
import { Playfair_Display, PT_Sans } from 'next/font/google'
import Script from 'next/script'
import './globals.css'
import { cn } from '@/lib/utils'
import { ClientLayout } from '@/components/layout/ClientLayout'
import type { Locale } from '@/i18n-config'

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
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  
  return (
    <html lang={lang} suppressHydrationWarning>
      <body
        className={cn(
          'min-h-screen bg-background font-body antialiased',
          fontHeadline.variable,
          fontBody.variable
        )}
      >
        {/* Google Analytics */}
        {gaId && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
              strategy="afterInteractive"
              onError={(e) => {
                // Degradar error a info si es por AdBlock
                if (e.message?.includes('blocked') || e.message?.includes('network')) {
                  console.info('Google Analytics blocked by ad blocker or network filter - this is normal');
                } else {
                  console.error('Google Analytics script error:', e);
                }
              }}
            />
            <Script
              id="google-analytics"
              strategy="afterInteractive"
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${gaId}', {
                    page_title: document.title,
                    page_location: window.location.href,
                  });
                `,
              }}
              onError={(e) => {
                console.info('Google Analytics configuration blocked or failed - continuing normally');
              }}
            />
          </>
        )}
        
        <ClientLayout lang={lang}>
            {children}
        </ClientLayout>
      </body>
    </html>
  )
}
