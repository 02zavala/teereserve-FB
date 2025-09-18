
"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useEffect, useState, useCallback } from "react";
import { getUserBookings } from "@/lib/data";
import type { Booking, UserProfile } from "@/types";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { ProfileEditor } from "@/components/ProfileEditor";
import { LazyScorecardManager, LazyGamificationSection } from "@/components/LazyComponents";
import { useRouter, usePathname } from "next/navigation";
import type { Locale } from "@/i18n-config";
import { dateLocales } from "@/lib/date-utils";
import { useOnboarding } from "@/hooks/useOnboarding";
import { HelpCircle } from "lucide-react";
import { LazyMyReviews } from "@/components/LazyComponents";
import { SavedPaymentMethods } from "@/components/SavedPaymentMethods";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { usePaymentMethods } from "@/hooks/usePaymentMethods";
import { useToast } from "@/hooks/use-toast";
import { NotificationPreferences } from "@/components/NotificationPreferences";
import { GuestBookingLinkModal } from "@/components/guest/GuestBookingLinkModal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link2 } from "lucide-react";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface FormattedBooking extends Omit<Booking, 'createdAt' | 'date'> {
    id: string;
    createdAt?: string; 
    date: string | Date;
}

// AddPaymentMethodForm component
function AddPaymentMethodForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
    const stripe = useStripe();
    const elements = useElements();
    const { savePaymentMethod } = usePaymentMethods();
    const { toast } = useToast();
    const [isProcessing, setIsProcessing] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();

        if (!stripe || !elements) {
            return;
        }

        setIsProcessing(true);
        setErrorMessage(null);

        try {
            const { error: submitError } = await elements.submit();
            if (submitError) {
                setErrorMessage(submitError.message || "An error occurred.");
                setIsProcessing(false);
                return;
            }

            const { error, setupIntent } = await stripe.confirmSetup({
                elements,
                confirmParams: {
                    return_url: window.location.href,
                },
                redirect: 'if_required',
            });

            if (error) {
                setErrorMessage(error.message || "An error occurred.");
            } else if (setupIntent && setupIntent.status === 'succeeded' && setupIntent.payment_method) {
                const result = await savePaymentMethod(setupIntent.payment_method as string);
                if (result) {
                    onSuccess();
                } else {
                    setErrorMessage("Failed to save payment method.");
                }
            }
        } catch (error: any) {
            console.error('Error saving payment method:', error);
            setErrorMessage(error.message || 'An unexpected error occurred.');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* Aviso del cargo de verificación */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <div>
                        <h4 className="text-sm font-semibold text-amber-800">Cargo de Verificación</h4>
                        <p className="text-sm text-amber-700 mt-1">
                            Se cargará un cargo único  de <strong>$1 USD</strong> para validar tu tarjeta.
                        </p>
                    </div>
                </div>
            </div>
            
            <PaymentElement options={{ layout: "tabs" }} />
            
            {errorMessage && (
                <div className="text-destructive text-sm font-medium p-3 bg-destructive/10 rounded-md border border-destructive/20">
                    {errorMessage}
                </div>
            )}
            
            <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
                    Cancelar
                </Button>
                <Button type="submit" disabled={!stripe || isProcessing} className="flex-1">
                    {isProcessing ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Procesando...</>
                    ) : (
                        'Validar y Guardar ($1 USD)'
                    )}
                </Button>
            </div>
        </form>
    );
}

function BookingRow({ booking, lang }: { booking: FormattedBooking, lang: Locale }) {
    const [formattedDate, setFormattedDate] = useState<string | null>(null);
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    useEffect(() => {
        if (booking.date && booking.time && isClient) {
            try {
                const dateObj = typeof booking.date === 'string' ? new Date(booking.date) : booking.date;
                if (!isNaN(dateObj.getTime())) {
                    setFormattedDate(`${format(dateObj, 'PPP', { locale: dateLocales[lang] })} at ${booking.time}`);
                } else {
                    setFormattedDate("Invalid Date");
                }
            } catch (e) {
                console.error("Invalid date format for booking:", booking.id, booking.date);
                setFormattedDate("Invalid Date");
            }
        }
    }, [booking.date, booking.time, booking.id, lang, isClient]);


    const getStatusVariant = (status: Booking['status']) => {
        switch (status) {
            case "Confirmed" as Booking['status']: return 'default';
            case "Completed" as Booking['status']: return 'secondary';
            case "Cancelled" as Booking['status']: return 'destructive';
            case "Pending" as Booking['status']:
            default:
                return 'outline';
        }
    }

    return (
        <Card>
            <CardContent className="p-4 flex items-center justify-between">
                <div>
                    <p className="font-bold text-lg">{booking.courseName}</p>
                    <div className="text-sm text-muted-foreground">
                      {isClient && formattedDate ? formattedDate : <Skeleton className="h-4 w-48" />}
                    </div>
                </div>
                 <div className="text-right">
                    <Badge variant={getStatusVariant(booking.status)}>{booking.status}</Badge>
                    <Button variant="link" size="sm" className="mt-1">View Details</Button>
                 </div>
            </CardContent>
        </Card>
    );
}


export default function ProfilePage() {
    const { user, userProfile, loading, refreshUserProfile } = useAuth();
    const { startOnboarding } = useOnboarding();
    const router = useRouter();
    const pathname = usePathname();
    const lang = (pathname?.split('/')[1] || 'en') as Locale;

    const [bookings, setBookings] = useState<FormattedBooking[]>([]);
    const [loadingBookings, setLoadingBookings] = useState(true);
    const [memberSince, setMemberSince] = useState<string | null>(null);
    const [isClient, setIsClient] = useState(false);
    const [showAddPaymentDialog, setShowAddPaymentDialog] = useState(false);
    const [setupIntentClientSecret, setSetupIntentClientSecret] = useState<string | null>(null);
    const [isCreatingSetupIntent, setIsCreatingSetupIntent] = useState(false);
    const [showGuestLinkModal, setShowGuestLinkModal] = useState(false);
    const [guestEmailToLink, setGuestEmailToLink] = useState('');

    const handleAddNewPaymentMethod = async () => {
        if (!user) return;
        
        setIsCreatingSetupIntent(true);
        try {
            const token = await user.getIdToken();
            const response = await fetch('/api/create-setup-intent', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });
            
            if (!response.ok) {
                throw new Error('Failed to create setup intent');
            }
            
            const data = await response.json();
            setSetupIntentClientSecret(data.client_secret);
            setShowAddPaymentDialog(true);
        } catch (error) {
            console.error('Error creating setup intent:', error);
        } finally {
            setIsCreatingSetupIntent(false);
        }
    };

    const handlePaymentMethodAdded = () => {
        setShowAddPaymentDialog(false);
        setSetupIntentClientSecret(null);
    };
    
    const handleAddCancel = () => {
        setShowAddPaymentDialog(false);
        setSetupIntentClientSecret(null);
    };

    const handleLinkGuestBookings = () => {
        if (guestEmailToLink.trim()) {
            setShowGuestLinkModal(true);
        }
    };

    useEffect(() => {
        setIsClient(true);
    }, []);

    useEffect(() => {
        if (!loading && !user) {
            router.push(`/${lang}/login`);
        }
    }, [user, loading, router, lang]);

    useEffect(() => {
        if (user && isClient) {
            setLoadingBookings(true);
            if (user.metadata.creationTime) {
                try {
                     setMemberSince(format(new Date(user.metadata.creationTime), 'PPP', { locale: dateLocales[lang] }));
                } catch (e) {
                    console.error("Failed to format member since date");
                }
            }

            getUserBookings(user.uid)
                .then(userBookings => {
                    setBookings(userBookings);
                })
                .catch(err => {
                    console.error("Failed to fetch bookings", err);
                })
                .finally(() => {
                    setLoadingBookings(false);
                });
        }
    }, [user, lang, isClient]);
    
    const onProfileUpdate = useCallback(() => {
        refreshUserProfile();
    }, [refreshUserProfile]);

    // Add timeout to prevent infinite loading
    useEffect(() => {
        const loadingTimeout = setTimeout(() => {
            if (loading) {
                console.warn("Profile page loading timeout reached");
            }
        }, 10000); // 10 second timeout for profile page

        return () => clearTimeout(loadingTimeout);
    }, [loading]);

    const getInitials = () => {
        if (userProfile?.displayName) {
            return userProfile.displayName.substring(0, 2).toUpperCase();
        }
        if (user?.email) {
            return user.email.substring(0, 2).toUpperCase();
        }
        return 'U';
    };

    if (loading || !user || !userProfile) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <div className="ml-4 text-muted-foreground">
                    {loading ? "Loading profile..." : "Please log in to view your profile"}
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto max-w-4xl px-4 py-12">
            <div className="flex flex-col items-center md:flex-row md:items-start gap-8 mb-12">
                <Avatar className="h-32 w-32 border-4 border-primary">
                    <AvatarImage src={userProfile.photoURL || `https://i.pravatar.cc/128?u=${user.uid}`} alt={userProfile.displayName || 'User'} />
                    <AvatarFallback className="text-4xl">{getInitials()}</AvatarFallback>
                </Avatar>
                <div className="text-center md:text-left flex-1">
                    <h1 className="font-headline text-4xl font-bold text-primary">{userProfile.displayName || user.email || 'TeeReserve User'}</h1>
                    <p className="text-muted-foreground mt-1">{user.email}</p>
                     {userProfile.handicap !== undefined && (
                        <p className="font-semibold text-accent mt-2">Handicap: {userProfile.handicap}</p>
                    )}
                    {isClient && memberSince ? (
                       <p className="text-muted-foreground text-sm mt-2">Member since {memberSince}</p>
                    ) : (
                       <Skeleton className="h-4 w-48 mt-2" />
                    )}
                    <div className="flex gap-2 mt-4">
                        <ProfileEditor user={user} userProfile={userProfile} onProfileUpdate={onProfileUpdate}>
                            <Button variant="outline" size="sm">
                                Edit Profile
                            </Button>
                        </ProfileEditor>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={startOnboarding}
                            className="text-muted-foreground hover:text-primary"
                        >
                            <HelpCircle className="h-4 w-4 mr-2" />
                            Tour Guide
                        </Button>
                    </div>
                </div>
            </div>

            <Separator />
            
            <div id="gamification" className="mt-12">
                <LazyGamificationSection userProfile={userProfile} />
            </div>

            <Separator className="my-12" />

            <div id="notification-preferences" className="mt-12">
                <h2 className="font-headline text-3xl font-bold text-primary mb-6">Notification Preferences</h2>
                <NotificationPreferences />
            </div>

            <Separator className="my-12" />

            <div id="guest-bookings" className="mt-12">
                <h2 className="font-headline text-3xl font-bold text-primary mb-6">Link Guest Bookings</h2>
                <Card>
                    <CardContent className="p-6">
                        <div className="space-y-4">
                            <p className="text-muted-foreground">
                                ¿Tienes reservas realizadas como invitado? Vincúlalas a tu cuenta para gestionarlas desde aquí.
                            </p>
                            <div className="flex gap-4 items-end">
                                <div className="flex-1">
                                    <Label htmlFor="guest-email">Email usado para reservas de invitado</Label>
                                    <Input
                                        id="guest-email"
                                        type="email"
                                        placeholder="ejemplo@email.com"
                                        value={guestEmailToLink}
                                        onChange={(e) => setGuestEmailToLink(e.target.value)}
                                    />
                                </div>
                                <Button 
                                    onClick={handleLinkGuestBookings}
                                    disabled={!guestEmailToLink.trim()}
                                    className="flex items-center gap-2"
                                >
                                    <Link2 className="h-4 w-4" />
                                    Buscar y Vincular
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Separator className="my-12" />

            <div id="bookings" className="mt-12">
                 <h2 className="font-headline text-3xl font-bold text-primary mb-6">My Bookings</h2>
                 <div className="space-y-4">
                    {loadingBookings ? (
                         [...Array(3)].map((_, i) => (
                           <Card key={i}>
                               <CardContent className="p-4 flex items-center justify-between">
                                   <div className="space-y-2">
                                       <Skeleton className="h-5 w-48" />
                                       <Skeleton className="h-4 w-56" />
                                   </div>
                                    <div className="text-right space-y-2">
                                       <Skeleton className="h-6 w-20" />
                                    </div>
                               </CardContent>
                           </Card>
                        ))
                    ) : bookings.length > 0 ? (
                        bookings.map(booking => (
                           <BookingRow key={booking.id} booking={booking} lang={lang} />
                        ))
                    ) : (
                        <p className="text-center text-muted-foreground">You have no upcoming bookings.</p>
                    )}
                 </div>
            </div>

             <Separator className="my-12" />

            <div id="payment-methods" className="mt-12">
                 <h2 className="font-headline text-3xl font-bold text-primary mb-6">Payment Methods</h2>
                 <SavedPaymentMethods 
                     onAddNewMethod={handleAddNewPaymentMethod}
                     showAddButton={true}
                 />
                 
                 <Dialog open={showAddPaymentDialog} onOpenChange={setShowAddPaymentDialog}>
                     <DialogContent className="max-w-md">
                         <DialogHeader>
                             <DialogTitle>Add New Payment Method</DialogTitle>
                             <DialogDescription>
                                 Add a new payment method to your account for faster checkout.
                             </DialogDescription>
                         </DialogHeader>
                         {setupIntentClientSecret && (
                             <Elements 
                                 stripe={stripePromise} 
                                 options={{
                                     clientSecret: setupIntentClientSecret,
                                     appearance: {
                                         theme: 'stripe',
                                     },
                                 }}
                             >
                                 <AddPaymentMethodForm 
                                     onSuccess={handlePaymentMethodAdded}
                                     onCancel={handleAddCancel}
                                 />
                             </Elements>
                         )}
                     </DialogContent>
                 </Dialog>
            </div>

             <Separator className="my-12" />

            <div id="reviews" className="mt-12">
                 <h2 className="font-headline text-3xl font-bold text-primary mb-6">My Reviews</h2>
                 <LazyMyReviews userId={user.uid} lang={lang} />
            </div>

             <Separator className="my-12" />

            <div id="scorecards" className="mt-12">
                 <h2 className="font-headline text-3xl font-bold text-primary mb-6">My Scorecards</h2>
                 <LazyScorecardManager user={user} />
            </div>

            {/* Guest Booking Link Modal */}
            <GuestBookingLinkModal
                isOpen={showGuestLinkModal}
                onClose={() => {
                    setShowGuestLinkModal(false);
                    setGuestEmailToLink('');
                }}
                guestEmail={guestEmailToLink}
                lang={lang}
            />
        </div>
    )
}
