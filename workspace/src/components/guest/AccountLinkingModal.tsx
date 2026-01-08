'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, Loader2, Mail, Lock, User } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useGuestAuth } from '@/hooks/useGuestAuth';
import { useToast } from '@/hooks/use-toast';
import { getFriendlyErrorMessage } from '@/lib/auth-utils';

interface AccountLinkingModalProps {
  isOpen: boolean;
  onClose: () => void;
  guestEmail: string;
  guestName: string;
  bookingId: string;
  lang: string;
}

export function AccountLinkingModal({
  isOpen,
  onClose,
  guestEmail,
  guestName,
  bookingId,
  lang
}: AccountLinkingModalProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const { user } = useAuth();
  const { upgradeGuestAccount } = useGuestAuth();
  const { toast } = useToast();
  const router = useRouter();

  const handleCreateAccount = async () => {
    if (!user || !user.isAnonymous) {
      setError('Solo usuarios anónimos pueden crear una cuenta');
      return;
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await upgradeGuestAccount(
        guestEmail,
        password,
        guestName,
        [bookingId]
      );

      if (result.userId) {
        setSuccess(true);
        toast({
          title: '¡Cuenta creada exitosamente!',
          description: `Tu reserva ha sido vinculada a tu nueva cuenta. ${result.migratedBookings} reserva(s) migrada(s).`,
        });
        
        // Redirect to profile after a short delay
        setTimeout(() => {
          router.push(`/${lang}/profile`);
          onClose();
        }, 2000);
      } else {
        throw new Error('Error al crear la cuenta');
      }
    } catch (error: any) {
      console.error('Error upgrading guest account:', error);
      const friendlyMessage = getFriendlyErrorMessage(error.code || error.message);
      setError(friendlyMessage);
      
      toast({
        title: 'Error al crear cuenta',
        description: friendlyMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    // Redirect to home page
    router.push(`/${lang}`);
    onClose();
  };

  if (success) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              ¡Cuenta Creada!
            </DialogTitle>
            <DialogDescription>
              Tu cuenta ha sido creada exitosamente. Serás redirigido a tu perfil en unos segundos.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Crear Cuenta</DialogTitle>
          <DialogDescription>
            ¡Tu reserva está confirmada! ¿Te gustaría crear una cuenta para gestionar tus futuras reservas?
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                value={guestEmail}
                disabled
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Nombre Completo</Label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="name"
                type="text"
                value={guestName}
                disabled
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repite tu contraseña"
                className="pl-10"
              />
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={handleSkip}
              className="flex-1"
              disabled={isLoading}
            >
              Omitir
            </Button>
            <Button
              onClick={handleCreateAccount}
              className="flex-1"
              disabled={isLoading || !password || !confirmPassword}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creando...
                </>
              ) : (
                'Crear Cuenta'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}