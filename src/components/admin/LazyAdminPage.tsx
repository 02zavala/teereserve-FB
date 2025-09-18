
"use client";

import { Suspense, lazy, ComponentType } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

// Lazy load admin components
const LazyDashboard = lazy(() => import('@/components/admin/Dashboard').then(module => ({ default: module.Dashboard })));
const LazyBackupManager = lazy(() => import('@/components/admin/BackupManager'));

// Loading skeleton for admin pages
function AdminPageSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>
      
      {/* Stats cards skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-7 w-16 mb-1" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Main content skeleton */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Loading component with spinner
function AdminPageLoading() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading admin page...</p>
      </div>
    </div>
  );
}

// Generic lazy wrapper for admin pages
function createLazyAdminPage<T extends object>(
  importFn: () => Promise<{ default: ComponentType<T> }>,
  fallback: 'skeleton' | 'spinner' = 'skeleton'
) {
  const LazyComponent = lazy(importFn);
  
  return function LazyAdminPageWrapper(props: T) {
    const FallbackComponent = fallback === 'skeleton' ? AdminPageSkeleton : AdminPageLoading;
    
    return (
      <Suspense fallback={<FallbackComponent />}>
        <LazyComponent {...(props as any)} />
      </Suspense>
    );
  };
}

export { LazyDashboard, LazyBackupManager };






