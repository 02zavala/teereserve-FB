
"use client";

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Mail, Printer, Share2, Info, User, Calendar, Clock, Users, DollarSign } from 'lucide-react';
import Link from 'next/link';
import { getCourseById } from '@/lib/data';
import type { GolfCourse } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import type { Locale } from '@/i18n-config';
import { useAuth } from '@/context/AuthContext';
import { Separator } from '@/components/ui/separator';
import { dateLocales } from '@/lib/date-utils';


const TAX_RATE = 0.16;

function SuccessPageContent() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { user, loading: authLoading } = useAuth();
    
    const [course, setCourse] = useState<GolfCourse | null>(null);
    const [loading, setLoading] = useState(true);
    const [totalPrice, setTotalPrice] = useState<string | null>(null);
    const [formattedDate, setFormattedDate] = useState<string | null>(null);

    const courseId = searchParams?.get('courseId');
    const date = searchParams?.get('date');
    const time = searchParams?.get('time');
    const players = searchParams?.get('players');
    const price = searchParams?.get('price'); // This is now subtotal

    const lang = (pathname?.split('/')[1] || 'en') as Locale;

    useEffect(() => {
        // This effect runs only on the client, ensuring `date-fns` has access to the correct locale.
        if (date) {
            try {
                setFormattedDate(format(new Date(date), "PPP", { locale: dateLocales[lang] }));
            } catch (e) {
                console.error("Invalid date format:", date);
                setFormattedDate("Invalid Date");
            }
        }
    }, [date, lang]);

    useEffect(() => {
        if (!courseId) {
            router.push(`/${lang}/courses`);
            return;
        }

        if (price) {
            const subtotalNum = parseFloat(price);
            const total = subtotalNum * (1 + TAX_RATE);
            setTotalPrice(total.toFixed(2));
        }

        getCourseById(courseId).then(data => {
            setCourse(data || null);
        }).finally(() => {
            setLoading(false);
        });
    }, [courseId, router, lang, date, price]);
    
    const handlePrint = () => window.print();

    const getShareMessage = () => {
        const message = `Booking Confirmation:\n\nCourse: ${course?.name}\nDate: ${formattedDate}\nTime: ${time}\nPlayers: ${players}\nTotal: $${totalPrice ? parseFloat(totalPrice).toFixed(2) : '0.00'}\n\nBooked via TeeReserve!`;
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
        // Basic share API for other apps
        if (navigator.share) {
            navigator.share({
                title: 'Golf Booking Confirmation',
                text: message,
                url: window.location.href,
            }).catch(console.error);
        } else {
            // Fallback for desktop/unsupported browsers
            window.open(whatsappUrl, '_blank');
        }
    };

    const getEmailMessage = () => {
        const subject = `Your Booking Confirmation for ${course?.name}`;
        const body = `Hello,\n\nHere are the details of your confirmed booking:\n\nCourse: ${course?.name}\nLocation: ${course?.location}\nDate: ${formattedDate}\nTime: ${time}\nPlayers: ${players}\nTotal Price: $${totalPrice ? parseFloat(totalPrice).toFixed(2) : '0.00'}\n\nWe look forward to seeing you on the course!\n\nThe TeeReserve Team`;
        return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    }

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
                    {/* Client Info */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Client Information</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <p className="text-sm text-muted-foreground">Name</p>
                                <p className="font-semibold">{user?.displayName || 'N/A'}</p>
                            </div>
                             <div>
                                <p className="text-sm text-muted-foreground">Email</p>
                                <p className="font-semibold">{user?.email}</p>
                            </div>
                             <div>
                                <p className="text-sm text-muted-foreground">Phone</p>
                                <p className="font-semibold">{user?.phoneNumber || 'Not provided'}</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Actions */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <Button variant="default" onClick={handlePrint} className="bg-green-700 hover:bg-green-800"><Printer className="mr-2 h-4 w-4"/> Print Receipt</Button>
                        <Button variant="outline" asChild><a href={getEmailMessage()}><Mail className="mr-2 h-4 w-4"/> Send by Email</a></Button>
                        <Button variant="outline" onClick={getShareMessage}><Share2 className="mr-2 h-4 w-4"/> Share</Button>
                    </div>

                    {/* Booking Details */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Booking Details</CardTitle>
                        </CardHeader>
                        <CardContent>
                             <h3 className="font-semibold text-lg">{course?.name}</h3>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm mt-2">
                                <div className="flex items-center text-muted-foreground">
                                    <Calendar className="h-4 w-4 mr-2" /> Date: 
                                    <span className="font-medium text-foreground ml-1">
                                      {formattedDate ? formattedDate : <Skeleton className="h-4 w-24 inline-block" />}
                                    </span>
                                </div>
                                <div className="flex items-center text-muted-foreground"><Clock className="h-4 w-4 mr-2" /> Time: <span className="font-medium text-foreground ml-1">{time}</span></div>
                                <div className="flex items-center text-muted-foreground"><Users className="h-4 w-4 mr-2" /> Players: <span className="font-medium text-foreground ml-1">{players}</span></div>
                                <div className="flex items-center text-muted-foreground"><DollarSign className="h-4 w-4 mr-2" /> Total: <span className="font-medium text-foreground ml-1">${totalPrice ? parseFloat(totalPrice).toFixed(2) : '0.00'}</span></div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Sent Confirmations */}
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

                    {/* Important Info */}
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
                            <Link href={`/${lang}/profile`}>
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
