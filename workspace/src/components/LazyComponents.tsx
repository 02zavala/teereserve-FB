"use client";

import { Suspense, lazy, ComponentType } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Loader2, MapPin, Calendar, Star, DollarSign } from 'lucide-react';

// TeeTimePicker Loading Skeleton
function TeeTimePickerSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <Skeleton className="h-6 w-32" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Date picker skeleton */}
        <Skeleton className="h-10 w-full" />
        
        {/* Time slots skeleton */}
        <div className="grid grid-cols-3 gap-2">
          {[...Array(9)].map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
        
        {/* Players and price skeleton */}
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-20" />
        </div>
        
        {/* Book button skeleton */}
        <Skeleton className="h-12 w-full" />
      </CardContent>
    </Card>
  );
}

// ReviewSection Loading Skeleton
function ReviewSectionSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-2">
        <Star className="h-6 w-6 text-muted-foreground" />
        <Skeleton className="h-8 w-48" />
      </div>
      
      {/* Rating summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-2">
                <Skeleton className="h-4 w-8" />
                <Skeleton className="h-2 flex-1" />
                <Skeleton className="h-4 w-8" />
              </div>
            ))}
          </div>
        </div>
        <Skeleton className="h-32 w-full" />
      </div>
      
      {/* Reviews list */}
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-start space-x-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center space-x-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-16 w-full" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// TRMap Loading Skeleton
function TRMapSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center space-x-2">
          <MapPin className="h-5 w-5 text-muted-foreground" />
          <Skeleton className="h-6 w-32" />
        </div>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-64 w-full rounded-lg" />
      </CardContent>
    </Card>
  );
}


// Generic loading component
function ComponentLoading({ name }: { name: string }) {
  return (
    <div className="flex items-center justify-center min-h-[200px]">
      <div className="flex flex-col items-center space-y-2">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading {name}...</p>
      </div>
    </div>
  );
}

// Generic lazy wrapper for components
export function createLazyComponent<T extends Record<string, any>>(
  importFn: () => Promise<{ default: ComponentType<T> }>,
  fallback?: ComponentType,
  componentName?: string
) {
  const LazyComponent = lazy(importFn);
  
  return function LazyComponentWrapper(props: T) {
    const FallbackComponent = fallback || (() => <ComponentLoading name={componentName || 'component'} />);
    
    return (
      <Suspense fallback={<FallbackComponent />}>
        <LazyComponent {...(props as any)} />
      </Suspense>
    );
  };
}

// Direct lazy imports without custom wrapper to avoid webpack issues
export const LazyTeeTimePicker = lazy(() => import('./TeeTimePicker'));
export const LazyReviewSection = lazy(() => import('./ReviewSection'));
// TRMap is already wrapped with Next.js dynamic(), so we use lazy import
export const LazyTRMap = lazy(() => import('./map/TRMap'));
export const LazyWeather = lazy(() => import('./weather/Weather'));
export const LazyCheckoutForm = lazy(() => import('./CheckoutForm'));
export const LazyRecommendations = lazy(() => import('./Recommendations'));
export const LazyFeaturedReviews = lazy(() => import('./home/FeaturedReviews'));
export const LazyScorecardManager = lazy(() => import('./ScorecardManager'));
export const LazyGamificationSection = lazy(() => import('./GamificationSection'));
export const LazyMyReviews = lazy(() => import('./MyReviews'));

// Wrapper components with Suspense for better error handling
export function LazyTeeTimePickerWithSuspense(props: any) {
  return (
    <Suspense fallback={<TeeTimePickerSkeleton />}>
      <LazyTeeTimePicker {...props} />
    </Suspense>
  );
}

export function LazyTRMapWithSuspense(props: any) {
  return (
    <Suspense fallback={<TRMapSkeleton />}>
      <LazyTRMap {...props} />
    </Suspense>
  );
}

export function LazyReviewSectionWithSuspense(props: any) {
  return (
    <Suspense fallback={<ReviewSectionSkeleton />}>
      <LazyReviewSection {...props} />
    </Suspense>
  );
}


export function LazyFeaturedReviewsWithSuspense(props: any) {
  return (
    <Suspense fallback={<ReviewSectionSkeleton />}>
      <LazyFeaturedReviews {...props} />
    </Suspense>
  );
}

export function LazyRecommendationsWithSuspense(props: any) {
  return (
    <Suspense fallback={<RecommendationSkeleton />}>
      <LazyRecommendations {...props} />
    </Suspense>
  );
}

export function LazyWeatherWithSuspense(props: any) {
  return (
    <Suspense fallback={<WeatherSkeleton />}>
      <LazyWeather {...props} />
    </Suspense>
  );
}

// Skeleton for weather
function WeatherSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-sm border p-4">
      <div className="flex items-center gap-2 mb-3">
        <Skeleton className="h-5 w-5" />
        <Skeleton className="h-6 w-16" />
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded" />
            <div>
              <Skeleton className="h-8 w-16 mb-1" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-8" />
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-6 w-20" />
        </div>
        <div>
          <Skeleton className="h-4 w-24 mb-2" />
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="text-center">
                <Skeleton className="h-3 w-8 mb-1 mx-auto" />
                <Skeleton className="h-6 w-6 mb-1 mx-auto" />
                <Skeleton className="h-4 w-6 mx-auto" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Skeleton for recommendations
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
  );
}