export const revalidate = 300;

import { Metadata } from 'next';
import { getDictionary } from '@/lib/get-dictionary';
import { Locale } from '@/i18n-config';
import ReviewsPageClient from './ReviewsPageClient';

// Metadata will be generated dynamically in generateMetadata function
export async function generateMetadata({ params }: ReviewsPageProps): Promise<Metadata> {
  const { lang } = await params;
  
  const title = lang === 'es'
    ? 'Reseñas de Golfistas | TeeReserve'
    : 'Golfer Reviews | TeeReserve';
    
  const description = lang === 'es'
    ? 'Descubre las experiencias de otros golfistas en Los Cabos. Lee reseñas auténticas y comparte tu propia experiencia.'
    : 'Discover the experiences of other golfers in Los Cabos. Read authentic reviews and share your own experience.';
  
  return {
    title,
    description,
  };
}

interface ReviewsPageProps {
  params: Promise<{
    lang: Locale;
  }>;
}

export default async function ReviewsPage({ params }: ReviewsPageProps) {
  const { lang } = await params;
  const dict = await getDictionary(lang);

  return <ReviewsPageClient dict={dict} lang={lang} />;
}