"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { lookupBookingAction } from '@/app/actions/lookup-booking';
import type { Booking } from '@/types';
import type { Locale } from '@/i18n-config';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Loader2, Search } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useErrorHandler, commonValidators } from '@/hooks/useErrorHandler';
import { ValidationError } from '@/lib/error-handling';
import { BookingResultCard } from './BookingResultCard';

interface BookingLookupClientProps {
  dictionary: any;
  lang: Locale;
}

const formSchema = z.object({
  bookingId: z.string().min(5, 'Booking ID must be at least 5 characters.').max(50, 'Booking ID is too long.'),
  email: z.string().email('Please enter a valid email address.').max(254, 'Email is too long.'),
});

type FormValues = z.infer<typeof formSchema>;

export function BookingLookupClient({ dictionary, lang }: BookingLookupClientProps) {
  const [booking, setBooking] = useState<Booking | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { handleAsyncError } = useErrorHandler();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      bookingId: '',
      email: '',
    },
  });

  const onSubmit = (values: FormValues) => {
    handleAsyncError(async () => {
      try {
        console.log('Starting booking lookup with values:', { ...values, email: '[REDACTED]' });
        
        // Validación adicional de datos
        if (!values.bookingId.trim()) {
          throw new ValidationError('Booking ID is required');
        }
        
        if (!commonValidators.isValidEmail(values.email)) {
          throw new ValidationError('Please enter a valid email address');
        }
        
        // Validar formato de Booking ID (debe ser alfanumérico con guiones)
        if (!/^[A-Za-z0-9-]+$/.test(values.bookingId.trim())) {
          throw new ValidationError('Booking ID can only contain letters, numbers, and hyphens');
        }
        
        setIsLoading(true);
        setError(null);
        setBooking(null);
        
        const result = await lookupBookingAction({
          bookingId: values.bookingId.trim().toUpperCase(),
          email: values.email.trim().toLowerCase()
        });
        
        if (result.success) {
          setBooking(result.data as Booking);
          console.log('Booking lookup successful');
        } else {
          setError(result.error || 'Unknown error occurred');
          console.log('Booking lookup failed:', result.error);
        }
      } finally {
        setIsLoading(false);
      }
    }, {
      defaultMessage: 'Failed to lookup booking'
    });
  };

  return (
    <div>
      {!booking ? (
        <Card>
          <CardHeader>
            <CardTitle>{dictionary.form.title}</CardTitle>
            <CardDescription>{dictionary.form.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="bookingId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{dictionary.form.bookingIdLabel}</FormLabel>
                      <FormControl>
                        <Input placeholder={dictionary.form.bookingIdPlaceholder} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{dictionary.form.lastNameLabel}</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder={dictionary.form.lastNamePlaceholder} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {error && (
                  <Alert variant="destructive">
                    <AlertTitle>{dictionary.error.title}</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="mr-2 h-4 w-4" />
                  )}
                  {isLoading ? dictionary.form.submitting : dictionary.form.submit}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      ) : (
        <BookingResultCard booking={booking} dictionary={dictionary.result} lang={lang} onReset={() => setBooking(null)} />
      )}
    </div>
  );
}
