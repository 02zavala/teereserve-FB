"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { Bell, Mail, MessageSquare, Calendar, CreditCard, Star, Loader2 } from "lucide-react";
import { updateUserProfile } from "@/lib/data";
import type { UserProfile } from "@/types";

interface NotificationSettings {
  email: {
    welcome: boolean;
    bookingConfirmation: boolean;
    bookingReminder: boolean;
    paymentConfirmation: boolean;
    reviewInvitation: boolean;
    promotions: boolean;
    newsletter: boolean;
  };
  push: {
    bookingReminder: boolean;
    paymentDue: boolean;
    newPromotions: boolean;
    reviewReminder: boolean;
  };
  sms: {
    bookingReminder: boolean;
    urgentUpdates: boolean;
  };
}

const defaultSettings: NotificationSettings = {
  email: {
    welcome: true,
    bookingConfirmation: true,
    bookingReminder: true,
    paymentConfirmation: true,
    reviewInvitation: true,
    promotions: false,
    newsletter: false,
  },
  push: {
    bookingReminder: true,
    paymentDue: true,
    newPromotions: false,
    reviewReminder: true,
  },
  sms: {
    bookingReminder: false,
    urgentUpdates: true,
  },
};

export function NotificationPreferences() {
  const { user, userProfile, refreshUserProfile } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings);
  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (userProfile?.notificationSettings) {
      setSettings(userProfile.notificationSettings);
    }
  }, [userProfile]);

  const handleSettingChange = (category: keyof NotificationSettings, setting: string, value: boolean) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [setting]: value,
      },
    }));
    setHasChanges(true);
  };

  const saveSettings = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const updatedProfile: Partial<UserProfile> = {
        notificationSettings: settings,
      };

      await updateUserProfile(user.uid, updatedProfile);
      await refreshUserProfile();
      
      toast({
        title: "Preferencias guardadas",
        description: "Tus preferencias de notificaciones han sido actualizadas.",
      });
      
      setHasChanges(false);
    } catch (error) {
      console.error('Error saving notification preferences:', error);
      toast({
        title: "Error",
        description: "No se pudieron guardar las preferencias. Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Preferencias de Notificaciones
        </CardTitle>
        <CardDescription>
          Configura cómo y cuándo quieres recibir notificaciones de TeeReserve.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Email Notifications */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Mail className="h-4 w-4 text-primary" />
            <h3 className="font-semibold">Notificaciones por Email</h3>
          </div>
          <div className="space-y-3 ml-6">
            <div className="flex items-center justify-between">
              <Label htmlFor="email-welcome" className="text-sm">
                Email de bienvenida
              </Label>
              <Switch
                id="email-welcome"
                checked={settings.email.welcome}
                onCheckedChange={(value) => handleSettingChange('email', 'welcome', value)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="email-booking" className="text-sm">
                Confirmaciones de reserva
              </Label>
              <Switch
                id="email-booking"
                checked={settings.email.bookingConfirmation}
                onCheckedChange={(value) => handleSettingChange('email', 'bookingConfirmation', value)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="email-reminder" className="text-sm">
                Recordatorios de reserva
              </Label>
              <Switch
                id="email-reminder"
                checked={settings.email.bookingReminder}
                onCheckedChange={(value) => handleSettingChange('email', 'bookingReminder', value)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="email-payment" className="text-sm">
                Confirmaciones de pago
              </Label>
              <Switch
                id="email-payment"
                checked={settings.email.paymentConfirmation}
                onCheckedChange={(value) => handleSettingChange('email', 'paymentConfirmation', value)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="email-review" className="text-sm">
                Invitaciones a reseñas
              </Label>
              <Switch
                id="email-review"
                checked={settings.email.reviewInvitation}
                onCheckedChange={(value) => handleSettingChange('email', 'reviewInvitation', value)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="email-promotions" className="text-sm">
                Promociones y ofertas
              </Label>
              <Switch
                id="email-promotions"
                checked={settings.email.promotions}
                onCheckedChange={(value) => handleSettingChange('email', 'promotions', value)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="email-newsletter" className="text-sm">
                Newsletter semanal
              </Label>
              <Switch
                id="email-newsletter"
                checked={settings.email.newsletter}
                onCheckedChange={(value) => handleSettingChange('email', 'newsletter', value)}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Push Notifications */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="h-4 w-4 text-primary" />
            <h3 className="font-semibold">Notificaciones Push</h3>
          </div>
          <div className="space-y-3 ml-6">
            <div className="flex items-center justify-between">
              <Label htmlFor="push-reminder" className="text-sm">
                Recordatorios de reserva
              </Label>
              <Switch
                id="push-reminder"
                checked={settings.push.bookingReminder}
                onCheckedChange={(value) => handleSettingChange('push', 'bookingReminder', value)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="push-payment" className="text-sm">
                Pagos pendientes
              </Label>
              <Switch
                id="push-payment"
                checked={settings.push.paymentDue}
                onCheckedChange={(value) => handleSettingChange('push', 'paymentDue', value)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="push-promotions" className="text-sm">
                Nuevas promociones
              </Label>
              <Switch
                id="push-promotions"
                checked={settings.push.newPromotions}
                onCheckedChange={(value) => handleSettingChange('push', 'newPromotions', value)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="push-review" className="text-sm">
                Recordatorios de reseñas
              </Label>
              <Switch
                id="push-review"
                checked={settings.push.reviewReminder}
                onCheckedChange={(value) => handleSettingChange('push', 'reviewReminder', value)}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* SMS Notifications */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="h-4 w-4 text-primary" />
            <h3 className="font-semibold">Notificaciones SMS</h3>
          </div>
          <div className="space-y-3 ml-6">
            <div className="flex items-center justify-between">
              <Label htmlFor="sms-reminder" className="text-sm">
                Recordatorios de reserva
              </Label>
              <Switch
                id="sms-reminder"
                checked={settings.sms.bookingReminder}
                onCheckedChange={(value) => handleSettingChange('sms', 'bookingReminder', value)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="sms-urgent" className="text-sm">
                Actualizaciones urgentes
              </Label>
              <Switch
                id="sms-urgent"
                checked={settings.sms.urgentUpdates}
                onCheckedChange={(value) => handleSettingChange('sms', 'urgentUpdates', value)}
              />
            </div>
          </div>
        </div>

        {hasChanges && (
          <div className="flex justify-end pt-4">
            <Button onClick={saveSettings} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar Preferencias
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}