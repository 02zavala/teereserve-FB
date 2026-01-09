// NUEVO: Hook personalizado para tracking de visitas
"use client";

import { useEffect, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';

interface VisitTrackingOptions {
  enabled?: boolean;
  trackPageViews?: boolean;
  debounceMs?: number;
}

export function useVisitTracking(options: VisitTrackingOptions = {}) {
  const {
    enabled = true,
    trackPageViews = true,
    debounceMs = 1000
  } = options;

  const pathname = usePathname();
  const lastTrackedPath = useRef<string>('');
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const trackVisit = useCallback(async (page: string, referer?: string) => {
    if (!enabled) return;

    try {
      const response = await fetch('/api/track-visit', {
        method: 'POST',
        keepalive: true,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          page,
          userAgent: navigator.userAgent,
          referer: referer || document.referrer || 'direct',
        }),
      });

      if (!response.ok) {
        console.warn('Failed to track visit:', response.status);
      }
    } catch (error) {
      console.warn('Error tracking visit:', error);
      
    }
  }, [enabled]);

  // Tracking automático de page views
  useEffect(() => {
    if (!trackPageViews || !enabled || !pathname) return;

    // Evitar tracking duplicado de la misma página
    if (lastTrackedPath.current === pathname) return;

    // Debounce para evitar múltiples llamadas rápidas
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      trackVisit(pathname);
      lastTrackedPath.current = pathname;
    }, debounceMs);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [pathname, trackPageViews, enabled, debounceMs, trackVisit]);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  return {
    trackVisit,
    currentPath: pathname,
  };
}