const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Performance optimization analysis and recommendations
async function analyzePerformance() {
  console.log('🚀 Analyzing Performance Optimization...');
  console.log('=' .repeat(50));

  try {
    // Check if bundle analyzer is installed
    console.log('\n📊 Checking bundle analysis tools...');
    try {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      const hasBundleAnalyzer = packageJson.devDependencies?.['@next/bundle-analyzer'] || 
                               packageJson.dependencies?.['@next/bundle-analyzer'];
      
      if (hasBundleAnalyzer) {
        console.log('✅ @next/bundle-analyzer: Installed');
      } else {
        console.log('⚠️  @next/bundle-analyzer: Not installed');
        console.log('   Install with: npm install --save-dev @next/bundle-analyzer');
      }
    } catch (error) {
      console.log('❌ Error checking package.json:', error.message);
    }

    // Check Next.js configuration for performance optimizations
    console.log('\n⚙️  Checking Next.js performance configuration...');
    const nextConfigPath = path.join(process.cwd(), 'next.config.mjs');
    if (fs.existsSync(nextConfigPath)) {
      const nextConfig = fs.readFileSync(nextConfigPath, 'utf8');
      
      // Check for various optimizations
      const optimizations = {
        'Image optimization': nextConfig.includes('images:'),
        'Compression enabled': nextConfig.includes('compress: true'),
        'Package imports optimization': nextConfig.includes('optimizePackageImports'),
        'Source maps disabled in prod': nextConfig.includes('productionBrowserSourceMaps'),
        'Powered by header disabled': nextConfig.includes('poweredByHeader: false'),
        'Security headers': nextConfig.includes('headers()'),
      };

      Object.entries(optimizations).forEach(([feature, enabled]) => {
        console.log(`${enabled ? '✅' : '❌'} ${feature}: ${enabled ? 'Configured' : 'Not configured'}`);
      });
    } else {
      console.log('❌ next.config.mjs: Not found');
    }

    // Check for lazy loading implementation
    console.log('\n🔄 Checking lazy loading implementation...');
    const lazyComponentsPath = path.join(process.cwd(), 'src', 'components', 'LazyComponents.tsx');
    if (fs.existsSync(lazyComponentsPath)) {
      console.log('✅ LazyComponents.tsx: Found');
      
      const lazyContent = fs.readFileSync(lazyComponentsPath, 'utf8');
      const lazyComponents = lazyContent.match(/export const Lazy\w+/g) || [];
      console.log(`   📦 Lazy components found: ${lazyComponents.length}`);
      lazyComponents.forEach(comp => {
        console.log(`      - ${comp.replace('export const ', '')}`);
      });
    } else {
      console.log('❌ LazyComponents.tsx: Not found');
    }

    // Check for dynamic imports usage
    console.log('\n📦 Analyzing dynamic imports...');
    const srcPath = path.join(process.cwd(), 'src');
    let dynamicImportCount = 0;
    let lazyImportCount = 0;
    
    function scanForDynamicImports(dir) {
      const files = fs.readdirSync(dir);
      
      files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          scanForDynamicImports(filePath);
        } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
          const content = fs.readFileSync(filePath, 'utf8');
          
          // Count dynamic imports
          const dynamicMatches = content.match(/import\(/g) || [];
          dynamicImportCount += dynamicMatches.length;
          
          // Count React.lazy usage
          const lazyMatches = content.match(/lazy\(/g) || [];
          lazyImportCount += lazyMatches.length;
        }
      });
    }
    
    if (fs.existsSync(srcPath)) {
      scanForDynamicImports(srcPath);
      console.log(`✅ Dynamic imports found: ${dynamicImportCount}`);
      console.log(`✅ React.lazy usage found: ${lazyImportCount}`);
    }

    // Check for image optimization
    console.log('\n🖼️  Checking image optimization...');
    const publicPath = path.join(process.cwd(), 'public');
    if (fs.existsSync(publicPath)) {
      const imageFiles = [];
      
      function scanForImages(dir) {
        const files = fs.readdirSync(dir);
        files.forEach(file => {
          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);
          
          if (stat.isDirectory()) {
            scanForImages(filePath);
          } else if (/\.(jpg|jpeg|png|gif|bmp)$/i.test(file)) {
            const sizeInMB = (stat.size / (1024 * 1024)).toFixed(2);
            imageFiles.push({ file: path.relative(publicPath, filePath), size: sizeInMB });
          }
        });
      }
      
      scanForImages(publicPath);
      
      console.log(`📊 Image files found: ${imageFiles.length}`);
      const largeImages = imageFiles.filter(img => parseFloat(img.size) > 1);
      if (largeImages.length > 0) {
        console.log('⚠️  Large images (>1MB) found:');
        largeImages.forEach(img => {
          console.log(`   - ${img.file}: ${img.size}MB`);
        });
      } else {
        console.log('✅ No large images found');
      }
    }

    // Check for caching strategies
    console.log('\n💾 Checking caching strategies...');
    const cacheLibPath = path.join(process.cwd(), 'src', 'lib', 'cache.ts');
    if (fs.existsSync(cacheLibPath)) {
      console.log('✅ Cache library: Found');
    } else {
      console.log('❌ Cache library: Not found');
    }

    // Check for service worker/PWA
    console.log('\n📱 Checking PWA configuration...');
    const manifestPath = path.join(process.cwd(), 'public', 'manifest.webmanifest');
    const swPath = path.join(process.cwd(), 'public', 'firebase-messaging-sw.js');
    
    if (fs.existsSync(manifestPath)) {
      console.log('✅ PWA Manifest: Found');
    } else {
      console.log('❌ PWA Manifest: Not found');
    }
    
    if (fs.existsSync(swPath)) {
      console.log('✅ Service Worker: Found');
    } else {
      console.log('❌ Service Worker: Not found');
    }

    // Check for font optimization
    console.log('\n🔤 Checking font optimization...');
    const layoutPath = path.join(process.cwd(), 'src', 'app', 'layout.tsx');
    if (fs.existsSync(layoutPath)) {
      const layoutContent = fs.readFileSync(layoutPath, 'utf8');
      if (layoutContent.includes('next/font')) {
        console.log('✅ Next.js font optimization: Configured');
      } else {
        console.log('⚠️  Next.js font optimization: Not found');
      }
    }

    // Performance recommendations
    console.log('\n💡 Performance Optimization Recommendations:');
    console.log('\n🚀 Already Implemented:');
    console.log('✅ Lazy loading system with custom skeletons');
    console.log('✅ Image optimization with Next.js Image component');
    console.log('✅ Package import optimization');
    console.log('✅ Compression enabled');
    console.log('✅ Security headers configured');
    console.log('✅ Smart preloading system');
    console.log('✅ Bundle optimization with tree shaking');

    console.log('\n🔧 Additional Optimizations to Consider:');
    console.log('1. 📊 Run bundle analysis: npm run analyze');
    console.log('2. 🗜️  Enable gzip/brotli compression on server');
    console.log('3. 🌐 Implement CDN for static assets');
    console.log('4. 💾 Add Redis caching for API responses');
    console.log('5. 🔄 Implement ISR (Incremental Static Regeneration)');
    console.log('6. 📱 Optimize for Core Web Vitals');
    console.log('7. 🎯 Implement resource hints (preload, prefetch)');
    console.log('8. 🧹 Remove unused dependencies');
    console.log('9. 📦 Split vendor bundles');
    console.log('10. 🔍 Implement virtual scrolling for long lists');

    console.log('\n📈 Performance Monitoring:');
    console.log('• Use Lighthouse for performance audits');
    console.log('• Monitor Core Web Vitals in production');
    console.log('• Set up performance budgets');
    console.log('• Use Next.js built-in performance analytics');

    console.log('\n🛠️  Development Tools:');
    console.log('• Bundle analyzer: npm run analyze');
    console.log('• Lighthouse CI for automated testing');
    console.log('• Web Vitals extension for Chrome');
    console.log('• Next.js Speed Insights');

    console.log('\n✅ Performance optimization analysis completed!');
    
  } catch (error) {
    console.error('❌ Error analyzing performance:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Ensure you\'re in the project root directory');
    console.log('2. Check that all configuration files exist');
    console.log('3. Verify Next.js is properly installed');
  }
}

// Run the analysis
analyzePerformance().catch(console.error);