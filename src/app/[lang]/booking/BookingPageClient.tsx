'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Locale } from '@/i18n-config';
import { GolfCourse } from '@/types/index';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';
import { PriceBreakdown } from '@/components/PriceBreakdown';
import { usePriceBreakdown } from '@/components/PriceBreakdown';

interface BookingPageClientProps {
  dictionary: any;
  lang: Locale;
  courseId?: string;
}

interface BookingForm {
  courseId: string;
  date: Date | undefined;
  time: string;
  participants: number;
  specialRequests: string;
}

export function BookingPageClient({ dictionary, lang, courseId }: BookingPageClientProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [course, setCourse] = useState<GolfCourse | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingCourse, setLoadingCourse] = useState(!!courseId);
  const [form, setForm] = useState<BookingForm>({
    courseId: courseId || '',
    date: undefined,
    time: '',
    participants: 1,
    specialRequests: ''
  });

  // Allow anonymous users (guests) to access booking page
  // Only redirect to login if explicitly needed for authenticated features
  useEffect(() => {
    // Don't redirect anonymous users - they can book as guests
    // This allows the guest booking flow to work properly
  }, [user, router, lang, courseId]);

  // Load course data if courseId is provided
  useEffect(() => {
    if (courseId) {
      loadCourse(courseId);
    }
  }, [courseId]);

  const loadCourse = async (id: string) => {
    try {
      setLoadingCourse(true);
      if (!db) {
        throw new Error('Firebase not initialized');
      }
      const courseDoc = await getDoc(doc(db, 'courses', id));
      if (courseDoc.exists()) {
        setCourse({ id: courseDoc.id, ...courseDoc.data() } as GolfCourse);
      } else {
        toast.error(dictionary.booking?.courseNotFound || 'Course not found');
      }
    } catch (error) {
      console.error('Error loading course:', error);
      toast.error(dictionary.booking?.errorLoadingCourse || 'Error loading course');
    } finally {
      setLoadingCourse(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!form.courseId || !form.date || !form.time) {
      toast.error(dictionary.booking?.fillAllFields || 'Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      // Here you would implement the booking creation logic
      // For now, redirect to confirmation
      const bookingData = {
        ...form,
        userId: user.uid,
        userEmail: user.email,
        userName: user.displayName || user.email,
        createdAt: new Date().toISOString()
      };

      // Store booking data in sessionStorage for the confirmation page
      sessionStorage.setItem('pendingBooking', JSON.stringify(bookingData));
      
      router.push(`/${lang}/booking/confirm`);
    } catch (error) {
      console.error('Error creating booking:', error);
      toast.error(dictionary.booking?.errorCreatingBooking || 'Error creating booking');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return null; // Will redirect
  }

  const dateLocale = lang === 'es' ? es : enUS;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">
          {dictionary.booking?.title || 'Make a Reservation'}
        </h1>

        {loadingCourse ? (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">{dictionary.booking?.loadingCourse || 'Loading course...'}</span>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Course Info */}
            {course && (
              <div className="lg:col-span-1">
                <Card>
                  <CardHeader>
                    <CardTitle>{course.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-muted-foreground">{dictionary.booking?.location || 'Location'}</p>
                        <p className="font-medium">{course.location}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{dictionary.booking?.price || 'Price'}</p>
                        <PriceBreakdown 
                          pricing={{
                            currency: 'USD',
                            tax_rate: 16,
                            subtotal_cents: Math.round((course.basePrice || 0) * 100),
                            tax_cents: Math.round((course.basePrice || 0) * 100 * 0.16),
                            discount_cents: 0,
                            total_cents: Math.round((course.basePrice || 0) * 100 * 1.16)
                          }}
                          locale="es-MX"
                          labels={{
                            subtotal: "Subtotal",
                            tax: "Impuestos (16%)",
                            discount: "Descuento",
                            total: "Total"
                          }}
                        />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{dictionary.booking?.description || 'Description'}</p>
                        <p className="text-sm">{course.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Booking Form */}
            <div className={cn("lg:col-span-2", !course && "lg:col-span-3")}>
              <Card>
                <CardHeader>
                  <CardTitle>{dictionary.booking?.bookingDetails || 'Booking Details'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {!courseId && (
                      <div>
                        <Label htmlFor="courseId">{dictionary.booking?.selectCourse || 'Select Course'} *</Label>
                        <Input
                          id="courseId"
                          value={form.courseId}
                          onChange={(e) => setForm(prev => ({ ...prev, courseId: e.target.value }))}
                          placeholder={dictionary.booking?.courseIdPlaceholder || 'Enter course ID'}
                          required
                        />
                      </div>
                    )}

                    <div>
                      <Label>{dictionary.booking?.selectDate || 'Select Date'} *</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !form.date && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {form.date ? (
                              format(form.date, "PPP", { locale: dateLocale })
                            ) : (
                              <span>{dictionary.booking?.pickDate || 'Pick a date'}</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={form.date}
                            onSelect={(date) => setForm(prev => ({ ...prev, date }))}
                            disabled={(date) => date < new Date()}
                            initialFocus
                            locale={dateLocale}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div>
                      <Label htmlFor="time">{dictionary.booking?.selectTime || 'Select Time'} *</Label>
                      <Select value={form.time} onValueChange={(value) => setForm(prev => ({ ...prev, time: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder={dictionary.booking?.selectTimePlaceholder || 'Select a time'} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="09:00">09:00</SelectItem>
                          <SelectItem value="10:00">10:00</SelectItem>
                          <SelectItem value="11:00">11:00</SelectItem>
                          <SelectItem value="14:00">14:00</SelectItem>
                          <SelectItem value="15:00">15:00</SelectItem>
                          <SelectItem value="16:00">16:00</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="participants">{dictionary.booking?.participants || 'Number of Participants'}</Label>
                      <Select 
                        value={form.participants.toString()} 
                        onValueChange={(value) => setForm(prev => ({ ...prev, participants: parseInt(value) }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                            <SelectItem key={num} value={num.toString()}>{num}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="specialRequests">{dictionary.booking?.specialRequests || 'Special Requests'}</Label>
                      <Textarea
                        id="specialRequests"
                        value={form.specialRequests}
                        onChange={(e) => setForm(prev => ({ ...prev, specialRequests: e.target.value }))}
                        placeholder={dictionary.booking?.specialRequestsPlaceholder || 'Any special requirements or requests...'}
                        rows={3}
                      />
                    </div>

                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {dictionary.booking?.processing || 'Processing...'}
                        </>
                      ) : (
                        dictionary.booking?.confirmBooking || 'Confirm Booking'
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}