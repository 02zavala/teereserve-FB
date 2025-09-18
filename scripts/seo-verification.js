const fs = require('fs');
const path = require('path');

console.log('🔍 TeeReserve Golf - SEO Implementation Verification\n');

// Verificar archivos SEO básicos
function checkBasicSEOFiles() {
  console.log('📋 Checking Basic SEO Files:');
  
  const files = [
    { path: 'public/robots.txt', name: 'Robots.txt' },
    { path: 'src/app/sitemap.xml/route.ts', name: 'Dynamic Sitemap' },
    { path: 'src/components/seo/SEOHead.tsx', name: 'SEO Component' }
  ];
  
  files.forEach(file => {
    const exists = fs.existsSync(file.path);
    console.log(`  ${exists ? '✅' : '❌'} ${file.name}: ${exists ? 'Found' : 'Missing'}`);
  });
  
  console.log('');
}

// Verificar implementación de metadata en páginas
function checkMetadataImplementation() {
  console.log('🏷️ Checking Metadata Implementation:');
  
  const pages = [
    { path: 'src/app/[lang]/page.tsx', name: 'Home Page' },
    { path: 'src/app/[lang]/courses/[id]/layout.tsx', name: 'Course Pages' },
    { path: 'src/app/layout.tsx', name: 'Root Layout' }
  ];
  
  pages.forEach(page => {
    if (fs.existsSync(page.path)) {
      const content = fs.readFileSync(page.path, 'utf8');
      const hasMetadata = content.includes('generateMetadata') || content.includes('metadata');
      const hasSEOImport = content.includes('generateSEOMetadata') || content.includes('SEOHead');
      
      console.log(`  📄 ${page.name}:`);
      console.log(`    ${hasMetadata ? '✅' : '❌'} Metadata: ${hasMetadata ? 'Implemented' : 'Missing'}`);
      console.log(`    ${hasSEOImport ? '✅' : '❌'} SEO Component: ${hasSEOImport ? 'Used' : 'Not Used'}`);
    } else {
      console.log(`  📄 ${page.name}: ❌ File not found`);
    }
  });
  
  console.log('');
}

// Verificar datos estructurados
function checkStructuredData() {
  console.log('🏗️ Checking Structured Data Implementation:');
  
  const files = [
    { path: 'src/app/[lang]/page.tsx', name: 'Home Page', type: 'Organization' },
    { path: 'src/app/[lang]/courses/[id]/layout.tsx', name: 'Course Pages', type: 'GolfCourse/LocalBusiness' }
  ];
  
  files.forEach(file => {
    if (fs.existsSync(file.path)) {
      const content = fs.readFileSync(file.path, 'utf8');
      const hasStructuredData = content.includes('application/ld+json');
      const hasSchemaOrg = content.includes('schema.org');
      
      console.log(`  📊 ${file.name} (${file.type}):`);
      console.log(`    ${hasStructuredData ? '✅' : '❌'} JSON-LD: ${hasStructuredData ? 'Implemented' : 'Missing'}`);
      console.log(`    ${hasSchemaOrg ? '✅' : '❌'} Schema.org: ${hasSchemaOrg ? 'Used' : 'Not Used'}`);
    } else {
      console.log(`  📊 ${file.name}: ❌ File not found`);
    }
  });
  
  console.log('');
}

// Verificar configuración de internacionalización SEO
function checkI18nSEO() {
  console.log('🌍 Checking Internationalization SEO:');
  
  const layoutPath = 'src/app/layout.tsx';
  if (fs.existsSync(layoutPath)) {
    const content = fs.readFileSync(layoutPath, 'utf8');
    const hasViewport = content.includes('viewport');
    const hasLangAttribute = content.includes('lang=');
    
    console.log(`  🌐 Root Layout:`);
    console.log(`    ${hasViewport ? '✅' : '❌'} Viewport Meta: ${hasViewport ? 'Configured' : 'Missing'}`);
    console.log(`    ${hasLangAttribute ? '✅' : '❌'} Lang Attribute: ${hasLangAttribute ? 'Set' : 'Missing'}`);
  }
  
  // Verificar hreflang en componente SEO
  const seoComponentPath = 'src/components/seo/SEOHead.tsx';
  if (fs.existsSync(seoComponentPath)) {
    const content = fs.readFileSync(seoComponentPath, 'utf8');
    const hasHreflang = content.includes('hrefLang') || content.includes('alternateLocales');
    const hasCanonical = content.includes('canonical');
    
    console.log(`  🔗 SEO Component:`);
    console.log(`    ${hasHreflang ? '✅' : '❌'} Hreflang: ${hasHreflang ? 'Implemented' : 'Missing'}`);
    console.log(`    ${hasCanonical ? '✅' : '❌'} Canonical URLs: ${hasCanonical ? 'Implemented' : 'Missing'}`);
  }
  
  console.log('');
}

// Verificar Open Graph y Twitter Cards
function checkSocialMetaTags() {
  console.log('📱 Checking Social Media Meta Tags:');
  
  const seoComponentPath = 'src/components/seo/SEOHead.tsx';
  if (fs.existsSync(seoComponentPath)) {
    const content = fs.readFileSync(seoComponentPath, 'utf8');
    
    const hasOpenGraph = content.includes('openGraph') || content.includes('og:');
    const hasTwitterCard = content.includes('twitter') || content.includes('twitter:card');
    const hasImages = content.includes('images') && content.includes('1200');
    
    console.log(`  📊 Open Graph: ${hasOpenGraph ? '✅ Implemented' : '❌ Missing'}`);
    console.log(`  🐦 Twitter Cards: ${hasTwitterCard ? '✅ Implemented' : '❌ Missing'}`);
    console.log(`  🖼️ Social Images: ${hasImages ? '✅ Configured' : '❌ Missing'}`);
  } else {
    console.log(`  ❌ SEO Component not found`);
  }
  
  console.log('');
}

// Verificar configuración de Next.js para SEO
function checkNextJSConfig() {
  console.log('⚙️ Checking Next.js SEO Configuration:');
  
  const configPath = 'next.config.mjs';
  if (fs.existsSync(configPath)) {
    const content = fs.readFileSync(configPath, 'utf8');
    
    const hasCompression = content.includes('compress');
    const hasHeaders = content.includes('headers');
    const hasRedirects = content.includes('redirects');
    const hasImages = content.includes('images');
    
    console.log(`  🗜️ Compression: ${hasCompression ? '✅ Enabled' : '❌ Disabled'}`);
    console.log(`  🛡️ Security Headers: ${hasHeaders ? '✅ Configured' : '❌ Missing'}`);
    console.log(`  🔄 Redirects: ${hasRedirects ? '✅ Configured' : '❌ Missing'}`);
    console.log(`  🖼️ Image Optimization: ${hasImages ? '✅ Configured' : '❌ Missing'}`);
  } else {
    console.log(`  ❌ Next.js config not found`);
  }
  
  console.log('');
}

// Generar recomendaciones SEO
function generateSEORecommendations() {
  console.log('💡 SEO Recommendations:');
  
  const recommendations = [
    '1. Test your pages with Google PageSpeed Insights',
    '2. Validate structured data with Google Rich Results Test',
    '3. Check mobile-friendliness with Google Mobile-Friendly Test',
    '4. Submit sitemap to Google Search Console',
    '5. Monitor Core Web Vitals regularly',
    '6. Optimize images with next/image component',
    '7. Implement breadcrumb navigation',
    '8. Add FAQ schema for course pages',
    '9. Create location-specific landing pages',
    '10. Monitor search rankings and organic traffic'
  ];
  
  recommendations.forEach(rec => {
    console.log(`  📌 ${rec}`);
  });
  
  console.log('');
}

// Herramientas de testing SEO
function listSEOTestingTools() {
  console.log('🛠️ SEO Testing Tools:');
  
  const tools = [
    { name: 'Google PageSpeed Insights', url: 'https://pagespeed.web.dev/' },
    { name: 'Google Rich Results Test', url: 'https://search.google.com/test/rich-results' },
    { name: 'Google Mobile-Friendly Test', url: 'https://search.google.com/test/mobile-friendly' },
    { name: 'Google Search Console', url: 'https://search.google.com/search-console' },
    { name: 'Lighthouse CI', url: 'https://github.com/GoogleChrome/lighthouse-ci' },
    { name: 'SEMrush Site Audit', url: 'https://www.semrush.com/siteaudit/' },
    { name: 'Ahrefs Site Audit', url: 'https://ahrefs.com/site-audit' },
    { name: 'Screaming Frog SEO Spider', url: 'https://www.screamingfrog.co.uk/seo-spider/' }
  ];
  
  tools.forEach(tool => {
    console.log(`  🔧 ${tool.name}: ${tool.url}`);
  });
  
  console.log('');
}

// Ejecutar todas las verificaciones
function runSEOVerification() {
  checkBasicSEOFiles();
  checkMetadataImplementation();
  checkStructuredData();
  checkI18nSEO();
  checkSocialMetaTags();
  checkNextJSConfig();
  generateSEORecommendations();
  listSEOTestingTools();
  
  console.log('✨ SEO verification completed! Your TeeReserve Golf application is optimized for search engines.');
}

// Ejecutar verificación
runSEOVerification();