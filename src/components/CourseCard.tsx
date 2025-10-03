
"use client";

import type { GolfCourse } from '@/types'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MapPin, Star } from 'lucide-react'
import { StarRating } from './StarRating'
import { FirebaseImage } from '@/components/FirebaseImage'
import { normalizeImageUrl } from '@/lib/normalize'
import type { getDictionary } from '@/lib/get-dictionary'
import type { Locale } from '@/i18n-config'
import Link from 'next/link'
// Removed pricingEngine import — we only display basePrice publicly

interface CourseCardProps {
  course: GolfCourse,
  dictionary: Awaited<ReturnType<typeof getDictionary>>['courseCard'],
  lang: Locale,
  asLink?: boolean,
}

export function CourseCard({ course, dictionary, lang, asLink = false }: CourseCardProps) {
  const avgRating = course.reviews.length > 0 
    ? course.reviews.reduce((sum, review) => sum + review.rating, 0) / course.reviews.length 
    : 0;

  // Display basePrice only if present; otherwise, omit numeric price
  const hasBasePrice = typeof course.basePrice === 'number' && !isNaN(course.basePrice);

  const content = (
    <Card className="flex flex-col overflow-hidden transition-transform duration-300 ease-in-out hover:scale-105 hover:shadow-lg">
      <CardHeader className="p-0">
        <div className="relative h-56 w-full overflow-hidden rounded-t-lg">
          <FirebaseImage
            src={normalizeImageUrl(course.imageUrls?.[0]) ?? '/images/fallback.svg'}
            alt={`Vista del campo de golf ${course.name}`}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="transition-transform duration-300 group-hover:scale-110 object-cover"
            priority={false}
          />
        </div>
      </CardHeader>
      <CardContent className="flex-grow p-4">
        <CardTitle className="mb-2 font-headline text-2xl text-primary">
          {course.name}
        </CardTitle>
        <div className="flex items-center text-sm text-muted-foreground mb-2">
          <MapPin className="mr-1.5 h-4 w-4" />
          <span>{course.location}</span>
        </div>
        <div className="flex items-center gap-2">
            <StarRating rating={avgRating} />
            <span className="text-sm text-muted-foreground">({course.reviews.length} {dictionary.reviews})</span>
        </div>
      </CardContent>
      <CardFooter className="flex items-center justify-between bg-card p-4">
        <div className="text-lg font-bold">
            {hasBasePrice ? (
              <>
                {dictionary.from} <span className="text-primary font-bold">${course.basePrice}</span>
              </>
            ) : (
              <span className="text-muted-foreground">{dictionary.from} —</span>
            )}
        </div>
        <Button>
          {dictionary.bookNow}
        </Button>
      </CardFooter>
    </Card>
  );

  if (asLink) return content; // no anclar aquí
  
  // uso independiente (fallback) - mantener link solo si no se usa como asLink
  return content;
}
