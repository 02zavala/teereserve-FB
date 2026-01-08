
import type { Locale } from "@/i18n-config";
import ReviewsClient from './ReviewsClient';


interface ReviewsPageProps {
  params: Promise<{
    lang: Locale;
  }>;
}

export default async function ReviewsPage({ params: paramsProp }: ReviewsPageProps) {
  const params = await paramsProp;
  
  return <ReviewsClient lang={params.lang} />;
}
