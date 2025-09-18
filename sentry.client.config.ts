// This file configures the initialization of Sentry on the browser side.
// The config you add here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';
// import { Replay } from '@sentry/replay';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: process.env.NODE_ENV === 'development',
  
  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || process.env.NODE_ENV,
  release: process.env.NEXT_PUBLIC_SENTRY_RELEASE || '1.0.0',
  
  // replaysOnErrorSampleRate: 1.0,
  
  // This sets the sample rate to be 10%. You may want this to be 100% while
  // in development and sample at a lower rate in production
  // replaysSessionSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0.1,
  
  // You can remove this option if you're not planning to use the Sentry Session Replay feature:
  // integrations: [
    // new Replay({
    //   // Additional Replay configuration goes in here, for example:
    //   maskAllText: true,
    //   blockAllMedia: true,
    // }),
    // new Sentry.BrowserTracing({
      // Set sampling rate for performance monitoring
      // tracePropagationTargets: [
        // 'localhost',
        // /^https:\/\/teereserve\.golf/,
        // /^https:\/\/api\.teereserve\.golf/,
      // ],
    // }),
  // ],
  
  beforeSend(event, hint) {
    // Filter out development errors in production
    if (process.env.NODE_ENV === 'production') {
      // Don't send console errors or development-specific errors
      if (event.exception?.values?.[0]?.value?.includes('Development')) {
        return null;
      }
      
      // Filter out network errors that are not actionable
      if (event.exception?.values?.[0]?.type === 'NetworkError') {
        return null;
      }
      
      // Filter out script loading errors from browser extensions
      if (event.exception?.values?.[0]?.value?.includes('chrome-extension://')) {
        return null;
      }
    }
    
    return event;
  },
  
  // Performance Monitoring
  beforeSendTransaction(event) {
    // Modify transaction events here
    return event;
  },
});
