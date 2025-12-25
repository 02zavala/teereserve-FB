/** @type {import('next').NextConfig} */
import { withSentryConfig } from '@sentry/nextjs';
const nextConfig = {
  // Explicitly set the root to avoid issues with parent directories
  turbopack: {
    root: process.cwd(),
  },

  // Build optimizations for Firebase Hosting
  output: 'standalone',
  trailingSlash: false,
  
  // TypeScript configuration
  typescript: {
    ignoreBuildErrors: process.env.NEXT_PREVIEW_BUILD === 'true',
  },
  
  // External packages for server-side rendering
  serverExternalPackages: [
    'firebase-admin',
    '@google-cloud/firestore',
    '@google-cloud/storage',
    'nodemailer',
    'xoauth2',
    'stripe',
    'sharp',
    'canvas',
    'jsdom',
    '@sentry/node',
    '@sentry/nextjs',
    'genkit',
    '@genkit-ai/googleai',
    'handlebars',
    // Ensure pdfkit assets (AFM files) resolve from node_modules at runtime
    'pdfkit',
  ],
  
  // Experimental features for Next.js 15
  experimental: {
    optimizePackageImports: [
      '@radix-ui/react-icons',
      '@radix-ui/react-slot',
      'class-variance-authority'
    ],
    // Disable CSS optimization to avoid critters issues
    optimizeCss: false,
    webVitalsAttribution: ['CLS', 'LCP'],
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'platform-lookaside.fbsbx.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'graph.facebook.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'scontent.facebook.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'plus.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/**',
      }
    ],
  },
  productionBrowserSourceMaps: true,
  compress: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Conditionally allow 'unsafe-eval' only in development for React Refresh
          // Build CSP dynamically to avoid EvalError in dev while keeping production strict
          {
            key: 'Content-Security-Policy',
            value: (() => {
              const isDev = process.env.NODE_ENV !== 'production';
              const scriptSrc = [
                "'self'",
                "'unsafe-inline'",
                ...(isDev ? ["'unsafe-eval'"] : []),
                'http://localhost:*',
                'https://apis.google.com',
                'https://www.googletagmanager.com',
                'https://js.stripe.com',
                'https://checkout.stripe.com',
                'https://m.stripe.network',
                'https://*.paypal.com',
                'https://*.paypalobjects.com',
              ].join(' ');

              const styleSrc = [
                "style-src 'self' 'unsafe-inline' http://localhost:* https://fonts.googleapis.com https://www.gstatic.com",
                ...(isDev ? ['https://unpkg.com'] : []),
              ].join(' ');

              const connectSrc = [
                "connect-src 'self' http://localhost:* ws://localhost:* https://*.googleapis.com https://*.firebaseapp.com https://firestore.googleapis.com https://identitytoolkit.googleapis.com https://firebase.googleapis.com https://firebaseinstallations.googleapis.com https://api.stripe.com https://checkout.stripe.com https://*.stripe.com https://m.stripe.network https://*.paypal.com https://*.sentry.io https://*.openstreetmap.org https://nominatim.openstreetmap.org wss://*.firebaseio.com",
                ...(isDev ? ['https://apis.google.com', 'https://www.google-analytics.com', 'https://api.openweathermap.org', 'https://unpkg.com'] : []),
              ].join(' ');

              const directives = [
                "default-src 'self' http://localhost:* ws://localhost:*",
                `script-src ${scriptSrc}`,
                styleSrc,
                "img-src 'self' http://localhost:* https://lh3.googleusercontent.com https://images.unsplash.com https://plus.unsplash.com https://unsplash.com https://firebasestorage.googleapis.com https://*.openstreetmap.org https://*.tile.openstreetmap.org data: blob:",
                connectSrc,
                "frame-src 'self' http://localhost:* https://js.stripe.com https://checkout.stripe.com https://hooks.stripe.com https://m.stripe.network https://*.paypal.com",
                "font-src 'self' http://localhost:* https://fonts.gstatic.com https://fonts.googleapis.com",
                "object-src 'none'",
                "base-uri 'self'",
                "form-action 'self'",
                "frame-ancestors 'self'",
              ];
              return directives.join('; ');
            })(),
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/:lang(es|en)/cources/:slug*',
        destination: '/:lang/courses/:slug*',
        permanent: true,
      },
    ];
  },
};

// Sentry configuration options
const sentryWebpackPluginOptions = {
  // Additional config options for the Sentry Webpack plugin.
  // Keep in mind that the following options are set automatically,
  // and overriding them is not recommended:
  //   release, url, org, project, authToken, configFile, stripPrefix,
  //   urlPrefix, include, ignore
  
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  
  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,
  
  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/
  
  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,
  
  // Transpiles SDK to be compatible with IE11 (increases bundle size)
  transpileClientSDK: false,
  
  // Routes browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  // Only enable tunnel in production and when Sentry is enabled
  tunnelRoute: process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_DISABLE_SENTRY !== 'true' ? '/monitoring' : undefined,
  
  // Hides source maps from generated client bundles
  hideSourceMaps: true,
  
  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,
  
  // Enables automatic instrumentation of Vercel Cron Monitors.
  // See the following for more information:
  // https://docs.sentry.io/product/crons/
  // https://vercel.com/docs/cron-jobs
  automaticVercelMonitors: true,
};

export default withSentryConfig(nextConfig, sentryWebpackPluginOptions);
