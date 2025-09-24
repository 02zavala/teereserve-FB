// utils/resource-errors.ts
type ResourceEl = HTMLImageElement | HTMLScriptElement | HTMLLinkElement;

export function installResourceErrorHandlers(logger: { error: (m: string, meta?: any) => void }) {
  if (typeof window === 'undefined') return;
  
  window.addEventListener('error', (ev: Event) => {
    const t = ev?.target as ResourceEl | undefined;
    if (!t || !(t as any).tagName) return;
    
    const tag = (t as any).tagName.toLowerCase();
    const url = 
      (t as HTMLImageElement).currentSrc || 
      (t as HTMLImageElement).src || 
      (t as HTMLLinkElement).href || '(unknown)';

    // Skip logging for Google Analytics and similar external resources
    if (url.includes('googletagmanager.com') || 
        url.includes('google-analytics.com') ||
        url.includes('gtag/js') ||
        url.includes('stats.g.doubleclick.net')) {
      return; // Don't log these as they're often blocked by ad blockers
    }

    // Apply fallback for images
    if (tag === 'img') {
      const img = t as HTMLImageElement;
      // Prevent infinite loop if fallback image itself fails
      if (!img.dataset.fallbackApplied && !img.src.includes('fallback.svg')) {
        img.dataset.fallbackApplied = '1';
        img.src = '/images/fallback.svg';
        img.srcset = '';
      } else if (img.src.includes('fallback.svg')) {
        // If fallback itself fails, remove the image to prevent infinite loops
        img.style.display = 'none';
        img.dataset.fallbackFailed = '1';
      }
    }

    // Use a more direct logging approach to avoid console interceptors
    // Only log if it's a critical resource (not external analytics)
    if (url.includes(window.location.origin) || !url.startsWith('http')) {
      // Use setTimeout to avoid potential interceptor conflicts
      setTimeout(() => {
        console.warn(`[ResourceHandler] Failed to load ${tag}: ${url}`);
      }, 0);
    }
  }, true);
}