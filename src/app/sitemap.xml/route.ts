import { getCourses } from '@/lib/data';
import { i18n } from '@/i18n-config';

function generateSiteMap() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://teereserve.golf';
  const currentDate = new Date().toISOString();
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <!-- Homepage -->
  <url>
    <loc>${baseUrl}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
    <xhtml:link rel="alternate" hreflang="es" href="${baseUrl}/es" />
    <xhtml:link rel="alternate" hreflang="en" href="${baseUrl}/en" />
  </url>
  
  <!-- Language-specific pages -->
  ${i18n.locales.map(locale => {
    const langUrl = locale === i18n.defaultLocale ? baseUrl : `${baseUrl}/${locale}`;
    return `
  <!-- ${locale.toUpperCase()} Pages -->
  <url>
    <loc>${langUrl}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
    <xhtml:link rel="alternate" hreflang="es" href="${baseUrl}/es" />
    <xhtml:link rel="alternate" hreflang="en" href="${baseUrl}/en" />
  </url>
  
  <url>
    <loc>${langUrl}/courses</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
    <xhtml:link rel="alternate" hreflang="es" href="${baseUrl}/es/courses" />
    <xhtml:link rel="alternate" hreflang="en" href="${baseUrl}/en/courses" />
  </url>
  
  <url>
    <loc>${langUrl}/about</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
    <xhtml:link rel="alternate" hreflang="es" href="${baseUrl}/es/about" />
    <xhtml:link rel="alternate" hreflang="en" href="${baseUrl}/en/about" />
  </url>
  
  <url>
    <loc>${langUrl}/contact</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
    <xhtml:link rel="alternate" hreflang="es" href="${baseUrl}/es/contact" />
    <xhtml:link rel="alternate" hreflang="en" href="${baseUrl}/en/contact" />
  </url>
  
  <url>
    <loc>${langUrl}/recommendations</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
    <xhtml:link rel="alternate" hreflang="es" href="${baseUrl}/es/recommendations" />
    <xhtml:link rel="alternate" hreflang="en" href="${baseUrl}/en/recommendations" />
  </url>
  
  <url>
    <loc>${langUrl}/reviews</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
    <xhtml:link rel="alternate" hreflang="es" href="${baseUrl}/es/reviews" />
    <xhtml:link rel="alternate" hreflang="en" href="${baseUrl}/en/reviews" />
  </url>
  
  <url>
    <loc>${langUrl}/help</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
    <xhtml:link rel="alternate" hreflang="es" href="${baseUrl}/es/help" />
    <xhtml:link rel="alternate" hreflang="en" href="${baseUrl}/en/help" />
  </url>
  
  <url>
    <loc>${langUrl}/privacy</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.3</priority>
    <xhtml:link rel="alternate" hreflang="es" href="${baseUrl}/es/privacy" />
    <xhtml:link rel="alternate" hreflang="en" href="${baseUrl}/en/privacy" />
  </url>
  
  <url>
    <loc>${langUrl}/terms</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.3</priority>
    <xhtml:link rel="alternate" hreflang="es" href="${baseUrl}/es/terms" />
    <xhtml:link rel="alternate" hreflang="en" href="${baseUrl}/en/terms" />
  </url>`;
  }).join('')}
</urlset>`;
}

export async function GET() {
  try {
    // Get courses for dynamic course pages
    const courses = await getCourses({});
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://teereserve.golf';
    const currentDate = new Date().toISOString();
    
    let sitemap = generateSiteMap();
    
    // Add course pages
    const courseUrls = courses.flatMap(course => 
      i18n.locales.map(locale => {
        const langUrl = locale === i18n.defaultLocale ? baseUrl : `${baseUrl}/${locale}`;
        return `
  <url>
    <loc>${langUrl}/courses/${course.id}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
    <xhtml:link rel="alternate" hreflang="es" href="${baseUrl}/es/courses/${course.id}" />
    <xhtml:link rel="alternate" hreflang="en" href="${baseUrl}/en/courses/${course.id}" />
  </url>`;
      })
    ).join('');
    
    // Insert course URLs before closing urlset tag
    sitemap = sitemap.replace('</urlset>', `${courseUrls}
</urlset>`);
    
    return new Response(sitemap, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600', // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error('Error generating sitemap:', error);
    return new Response('Error generating sitemap', { status: 500 });
  }
}
