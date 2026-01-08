import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'TeeReserve Golf',
    short_name: 'TeeReserve',
    description: 'Reserve your perfect golf tee time with TeeReserve - the premier golf booking platform',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#07553B',
    orientation: 'portrait',
    scope: '/',
    icons: [
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: '/icons/icon-256x256.png',
        sizes: '256x256',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: '/icons/icon-384x384.png',
        sizes: '384x384',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any'
      }
    ],
    categories: ['sports', 'lifestyle', 'travel'],
    lang: 'en-US',
    dir: 'ltr'
  };
}