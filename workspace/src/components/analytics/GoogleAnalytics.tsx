"use client";

import Script from 'next/script';

interface GoogleAnalyticsProps {
  gaId: string;
  nonce?: string;
}

export function GoogleAnalytics({ gaId, nonce }: GoogleAnalyticsProps) {
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
        strategy="afterInteractive"
        nonce={nonce}
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
        nonce={nonce}
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
  );
}
