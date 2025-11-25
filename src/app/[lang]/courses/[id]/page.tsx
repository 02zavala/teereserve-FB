"use client";

import { getCourseBySlugOrId } from '@/lib/data';
import { getDictionary } from '@/lib/get-dictionary';
import { notFound, useParams, usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { MapPin, ShieldCheck, Star, Sun, Wind, Droplets, Eye, Gauge, CheckCircle } from 'lucide-react';
import { LazyTeeTimePickerWithSuspense, LazyReviewSection, LazyRecommendations, LazyTRMapWithSuspense, LazyWeatherWithSuspense } from '@/components/LazyComponents';
import { Suspense, useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Locale } from '@/i18n-config';
import type { GolfCourse } from '@/types';
import { Badge } from '@/components/ui/badge';
import { format } from "date-fns";
import { dateLocales } from "@/lib/date-utils";
import { BookingModal } from '@/components/BookingModal';
import { useAuth } from '@/context/AuthContext';
import { gtagEvent } from '@/lib/ga';




export default function CourseDetailPage() {
    const params = useParams();
    const pathname = usePathname();
    const router = useRouter();
    const { user } = useAuth();
    const [course, setCourse] = useState<GolfCourse | null>(null);
    const [dictionary, setDictionary] = useState<any>(null);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
    const [minPrice, setMinPrice] = useState<number | null>(null);

    const courseId = params ? (Array.isArray(params.id) ? params.id[0] : params.id) : null;
    const lang = (pathname?.split('/')[1] || 'en') as Locale;

    useEffect(() => {
        if (!courseId || !lang) return;

        const fetchCourseAndDict = async () => {
            const [courseData, dictData] = await Promise.all([
                getCourseBySlugOrId(courseId),
                getDictionary(lang)
            ]);
            
            if (!courseData) {
                notFound();
            }

            setCourse(courseData);
            setDictionary(dictData);
            setSelectedImage(courseData.imageUrls[0]);
        };
        fetchCourseAndDict();
    }, [courseId, lang]);

    useEffect(() => {
        if (course) {
            const item = {
                currency: 'USD',
                value: typeof course.basePrice === 'number' ? course.basePrice : 0,
                items: [
                    {
                        item_id: course.id,
                        item_name: course.name,
                        item_category: 'golf_course',
                        price: typeof course.basePrice === 'number' ? course.basePrice : 0,
                        quantity: 1,
                    },
                ],
            };
            gtagEvent('view_item', item);
        }
    }, [course]);

    // Cargar precio mínimo derivado para asegurar consistencia con bandas horarias
  useEffect(() => {
    if (!courseId) return;
    let mounted = true;
    const loadMinPrice = async () => {
      try {
        const res = await fetch(`/api/public/pricing/load?courseId=${courseId}`, { cache: 'no-store' });
        if (!res.ok) return;
        const json = await res.json();
        const value = json?.data?.minPrice;
        if (mounted && typeof value === 'number' && !isNaN(value)) {
          setMinPrice(value);
          if (process.env.NODE_ENV !== 'production') {
            console.log('[PUBLIC PRICING] minPrice computed', { courseId, minPrice: value });
          }
        }
      } catch {}
    };
    loadMinPrice();
    return () => { mounted = false; };
  }, [courseId]);

    if (!course || !dictionary) {
        return (
             <div className="container mx-auto px-4 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-4">
                        <Skeleton className="h-12 w-3/4" />
                        <Skeleton className="h-6 w-1/2" />
                        <Skeleton className="aspect-video w-full rounded-lg" />
                        <div className="flex gap-2">
                           <Skeleton className="h-20 w-28 rounded-md" />
                           <Skeleton className="h-20 w-28 rounded-md" />
                           <Skeleton className="h-20 w-28 rounded-md" />
                        </div>
                        <Skeleton className="h-8 w-1/4 mt-4" />
                        <Skeleton className="h-24 w-full" />
                    </div>
                    <div className="lg:col-span-1 space-y-8">
                        <Skeleton className="h-96 w-full" />
                        <Skeleton className="h-64 w-full" />
                    </div>
                </div>
            </div>
        );
    }
    
    const avgRating = course.reviews.length > 0
    ? (course.reviews.reduce((acc, r) => acc + r.rating, 0) / course.reviews.length).toFixed(1)
    : 'No reviews';

    return (
        <div className="bg-background">
            <div className="container mx-auto px-4 py-8">
                {/* Header Section */}
                <div className="mb-8">
                    <h1 className="font-headline text-4xl md:text-5xl font-bold text-primary">{course.name}</h1>
                    <div className="mt-2 flex items-center space-x-4 text-muted-foreground">
                        <div className="flex items-center">
                            <MapPin className="h-5 w-5 mr-2" />
                            <span>{course.location}</span>
                        </div>
                        <div className="flex items-center">
                            <Star className="h-5 w-5 mr-2 text-primary" />
                            <span>{avgRating} ({course.reviews.length} reviews)</span>
                        </div>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column (Main) */}
                    <div className="lg:col-span-2 space-y-8">
                        
                        {/* Image Gallery */}
                        <div>
                             <div className="relative aspect-video w-full rounded-lg overflow-hidden mb-4">
                                {selectedImage && <Image src={selectedImage} alt={`${course.name} view`} data-ai-hint="golf course scene" fill className="object-cover" sizes="(max-width: 768px) 100vw, (max-width: 1200px) 66vw, 50vw" priority />}
                            </div>
                            <div className="flex gap-2 overflow-x-auto pb-2">
                               {course.imageUrls.map((url, index) => (
                                   <div key={index} className="relative aspect-video w-28 h-20 flex-shrink-0 cursor-pointer rounded-md overflow-hidden" onClick={() => setSelectedImage(url)}>
                                       <Image src={url} alt={`${course.name} thumbnail ${index + 1}`} fill className="object-cover" sizes="112px" />
                                        {selectedImage === url && <div className="absolute inset-0 border-2 border-primary rounded-md" />}
                                   </div>
                               ))}
                           </div>
                        </div>
                        
                        {/* Description & Rules */}
                        <div className="space-y-8">
                            <div>
                                <h2 className="font-headline text-3xl font-semibold text-primary mb-4">About the Course</h2>
                                <p className="text-base text-foreground/80 leading-relaxed">{course.description}</p>
                            </div>
                            
                            {/* Map Section */}
                            {course.latLng && (
                                <div className="my-8">
                                    <h2 className="font-headline text-3xl font-semibold text-primary mb-4">Location</h2>
                                    <div className="aspect-video w-full rounded-lg overflow-hidden">
                                        <LazyTRMapWithSuspense 
                            center={[course.latLng.lat, course.latLng.lng]}
                            zoom={15}
                            markers={[{
                                id: course.id,
                                name: course.name,
                                lat: course.latLng.lat,
                                lng: course.latLng.lng,
                                description: course.description,
                                imageUrl: course.imageUrls?.[0],
                                priceFromUSD: typeof minPrice === 'number' ? minPrice : (typeof course.basePrice === 'number' ? course.basePrice : undefined),
                                url: `/${lang}/courses/${course.slug ?? course.id}`
                            }]}
                            height="400px"
                            showUserLocation={true}
                            cluster={false}
                            fitToMarkers={false}
                        />
                                    </div>
                                </div>
                            )}

                            <div>
                                <h3 className="font-headline text-2xl font-semibold text-primary mb-4 flex items-center"><ShieldCheck className="h-6 w-6 mr-2" /> Course Rules</h3>
                                <p className="text-base text-foreground/80 leading-relaxed whitespace-pre-line">{course.rules || 'Standard golf etiquette and club rules apply.'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Right Column (Sidebar) */}
                    <aside className="lg:col-span-1">
                        <div className="sticky top-24 space-y-8">
                            {/* Booking Card */}
                            <Card className="bg-card/90 backdrop-blur-sm border-border/60 shadow-lg">
                                <CardHeader>
                                    <CardTitle className="font-headline text-2xl text-primary">{dictionary.courseDetail?.bookTeeTime || 'Book Tee Time'}</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="text-center">
                                        <p className="text-3xl font-bold text-primary">${typeof minPrice === 'number' ? minPrice : (course && typeof course.basePrice === 'number' && !isNaN(course.basePrice) ? course.basePrice : '—')}</p>
                                        <p className="text-sm text-muted-foreground">{dictionary.courseDetail?.perPlayer || 'per player'}</p>
                                    </div>
                                    <Button 
                                        onClick={() => {
                                            // Hacer scroll al formulario de reserva
                                            const bookingForm = document.getElementById('booking-form');
                                            if (bookingForm) {
                                                bookingForm.scrollIntoView({ 
                                                    behavior: 'smooth',
                                                    block: 'start'
                                                });
                                            }
                                        }}
                                        className="w-full text-lg py-6"
                                        size="lg"
                                    >
                                        Reservar Ahora
                                    </Button>
                                    <p className="text-xs text-muted-foreground text-center">
                                        Reserva sin cuenta o inicia sesión para gestionar tus reservas
                                    </p>
                                </CardContent>
                            </Card>
                            
                            <LazyWeatherWithSuspense 
                              location={course.latLng ? { lat: course.latLng.lat, lng: course.latLng.lng, name: course.name } : undefined}
                            />
                             <LazyTeeTimePickerWithSuspense 
                                courseId={course.id} 
                                basePrice={course.basePrice} 
                                teeTimeInterval={course.teeTimeInterval}
                                operatingHours={course.operatingHours}
                                availableHoles={course.availableHoles}
                                holeDetails={course.holeDetails}
                                lang={lang} 
                            />
                        </div>
                    </aside>
                </div>
                
                {/* Reviews Section */}
                <div className="my-12 border-t pt-12">
                    <LazyReviewSection course={course} />
                </div>

                 {/* Recommendations Section */}
                 <div className="my-12 border-t pt-12">
                    <div className="mb-12 text-center">
                        <h2 className="font-headline text-3xl font-bold text-primary md:text-4xl">You Might Also Like</h2>
                        <p className="mt-2 text-lg text-muted-foreground">Other courses you may enjoy</p>
                    </div>
                    <LazyRecommendations courseId={course.id} dictionary={dictionary.courseCard} lang={lang} />
                </div>
            </div>
            
            {/* Booking Modal */}
            <BookingModal 
                isOpen={isBookingModalOpen}
                onClose={() => setIsBookingModalOpen(false)}
                course={course}
                lang={lang}
            />
        </div>
    )
}

function RecommendationSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
      {[...Array(3)].map((_, i) => (
         <div key={i} className="flex flex-col space-y-3">
         <Skeleton className="h-[225px] w-full rounded-xl" />
         <div className="space-y-2">
           <Skeleton className="h-4 w-[250px]" />
           <Skeleton className="h-4 w-[200px]" />
         </div>
       </div>
      ))}
    </div>
  )
}
