
import type { Metadata, Viewport } from 'next'
import { Playfair_Display, PT_Sans } from 'next/font/google'
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
  return (
    <html lang={lang} suppressHydrationWarning>
      <body
        className={cn(
          'min-h-screen bg-background font-body antialiased',
          fontHeadline.variable,
          fontBody.variable
        )}
      >
        <ClientLayout lang={lang}>
            {children}
        </ClientLayout>
      </body>
    </html>
  )
}
