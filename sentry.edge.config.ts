// This file configures the initialization of Sentry for edge features (middleware, edge API routes, and other edge runtime code).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: process.env.NODE_ENV === 'development',
  
  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || process.env.NODE_ENV,
  release: process.env.NEXT_PUBLIC_SENTRY_RELEASE || '1.0.0',
  
  beforeSend(event, hint) {
    // Filter out development errors in production
    if (process.env.NODE_ENV === 'production') {
      // Don't send console errors or development-specific errors
      if (event.exception?.values?.[0]?.value?.includes('Development')) {
        return null;
      }
      
      // Filter out middleware-specific errors that are not actionable
      const errorMessage = event.exception?.values?.[0]?.value || '';
      
      // Filter out bot requests and crawlers
      if (errorMessage.includes('bot') || errorMessage.includes('crawler')) {
        return null;
      }
    }
    
    return event;
  },
  
  // Performance Monitoring for Edge Runtime
  beforeSendTransaction(event) {
    // Filter out health check and monitoring requests
    if (event.transaction?.includes('/api/health') || 
        event.transaction?.includes('/_next/') ||
        event.transaction?.includes('/favicon.ico')) {
      return null;
    }
    
    return event;
  },
});
