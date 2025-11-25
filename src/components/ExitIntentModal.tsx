"use client";

import { useEffect, useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Locale } from '@/i18n-config';
import { commonValidators } from '@/hooks/useErrorHandler';
import { useAnalytics } from '@/lib/analytics';
import { useAuth } from '@/context/AuthContext';

interface ExitIntentDictionary {
  title: string;
  subtitle: string;
  placeholderEmail: string;
  cta: string;
  skip: string;
  success: string;
  invalid: string;
}

interface ExitIntentModalProps {
  lang: Locale;
  dictionary: ExitIntentDictionary;
}

export function ExitIntentModal({ lang, dictionary }: ExitIntentModalProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [shownOnce, setShownOnce] = useState(false);
  const { trackEvent } = useAnalytics();
  const { user } = useAuth();

  const shouldShowDebug = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.get('showExitIntent') === '1';
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    // No mostrar a usuarios autenticados
    if (user) {
      setShownOnce(true);
      return;
    }
    // Only show once per session
    const alreadyShown = sessionStorage.getItem('exit_intent_shown') === '1';
    if (alreadyShown) {
      setShownOnce(true);
      return;
    }

    // Respeta cierre persistente (30 días) o éxito previo (180 días)
    try {
      const suppressUntilStr = localStorage.getItem('TR_EXIT_MODAL_SUPPRESS_UNTIL');
      const suppressUntil = suppressUntilStr ? parseInt(suppressUntilStr, 10) : 0;
      if (suppressUntil && Date.now() < suppressUntil) {
        setShownOnce(true);
        return;
      }
    } catch {}

    const handleMouseOut = (e: MouseEvent) => {
      if (shownOnce || open) return;
      // Trigger only when mouse leaves toward top
      const shouldOpen = e.clientY <= 0;
      if (shouldOpen) {
        setOpen(true);
        sessionStorage.setItem('exit_intent_shown', '1');
        setShownOnce(true);
        try { trackEvent?.exitIntentModalOpened?.(); } catch {}
      }
    };

    // Debug trigger
    if (shouldShowDebug && !shownOnce) {
      setOpen(true);
      sessionStorage.setItem('exit_intent_shown', '1');
      setShownOnce(true);
      try { trackEvent?.exitIntentModalOpened?.(); } catch {}
    }

    document.addEventListener('mouseout', handleMouseOut);
    return () => {
      document.removeEventListener('mouseout', handleMouseOut);
    };
  }, [open, shownOnce, shouldShowDebug, trackEvent]);

  const onSubmit = async () => {
    setMessage(null);
    if (!email || !commonValidators.isValidEmail(email)) {
      setMessage(dictionary.invalid);
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        email,
        source: 'exit-intent',
        lang,
        pageUrl: typeof window !== 'undefined' ? window.location.href : '',
        referrer: typeof document !== 'undefined' ? document.referrer : ''
      };
      try { trackEvent?.exitIntentLeadSubmitted?.(true); } catch {}

      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to save lead');
      }

      setMessage(dictionary.success);
      try { trackEvent?.exitIntentLeadSuccess?.(); } catch {}
      // Suprimir modal por 365 días tras éxito
      try {
        const days365 = 365 * 24 * 60 * 60 * 1000;
        localStorage.setItem('TR_EXIT_MODAL_SUPPRESS_UNTIL', String(Date.now() + days365));
      } catch {}
      // Close shortly after success
      setTimeout(() => setOpen(false), 1200);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Something went wrong';
      setMessage(errMsg);
      try { trackEvent?.exitIntentLeadFailed?.(errMsg); } catch {}
      try { trackEvent?.errorOccurred?.('exit-intent', String(error), typeof window !== 'undefined' ? window.location.pathname : 'unknown'); } catch {}
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => setOpen(v)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{dictionary.title}</DialogTitle>
          <DialogDescription>{dictionary.subtitle}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2 py-2">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={dictionary.placeholderEmail}
            disabled={submitting}
          />
          {message && (
            <p className="text-sm text-muted-foreground">{message}</p>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="secondary"
            onClick={() => {
              // Suprimir modal por 90 días al cerrar
              try {
                const days90 = 90 * 24 * 60 * 60 * 1000;
                localStorage.setItem('TR_EXIT_MODAL_SUPPRESS_UNTIL', String(Date.now() + days90));
              } catch {}
              setOpen(false);
              setShownOnce(true);
            }}
            disabled={submitting}
          >
            {dictionary.skip}
          </Button>
          <Button onClick={onSubmit} disabled={submitting}>
            {submitting ? '...' : dictionary.cta}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}