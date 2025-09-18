const fs = require('fs');
const path = require('path');

// Colores para la consola
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkMobileResponsiveness() {
  log('\n🔍 VERIFICACIÓN DE RESPONSIVIDAD MÓVIL', 'bold');
  log('=' .repeat(50), 'blue');

  // 1. Verificar hook useIsMobile
  log('\n1. Verificando hook useIsMobile...', 'blue');
  const useMobilePath = path.join(process.cwd(), 'src', 'hooks', 'use-mobile.tsx');
  if (fs.existsSync(useMobilePath)) {
    const content = fs.readFileSync(useMobilePath, 'utf8');
    if (content.includes('MOBILE_BREAKPOINT = 768')) {
      log('   ✅ Hook useIsMobile encontrado con breakpoint 768px', 'green');
    } else {
      log('   ⚠️  Hook useIsMobile encontrado pero sin breakpoint estándar', 'yellow');
    }
  } else {
    log('   ❌ Hook useIsMobile no encontrado', 'red');
  }

  // 2. Verificar configuración de Tailwind
  log('\n2. Verificando configuración de Tailwind...', 'blue');
  const tailwindPath = path.join(process.cwd(), 'tailwind.config.ts');
  if (fs.existsSync(tailwindPath)) {
    const content = fs.readFileSync(tailwindPath, 'utf8');
    if (content.includes('container') && content.includes('screens')) {
      log('   ✅ Configuración de container y screens encontrada', 'green');
    } else {
      log('   ⚠️  Configuración básica de Tailwind encontrada', 'yellow');
    }
  }

  // 3. Verificar componentes principales
  log('\n3. Verificando componentes principales...', 'blue');
  const componentsToCheck = [
    { path: 'src/components/layout/Header.tsx', name: 'Header' },
    { path: 'src/components/layout/Footer.tsx', name: 'Footer' },
    { path: 'src/components/ui/sidebar.tsx', name: 'Sidebar' },
    { path: 'src/components/ui/modal.tsx', name: 'Modal' }
  ];

  componentsToCheck.forEach(component => {
    const fullPath = path.join(process.cwd(), component.path);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const responsiveClasses = [
        'md:', 'lg:', 'xl:', 'sm:', '2xl:',
        'hidden md:', 'md:hidden', 'lg:hidden',
        'grid-cols-1', 'md:grid-cols', 'lg:grid-cols'
      ];
      
      const foundClasses = responsiveClasses.filter(cls => content.includes(cls));
      if (foundClasses.length > 0) {
        log(`   ✅ ${component.name}: ${foundClasses.length} clases responsive encontradas`, 'green');
      } else {
        log(`   ⚠️  ${component.name}: Pocas clases responsive encontradas`, 'yellow');
      }
    } else {
      log(`   ❌ ${component.name}: Archivo no encontrado`, 'red');
    }
  });

  // 4. Verificar páginas principales
  log('\n4. Verificando páginas principales...', 'blue');
  const pagesToCheck = [
    'src/app/[lang]/page.tsx',
    'src/app/[lang]/courses/page.tsx',
    'src/app/[lang]/courses/[id]/page.tsx',
    'src/app/[lang]/admin/dashboard/page.tsx'
  ];

  pagesToCheck.forEach(pagePath => {
    const fullPath = path.join(process.cwd(), pagePath);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const responsivePatterns = [
        /grid.*md:/g,
        /flex.*md:/g,
        /text-.*md:/g,
        /px-.*md:/g,
        /py-.*md:/g
      ];
      
      const matches = responsivePatterns.reduce((acc, pattern) => {
        return acc + (content.match(pattern) || []).length;
      }, 0);
      
      if (matches > 5) {
        log(`   ✅ ${path.basename(pagePath)}: Bien optimizada para móvil`, 'green');
      } else if (matches > 0) {
        log(`   ⚠️  ${path.basename(pagePath)}: Parcialmente optimizada`, 'yellow');
      } else {
        log(`   ❌ ${path.basename(pagePath)}: Necesita optimización móvil`, 'red');
      }
    }
  });

  // 5. Verificar CSS global
  log('\n5. Verificando CSS global...', 'blue');
  const globalCssPath = path.join(process.cwd(), 'src', 'app', 'globals.css');
  if (fs.existsSync(globalCssPath)) {
    const content = fs.readFileSync(globalCssPath, 'utf8');
    if (content.includes('@media') || content.includes('responsive')) {
      log('   ✅ CSS responsive personalizado encontrado', 'green');
    } else {
      log('   ℹ️  CSS global básico (usando Tailwind para responsive)', 'blue');
    }
  }

  // 6. Verificar meta viewport
  log('\n6. Verificando configuración de viewport...', 'blue');
  const layoutPath = path.join(process.cwd(), 'src', 'app', 'layout.tsx');
  if (fs.existsSync(layoutPath)) {
    const content = fs.readFileSync(layoutPath, 'utf8');
    if (content.includes('viewport') || content.includes('width=device-width')) {
      log('   ✅ Meta viewport configurado', 'green');
    } else {
      log('   ⚠️  Meta viewport no encontrado en layout principal', 'yellow');
    }
  }

  // 7. Recomendaciones
  log('\n📋 RECOMENDACIONES PARA MEJORAR RESPONSIVIDAD:', 'bold');
  log('=' .repeat(50), 'blue');
  
  const recommendations = [
    '• Verificar que todas las imágenes tengan tamaños responsive',
    '• Asegurar que los formularios sean fáciles de usar en móvil',
    '• Probar la navegación en dispositivos táctiles',
    '• Verificar que los botones tengan tamaño mínimo de 44px',
    '• Asegurar que el texto sea legible sin zoom',
    '• Probar el rendimiento en dispositivos móviles',
    '• Verificar que los modales se adapten a pantallas pequeñas',
    '• Asegurar que las tablas sean scrolleables horizontalmente'
  ];

  recommendations.forEach(rec => {
    log(rec, 'yellow');
  });

  // 8. Herramientas de testing
  log('\n🛠️  HERRAMIENTAS RECOMENDADAS PARA TESTING:', 'bold');
  log('=' .repeat(50), 'blue');
  
  const tools = [
    '• Chrome DevTools - Device Mode',
    '• Lighthouse Mobile Audit',
    '• BrowserStack para testing real',
    '• Google PageSpeed Insights',
    '• WebPageTest.org',
    '• Responsive Design Checker'
  ];

  tools.forEach(tool => {
    log(tool, 'blue');
  });

  log('\n✅ Verificación de responsividad móvil completada', 'green');
  log('\n💡 Próximos pasos:', 'bold');
  log('   1. Probar la aplicación en dispositivos reales', 'yellow');
  log('   2. Ejecutar auditoría de Lighthouse', 'yellow');
  log('   3. Verificar Core Web Vitals en móvil', 'yellow');
  log('   4. Optimizar imágenes para diferentes densidades', 'yellow');
}

// Ejecutar verificación
checkMobileResponsiveness();