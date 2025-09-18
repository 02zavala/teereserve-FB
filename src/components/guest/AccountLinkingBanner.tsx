"use client";

import { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { X, UserPlus, ChevronRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { canLinkAccount } from '@/hooks/useAccountLinking';
import { AccountLinkingModal } from './AccountLinkingModal';

interface AccountLinkingBannerProps {
  guestEmail?: string;
  guestName?: string;
  bookingId?: string;
  lang: string;
  className?: string;
  variant?: 'default' | 'compact';
}

export function AccountLinkingBanner({
  guestEmail,
  guestName,
  bookingId,
  lang,
  className = '',
  variant = 'default'
}: AccountLinkingBannerProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const { user } = useAuth();

  // Don't show if user can't link account or banner is dismissed
  if (!canLinkAccount(user) || !isVisible) {
    return null;
  }

  const handleDismiss = () => {
    setIsVisible(false);
    // Store dismissal in localStorage to persist across sessions
    localStorage.setItem('account-linking-banner-dismissed', 'true');
  };

  const handleCreateAccount = () => {
    if (guestEmail && guestName) {
      setShowModal(true);
    } else {
      // Redirect to signup page if no guest data available
      window.location.href = `/${lang}/auth/signup`;
    }
  };

  if (variant === 'compact') {
    return (
      <>
        <div className={`bg-blue-50 border border-blue-200 rounded-lg p-3 ${className}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-blue-800 font-medium">
                ¿Crear una cuenta?
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCreateAccount}
                className="text-blue-600 hover:text-blue-700 hover:bg-blue-100 h-8 px-2"
              >
                Crear
                <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDismiss}
                className="text-blue-400 hover:text-blue-600 hover:bg-blue-100 h-8 w-8 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>

        {showModal && guestEmail && guestName && (
          <AccountLinkingModal
            isOpen={showModal}
            onClose={() => setShowModal(false)}
            guestEmail={guestEmail}
            guestName={guestName}
            bookingId={bookingId || ''}
            lang={lang}
          />
        )}
      </>
    );
  }

  return (
    <>
      <Alert className={`border-blue-200 bg-blue-50 ${className}`}>
        <UserPlus className="h-4 w-4 text-blue-600" />
        <div className="flex items-center justify-between w-full">
          <div className="flex-1">
            <AlertDescription className="text-blue-800">
              <strong>¿Quieres gestionar tus reservas?</strong>
              <br />
              Crea una cuenta para acceder a tu historial de reservas y recibir ofertas exclusivas.
            </AlertDescription>
          </div>
          <div className="flex items-center gap-2 ml-4">
            <Button
              size="sm"
              onClick={handleCreateAccount}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Crear Cuenta
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDismiss}
              className="text-blue-400 hover:text-blue-600 hover:bg-blue-100"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Alert>

      {showModal && guestEmail && guestName && (
        <AccountLinkingModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          guestEmail={guestEmail}
          guestName={guestName}
          bookingId={bookingId || ''}
          lang={lang}
        />
      )}
    </>
  );
}

// Hook to check if banner should be shown
export function useAccountLinkingBanner() {
  const { user } = useAuth();
  const [isDismissed, setIsDismissed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('account-linking-banner-dismissed') === 'true';
    }
    return false;
  });

  const shouldShow = canLinkAccount(user) && !isDismissed;

  const dismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('account-linking-banner-dismissed', 'true');
  };

  const reset = () => {
    setIsDismissed(false);
    localStorage.removeItem('account-linking-banner-dismissed');
  };

  return {
    shouldShow,
    dismiss,
    reset
  };
}