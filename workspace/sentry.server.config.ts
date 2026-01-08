// This file configures the initialization of Sentry on the server side.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

if (process.env.NEXT_PUBLIC_DISABLE_SENTRY === 'true' || !process.env.NEXT_PUBLIC_SENTRY_DSN) {
  if (process.env.NODE_ENV === 'development') {
    console.log('ℹ️ Sentry (server) deshabilitado: flag activa o falta DSN');
  }
} else {
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: process.env.NODE_ENV === 'development',
  
  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || process.env.NODE_ENV,
  release: process.env.NEXT_PUBLIC_SENTRY_RELEASE || '1.0.0',
  
  // Uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: process.env.NODE_ENV === 'development',
  
  beforeSend(event, hint) {
    // Filter out development errors in production
    if (process.env.NODE_ENV === 'production') {
      // Don't send console errors or development-specific errors
      if (event.exception?.values?.[0]?.value?.includes('Development')) {
        return null;
      }
      
      // Filter out common server errors that are not actionable
      const errorMessage = event.exception?.values?.[0]?.value || '';
      
      // Filter out ECONNRESET errors (client disconnections)
      if (errorMessage.includes('ECONNRESET')) {
        return null;
      }
      
      // Filter out timeout errors from external services
      if (errorMessage.includes('timeout') && errorMessage.includes('external')) {
        return null;
      }
    }
    
    return event;
  },
});
}
