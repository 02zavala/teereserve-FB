'use client';

import dynamic from 'next/dynamic';
import { GolfCourse } from '@/types';
import { Locale } from '@/i18n-config';
import type { MarkerData } from '@/components/map/TRMap';
import { Skeleton } from '@/components/ui/skeleton';

// Importar dinámicamente TRMap para evitar problemas de SSR
const TRMap = dynamic(() => import('@/components/map/TRMap'), {
  loading: () => (
    <div className="w-full h-[600px] bg-muted animate-pulse rounded-lg flex items-center justify-center">
      <div className="text-muted-foreground">
        Cargando mapa...
      </div>
    </div>
  ),
  ssr: false
});

interface MapPageClientProps {
  courses: GolfCourse[];
  lang: Locale;
  dictionary: any;
}

export function MapPageClient({ courses, lang, dictionary }: MapPageClientProps) {
  // Convertir los campos de golf a formato de marcadores
  const markers: MarkerData[] = courses.map(course => ({
    id: course.id,
    name: course.name,
    lat: course.latLng!.lat,
    lng: course.latLng!.lng,
    description: course.description,
    imageUrl: course.imageUrls?.[0],
    priceFromUSD: course.basePrice,
    url: `/${lang}/courses/${course.id}`
  }));

  // Centro del mapa en Los Cabos
  const losCabosCenter: [number, number] = [22.8905, -109.9167];

  return (
    <div className="w-full">
      <TRMap
        center={losCabosCenter}
        zoom={10}
        markers={markers}
        height="600px"
        fitToMarkers={true}
        showUserLocation={true}
        cluster={true}
      />
    </div>
  );
}