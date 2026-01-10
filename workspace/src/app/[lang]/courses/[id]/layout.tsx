import { getCourseBySlugOrId } from '@/lib/data';
import { getDictionary } from '@/lib/get-dictionary';
import { generateSEOMetadata, generateGolfCourseStructuredData } from '@/components/seo/SEOHead';
import type { Metadata } from 'next';
import type { Locale } from '@/i18n-config';
import { notFound, redirect } from 'next/navigation';

interface CourseLayoutProps {
  children: React.ReactNode;
  params: Promise<{ lang: string; id: string }>;
}

// Generar metadata SEO para páginas de cursos individuales
export async function generateMetadata({ params: paramsProp }: { params: Promise<{ lang: string; id: string }> }): Promise<Metadata> {
  const params = await paramsProp;
  const lang = params.lang as Locale;
  const id = params.id;
  
  try {
    const course = await getCourseBySlugOrId(id);
    const dictionary = await getDictionary(lang);
    
    if (!course) {
      return generateSEOMetadata({
        title: 'Course Not Found - TeeReserve Golf',
        description: 'The requested golf course could not be found.',
        noIndex: true
      });
    }

    const title = lang === 'es'
      ? `${course.name} - Reserva Golf en Los Cabos | TeeReserve`
      : `${course.name} - Golf Booking in Los Cabos | TeeReserve`;
      
    const priceSegmentEs = typeof course.basePrice === 'number' && !isNaN(course.basePrice) ? ` Desde $${course.basePrice} USD.` : '';
    const priceSegmentEn = typeof course.basePrice === 'number' && !isNaN(course.basePrice) ? ` Starting from $${course.basePrice} USD.` : '';
    
    const description = lang === 'es'
      ? `Reserva tu tee time en ${course.name}, ${course.location}. ${course.description}${priceSegmentEs} Reserva ahora con TeeReserve Golf.`
        : `Book your tee time at ${course.name}, ${course.location}. ${course.description}${priceSegmentEn} Book now with TeeReserve Golf.`;
      
    const keywords = lang === 'es'
      ? `${course.name}, golf ${course.location}, reserva golf, tee time, campo golf Los Cabos, ${course.name} reservas`
      : `${course.name}, golf ${course.location}, golf booking, tee time, Los Cabos golf course, ${course.name} booking`;

    return generateSEOMetadata({
      title,
      description,
      keywords,
      image: course.imageUrls?.[0] || '/logo-final.png',
      url: `/${lang}/courses/${course.slug ?? id}`,
      locale: lang,
      alternateLocales: [
        { locale: 'es', url: `/es/courses/${course.slug ?? id}` },
        { locale: 'en', url: `/en/courses/${course.slug ?? id}` }
      ],
      type: 'article'
    });
  } catch (error) {
    console.error('Error generating course metadata:', error);
    return generateSEOMetadata({
      title: 'Course - TeeReserve Golf',
      description: 'Premium golf course booking in Los Cabos, Mexico.',
      url: `/${lang}/courses/${id}`,
      locale: lang
    });
  }
}

export default async function CourseLayout({ children, params: paramsProp }: CourseLayoutProps) {
  const params = await paramsProp;
  const lang = params.lang as Locale;
  const id = params.id;
  
  try {
    const course = await getCourseBySlugOrId(id);
    
    if (!course) {
      notFound();
    }

    // Canonical redirect to slug-based URL when param is not the slug
    if (course.slug && id !== course.slug) {
      redirect(`/${lang}/courses/${course.slug}`);
    }

    // Generar datos estructurados para el campo de golf
    const golfCourseStructuredData = generateGolfCourseStructuredData({
      id: course.id,
      slug: course.slug,
      name: course.name,
      description: course.description,
      location: course.location,
      basePrice: course.basePrice,
      imageUrls: course.imageUrls || [],
      totalYards: course.totalYards,
      par: course.par
    });

    return (
      <>
        {/* Datos estructurados JSON-LD para el campo de golf */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(golfCourseStructuredData)
          }}
        />
        
        {/* Datos estructurados adicionales para LocalBusiness */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'LocalBusiness',
              '@id': `https://teereserve.golf/${lang}/courses/${course.slug ?? id}`,
              name: course.name,
              description: course.description,
              image: course.imageUrls?.[0],
              address: {
                '@type': 'PostalAddress',
                addressLocality: course.location,
                addressCountry: 'Mexico'
              },
              geo: course.latLng ? {
                '@type': 'GeoCoordinates',
                latitude: course.latLng.lat,
                longitude: course.latLng.lng
              } : undefined,
              priceRange: `$195 - $295`,
              // telephone: course.contactInfo?.phone, // contactInfo not available in GolfCourse type
              url: `https://teereserve.golf/${lang}/courses/${course.slug ?? id}`,
              // sameAs: course.website ? [course.website] : undefined, // website not available in GolfCourse type
              // aggregateRating: course.averageRating ? {
              //   '@type': 'AggregateRating',
              //   ratingValue: course.averageRating,
              //   reviewCount: course.reviewCount || 0,
              //   bestRating: 5,
              //   worstRating: 1
              // } : undefined, // averageRating and reviewCount not available in GolfCourse type
              offers: {
                '@type': 'Offer',
                price: course.basePrice,
                priceCurrency: 'USD',
                availability: 'https://schema.org/InStock',
                validFrom: new Date().toISOString(),
                url: `https://teereserve.golf/${lang}/courses/${course.slug ?? id}`
              }
            })
          }}
        />
        
        {children}
      </>
    );
  } catch (error) {
    console.error('Error in course layout:', error);
    notFound();
  }
}