// NUEVO: Componente para tracking automático de visitas
"use client";

import { useVisitTracking } from '@/hooks/useVisitTracking';
import { useEffect } from 'react';

interface VisitTrackerProps {
  enabled?: boolean;
  debounceMs?: number;
}

export function VisitTracker({ enabled = true, debounceMs = 1000 }: VisitTrackerProps) {
  // Usar el hook de tracking
  useVisitTracking({
    enabled,
    trackPageViews: true,
    debounceMs,
  });

  // Registrar IP de visita anónima una vez por sesión
  useEffect(() => {
    if (!enabled) return;
    try {
      if (typeof window !== 'undefined' && !sessionStorage.getItem('ip_visit_logged')) {
        fetch('/api/log-user-ip', {
          method: 'POST',
          keepalive: true,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'visit',
          }),
        }).catch(() => {});
        sessionStorage.setItem('ip_visit_logged', '1');
      }
    } catch (error) {
      console.debug('IP visit logging skipped:', error);
    }
  }, [enabled]);

  // Tracking de eventos especiales del navegador
  useEffect(() => {
    if (!enabled) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Usuario regresó a la pestaña - podríamos trackear esto como una "re-visita"
        console.debug('Page became visible');
      }
    };

    const handleBeforeUnload = () => {
      // Usuario está saliendo de la página
      console.debug('Page unloading');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [enabled]);

  // Este componente no renderiza nada visible
  return null;
}