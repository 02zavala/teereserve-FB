
"use client";

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useEffect, useState, useMemo, useTransition } from 'react';
import * as Sentry from '@sentry/nextjs';
import { useLogger } from '@/hooks/useLogger';
import { useStableNavigation, useValidatedNavigation } from '@/hooks/useStableNavigation';
import { useFetchWithAbort } from '@/hooks/useFetchWithAbort';
import Link from 'next/link';
import { getCourseById, validateCoupon, getGuestBookingDraft, getCMSSection } from '@/lib/data';
import type { GolfCourse, Coupon, QuoteRequest, QuoteResponse } from '@/types';
import { PriceBreakdown } from '@/components/PriceBreakdown';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, User, Calendar, Clock, Users, ArrowLeft, MessageSquare, Lock, TicketPercent, XCircle, Shield } from 'lucide-react';
import { FirebaseImage } from '@/components/FirebaseImage';
import { normalizeImageUrl } from '@/lib/normalize';
import { useToast } from '@/hooks/use-toast';
import { useErrorHandler, commonValidators } from '@/hooks/useErrorHandler';
import { ValidationError } from '@/lib/error-handling';
import { createBooking } from '@/lib/data';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { StripeError } from '@stripe/stripe-js';
import { Locale } from '@/i18n-config';
import { Skeleton } from './ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Separator } from './ui/separator';
import { formatBookingDate } from '@/lib/date-utils';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { SavedPaymentMethods } from './SavedPaymentMethods';
import { usePaymentMethods, SavedPaymentMethod } from '@/hooks/usePaymentMethods';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PayPalButton from '@/components/PayPalButton';
import PaymentMethodSelector, { PaymentMethod } from '@/components/PaymentMethodSelector';
import PaymentTermsCheckbox from '@/components/PaymentTermsCheckbox';
import { useCardValidation } from '@/hooks/useCardValidation';
import { handleStripeError } from '@/lib/payments/stripe-error-handler';
import { useGuestAuth } from '@/hooks/useGuestAuth';
import { gtagEvent } from '@/lib/ga';

import { fallbackService, withFallback } from '@/lib/fallback-service';


const TAX_RATE = 0.16; // 16%

export default function CheckoutForm() {
    const stripe = useStripe();
    const elements = useElements();
    const { toast } = useToast();
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    const { user, loading: authLoading } = useAuth();
    const { go } = useStableNavigation();
    const { fetchWithAbort } = useFetchWithAbort();
    const { finalizeGuestBooking } = useGuestAuth();
    const { logEvent } = useLogger();

    const [course, setCourse] = useState<GolfCourse | null>(null);
    const [event, setEvent] = useState<any | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [formattedDate, setFormattedDate] = useState<string | null>(null);
    const [showPaymentForm, setShowPaymentForm] = useState(false);
    const [isClient, setIsClient] = useState(false);
    const [availableFallbacks, setAvailableFallbacks] = useState<('paypal' | 'link')[]>([]);
    const [showRetryNewCard, setShowRetryNewCard] = useState(false);
    
    const [couponCode, setCouponCode] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
    const [couponMessage, setCouponMessage] = useState<string | null>(null);
    const [isCouponPending, startCouponTransition] = useTransition();
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<SavedPaymentMethod | null>(null);
    const [paymentMode, setPaymentMode] = useState<'new' | 'saved'>('new');
    const [savePaymentMethod, setSavePaymentMethod] = useState(false);
    const getInitialPaymentMethod = () => {
        try {
            const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
            const stripeHealthy = fallbackService.getServiceStatus('stripe')?.isHealthy !== false;
            // Force stripe as default since PayPal is temporarily hidden
            return 'stripe'; 
            // return online && stripeHealthy ? 'stripe' : 'paypal';
        } catch {
            return 'stripe';
        }
    };
    const [selectedPaymentType, setSelectedPaymentType] = useState<PaymentMethod>(getInitialPaymentMethod());
    const [termsAccepted, setTermsAccepted] = useState(false);
    const { paymentMethods, processPaymentWithSavedMethod } = usePaymentMethods();
    useEffect(() => {
        if (paymentMethods.length > 0) {
            setPaymentMode('saved');
        }
    }, [paymentMethods.length]);
    const { validateCard, isValidating } = useCardValidation();
    const [isPaymentElementReady, setIsPaymentElementReady] = useState(false);
    const [showFxNote, setShowFxNote] = useState(false);

    // Legacy price details for backward compatibility (moved up to avoid TDZ)
    const [priceDetails, setPriceDetails] = useState({
        subtotal: 0,
        tax: 0,
        total: 0,
        discount: 0,
    });

    // Currency selection (display only; payments remain in USD)
    const fxRateMXN = 20.00;
    const [preferredCurrency, setPreferredCurrency] = useState<'USD' | 'MXN'>('USD');
    const approxTotalMXN = useMemo(() => priceDetails.total * fxRateMXN, [priceDetails.total]);
    
    // Guest user form fields
    const [guestInfo, setGuestInfo] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: ''
    });

    // Special requests field
    const [specialRequests, setSpecialRequests] = useState('');

    // Quote system state
    const [currentQuote, setCurrentQuote] = useState<QuoteResponse | null>(null);
    const [isQuoteLoading, setIsQuoteLoading] = useState(false);
    const [quoteError, setQuoteError] = useState<string | null>(null);
    
    // Legacy price details for backward compatibility (already declared above)
    // const [priceDetails, setPriceDetails] = useState({
    //     subtotal: 0,
    //     tax: 0,
    //     total: 0,
    //     discount: 0,
    // });

    const courseId = searchParams?.get('courseId');
    const date = searchParams?.get('date');
    const time = searchParams?.get('time');
    const players = searchParams?.get('players');
    const holes = searchParams?.get('holes');
    const price = searchParams?.get('price'); // This is the subtotal
    const teeTimeId = searchParams?.get('teeTimeId');
    const comments = searchParams?.get('comments');
    
    // Guest booking parameters
    const clientSecret = searchParams?.get('client_secret');
    const draftId = searchParams?.get('draft_id');
    
    const lang = (pathname?.split('/')[1] || 'en') as Locale;

    const baseSubtotal = useMemo(() => parseFloat(price || '0'), [price]);
    useEffect(() => {
        if (process.env.NODE_ENV !== 'production') {
            console.log('[CHECKOUT] subtotalFromTeeTime', { baseSubtotal, players, holes, courseId, time });
        }
    }, [baseSubtotal, players, holes, courseId, time]);
    
    // Use useMemo to prevent paymentElementOptions from changing on every render
    // IMPORTANT: This must be declared BEFORE any conditional returns to avoid hook order issues
    const paymentElementOptions = useMemo(() => ({
        layout: "tabs" as const,
    }), []);
    
    // Function to fetch quote from server
    const fetchQuote = async (promoCode?: string) => {
        if (!courseId || !date || !time || !players || !holes || !price) {
            return;
        }
        
        setIsQuoteLoading(true);
        setQuoteError(null);
        
        try {
            const quoteRequest: QuoteRequest = {
                courseId,
                date,
                time,
                players: parseInt(players),
                holes: parseInt(holes),
                basePrice: parseFloat(price),
                promoCode,
                userId: user?.uid || undefined,
                userEmail: (user?.email || guestInfo.email) || undefined,
            };
            
            const response = await fetch('/api/checkout/quote', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(quoteRequest),
            });
            
            if (!response.ok) {
                throw new Error('Failed to fetch quote');
            }
            
            const quote: QuoteResponse = await response.json();
            setCurrentQuote(quote);
            
            // Update legacy priceDetails for backward compatibility
            setPriceDetails({
                subtotal: quote.subtotal_cents / 100,
                tax: quote.tax_cents / 100,
                total: quote.total_cents / 100,
                discount: quote.discount_cents / 100,
            });
            if (process.env.NODE_ENV !== 'production') {
                console.log('[CHECKOUT] Quote totals', {
                    subtotal: quote.subtotal_cents / 100,
                    tax: quote.tax_cents / 100,
                    total: quote.total_cents / 100,
                    discount: quote.discount_cents / 100,
                });
            }
            
        } catch (error) {
            console.error('Error fetching quote:', error);
            setQuoteError('Error al calcular el precio. Por favor, intenta de nuevo.');
        } finally {
            setIsQuoteLoading(false);
        }
    };

    useEffect(() => {
        setIsClient(true);
        // Pre-populate form with user data if available
        if (user) {
            const nameParts = user.displayName?.split(' ') || [];
            setGuestInfo({
                firstName: nameParts[0] || '',
                lastName: nameParts.slice(1).join(' ') || '',
                email: user.email || '',
                phone: ''
            });
        }
    }, [user]);

    useEffect(() => {
        if (courseId && time) {
            logEvent('checkout_opened', { courseId, teeTime: time, stage: 'checkout', lang });
        }
    }, [courseId, time, logEvent, lang]);

    // Load guest data from draft when draftId is present
    useEffect(() => {
        const loadGuestDraft = async () => {
            if (draftId && !user) {
                try {
                    const draft = await getGuestBookingDraft(draftId);
                    if (draft && draft.guest) {
                        setGuestInfo({
                            firstName: draft.guest.firstName || '',
                            lastName: draft.guest.lastName || '',
                            email: draft.guest.email || '',
                            phone: draft.guest.phone || ''
                        });
                    }
                } catch (error) {
                    console.error('Error loading guest draft:', error);
                }
            }
        };

        loadGuestDraft();
    }, [draftId, user]);

    // Fetch quote whenever relevant data changes
    useEffect(() => {
        if (!price || !players || !holes || !courseId || !date || !time) return;
        
        const promoCode = appliedCoupon?.code;
        fetchQuote(promoCode);
    }, [price, players, holes, appliedCoupon, courseId, date, time]);


    useEffect(() => {
        if (!courseId) {
            go('/');
            return;
        }
        // Allow anonymous users (guests) to proceed with checkout
        // The guest booking flow handles authentication separately
        if (!authLoading && !user) {
            // Don't redirect to login - allow guest checkout to proceed
            console.log('Guest user accessing checkout - this is allowed');
        }

        if (date && isClient) {
            try {
                setFormattedDate(formatBookingDate(date, "PPP", lang));
            } catch (e) {
                console.error("Invalid date format:", date);
                setFormattedDate("Invalid Date");
            }
        }

        // Detectar si es un evento (los IDs de eventos empiezan con 'event-')
        if (courseId.startsWith('event-')) {
            getCMSSection(courseId).then(fetchedEvent => {
                if (fetchedEvent) {
                    setEvent(fetchedEvent);
                }
                setIsLoading(false);
            });
        } else {
            getCourseById(courseId).then(fetchedCourse => {
                if (fetchedCourse) {
                    setCourse(fetchedCourse);
                }
                setIsLoading(false);
            });
        }

    }, [courseId, user, authLoading, date, lang, isClient, go]);

    const { handleAsyncError } = useErrorHandler();
    
    const handleApplyCoupon = () => {
        if (!couponCode) {
            setCouponMessage('Please enter a coupon code.');
            return;
        }
        
        if (!commonValidators.isValidCouponCode(couponCode)) {
            setCouponMessage('Invalid coupon code format.');
            return;
        }
        
        setCouponMessage(null);
        startCouponTransition(async () => {
            const result = await handleAsyncError(async () => {
                const coupon = await validateCoupon(couponCode, { userId: user?.uid, userEmail: user?.email || guestInfo.email });
                setAppliedCoupon(coupon);
                setCouponMessage('Coupon applied successfully!');
                return coupon;
            }, {
                defaultMessage: 'Failed to apply coupon. Please check the code and try again.',
                onError: (error) => {
                    setAppliedCoupon(null);
                    setCouponMessage(error instanceof Error ? error.message : 'Invalid coupon code.');
                }
            });
        });
    };
    
    const handleRemoveCoupon = () => {
        setCouponCode('');
        setAppliedCoupon(null);
        setCouponMessage(null);
    };

    const handleProceedToPayment = () => {
        if (!termsAccepted) {
            toast({
                title: "Términos requeridos",
                description: "Debes aceptar los términos y condiciones para continuar.",
                variant: "destructive"
            });
            return;
        }
        if (!stripe || !elements) {
            toast({ title: "Payment system not ready. Please wait a moment.", variant: "destructive" });
            return;
        }
        // Set default payment mode based on available saved methods
        setPaymentMode(paymentMethods.length > 0 ? 'saved' : 'new');
        setSelectedPaymentMethod(null);
        setErrorMessage(null);
        setShowPaymentForm(true);
        if (courseId && time) {
            logEvent('checkout_opened', { courseId, teeTime: time, stage: 'checkout', lang });
        }
        try {
            if (selectedPaymentType === 'stripe') {
                gtagEvent('add_payment_info', {
                    currency: 'USD',
                    value: priceDetails.total,
                    items: [
                        {
                            item_id: courseId!,
                            item_name: course?.name || 'Course',
                            item_category: 'golf_course',
                            price: priceDetails.subtotal,
                            quantity: parseInt(players || '1'),
                        },
                    ],
                    payment_type: 'card',
                });
            }
        } catch {}
    };

    const handlePayPalSuccess = async (details: any) => {
        setIsProcessing(true);
        setErrorMessage(null);

        const result = await withFallback('paypal', async () => {
            console.log('🔄 [PayPal] Iniciando creación de reserva...');
            const bookingId = await createBooking({
                userId: user?.uid || 'guest',
                userName: user ? (user.displayName || user.email || 'User') : `${guestInfo.firstName} ${guestInfo.lastName}`,
                userEmail: user?.email || guestInfo.email,
                userPhone: guestInfo.phone || '',
                courseId: courseId || '',
                courseName: course?.name || '',
                date: date || '',
                time: time || '',
                players: parseInt(players || '1'),
                holes: holes ? parseInt(holes) : 18,
                totalPrice: priceDetails.total,
                status: 'confirmed',
                teeTimeId: teeTimeId || '',
                comments: comments || '',
                specialRequests: specialRequests || '',
                couponCode: appliedCoupon?.code || '',
                paymentMethod: 'paypal',
                paymentStatus: 'completed',
                currency: 'USD'
            }, lang);
            
            console.log('✅ [PayPal] Reserva creada exitosamente. BookingId:', bookingId);
            
            // Show FX note if payment was processed in MXN
            setShowFxNote(true);
                             
            const successUrl = new URL(`${window.location.origin}/${lang}/book/success`);
            searchParams?.forEach((value, key) => successUrl.searchParams.append(key, value));
            successUrl.searchParams.append('bookingId', bookingId);
            
            console.log('🔗 [PayPal] URL de éxito construida:', successUrl.toString());
            console.log('🚀 [PayPal] Iniciando redirección...');
            
            go(successUrl.toString());
            try { logEvent('payment_completed', { courseId: courseId || '', teeTime: time || '', stage: 'paid', bookingId, method: 'paypal' }); } catch {}
            console.log('✅ [PayPal] Redirección ejecutada');
            return { success: true };
        });

        if (!result.success) {
            if ((result as any).fallbackUsed) {
                setErrorMessage('Error con PayPal. Se recomienda usar un método alternativo como transferencia bancaria o pago en efectivo.');
            } else {
                setErrorMessage((result as any).error || 'Error al procesar la reserva. Por favor contacta soporte.');
            }
        }
        
        setIsProcessing(false);
    };

    const handlePayPalError = (error: any) => {
        console.error('PayPal payment error:', error);
        try { Sentry.captureException(error); } catch {}
        
        // Check if it's a network connectivity issue
        const isNetworkError = !navigator.onLine || 
                              error.message?.includes('network') || 
                              error.message?.includes('timeout') ||
                              error.name === 'NetworkError';
        
        if (isNetworkError) {
            setErrorMessage('Error de conexión con PayPal. Verifica tu conexión a internet o prueba con otro método de pago.');
        } else {
            setErrorMessage('Error en el pago con PayPal. Por favor inténtalo de nuevo o usa otro método de pago.');
        }
        
        // Log connectivity info for debugging
        console.warn('PayPal Error Details:', {
            online: navigator.onLine,
            errorType: error.name,
            errorMessage: error.message,
            fallbacksAvailable: ['stripe']
        });
        if (courseId && time) {
            logEvent('payment_abandoned', { courseId, teeTime: time, stage: 'abandoned', method: 'paypal' });
        }
        if (courseId && time) {
            const cancelUrl = new URL(`${window.location.origin}/${lang}/book/cancel`)
            cancelUrl.searchParams.set('courseId', courseId)
            cancelUrl.searchParams.set('time', time)
            go(cancelUrl.toString())
        }
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        
        if (!termsAccepted) {
            toast({
                title: "Términos requeridos",
                description: "Debes aceptar los términos y condiciones para continuar.",
                variant: "destructive"
            });
            return;
        }

        if (!courseId || !date || !time || !players || !price || !teeTimeId || !course) {
            setErrorMessage('Missing required booking information. Please refresh and try again.');
            return;
        }

        // Validate booking information for all users
        if (!guestInfo.firstName.trim() || !guestInfo.lastName.trim() || !guestInfo.email.trim() || !guestInfo.phone.trim()) {
            setErrorMessage('Please fill in all booking information fields.');
            return;
        }
        
        if (!commonValidators.isValidEmail(guestInfo.email)) {
            setErrorMessage('Please enter a valid email address.');
            return;
        }

        setIsProcessing(true);
        setErrorMessage(null);
        setAvailableFallbacks([]);
        setShowRetryNewCard(false);

        const result = await handleAsyncError(async () => {
            // Handle Stripe payment method
            if (selectedPaymentType === 'stripe') {
                if (!stripe || !elements) {
                    throw new Error('Stripe no está disponible. Por favor recarga la página.');
                }

                const { error: submitError } = await elements.submit();
                if (submitError) {
                    throw new Error(submitError.message || 'Error al procesar el pago');
                }

                try {
                    // Use provided client_secret when present (guest flow), otherwise create intent
                    let clientSecretToUse = clientSecret || null;
                    if (!clientSecretToUse) {
                        if (!currentQuote) {
                            throw new Error('No se ha podido calcular el precio. Por favor recarga la página.');
                        }

                        const response = await fetchWithAbort('/api/checkout/create-intent', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                courseId,
                                date,
                                time,
                                players: parseInt(players),
                                holes: holes ? parseInt(holes) : 18,
                                currency: currentQuote.currency,
                                tax_rate: currentQuote.tax_rate,
                                subtotal_cents: currentQuote.subtotal_cents,
                                discount_cents: currentQuote.discount_cents,
                                tax_cents: currentQuote.tax_cents,
                                total_cents: currentQuote.total_cents,
                                quote_hash: currentQuote.quote_hash,
                                expires_at: currentQuote.expires_at,
                                promoCode: appliedCoupon?.code || '',
                                guestEmail: user?.email || guestInfo.email,
                                guestName: user ? (user.displayName || user.email || 'User') : `${guestInfo.firstName} ${guestInfo.lastName}`,
                                savePaymentMethod: savePaymentMethod
                            }),
                        });

                        if (!response.ok) {
                            const errorData = await response.json();
                            throw new Error(errorData.error || 'Error al crear la intención de pago');
                        }

                        const { client_secret: generatedClientSecret } = await response.json();
                        clientSecretToUse = generatedClientSecret;
                    }

                    // Confirm payment
                    const { error, paymentIntent } = await stripe.confirmPayment({
                        elements,
                        clientSecret: clientSecretToUse!,
                        redirect: 'if_required',
                        confirmParams: {
                            return_url: `${window.location.origin}/${lang}/book/success`,
                        },
                    });

                    if (error) {
                        const { userMessage, fallbacksAvailable, showRetryWithNewCard } = handleStripeError(error as StripeError);
                        setErrorMessage(userMessage);
                        setAvailableFallbacks(fallbacksAvailable);
                        setShowRetryWithNewCard(showRetryWithNewCard);
                        setIsProcessing(false); // Detener el spinner
                        return; // Detener la ejecución de handleSubmit
                    }

                    if (paymentIntent && paymentIntent.status === 'succeeded') {
                        // Save payment method if requested with $1 validation charge
                        if (savePaymentMethod && paymentIntent.payment_method) {
                            try {
                                // First validate the card with $1 charge
                                const validationResult = await validateCard(paymentIntent.payment_method as string);
                                
                                if (validationResult.success) {
                                    // Save the payment method after successful validation
                                    await fetch('/api/save-payment-method', {
                                        method: 'POST',
                                        headers: {
                                            'Content-Type': 'application/json',
                                        },
                                        body: JSON.stringify({
                                            paymentMethodId: paymentIntent.payment_method,
                                            customerId: user?.uid || 'guest',
                                        }),
                                    });
                                }
                            } catch (error) {
                                console.warn('Failed to save payment method:', error);
                                // Don't fail the entire payment if saving fails
                            }
                        }

                        // If this is a guest draft flow, finalize server-side first
                        if (draftId) {
                            try {
                                const finalizeResult: any = await finalizeGuestBooking(draftId, paymentIntent.id);
                                const redirectUrl = finalizeResult?.redirectUrl || `${window.location.origin}/${lang}/book/success`;
                                const url = new URL(redirectUrl, window.location.origin);
                                if (!finalizeResult?.redirectUrl && finalizeResult?.bookingId) {
                                    url.searchParams.append('bookingId', finalizeResult.bookingId);
                                }
                                searchParams?.forEach((value, key) => url.searchParams.append(key, value));
                                go(url.toString());
                                setIsProcessing(false);
                                return;
                            } catch (finalizeErr) {
                                console.error('Failed to finalize guest booking:', finalizeErr);
                                setErrorMessage('Payment succeeded, but finalization failed. Please contact support.');
                                setIsProcessing(false);
                                return;
                            }
                        }

                        // Create booking with successful payment
                        const bookingData = {
                            userId: user?.uid || 'guest',
                            userName: user ? (user.displayName || user.email || 'User') : `${guestInfo.firstName} ${guestInfo.lastName}`,
                            userEmail: user?.email || guestInfo.email,
                            userPhone: guestInfo.phone || '',
                            courseId,
                            courseName: course.name,
                            date,
                            time,
                            players: parseInt(players),
                            holes: holes ? parseInt(holes) : 18,
                            totalPrice: priceDetails.total,
                            status: 'confirmed' as any,
                            teeTimeId,
                            comments: comments || '',
                            specialRequests: specialRequests || '',
                            paymentIntentId: paymentIntent.id,
                            paymentMethod: 'stripe',
                            paymentStatus: 'completed',
                            couponCode: appliedCoupon?.code || ''
                        };

                        console.log('Creating booking with data:', bookingData);
                        console.log('Language:', lang);
                        
                        try {
                            console.log('🔄 [Método Guardado] Iniciando creación de reserva...');
                            const bookingId = await createBooking(bookingData, lang);
                            console.log('✅ [Método Guardado] Reserva creada exitosamente. BookingId:', bookingId);
                            
                            if (bookingId) {
                                const successUrl = new URL(`${window.location.origin}/${lang}/book/success`);
                                searchParams?.forEach((value, key) => successUrl.searchParams.append(key, value));
                                successUrl.searchParams.append('paymentMethod', selectedPaymentType);
                                successUrl.searchParams.append('paymentStatus', 'completed');
                                successUrl.searchParams.append('bookingId', bookingId);
                                
                                console.log('🔗 [Método Guardado] URL de éxito construida:', successUrl.toString());
                                console.log('🚀 [Método Guardado] Iniciando redirección...');
                                
                                go(successUrl.toString());
                                console.log('✅ [Método Guardado] Redirección ejecutada');
                                return;
                            } else {
                                console.error('createBooking returned null or undefined:', bookingId);
                                throw new Error('Error creating booking - no booking ID returned');
                            }
                        } catch (createBookingError) {
                            console.error('Error in createBooking function:', createBookingError);
                            throw new Error(`Error creating booking: ${createBookingError.message}`);
                        }
                    } else {
                        throw new Error('Payment was not completed successfully');
                    }
                } catch (error) {
                    console.error('Error processing Stripe payment:', error);
                    try { Sentry.captureException(error as any); } catch {}
                    if (courseId && time) {
                        logEvent('payment_abandoned', { courseId, teeTime: time, stage: 'abandoned', method: 'stripe' });
                    }
                    if (courseId && time) {
                        const cancelUrl = new URL(`${window.location.origin}/${lang}/book/cancel`)
                        cancelUrl.searchParams.set('courseId', courseId)
                        cancelUrl.searchParams.set('time', time)
                        go(cancelUrl.toString())
                    }
                    throw error;
                }
            }

            if (paymentMode === 'saved' && selectedPaymentMethod) {
                // Process payment with saved method securely
                if (!currentQuote) {
                     throw new Error("Price quote not available. Please refresh and try again.");
                }

                if (!stripe) {
                    throw new Error("Payment system not ready.");
                }

                // 1. Create secure intent using the same robust endpoint
                const response = await fetchWithAbort('/api/checkout/create-intent', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            courseId,
                            date,
                            time,
                            players: parseInt(players),
                            holes: holes ? parseInt(holes) : 18,
                            currency: currentQuote.currency,
                            tax_rate: currentQuote.tax_rate,
                            subtotal_cents: currentQuote.subtotal_cents,
                            discount_cents: currentQuote.discount_cents,
                            tax_cents: currentQuote.tax_cents,
                            total_cents: currentQuote.total_cents,
                            quote_hash: currentQuote.quote_hash,
                            expires_at: currentQuote.expires_at,
                            promoCode: appliedCoupon?.code || '',
                            guestEmail: user?.email || guestInfo.email,
                            guestName: user ? (user.displayName || user.email || 'User') : `${guestInfo.firstName} ${guestInfo.lastName}`,
                            savePaymentMethod: false // Already saved
                        }),
                });

                if (!response.ok) {
                    const errData = await response.json();
                    throw new Error(errData.error || 'Failed to initialize payment');
                }

                const { client_secret } = await response.json();

                // 2. Confirm with saved method
                const { error, paymentIntent } = await stripe.confirmCardPayment(client_secret, {
                    payment_method: selectedPaymentMethod.id,
                });

                if (error) {
                    setErrorMessage(error.message || "Payment failed. Please try again.");
                    setIsProcessing(false);
                    return;
                }

                if (paymentIntent && paymentIntent.status === 'succeeded') {
                    const successUrl = new URL(`${window.location.origin}/${lang}/book/success`);
                    searchParams?.forEach((value, key) => successUrl.searchParams.append(key, value));
                    go(successUrl.toString());
                }
            } else {
                // Process payment with new method (existing Stripe flow with fallbacks)
                if (!stripe || !elements) {
                    setErrorMessage("Payment system not ready. Please try again.");
                    setIsProcessing(false);
                    return;
                }

                // Wrap Stripe payment processing with fallback system
                const stripeResult = await withFallback('stripe', async () => {
                    const { error: submitError } = await elements.submit();
                    if (submitError) {
                        throw new Error(submitError.message || "An unexpected error occurred.");
                    }
                    
                    if (!currentQuote) {
                        throw new Error("Price quote not available. Please refresh and try again.");
                    }

                    // Generate a unique booking ID for this payment attempt
                    const tempBookingId = `booking_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                    
                    const response = await fetchWithAbort('/api/checkout/create-intent', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            courseId,
                            date,
                            time,
                            players: parseInt(players),
                            holes: holes ? parseInt(holes) : 18,
                            currency: currentQuote.currency,
                            tax_rate: currentQuote.tax_rate,
                            subtotal_cents: currentQuote.subtotal_cents,
                            discount_cents: currentQuote.discount_cents,
                            tax_cents: currentQuote.tax_cents,
                            total_cents: currentQuote.total_cents,
                            quote_hash: currentQuote.quote_hash,
                            expires_at: currentQuote.expires_at,
                            promoCode: appliedCoupon?.code || '',
                            guestEmail: user?.email || guestInfo.email,
                            guestName: user ? (user.displayName || user.email || 'User') : `${guestInfo.firstName} ${guestInfo.lastName}`,
                            savePaymentMethod: savePaymentMethod
                        }),
                    });
                    
                    if (!response.ok) {
                        throw new Error('Failed to create payment intent');
                    }
                    
                    const responseData = await response.json();
                    const { client_secret: clientSecret } = responseData;
                    
                    if (!clientSecret) {
                        throw new Error("Failed to initialize payment. Please try again.");
                    }

                    // Confirm payment attempt
                    const { error, paymentIntent } = await stripe.confirmPayment({
                        elements,
                        clientSecret,
                        confirmParams: {
                            return_url: `${window.location.origin}/${lang}/book/success`,
                        },
                        redirect: 'if_required',
                    });

                    if (error) {
                        const { userMessage, fallbacksAvailable, showRetryWithNewCard } = handleStripeError(error as StripeError);
                        setErrorMessage(userMessage);
                        setAvailableFallbacks(fallbacksAvailable);
                        setShowRetryNewCard(showRetryWithNewCard);
                        // No relanzamos el error, permitimos al usuario ver las opciones
                        // En este caso, el `withFallback` no se activará, pero el usuario ve el error.
                        throw new Error(userMessage); // Lanzamos para que withFallback lo capture
                    }

                    if (paymentIntent && paymentIntent.status === 'succeeded') {
                        // Save payment method if requested with $1 validation charge
                        if (savePaymentMethod && paymentIntent.payment_method) {
                            try {
                                // First validate the card with $1 charge
                                const validationResult = await validateCard(paymentIntent.payment_method as string);
                                
                                if (validationResult.success && validationResult.validated) {
                                    // Save the payment method after successful validation
                                    await fetch('/api/payment-methods', {
                                        method: 'POST',
                                        headers: {
                                            'Content-Type': 'application/json',
                                        },
                                        body: JSON.stringify({
                                            paymentMethodId: paymentIntent.payment_method,
                                        }),
                                    });
                                    
                                    toast({
                                        title: "Tarjeta guardada exitosamente",
                                        description: "Tu tarjeta ha sido validada y guardada para futuros pagos.",
                                    });
                                } else {
                                    console.warn('Card validation failed, not saving payment method:', validationResult.error);
                                    toast({
                                        title: "Advertencia",
                                        description: "El pago fue exitoso pero no se pudo validar la tarjeta para guardarla.",
                                        variant: "destructive"
                                    });
                                }
                            } catch (saveError) {
                                console.error('Error validating/saving payment method:', saveError);
                                toast({
                                    title: "Advertencia",
                                    description: "El pago fue exitoso pero no se pudo guardar la tarjeta.",
                                    variant: "destructive"
                                });
                            }
                        }

                        // Finalizar reserva de invitado si hay borrador
                        if (draftId) {
                            try {
                                const finalizeResult: any = await finalizeGuestBooking(draftId, paymentIntent.id);
                                const redirectUrl = finalizeResult?.redirectUrl || `${window.location.origin}/${lang}/book/success`;
                                const url = new URL(redirectUrl, window.location.origin);
                                searchParams?.forEach((value, key) => url.searchParams.append(key, value));
                                if (!finalizeResult?.redirectUrl && finalizeResult?.bookingId) {
                                    url.searchParams.append('bookingId', finalizeResult.bookingId);
                                }
                                // Activar nota FX si corresponde
                                if (paymentIntent.currency === 'mxn') {
                                    setShowFxNote(true);
                                }
                                go(url.toString());
                                return { success: true };
                            } catch (finalizeError) {
                                console.error('Error finalizando reserva de invitado:', finalizeError);
                                setErrorMessage('El pago fue exitoso, pero la finalización falló. Contacta soporte.');
                                return { success: false };
                            }
                        }

                        console.log('🔄 Iniciando creación de reserva...');
                        const bookingId = await createBooking({
                            userId: user?.uid || 'guest',
                            userName: user ? (user.displayName || user.email || 'User') : `${guestInfo.firstName} ${guestInfo.lastName}`,
                            userEmail: user?.email || guestInfo.email,
                            userPhone: guestInfo.phone || '',
                            courseId,
                            courseName: course.name,
                            date,
                            time,
                            players: parseInt(players),
                            holes: holes ? parseInt(holes) : 18,
                            totalPrice: currentQuote ? currentQuote.total_cents / 100 : priceDetails.total,
                            status: 'confirmed',
                            teeTimeId,
                            comments: comments || '',
                            specialRequests: specialRequests || '',
                            couponCode: appliedCoupon?.code || ''
                        }, lang);
                        
                        console.log('✅ Reserva creada exitosamente. BookingId:', bookingId);
                        
                        const successUrl = new URL(`${window.location.origin}/${lang}/book/success`);
                        searchParams?.forEach((value, key) => successUrl.searchParams.append(key, value));
                        successUrl.searchParams.append('bookingId', bookingId);
                        
                        console.log('🔗 URL de éxito construida:', successUrl.toString());
                        console.log('🚀 Iniciando redirección...');
                        
                        // Activar nota FX si corresponde
                        if (paymentIntent.currency === 'mxn') {
                            console.log('💱 Activando nota FX para pago en MXN');
                            setShowFxNote(true);
                        }
                        
                        try { logEvent('payment_completed', { courseId, teeTime: time, stage: 'paid', bookingId, method: 'stripe' }); } catch {}
                        go(successUrl.toString());
                        console.log('✅ Redirección ejecutada');
                        return { success: true };
                    }

                    throw new Error("Payment was not successful");
                });

                // Handle fallback result
                const sr: any = stripeResult as any;
                if (!sr.success && sr.fallbackUsed) {
                    // Fallback was triggered, show appropriate message
                    setErrorMessage(`Error con el procesador de pagos principal. Se recomienda usar un método alternativo como transferencia bancaria o pago en efectivo.`);
                } else if (!sr.success) {
                    // Regular error without fallback
                    setErrorMessage(sr.error || 'Payment failed. Please try again.');
                }
            }
        }, {
            onError: async (error: any) => {
                console.error('HandleAsyncError caught:', error);
                setErrorMessage(error.message || 'An unexpected error occurred.');
            }
        });
        
        setIsProcessing(false);
    };

    useEffect(() => {
        const onBeforeUnload = () => {
            if (showPaymentForm && !isProcessing && courseId && time) {
                logEvent('payment_abandoned', { courseId, teeTime: time, stage: 'abandoned' });
            }
        };
        window.addEventListener('beforeunload', onBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', onBeforeUnload);
        };
    }, [showPaymentForm, isProcessing, courseId, time, logEvent]);

    if (isLoading || authLoading) {
        return (
            <div className="container mx-auto max-w-4xl px-4 py-12">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <Skeleton className="h-96 w-full" />
                     <Skeleton className="h-96 w-full" />
                 </div>
            </div>
        );
    }
    
    if (!course && !event) {
        return <div className="text-center py-12">Course or event not found.</div>;
    }

    // Determinar qué datos mostrar (curso o evento)
    const displayData = event || course;
    const isEventBooking = !!event;
    
    return (
        <div className="container mx-auto max-w-4xl px-4 py-12">
            <Button variant="ghost" onClick={() => router.back()} className="mb-6">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {isEventBooking ? 'Back to Event' : 'Back to Course'}
            </Button>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle className="font-headline text-2xl text-primary">
                            {isEventBooking ? 'Event Ticket Summary' : 'Booking Summary'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="relative aspect-video w-full rounded-lg overflow-hidden mb-4">
                            <FirebaseImage
                                src={normalizeImageUrl(displayData?.imageUrls?.[0] || displayData?.imageUrl) ?? '/images/fallback.svg'}
                                alt={displayData?.name || displayData?.title}
                                fill
                                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                className="object-cover"
                                data-ai-hint={isEventBooking ? "event" : "golf course"}
                            />
                        </div>
                        <h3 className="text-xl font-bold">{displayData?.name || displayData?.title}</h3>
                        <p className="text-sm text-muted-foreground">{displayData?.location || displayData?.description}</p>
                        <Separator />
                        <div className="space-y-2 text-sm">
                            <div className="flex items-center"><User className="h-4 w-4 mr-3 text-muted-foreground" /><span><span className="font-semibold">{players}</span> Player(s)</span></div>
                            <div className="flex items-center"><Calendar className="h-4 w-4 mr-3 text-muted-foreground" /><span>{isClient && formattedDate ? formattedDate : <Skeleton className="h-4 w-24 inline-block" />}</span></div>
                            <div className="flex items-center"><Clock className="h-4 w-4 mr-3 text-muted-foreground" /><span><span className="font-semibold">{time}</span> Tee Time</span></div>
                            {holes && <div className="flex items-center"><Users className="h-4 w-4 mr-3 text-muted-foreground" /><span><span className="font-semibold">{holes}</span> Holes</span></div>}
                             {comments && (
                                <div className="flex items-start pt-2">
                                    <MessageSquare className="h-4 w-4 mr-3 mt-1 text-muted-foreground" />
                                    <div>
                                        <span className="font-semibold">Comments:</span>
                                        <p className="text-muted-foreground text-xs italic">{comments}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                         <Separator />
                         {/* Price Breakdown */}
                         {isQuoteLoading ? (
                             <div className="space-y-2">
                                 <Skeleton className="h-4 w-full" />
                                 <Skeleton className="h-4 w-full" />
                                 <Skeleton className="h-4 w-full" />
                             </div>
                         ) : quoteError ? (
                             <div className="text-red-600 text-sm p-2 bg-red-50 rounded">
                                 {quoteError}
                             </div>
                         ) : currentQuote ? (
                             <PriceBreakdown
                                 pricing={currentQuote}
                                 className="text-sm"
                             />
                         ) : (
                             <div className="text-muted-foreground text-sm">
                                 Calculando precio...
                             </div>
                         )}
                    </CardContent>
                    <CardFooter className="bg-card p-6 border-t">
                        <div className="w-full">
                            <div className="flex justify-between items-center">
                                <span className="text-lg">Total Price:</span>
                                <span className="text-2xl font-bold text-primary">
                                    {currentQuote ? `${(currentQuote.total_cents / 100).toFixed(2)} USD` : `${priceDetails.total.toFixed(2)} USD`}
                                </span>
                            </div>
                            {showFxNote && process.env.NEXT_PUBLIC_SHOW_FX_NOTE === 'true' && (
                                <div className="mt-2 text-sm text-muted-foreground italic">
                                    Pago procesado en MXN equivalente a tu tarifa en USD.
                                </div>
                            )}
                        </div>
                    </CardFooter>
                </Card>

                <Card className="lg:col-span-1">
                    <CardHeader>
                         <CardTitle className="font-headline text-xl">Complete Your Booking</CardTitle>
                         <CardDescription>Confirm your details and proceed to our secure payment portal.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 space-y-4">
                            <h4 className="font-semibold text-primary">{user ? 'Booking Information' : 'Guest Information'}</h4>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label htmlFor="guest-firstName">First Name *</Label>
                                    <Input
                                        id="guest-firstName"
                                        placeholder={user?.displayName?.split(' ')[0] || "Enter first name"}
                                        value={guestInfo.firstName}
                                        onChange={(e) => setGuestInfo(prev => ({ ...prev, firstName: e.target.value }))}
                                        required
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="guest-lastName">Last Name *</Label>
                                    <Input
                                        id="guest-lastName"
                                        placeholder={user?.displayName?.split(' ').slice(1).join(' ') || "Enter last name"}
                                        value={guestInfo.lastName}
                                        onChange={(e) => setGuestInfo(prev => ({ ...prev, lastName: e.target.value }))}
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <Label htmlFor="guest-email">Email *</Label>
                                <Input
                                    id="guest-email"
                                    type="email"
                                    placeholder={user?.email || "Enter email address"}
                                    value={guestInfo.email}
                                    onChange={(e) => setGuestInfo(prev => ({ ...prev, email: e.target.value }))}
                                    required
                                />
                            </div>
                            <div>
                                <Label htmlFor="guest-phone">Phone Number *</Label>
                                <Input
                                    id="guest-phone"
                                    type="tel"
                                    placeholder="Enter phone number"
                                    value={guestInfo.phone}
                                    onChange={(e) => setGuestInfo(prev => ({ ...prev, phone: e.target.value }))}
                                    required
                                />
                            </div>
                            <div>
                                <Label htmlFor="special-requests">Indicaciones Especiales (Opcional)</Label>
                                <textarea
                                    id="special-requests"
                                    className="w-full min-h-[80px] px-3 py-2 border border-input bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 rounded-md resize-none"
                                    placeholder="Ej: Necesito un carrito de golf, tengo movilidad reducida, celebración especial, etc."
                                    value={specialRequests}
                                    onChange={(e) => setSpecialRequests(e.target.value)}
                                    maxLength={500}
                                />
                                <div className="text-xs text-muted-foreground mt-1">
                                    {specialRequests.length}/500 caracteres
                                </div>
                            </div>
                            {user && (
                                <div className="text-sm text-muted-foreground bg-blue-50 p-3 rounded-md">
                                    💡 You can modify your information for this booking. Your account details will remain unchanged.
                                </div>
                            )}
                        </div>

                         <div>
                            <Label htmlFor="coupon-code">Coupon Code</Label>
                            <div className="flex items-center gap-2 mt-1">
                                <Input 
                                    id="coupon-code" 
                                    placeholder="Enter code" 
                                    value={couponCode}
                                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                    disabled={!!appliedCoupon}
                                />
                                {appliedCoupon ? (
                                    <Button variant="ghost" size="icon" onClick={handleRemoveCoupon}>
                                        <XCircle className="h-5 w-5 text-destructive" />
                                    </Button>
                                ) : (
                                    <Button onClick={handleApplyCoupon} disabled={isCouponPending}>
                                        {isCouponPending ? <Loader2 className="h-4 w-4 animate-spin"/> : 'Apply'}
                                    </Button>
                                )}
                            </div>
                            {couponMessage && (
                                <p className={`mt-2 text-sm ${appliedCoupon ? 'text-green-600' : 'text-destructive'}`}>
                                    {couponMessage}
                                </p>
                            )}
                        </div>

                        {/* Payment Terms Checkbox */}
                        <PaymentTermsCheckbox
                            checked={termsAccepted}
                            onCheckedChange={setTermsAccepted}
                            lang={lang}
                            disabled={isProcessing}
                        />
                    </CardContent>
                    <CardFooter>
                        <Button 
                            onClick={handleProceedToPayment} 
                            className="w-full text-lg font-bold h-12"
                            disabled={!termsAccepted || isProcessing}
                        >
                            <Lock className="mr-2 h-5 w-5"/>
                            Proceed to Payment
                        </Button>
                    </CardFooter>
                </Card>


            </div>

            {showPaymentForm && (
                <Card className="lg:col-span-2 mt-6">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="font-headline text-xl text-primary">Pago Seguro</CardTitle>
                                <CardDescription>
                                    Elige tu método de pago preferido. Tu transacción está protegida y encriptada.
                                </CardDescription>
                            </div>
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => setShowPaymentForm(false)}
                                className="text-muted-foreground hover:text-foreground"
                            >
                                ← Volver al resumen
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">

                        {/* Payment Method Selector */}
                        <PaymentMethodSelector
                            selectedMethod={selectedPaymentType}
                            onMethodChange={setSelectedPaymentType}
                            disabled={isProcessing}
                        />

                        {/* Error Message */}
                        {errorMessage && (
                            <div className="text-destructive text-sm font-medium p-3 bg-destructive/10 rounded-md border border-destructive/20">
                                {errorMessage}
                            </div>
                        )}

                        {/* Fallback & Retry UI */}
                        {(availableFallbacks.length > 0 || showRetryNewCard) && (
                            <div className="flex flex-col gap-3 mt-4 p-4 bg-muted/50 rounded-lg">
                                <div className="text-sm text-muted-foreground">
                                    Sugerencia: si tu tarjeta falla o requiere pasos adicionales, puedes reintentar con otra tarjeta o usar un método alternativo.
                                </div>
                                {showRetryNewCard && (
                                     <Button
                                         variant="outline"
                                         onClick={() => {
                                             elements?.getElement('payment')?.clear();
                                             setErrorMessage(null);
                                             setShowRetryNewCard(false);
                                             setAvailableFallbacks([]);
                                         }}
                                     >
                                         Usar otra tarjeta
                                     </Button>
                                )}
                                {availableFallbacks.includes('paypal') && (
                                    <Button variant="secondary" onClick={() => setSelectedPaymentType('paypal')}>
                                        Pagar con PayPal
                                    </Button>
                                )}
                                {availableFallbacks.includes('link') && (
                                     <Button variant="secondary" onClick={() => { /* Lógica para Link si es necesaria */ }}>
                                         Pagar con Link
                                     </Button>
                                )}
                            </div>
                        )}

                        {/* Stripe Payment */}
                        {selectedPaymentType === 'stripe' && (
                            <div className="space-y-4">
                                <Tabs value={paymentMode} onValueChange={(value) => {
                                    setPaymentMode(value as 'new' | 'saved');
                                    setSelectedPaymentMethod(null);
                                    setErrorMessage(null);
                                }} className="w-full">
                                    <TabsList className="grid w-full grid-cols-2">
                                        {paymentMethods.length > 0 && (
                                            <TabsTrigger value="saved">Métodos Guardados</TabsTrigger>
                                        )}
                                        <TabsTrigger value="new">
                                            {paymentMethods.length > 0 ? 'Nuevo Método' : 'Detalles de Pago'}
                                        </TabsTrigger>
                                    </TabsList>
                                    
                                    {paymentMethods.length > 0 && (
                                        <TabsContent value="saved" className="space-y-4">
                        <SavedPaymentMethods
                            onSelectPaymentMethod={setSelectedPaymentMethod}
                            selectedPaymentMethodId={selectedPaymentMethod?.id}
                            showAddButton={false}
                        />
                        
                        <div className="text-sm text-muted-foreground">No se te cobrará hasta confirmar en el último paso</div>
                        <Button 
                            onClick={handleSubmit} 
                            className="w-full text-lg font-bold h-12" 
                            disabled={!selectedPaymentMethod || isProcessing}
                        >
                                                {isProcessing ? (
                                                    <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Procesando...</>
                                                ) : (
                                                    `Pagar ${priceDetails.total.toFixed(2)} USD y Confirmar`
                                                )}
                                            </Button>
                                        </TabsContent>
                                    )}
                                    
                                    <TabsContent value="new" className="space-y-4">
                                        <form onSubmit={handleSubmit} className="space-y-4">
                                            <div className="text-sm text-muted-foreground">No se te cobrará hasta confirmar en el último paso</div>
                                            <PaymentElement
                                                options={paymentElementOptions}
                                                onReady={() => setIsPaymentElementReady(true)}
                                                onChange={(e: any) => {
                                                    const msg = e?.error?.message
                                                    if (msg) {
                                                        setErrorMessage(msg)
                                                        try { Sentry.captureException(new Error(`PaymentElement loaderror: ${msg}`)) } catch {}
                                                    }
                                                }}
                                            />
                                            
                                            <div className="flex items-center space-x-2 p-3 bg-muted/50 rounded-md">
                                                <input 
                                                    type="checkbox" 
                                                    id="savePaymentMethod" 
                                                    checked={savePaymentMethod}
                                                    onChange={(e) => setSavePaymentMethod(e.target.checked)}
                                                    className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                                                />
                                                <Label htmlFor="savePaymentMethod" className="text-sm font-medium">
                                                    Guardar este método de pago para futuras reservas
                                                    <span className="block text-xs text-muted-foreground mt-1">
                                                        Se realizará un cargo de validación de $1.00 USD
                                                    </span>
                                                </Label>
                                            </div>
                                            
                                            <Button 
                                                type="submit" 
                                                className="w-full text-lg font-bold h-12" 
                                                disabled={!stripe || isProcessing || isValidating || !isPaymentElementReady}
                                            >
                                                {!isPaymentElementReady ? (
                                                    "Cargando..."
                                                ) : (isProcessing || isValidating) ? (
                                                    <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> 
                                                    {isValidating ? 'Validando tarjeta...' : 'Procesando...'}</>
                                                ) : (
                                                    `Pagar ${priceDetails.total.toFixed(2)} USD y Confirmar`
                                                )}
                                            </Button>
                                        </form>
                                    </TabsContent>
                                </Tabs>
                            </div>
                        )}

                        {/* PayPal Payment - Temporarily Hidden */}
                        {false && selectedPaymentType === 'paypal' && (
                            <div className="space-y-4">
                                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Shield className="h-4 w-4 text-blue-600" />
                                        <span className="text-sm font-medium text-blue-800">Pago con PayPal</span>
                                    </div>
                                <p className="text-sm text-blue-700">
                                    Serás redirigido a PayPal para completar tu pago de forma segura.
                                </p>
                                <p className="text-sm text-muted-foreground mt-2">No se te cobrará hasta confirmar en el último paso</p>
                            </div>
                                
                                <PayPalButton
                                    amount={priceDetails.total}
                                    currency="USD"
                                    onSuccess={handlePayPalSuccess}
                                    onError={handlePayPalError}
                                    disabled={isProcessing}
                                />
                            </div>
                        )}


                    </CardContent>
                </Card>
            )}
        </div>
    );
}
// @ts-nocheck
