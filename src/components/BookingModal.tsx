"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserPlus, LogIn, User } from 'lucide-react';
import { useGuestAuth } from '@/hooks/useGuestAuth';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import type { GolfCourse } from '@/types';
import type { Locale } from '@/i18n-config';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: GolfCourse;
  lang: Locale;
}

type BookingMode = 'select' | 'guest' | 'login';

interface GuestFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  date: string;
  teeTime: string;
  players: number;
}

export function BookingModal({ isOpen, onClose, course, lang }: BookingModalProps) {
  const [mode, setMode] = useState<BookingMode>('select');
  const [guestForm, setGuestForm] = useState<GuestFormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    date: '',
    teeTime: '',
    players: 1,
  });
  
  const { signInAsGuest, createGuestBookingIntent, isLoading, error } = useGuestAuth();
  const { user } = useAuth();
  const router = useRouter();

  // If user is authenticated and not anonymous, redirect to booking page
  useEffect(() => {
    if (user && !user.isAnonymous && isOpen) {
      onClose();
      router.push(`/${lang}/booking?courseId=${course.id}`);
    }
  }, [user, isOpen, router, lang, course.id, onClose]);

  const handleGuestBooking = async () => {
    if (!guestForm.firstName || !guestForm.lastName || !guestForm.email || !guestForm.phone) {
      return;
    }

    if (!guestForm.date || !guestForm.teeTime) {
      return;
    }

    try {
      // Sign in anonymously first
      await signInAsGuest();
      
      // Create booking intent
      const { clientSecret, draftId } = await createGuestBookingIntent({
        courseId: course.id,
        date: guestForm.date,
        teeTime: guestForm.teeTime,
        players: guestForm.players,
        guest: {
          firstName: guestForm.firstName,
          lastName: guestForm.lastName,
          email: guestForm.email,
          phone: guestForm.phone,
        },
      });
      
      // Redirect to booking confirmation with client secret and draft ID
      router.push(`/${lang}/book/confirm?client_secret=${clientSecret}&draft_id=${draftId}`);
      onClose();
    } catch (err) {
      console.error('Error creating guest booking:', err);
    }
  };

  const handleLogin = () => {
    router.push(`/${lang}/login?redirect=${encodeURIComponent(`/${lang}/courses/${course.id}`)}`);
    onClose();
  };

  const renderModeSelect = () => (
    <div className="space-y-4">
      <Card 
        className="cursor-pointer transition-colors hover:bg-accent/50 border-2 hover:border-primary"
        onClick={() => setMode('guest')}
      >
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-3">
            <User className="h-6 w-6 text-primary" />
            Reservar como Invitado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Reserva rápidamente sin crear una cuenta. Podrás crear una cuenta después para gestionar tus reservas.
          </p>
        </CardContent>
      </Card>

      <Card 
        className="cursor-pointer transition-colors hover:bg-accent/50 border-2 hover:border-primary"
        onClick={handleLogin}
      >
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-3">
            <LogIn className="h-6 w-6 text-primary" />
            Iniciar Sesión
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Accede a tu cuenta para gestionar tus reservas y métodos de pago guardados.
          </p>
        </CardContent>
      </Card>
    </div>
  );

  const renderGuestForm = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="firstName">Nombre</Label>
          <Input
            id="firstName"
            value={guestForm.firstName}
            onChange={(e) => setGuestForm(prev => ({ ...prev, firstName: e.target.value }))}
            required
          />
        </div>
        <div>
          <Label htmlFor="lastName">Apellido</Label>
          <Input
            id="lastName"
            value={guestForm.lastName}
            onChange={(e) => setGuestForm(prev => ({ ...prev, lastName: e.target.value }))}
            required
          />
        </div>
      </div>
      
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={guestForm.email}
          onChange={(e) => setGuestForm(prev => ({ ...prev, email: e.target.value }))}
          required
        />
      </div>
      
      <div>
        <Label htmlFor="phone">Teléfono</Label>
        <Input
          id="phone"
          type="tel"
          value={guestForm.phone}
          onChange={(e) => setGuestForm(prev => ({ ...prev, phone: e.target.value }))}
          required
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="date">Fecha</Label>
          <Input
            id="date"
            type="date"
            value={guestForm.date}
            onChange={(e) => setGuestForm(prev => ({ ...prev, date: e.target.value }))}
            required
          />
        </div>
        <div>
          <Label htmlFor="teeTime">Hora</Label>
          <Input
            id="teeTime"
            type="time"
            value={guestForm.teeTime}
            onChange={(e) => setGuestForm(prev => ({ ...prev, teeTime: e.target.value }))}
            required
          />
        </div>
      </div>
      
      <div>
        <Label htmlFor="players">Número de Jugadores</Label>
        <Input
          id="players"
          type="number"
          min="1"
          max="4"
          value={guestForm.players}
          onChange={(e) => setGuestForm(prev => ({ ...prev, players: parseInt(e.target.value) || 1 }))}
          required
        />
      </div>
      
      {error && (
        <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
          {error}
        </div>
      )}
      
      <div className="flex gap-3 pt-4">
        <Button variant="outline" onClick={() => setMode('select')} className="flex-1">
          Volver
        </Button>
        <Button 
          onClick={handleGuestBooking} 
          disabled={isLoading || !guestForm.firstName || !guestForm.lastName || !guestForm.email || !guestForm.phone || !guestForm.date || !guestForm.teeTime}
          className="flex-1"
        >
          {isLoading ? 'Procesando...' : 'Continuar al Pago'}
        </Button>
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === 'select' && 'Reservar en ' + course.name}
            {mode === 'guest' && 'Información del Invitado'}
          </DialogTitle>
        </DialogHeader>
        
        {mode === 'select' && renderModeSelect()}
        {mode === 'guest' && renderGuestForm()}
      </DialogContent>
    </Dialog>
  );
}