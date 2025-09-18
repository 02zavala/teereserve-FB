#!/usr/bin/env node

/**
 * Script de deployment automatizado para TeeReserve en Firebase Hosting
 * Ejecutar: npm run deploy
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, message) {
  log(`\n${step}. ${message}`, 'cyan');
  log('='.repeat(60), 'blue');
}

function runCommand(command, description) {
  try {
    log(`\n🔄 ${description}...`, 'yellow');
    log(`Ejecutando: ${command}`, 'blue');
    
    const result = execSync(command, { 
      encoding: 'utf8', 
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    log(`✅ ${description} completado`, 'green');
    return true;
  } catch (error) {
    log(`❌ Error en: ${description}`, 'red');
    log(`Error: ${error.message}`, 'red');
    return false;
  }
}

function checkPrerequisites() {
  logStep('1', 'VERIFICANDO PREREQUISITOS');
  
  // Verificar Node.js
  try {
    const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
    log(`✅ Node.js: ${nodeVersion}`, 'green');
  } catch (error) {
    log('❌ Node.js no está instalado', 'red');
    return false;
  }
  
  // Verificar npm
  try {
    const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
    log(`✅ npm: ${npmVersion}`, 'green');
  } catch (error) {
    log('❌ npm no está instalado', 'red');
    return false;
  }
  
  // Verificar Firebase CLI
  try {
    const firebaseVersion = execSync('firebase --version', { encoding: 'utf8' }).trim();
    log(`✅ Firebase CLI: ${firebaseVersion}`, 'green');
  } catch (error) {
    log('❌ Firebase CLI no está instalado. Ejecuta: npm install -g firebase-tools', 'red');
    return false;
  }
  
  // Verificar login en Firebase
  try {
    execSync('firebase projects:list', { encoding: 'utf8', stdio: 'pipe' });
    log('✅ Autenticado en Firebase', 'green');
  } catch (error) {
    log('❌ No estás autenticado en Firebase. Ejecuta: firebase login', 'red');
    return false;
  }
  
  // Verificar archivos de configuración
  const requiredFiles = [
    'firebase.json',
    'apphosting.yaml',
    'next.config.mjs',
    '.env.local'
  ];
  
  for (const file of requiredFiles) {
    if (fs.existsSync(file)) {
      log(`✅ ${file} existe`, 'green');
    } else {
      log(`❌ ${file} no encontrado`, 'red');
      return false;
    }
  }
  
  return true;
}

function installDependencies() {
  logStep('2', 'INSTALANDO DEPENDENCIAS');
  return runCommand('npm ci', 'Instalación de dependencias');
}

function runLinting() {
  logStep('3', 'EJECUTANDO LINTING Y VERIFICACIONES');
  
  // ESLint
  if (!runCommand('npm run lint', 'ESLint')) {
    log('⚠️  Advertencia: ESLint falló, continuando...', 'yellow');
  }
  
  // TypeScript check
  if (!runCommand('npx tsc --noEmit', 'Verificación de TypeScript')) {
    log('⚠️  Advertencia: TypeScript check falló, continuando...', 'yellow');
  }
  
  return true;
}

function buildProject() {
  logStep('4', 'CONSTRUYENDO PROYECTO');
  
  // Limpiar build anterior
  if (fs.existsSync('.next')) {
    runCommand('rm -rf .next', 'Limpiando build anterior');
  }
  
  // Build del proyecto
  return runCommand('npm run build', 'Build de Next.js');
}

function configureEnvironmentVariables() {
  logStep('5', 'CONFIGURANDO VARIABLES DE ENTORNO');
  
  // Ejecutar script de configuración de variables
  if (fs.existsSync('scripts/configure-firebase-env.js')) {
    return runCommand('node scripts/configure-firebase-env.js', 'Configuración de variables de entorno');
  } else {
    log('⚠️  Script de configuración de variables no encontrado, saltando...', 'yellow');
    return true;
  }
}

function validateAssets() {
  logStep('6', 'VALIDANDO ASSETS');
  
  // Verificar manifest.json
  if (fs.existsSync('public/manifest.json')) {
    log('✅ manifest.json encontrado', 'green');
  } else {
    log('❌ manifest.json no encontrado en public/', 'red');
    return false;
  }
  
  // Verificar iconos
  const iconPaths = [
    'public/icons/icon-192x192.png',
    'public/icons/icon-512x512.png',
    'public/favicon.ico'
  ];
  
  for (const iconPath of iconPaths) {
    if (fs.existsSync(iconPath)) {
      log(`✅ ${iconPath} encontrado`, 'green');
    } else {
      log(`⚠️  ${iconPath} no encontrado`, 'yellow');
    }
  }
  
  return true;
}

function deployToFirebase() {
  logStep('7', 'DESPLEGANDO A FIREBASE');
  
  // Deploy de hosting y functions
  if (!runCommand('firebase deploy --only hosting,functions', 'Deployment a Firebase')) {
    return false;
  }
  
  // Obtener URL del proyecto
  try {
    const projectInfo = execSync('firebase projects:list --json', { encoding: 'utf8' });
    const projects = JSON.parse(projectInfo);
    const currentProject = projects.find(p => p.state === 'ACTIVE');
    
    if (currentProject) {
      log(`\n🎉 DEPLOYMENT COMPLETADO`, 'green');
      log(`🌐 URL: https://${currentProject.projectId}.web.app`, 'cyan');
      log(`🌐 URL personalizada: https://${currentProject.projectId}.firebaseapp.com`, 'cyan');
    }
  } catch (error) {
    log('⚠️  No se pudo obtener la URL del proyecto', 'yellow');
  }
  
  return true;
}

function runPostDeploymentTests() {
  logStep('8', 'VERIFICACIONES POST-DEPLOYMENT');
  
  log('\n📝 Verificaciones manuales recomendadas:', 'yellow');
  log('1. Verificar que la aplicación carga correctamente', 'yellow');
  log('2. Probar autenticación de usuarios', 'yellow');
  log('3. Verificar integración con Stripe/PayPal', 'yellow');
  log('4. Comprobar que los formularios funcionan', 'yellow');
  log('5. Verificar Analytics en Firebase Console', 'yellow');
  
  return true;
}

function main() {
  log('🚀 INICIANDO DEPLOYMENT DE TEERESERVE', 'bright');
  log('='.repeat(60), 'blue');
  
  const steps = [
    checkPrerequisites,
    installDependencies,
    runLinting,
    buildProject,
    configureEnvironmentVariables,
    validateAssets,
    deployToFirebase,
    runPostDeploymentTests
  ];
  
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const success = step();
    
    if (!success && i < 6) { // Los primeros 6 pasos son críticos
      log(`\n❌ DEPLOYMENT FALLIDO EN PASO ${i + 1}`, 'red');
      process.exit(1);
    }
  }
  
  log('\n🎉 DEPLOYMENT COMPLETADO EXITOSAMENTE', 'green');
  log('\n📊 Próximos pasos:', 'cyan');
  log('1. Verificar la aplicación en producción', 'cyan');
  log('2. Configurar dominio personalizado si es necesario', 'cyan');
  log('3. Configurar monitoreo y alertas', 'cyan');
  log('4. Realizar pruebas de carga si es necesario', 'cyan');
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main();
}

module.exports = {
  checkPrerequisites,
  buildProject,
  deployToFirebase
};