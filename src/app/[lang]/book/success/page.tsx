
"use client";

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Mail, Printer, Share2, Info, User, Calendar, Clock, Users, DollarSign, Flag, Send, FileText, FileDown } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import Link from 'next/link';
import { getCourseById, getBookingById } from '@/lib/data';
import type { GolfCourse, Booking } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import type { Locale } from '@/i18n-config';
import { useAuth } from '@/context/AuthContext';
import { Separator } from '@/components/ui/separator';
import { formatBookingDate } from '@/lib/date-utils';
import { PriceBreakdown } from '@/components/PriceBreakdown';
import { usePriceBreakdown } from '@/components/PriceBreakdown';

const TAX_RATE = 0.16;

function SuccessPageContent() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { user, loading: authLoading } = useAuth();
    
    const [course, setCourse] = useState<GolfCourse | null>(null);
    const [booking, setBooking] = useState<Booking | null>(null);
    const [loading, setLoading] = useState(true);
    const [totalPrice, setTotalPrice] = useState<string | null>(null);
    const [formattedDate, setFormattedDate] = useState<string | null>(null);
    const [isClient, setIsClient] = useState(false);
    const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
    const [recipientEmail, setRecipientEmail] = useState('');
    const [isSending, setIsSending] = useState(false);

    // Get URL parameters first
    const bookingId = searchParams?.get('bookingId');
    const courseId = searchParams?.get('courseId');
    const date = searchParams?.get('date');
    const time = searchParams?.get('time');
    const players = searchParams?.get('players');
    const holes = searchParams?.get('holes');
    const price = searchParams?.get('price'); // This is now subtotal

    // Use pricing_snapshot from booking if available, otherwise calculate from legacy data
    const priceBreakdown = React.useMemo(() => {
        // If booking has pricing_snapshot, use it directly (preferred)
        if (booking?.pricing_snapshot) {
            return {
                subtotal_cents: booking.pricing_snapshot.subtotal_cents,
                tax_cents: booking.pricing_snapshot.tax_cents,
                discount_cents: booking.pricing_snapshot.discount_cents,
                total_cents: booking.pricing_snapshot.total_cents,
                currency: booking.pricing_snapshot.currency,
                tax_rate: booking.pricing_snapshot.tax_rate,
                discount_code: booking.pricing_snapshot.promoCode
            };
        }
        
        // Fallback: calculate from legacy data (for backwards compatibility)
        const tax_rate = 0.16;
        const discount_cents = booking?.couponCode ? Math.round((booking.totalPrice || 0) * 0.1 * 100) : 0; // Assume 10% discount if coupon exists
        const currency = "USD"; // Changed to USD for international market
        
        let subtotal_cents, tax_cents, total_cents;
        
        if (booking?.totalPrice) {
            // If we have booking data, calculate from total price
            total_cents = Math.round(booking.totalPrice * 100);
            // Calculate subtotal by working backwards from total
            subtotal_cents = Math.round((total_cents + discount_cents) / (1 + tax_rate));
            tax_cents = Math.round(subtotal_cents * tax_rate);
        } else if (price) {
            // If we have URL parameters, price is the subtotal
            subtotal_cents = Math.round(parseFloat(price) * 100);
            tax_cents = Math.round(subtotal_cents * tax_rate);
            total_cents = subtotal_cents + tax_cents - discount_cents;
        } else {
            // Fallback
            subtotal_cents = 0;
            tax_cents = 0;
            total_cents = 0;
        }
        
        return {
            subtotal_cents,
            tax_cents,
            discount_cents,
            total_cents,
            currency,
            tax_rate,
            discount_code: booking?.couponCode
        };
    }, [booking?.totalPrice, booking?.pricing_snapshot, price, booking?.couponCode]);

    const lang = (pathname?.split('/')[1] || 'en') as Locale;

    useEffect(() => {
        setIsClient(true);
    }, []);

    useEffect(() => {
        if (date && isClient) {
            try {
                setFormattedDate(formatBookingDate(date, "PPP", lang));
            } catch (e) {
                console.error("Invalid date format:", date);
                setFormattedDate("Invalid Date");
            }
        }
    }, [date, lang, isClient]);

    useEffect(() => {
        const loadBookingData = async () => {
            if (bookingId) {
                // Load booking by ID
                try {
                    const bookingData = await getBookingById(bookingId);
                    if (bookingData) {
                        setBooking(bookingData);
                        setTotalPrice(bookingData.totalPrice.toString());
                        
                        // Load course data
                        const courseData = await getCourseById(bookingData.courseId);
                        setCourse(courseData || null);
                    }
                } catch (error) {
                    console.error('Error loading booking:', error);
                    router.push(`/${lang}/courses`);
                }
            } else if (courseId) {
                // Fallback to URL parameters
                if (price) {
                    const subtotalNum = parseFloat(price);
                    const total = subtotalNum * (1 + TAX_RATE);
                    setTotalPrice(total.toFixed(2));
                }

                try {
                    const courseData = await getCourseById(courseId);
                    setCourse(courseData || null);
                } catch (error) {
                    console.error('Error loading course:', error);
                }
            } else {
                router.push(`/${lang}/courses`);
                return;
            }
            
            setLoading(false);
        };

        loadBookingData();
    }, [bookingId, courseId, router, lang, price]);
    
    const handlePrint = () => window.print();

    const handleDownloadPdf = async () => {
        try {
            const courseName = booking?.courseName || course?.name;
            const bookingDate = booking?.date ? formatBookingDate(booking.date, "PPP", lang) : formattedDate;
            const bookingTime = booking?.time || time;
            const bookingPlayers = booking?.players || players;
            const bookingHoles = booking?.holes || holes || '18';
            const total = booking?.pricing_snapshot ? (booking.pricing_snapshot.total_cents / 100).toFixed(2) : (totalPrice ? parseFloat(totalPrice).toFixed(2) : '0.00');

            const payload = {
                bookingDetails: {
                    bookingId: booking?.id,
                    confirmationNumber: booking?.confirmationNumber,
                    courseName: courseName || 'Golf Course',
                    courseLocation: course?.location,
                    date: bookingDate || '',
                    time: bookingTime || '',
                    players: bookingPlayers || 1,
                    holes: bookingHoles,
                    totalPrice: total,
                    customerName: booking?.userName || user?.displayName || undefined,
                    customerEmail: booking?.userEmail || user?.email || undefined,
                },
                saveToStorage: true,
            };

            const res = await fetch('/api/booking/receipt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!res.ok) throw new Error('Error generando PDF');
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `TRG-${booking?.confirmationNumber || booking?.id || 'receipt'}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (e) {
            console.error('Download PDF failed:', e);
            toast({ title: 'Error', description: 'No se pudo descargar el PDF', variant: 'destructive' });
        }
    };

    const getShareMessage = () => {
        const confirmationText = booking?.confirmationNumber ? `\nConfirmation #: ${booking.confirmationNumber}` : '';
        const courseName = booking?.courseName || course?.name;
        const bookingDate = booking?.date ? formatBookingDate(booking.date, "PPP", lang) : formattedDate;
        const bookingTime = booking?.time || time;
        const bookingPlayers = booking?.players || players;
        const bookingHoles = booking?.holes || holes || '18';
        
        const message = `Booking Confirmation:${confirmationText}\n\nCourse: ${courseName}\nDate: ${bookingDate}\nTime: ${bookingTime}\nPlayers: ${bookingPlayers}\nHoles: ${bookingHoles}\nTotal: $${totalPrice ? parseFloat(totalPrice).toFixed(2) : '0.00'}\n\nBooked via TeeReserve!`;
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
        if (navigator.share) {
            navigator.share({
                title: 'Golf Booking Confirmation',
                text: message,
                url: window.location.href,
            }).catch(console.error);
        } else {
            window.open(whatsappUrl, '_blank');
        }
    };

    const getEmailMessage = () => {
        const courseName = booking?.courseName || course?.name;
        const confirmationText = booking?.confirmationNumber ? `\nConfirmation Number: ${booking.confirmationNumber}` : '';
        const bookingDate = booking?.date ? formatBookingDate(booking.date, "PPP", lang) : formattedDate;
        const bookingTime = booking?.time || time;
        const bookingPlayers = booking?.players || players;
        const bookingHoles = booking?.holes || holes || '18';
        
        const subject = `Your Booking Confirmation for ${courseName}`;
        const body = `Hello,\n\nHere are the details of your confirmed booking:${confirmationText}\n\nCourse: ${courseName}\nLocation: ${course?.location}\nDate: ${bookingDate}\nTime: ${bookingTime}\nPlayers: ${bookingPlayers}\nHoles: ${bookingHoles}\nTotal Price: $${totalPrice ? parseFloat(totalPrice).toFixed(2) : '0.00'}\n\nWe look forward to seeing you on the course!\n\nThe TeeReserve Team`;
        return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    }

    const handleSendToEmail = async () => {
        if (!recipientEmail) {
            toast({
                title: "Error",
                description: "Por favor ingresa un correo electrónico válido",
                variant: "destructive"
            });
            return;
        }

        setIsSending(true);
        try {
            const response = await fetch('/api/send-booking-receipt', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    recipientEmail,
                    bookingDetails: {
                        confirmationNumber: booking?.confirmationNumber,
                        courseName: booking?.courseName || course?.name,
                        courseLocation: course?.location,
                        date: booking?.date ? formatBookingDate(booking.date, "PPP", lang) : formattedDate,
                        time: booking?.time || time,
                        players: booking?.players || players,
                        holes: booking?.holes || holes || '18',
                        totalPrice: booking?.pricing_snapshot ? 
                            (booking.pricing_snapshot.total_cents / 100).toFixed(2) : 
                            totalPrice,
                        pricing_snapshot: booking?.pricing_snapshot,
                        userName: booking?.userName || user?.displayName || 'Cliente'
                    }
                })
            });

            if (response.ok) {
                toast({
                    title: "¡Enviado!",
                    description: `Comprobante enviado exitosamente a ${recipientEmail}`,
                });
                setIsEmailDialogOpen(false);
                setRecipientEmail('');
            } else {
                throw new Error('Error al enviar el correo');
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "No se pudo enviar el comprobante. Inténtalo de nuevo.",
                variant: "destructive"
            });
        } finally {
            setIsSending(false);
        }
    };

    if (loading || authLoading) {
         return (
            <div className="container mx-auto max-w-4xl px-4 py-12 space-y-8">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
        )
    }

    return (
        <div className="bg-muted/40">
            <div className="container mx-auto max-w-4xl px-4 py-12">
                <div className="flex flex-col items-center text-center mb-8">
                    <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
                    <h1 className="text-3xl font-bold font-headline text-primary">Booking Confirmed!</h1>
                    <p className="text-muted-foreground max-w-2xl">Your tee time is set. You can find all the details below. A confirmation has also been sent to your email.</p>
                </div>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Client Information</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <p className="text-sm text-muted-foreground">Name</p>
                                <p className="font-semibold">{booking?.userName || user?.displayName || 'N/A'}</p>
                            </div>
                             <div>
                                <p className="text-sm text-muted-foreground">Email</p>
                                <p className="font-semibold">{booking?.userEmail || user?.email}</p>
                            </div>
                             <div>
                                <p className="text-sm text-muted-foreground">Phone</p>
                                <p className="font-semibold">{booking?.userPhone || user?.phoneNumber || 'Not provided'}</p>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                        <Button variant="outline" asChild><a href={getEmailMessage()}><Mail className="mr-2 h-4 w-4"/> Send by Email</a></Button>
                        <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline"><Send className="mr-2 h-4 w-4"/> Send to Another Email</Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px]">
                                <DialogHeader>
                                    <DialogTitle>Enviar comprobante a otro correo</DialogTitle>
                                    <DialogDescription>
                                        Ingresa el correo electrónico donde quieres enviar el comprobante de reserva.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="email" className="text-right">
                                            Correo
                                        </Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="ejemplo@correo.com"
                                            value={recipientEmail}
                                            onChange={(e) => setRecipientEmail(e.target.value)}
                                            className="col-span-3"
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button 
                                        type="button" 
                                        variant="outline" 
                                        onClick={() => setIsEmailDialogOpen(false)}
                                    >
                                        Cancelar
                                    </Button>
                                    <Button 
                                        type="button" 
                                        onClick={handleSendToEmail}
                                        disabled={isSending}
                                    >
                                        {isSending ? 'Enviando...' : 'Enviar'}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                        <Button variant="outline" onClick={handleDownloadPdf}><FileDown className="mr-2 h-4 w-4"/> {lang === 'es' ? 'Descargar PDF' : 'Download PDF'}</Button>
                        <Button variant="outline" onClick={getShareMessage}><Share2 className="mr-2 h-4 w-4"/> Share</Button>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Booking Details</CardTitle>
                            {booking?.confirmationNumber && (
                                <div className="flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-primary" />
                                    <span className="text-sm text-muted-foreground">Confirmation #:</span>
                                    <span className="font-mono font-semibold text-primary">{booking.confirmationNumber}</span>
                                </div>
                            )}
                        </CardHeader>
                        <CardContent>
                             <h3 className="font-semibold text-lg">{booking?.courseName || course?.name}</h3>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm mt-2">
                                <div className="flex items-center text-muted-foreground">
                                     <Calendar className="h-4 w-4 mr-2" /> Date: 
                                     <span className="font-medium text-foreground ml-1">
                                       {isClient && (booking?.date || formattedDate) ? 
                                         (booking?.date ? formatBookingDate(booking.date, "PPP", lang) : formattedDate) : 
                                         <Skeleton className="h-4 w-24 inline-block" />
                                       }
                                     </span>
                                 </div>
                                <div className="flex items-center text-muted-foreground"><Clock className="h-4 w-4 mr-2" /> Time: <span className="font-medium text-foreground ml-1">{booking?.time || time}</span></div>
                                <div className="flex items-center text-muted-foreground"><Users className="h-4 w-4 mr-2" /> Players: <span className="font-medium text-foreground ml-1">{booking?.players || players}</span></div>
                                <div className="flex items-center text-muted-foreground"><Flag className="h-4 w-4 mr-2" /> Holes: <span className="font-medium text-foreground ml-1">{booking?.holes || holes || '18'}</span></div>
                            </div>
                            
                            {/* Price Breakdown Section */}
                            <div className="mt-6 pt-4 border-t border-border bg-muted/50 p-4 rounded-lg">
                                <h4 className="font-semibold text-lg mb-4 text-foreground flex items-center">
                                    💳 Desglose de Pago
                                </h4>
                                <div className="bg-card p-4 rounded-lg border border-border">
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-muted-foreground">Subtotal:</span>
                                            <span className="font-medium text-foreground">${(priceBreakdown.subtotal_cents / 100).toFixed(2)} {priceBreakdown.currency}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-muted-foreground">Impuestos (16%):</span>
                                            <span className="font-medium text-foreground">${(priceBreakdown.tax_cents / 100).toFixed(2)} {priceBreakdown.currency}</span>
                                        </div>
                                        {priceBreakdown.discount_cents > 0 && (
                                            <div className="flex justify-between items-center">
                                                <span className="text-muted-foreground">Descuento:</span>
                                                <span className="font-medium text-green-600 dark:text-green-400">-${(priceBreakdown.discount_cents / 100).toFixed(2)} {priceBreakdown.currency}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between items-center pt-3 border-t-2 border-border">
                                            <span className="text-lg font-bold text-foreground">Total:</span>
                                            <span className="text-lg font-bold text-foreground">${(priceBreakdown.total_cents / 100).toFixed(2)} {priceBreakdown.currency}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                     <Card>
                        <CardHeader>
                            <CardTitle>Confirmations Sent</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                           <div className="flex items-center text-green-600">
                                <CheckCircle className="h-5 w-5 mr-3" />
                                <p>Confirmation sent by email to <span className="font-semibold">{user?.email}</span></p>
                           </div>
                           <div className="flex items-center text-green-600">
                                <CheckCircle className="h-5 w-5 mr-3" />
                                <p>PDF receipt generated and sent</p>
                           </div>
                           <div className="flex items-center text-green-600">
                                <CheckCircle className="h-5 w-5 mr-3" />
                                <p>Confirmation sent by WhatsApp to your number</p>
                           </div>
                        </CardContent>
                    </Card>

                    <Card>
                         <CardHeader>
                            <CardTitle className="flex items-center"><Info className="h-5 w-5 mr-2 text-primary"/> Important Information</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
                                <li>Arrive at the course 30 minutes before your tee time.</li>
                                <li>Present this receipt or your ID at the reception.</li>
                                <li>For changes or cancellations, contact the course directly.</li>
                                <li>Review the course policies on dress code and equipment.</li>
                                <li>In case of bad weather, the course will contact you to reschedule.</li>
                            </ul>
                        </CardContent>
                    </Card>
                    
                    <div className="flex flex-col sm:flex-row justify-center items-center gap-4 text-center pt-4">
                         <Button asChild>
                            <Link href={`/${lang}/booking-lookup`}>
                            <User className="mr-2 h-4 w-4" /> View All My Bookings
                            </Link>
                        </Button>
                         <Button variant="ghost" asChild>
                            <Link href={`/${lang}/courses`}>
                            Explore More Courses
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function SuccessPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh]"><Skeleton className="h-96 w-full max-w-3xl" /></div>}>
            <SuccessPageContent />
        </Suspense>
    );
}
