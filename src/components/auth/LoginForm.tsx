
"use client";

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormField, FormItem, FormLabel, FormMessage, FormControl } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { translateFirebaseError } from '@/lib/error-handling';
import { FirebaseError } from 'firebase/app';
import { useRouter, usePathname } from 'next/navigation';

const formSchema = z.object({
  email: z.string().email({ message: 'Email inválido' }),
  password: z.string().min(6, { message: 'Mínimo 6 caracteres' }),
  remember: z.boolean().optional().default(false),
});

type FormValues = z.infer<typeof formSchema>;

export default function LoginForm() {
  const { login, resetPassword } = useAuth();
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const lang = pathname?.split('/')[1] || 'es';
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: '', password: '', remember: false },
  });

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    try {
      await login(values.email.trim().toLowerCase(), values.password, !!values.remember);
      toast({
        title: '¡Bienvenido de nuevo!',
        description: 'Inicio de sesión correcto.',
      });
      router.push(`/${lang}`);
      router.refresh();
    } catch (error) {
      const friendly = translateFirebaseError(error as FirebaseError);
      toast({
        title: 'Error al iniciar sesión',
        description: friendly,
        variant: 'destructive',
      });
      // Marcar errores en el formulario cuando la credencial es inválida
      const code = (error as any)?.code as string | undefined;
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
        form.setError('password', { message: 'Correo o contraseña incorrecta' });
      }
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    const emailValue = form.getValues('email');
    if (!emailValue) {
      form.setError('email', { message: 'Ingresa tu email para recuperar contraseña' });
      return;
    }
    try {
      await resetPassword(emailValue.trim().toLowerCase());
      toast({
        title: 'Recuperación enviada',
        description: 'Si el email existe, te enviamos instrucciones.',
      });
    } catch (e) {
      const friendly = translateFirebaseError(e as FirebaseError);
      toast({
        title: 'Error al recuperar contraseña',
        description: friendly,
        variant: 'destructive',
      });
      console.error('Reset password error', e);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="tucorreo@ejemplo.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contraseña</FormLabel>
              <FormControl>
                <Input type="password" placeholder="••••••••" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="remember"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between">
              <FormLabel>No cerrar sesión (28 días)</FormLabel>
              <FormControl>
                <Switch checked={!!field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={loading}>
            {loading ? 'Ingresando…' : 'Ingresar'}
          </Button>
          <Button type="button" variant="link" onClick={handlePasswordReset}>
            ¿Olvidaste tu contraseña?
          </Button>
        </div>
      </form>
    </Form>
  );
}
