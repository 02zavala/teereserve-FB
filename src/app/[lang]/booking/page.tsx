import { Suspense } from 'react';
import { getDictionary } from '@/lib/get-dictionary';
import { Locale } from '@/i18n-config';
import { BookingPageClient } from './BookingPageClient';
import { Skeleton } from '@/components/ui/skeleton';

interface BookingPageProps {
  params: Promise<{ lang: Locale }>;
  searchParams: Promise<{ courseId?: string }>;
}

export default async function BookingPage({ params, searchParams }: BookingPageProps) {
  const { lang } = await params;
  const { courseId } = await searchParams;
  const dictionary = await getDictionary(lang);

  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    }>
      <BookingPageClient 
        dictionary={dictionary} 
        lang={lang} 
        courseId={courseId}
      />
    </Suspense>
  );
}