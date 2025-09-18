import Head from 'next/head';
import { Metadata } from 'next';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article';
  locale?: string;
  alternateLocales?: { locale: string; url: string }[];
  noIndex?: boolean;
  canonicalUrl?: string;
  structuredData?: object;
}

interface GenerateMetadataProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article';
  locale?: string;
  alternateLocales?: { locale: string; url: string }[];
  noIndex?: boolean;
  canonicalUrl?: string;
}

// Función para generar metadata para App Router
export function generateSEOMetadata({
  title = 'TeeReserve Golf - Premium Golf Booking in Los Cabos',
  description = 'Book premium golf courses in Los Cabos, Mexico. Discover the best tee times, exclusive courses, and unforgettable golf experiences with TeeReserve.',
  keywords = 'golf, Los Cabos, golf booking, tee times, golf courses, Mexico, premium golf, golf vacation',
  image = '/logo-final.png',
  url,
  type = 'website',
  locale = 'en',
  alternateLocales = [],
  noIndex = false,
  canonicalUrl
}: GenerateMetadataProps = {}): Metadata {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://teereserve.golf';
  const fullUrl = url ? `${baseUrl}${url}` : baseUrl;
  const imageUrl = image?.startsWith('http') ? image : `${baseUrl}${image}`;
  const canonical = canonicalUrl || fullUrl;

  const metadata: Metadata = {
    title,
    description,
    keywords,
    authors: [{ name: 'TeeReserve Golf' }],
    creator: 'TeeReserve Golf',
    publisher: 'TeeReserve Golf',
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    metadataBase: new URL(baseUrl),
    alternates: {
      canonical,
      languages: {
        'es': '/es',
        'en': '/en',
        'x-default': '/'
      }
    },
    openGraph: {
      title,
      description,
      url: fullUrl,
      siteName: 'TeeReserve Golf',
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: title,
        }
      ],
      locale,
      type,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
      creator: '@teereservegolf',
      site: '@teereservegolf',
    },
    robots: {
      index: !noIndex,
      follow: !noIndex,
      googleBot: {
        index: !noIndex,
        follow: !noIndex,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    verification: {
      google: process.env.GOOGLE_SITE_VERIFICATION,
      yandex: process.env.YANDEX_VERIFICATION,
      yahoo: process.env.YAHOO_VERIFICATION,
    },
  };

  // Add alternate locales if provided
  if (alternateLocales.length > 0) {
    const languages: Record<string, string> = {};
    alternateLocales.forEach(({ locale, url }) => {
      languages[locale] = url;
    });
    metadata.alternates = {
      ...metadata.alternates,
      languages
    };
  }

  return metadata;
}

// Componente para Pages Router (legacy)
export function SEOHead({
  title = 'TeeReserve Golf - Premium Golf Booking in Los Cabos',
  description = 'Book premium golf courses in Los Cabos, Mexico. Discover the best tee times, exclusive courses, and unforgettable golf experiences with TeeReserve.',
  keywords = 'golf, Los Cabos, golf booking, tee times, golf courses, Mexico, premium golf, golf vacation',
  image = '/logo-final.png',
  url,
  type = 'website',
  locale = 'en',
  alternateLocales = [],
  noIndex = false,
  canonicalUrl,
  structuredData
}: SEOProps) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://teereserve.golf';
  const fullUrl = url ? `${baseUrl}${url}` : baseUrl;
  const imageUrl = image?.startsWith('http') ? image : `${baseUrl}${image}`;
  const canonical = canonicalUrl || fullUrl;

  return (
    <Head>
      {/* Basic Meta Tags */}
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="author" content="TeeReserve Golf" />
      <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      
      {/* Canonical URL */}
      <link rel="canonical" href={canonical} />
      
      {/* Language Alternates */}
      <link rel="alternate" hrefLang="es" href={`${baseUrl}/es${url || ''}`} />
      <link rel="alternate" hrefLang="en" href={`${baseUrl}/en${url || ''}`} />
      <link rel="alternate" hrefLang="x-default" href={`${baseUrl}${url || ''}`} />
      
      {alternateLocales.map(({ locale: altLocale, url: altUrl }) => (
        <link key={altLocale} rel="alternate" hrefLang={altLocale} href={altUrl} />
      ))}
      
      {/* Robots */}
      {noIndex && <meta name="robots" content="noindex, nofollow" />}
      
      {/* Open Graph */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content="TeeReserve Golf" />
      <meta property="og:locale" content={locale} />
      
      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={imageUrl} />
      <meta name="twitter:creator" content="@teereservegolf" />
      <meta name="twitter:site" content="@teereservegolf" />
      
      {/* Additional Meta Tags */}
      <meta name="format-detection" content="telephone=no" />
      <meta name="theme-color" content="#CED46A" />
      <meta name="msapplication-TileColor" content="#CED46A" />
      
      {/* Structured Data */}
      {structuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData)
          }}
        />
      )}
    </Head>
  );
}

// Función para generar datos estructurados
export function generateStructuredData({
  type = 'Organization',
  name = 'TeeReserve Golf',
  description = 'Premium golf booking platform in Los Cabos, Mexico',
  url = 'https://teereserve.golf',
  logo = 'https://teereserve.golf/logo-final.png',
  contactPoint,
  sameAs = [
    'https://facebook.com/teereservegolf',
    'https://twitter.com/teereservegolf',
    'https://instagram.com/teereservegolf'
  ],
  address,
  additionalData = {}
}: {
  type?: string;
  name?: string;
  description?: string;
  url?: string;
  logo?: string;
  contactPoint?: object;
  sameAs?: string[];
  address?: object;
  additionalData?: object;
} = {}) {
  const baseStructure: any = {
    '@context': 'https://schema.org',
    '@type': type,
    name,
    description,
    url,
    logo: {
      '@type': 'ImageObject',
      url: logo
    },
    sameAs,
    ...additionalData
  };

  if (contactPoint) {
    baseStructure.contactPoint = contactPoint;
  }

  if (address) {
    baseStructure.address = address;
  }

  return baseStructure;
}

// Datos estructurados específicos para golf
export function generateGolfCourseStructuredData(course: {
  id: string;
  name: string;
  description: string;
  location: string;
  basePrice: number;
  imageUrls: string[];
  totalYards?: number;
  par?: number;
}) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://teereserve.golf';
  
  return {
    '@context': 'https://schema.org',
    '@type': 'GolfCourse',
    name: course.name,
    description: course.description,
    url: `${baseUrl}/courses/${course.id}`,
    image: course.imageUrls[0],
    address: {
      '@type': 'PostalAddress',
      addressLocality: course.location,
      addressCountry: 'Mexico'
    },
    offers: {
      '@type': 'Offer',
      price: course.basePrice,
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock'
    },
    sport: 'Golf',
    ...(course.totalYards && { 'golfCourseLength': course.totalYards }),
    ...(course.par && { 'par': course.par })
  };
}