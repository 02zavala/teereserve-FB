
export const revalidate = 300;

import * as React from 'react';
import { CourseSearchForm } from '@/components/CourseSearchForm'
import { getCourses } from '@/lib/data'
import { CourseCard } from '@/components/CourseCard'
import { LazyRecommendations, LazyFeaturedReviews } from '@/components/LazyComponents'
import { Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { getDictionary } from '@/lib/get-dictionary'
import { Locale } from '@/i18n-config'
import { HowItWorks } from '@/components/home/HowItWorks'
import { WhyChooseUs } from '@/components/home/WhyChooseUs'
import { HeroSection } from '@/components/home/HeroSection'
import { DynamicSections } from '@/components/DynamicSections'
import { ImagePreloader } from '@/components/ui/smart-preloader'
import LinkComponent from '@/components/LinkComponent'
import { OptimizedImage } from '@/components/ui/optimized-image'
import { generateSEOMetadata, generateStructuredData } from '@/components/seo/SEOHead'
import type { Metadata } from 'next'

// Generar metadata SEO para la página principal
export async function generateMetadata({ params: paramsProp }: { params: Promise<{ lang: Locale }> }): Promise<Metadata> {
  const params = await paramsProp;
  const lang = params.lang;
  const dictionary = await getDictionary(lang);
  
  const title = lang === 'es' 
    ? 'TeeReserve Golf - Reservas Premium de Golf en Los Cabos'
    : 'TeeReserve Golf - Premium Golf Booking in Los Cabos';
    
  const description = lang === 'es'
    ? 'Reserva campos de golf premium en Los Cabos, México. Descubre los mejores tee times, campos exclusivos y experiencias de golf inolvidables con TeeReserve.'
    : 'Book premium golf courses in Los Cabos, Mexico. Discover the best tee times, exclusive courses, and unforgable golf experiences with TeeReserve.';
    
  const keywords = lang === 'es'
    ? 'golf, Los Cabos, reservas golf, tee times, campos golf, México, golf premium, vacaciones golf'
    : 'golf, Los Cabos, golf booking, tee times, golf courses, Mexico, premium golf, golf vacation';

  return generateSEOMetadata({
    title,
    description,
    keywords,
    url: `/${lang}`,
    locale: lang,
    alternateLocales: [
      { locale: 'es', url: `/es` },
      { locale: 'en', url: `/en` }
    ],
    type: 'website'
  });
}

export default async function Home({ params: paramsProp }: { params: Promise<{ lang: Locale }> }) {
  const params = await paramsProp;
  const lang = params.lang;
  const dictionary = await getDictionary(lang)
  const featuredCourses = await getCourses({ isFeatured: true })
  
  // Precargar imágenes críticas de los cursos destacados
  const criticalImages = featuredCourses.map(course => course.imageUrls[0]).filter(Boolean)

  // Generar datos estructurados para la organización
  const organizationStructuredData = generateStructuredData({
    type: 'Organization',
    name: 'TeeReserve Golf',
    description: lang === 'es' 
      ? 'Plataforma premium de reservas de golf en Los Cabos, México'
      : 'Premium golf booking platform in Los Cabos, Mexico',
    url: 'https://teereserve.golf',
    logo: 'https://teereserve.golf/logo-final.png',
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+52-624-123-4567',
      contactType: 'customer service',
      availableLanguage: ['English', 'Spanish']
    },
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Los Cabos',
      addressRegion: 'Baja California Sur',
      addressCountry: 'Mexico'
    },
    sameAs: [
      'https://facebook.com/teereservegolf',
      'https://twitter.com/teereservegolf',
      'https://instagram.com/teereservegolf'
    ]
  });

  return (
    <>
      {/* Datos estructurados JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationStructuredData)
        }}
      />
      
      <HeroSection dictionary={dictionary.heroSection} lang={lang} />

      <div className="relative bg-background z-10">
          <div className="absolute left-1/2 z-20 w-full max-w-6xl -translate-x-1/2 -translate-y-1/2 px-4">
            <CourseSearchForm dictionary={dictionary.courseSearch} />
          </div>
          <div className="h-24"></div>
      </div>

      {/* Secciones dinámicas del CMS */}
      <section className="bg-background py-8">
        <div className="container mx-auto px-4">
          <DynamicSections />
        </div>
      </section>
      
      <HowItWorks dictionary={dictionary.howItWorks} lang={lang} />

      <WhyChooseUs dictionary={dictionary.whyChooseUs} />

      <section className="bg-background py-16 lg:py-24">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <h2 className="font-headline text-3xl font-bold text-primary md:text-4xl">{dictionary.home.featuredCoursesTitle}</h2>
            <p className="mt-2 text-lg text-muted-foreground">{dictionary.home.featuredCoursesSubtitle}</p>
          </div>
          {/* Precargar imágenes críticas */}
          <ImagePreloader images={criticalImages} />
          
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {featuredCourses.map((course, index) => (
              <div key={course.id} className="group">
                <LinkComponent 
                  href={`/${lang}/courses/${course.id}`}
                  className="block"
                >
                  <CourseCard course={course} dictionary={dictionary.courseCard} lang={lang} asLink />
                </LinkComponent>
              </div>
            ))}
          </div>
        </div>
      </section>


      
      <section className="bg-background py-16 lg:py-24">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <h2 className="font-headline text-3xl font-bold text-primary md:text-4xl">{dictionary.home.featuredReviewsTitle}</h2>
            <p className="mt-2 text-lg text-muted-foreground">{dictionary.home.featuredReviewsSubtitle}</p>
          </div>
          <Suspense fallback={<ReviewsSkeleton />}>
            <LazyFeaturedReviews dictionary={dictionary} lang={lang} />
          </Suspense>
        </div>
      </section>
      
      <section className="bg-card py-16 lg:py-24">
         <div className="container mx-auto px-4">
           <div className="mb-12 text-center">
             <h2 className="font-headline text-3xl font-bold text-primary md:text-4xl">{dictionary.home.recommendationsTitle}</h2>
             <p className="mt-2 text-lg text-muted-foreground">{dictionary.home.recommendationsSubtitle}</p>
           </div>
           <Suspense fallback={<RecommendationSkeleton />}>
             <LazyRecommendations dictionary={dictionary.courseCard} lang={lang} />
           </Suspense>
         </div>
       </section>
    </>
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

function ReviewsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="flex flex-col space-y-3">
          <Skeleton className="h-[200px] w-full rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-[200px]" />
            <Skeleton className="h-4 w-[150px]" />
          </div>
        </div>
      ))}
    </div>
  )
}
