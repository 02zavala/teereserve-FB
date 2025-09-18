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

// CourseMap Loading Skeleton
function CourseMapSkeleton() {
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

// PricingCalendar Loading Skeleton
function PricingCalendarSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center space-x-2">
          <DollarSign className="h-5 w-5 text-muted-foreground" />
          <Skeleton className="h-6 w-32" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Calendar header */}
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-8 w-8" />
        </div>
        
        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {[...Array(42)].map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
        
        {/* Price controls */}
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
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

// Lazy loaded components
export const LazyTeeTimePicker = createLazyComponent(
  () => import('./TeeTimePicker'),
  TeeTimePickerSkeleton,
  'TeeTimePicker'
);

export const LazyReviewSection = createLazyComponent(
  () => import('./ReviewSection'),
  ReviewSectionSkeleton,
  'ReviewSection'
);

export const LazyCourseMap = createLazyComponent(
  () => import('./CourseMap'),
  CourseMapSkeleton,
  'CourseMap'
);

export const LazyPricingCalendar = createLazyComponent(
  () => import('./admin/PricingCalendar').then(module => ({ default: module.PricingCalendar })),
  PricingCalendarSkeleton,
  'PricingCalendar'
);

export const LazyCheckoutForm = createLazyComponent(
  () => import('./CheckoutForm'),
  undefined,
  'CheckoutForm'
);

export const LazyRecommendations = createLazyComponent(
  () => import('./Recommendations'),
  undefined,
  'Recommendations'
);

export const LazyFeaturedReviews = createLazyComponent(
  () => import('./home/FeaturedReviews'),
  undefined,
  'FeaturedReviews'
);

export const LazyScorecardManager = createLazyComponent(
  () => import('./ScorecardManager'),
  undefined,
  'ScorecardManager'
);

export const LazyGamificationSection = createLazyComponent(
  () => import('./GamificationSection'),
  undefined,
  'GamificationSection'
);

export const LazyMyReviews = createLazyComponent(
  () => import('./MyReviews'),
  undefined,
  'MyReviews'
);