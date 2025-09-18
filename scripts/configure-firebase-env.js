#!/usr/bin/env node

/**
 * Script para configurar variables de entorno en Firebase Functions
 * Ejecutar: node scripts/configure-firebase-env.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Cargar variables de entorno desde .env.local
require('dotenv').config({ path: '.env.local' });

console.log('🔧 CONFIGURANDO VARIABLES DE ENTORNO EN FIREBASE FUNCTIONS');
console.log('=' .repeat(60));

// Mapeo de variables de entorno locales a Firebase Functions config
const envMapping = {
  // Stripe
  'stripe.secret_key': process.env.STRIPE_SECRET_KEY,
  'stripe.publishable_key': process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  'stripe.webhook_secret': process.env.STRIPE_WEBHOOK_SECRET,
  
  // PayPal
  'paypal.client_secret': process.env.PAYPAL_CLIENT_SECRET,
  'paypal.client_id': process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID,
  'paypal.environment': process.env.NEXT_PUBLIC_PAYPAL_ENVIRONMENT,
  'paypal.webhook_id': process.env.PAYPAL_WEBHOOK_ID,
  'paypal.webhook_url': process.env.PAYPAL_WEBHOOK_URL,
  
  // Google Services
  'google.maps_api_key': process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
  'google.client_id': process.env.GOOGLE_CLIENT_ID,
  
  // reCAPTCHA
  'recaptcha.site_key': process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY,
  'recaptcha.secret_key': process.env.RECAPTCHA_SECRET_KEY,
  
  // AI Services
  'gemini.api_key': process.env.GEMINI_API_KEY,
  
  // Firebase
  'firebase.api_key': process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  'firebase.auth_domain': process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  'firebase.project_id': process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  'firebase.storage_bucket': process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  'firebase.messaging_sender_id': process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  'firebase.app_id': process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  'firebase.measurement_id': process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  'firebase.database_url': process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  
  // Firebase Admin
  'firebase_admin.project_id': process.env.FIREBASE_PROJECT_ID,
  'firebase_admin.client_email': process.env.FIREBASE_CLIENT_EMAIL,
  'firebase_admin.private_key': process.env.FIREBASE_PRIVATE_KEY,
  
  // Email
  'email.resend_api_key': process.env.RESEND_API_KEY,
  'email.from': process.env.EMAIL_FROM,
  'email.contact_recipient': process.env.CONTACT_FORM_RECIPIENT,
  
  // Zoho Mail
  'zoho.client_id': process.env.ZOHO_MAIL_CLIENT_ID,
  'zoho.client_secret': process.env.ZOHO_MAIL_CLIENT_SECRET,
  'zoho.refresh_token': process.env.ZOHO_MAIL_REFRESH_TOKEN,
  'zoho.from': process.env.ZOHO_MAIL_FROM,
  
  // Security
  'security.jwt_secret': process.env.JWT_SECRET || 'your-jwt-secret-here',
};

// Función para ejecutar comandos de Firebase
function runFirebaseCommand(command) {
  try {
    console.log(`Ejecutando: ${command}`);
    const result = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
    return result;
  } catch (error) {
    console.error(`❌ Error ejecutando comando: ${command}`);
    console.error(error.message);
    return null;
  }
}

// Configurar variables de entorno
function configureEnvironmentVariables() {
  console.log('\n📝 Configurando variables de entorno...');
  
  const commands = [];
  
  // Generar comandos para cada variable
  Object.entries(envMapping).forEach(([key, value]) => {
    if (value && value.trim() !== '') {
      // Escapar comillas y caracteres especiales
      const escapedValue = value.replace(/"/g, '\\"').replace(/'/g, "\\'");
      commands.push(`firebase functions:config:set ${key}="${escapedValue}"`);
    } else {
      console.warn(`⚠️  Variable ${key} no está definida o está vacía`);
    }
  });
  
  // Ejecutar comandos en lotes para evitar límites de longitud
  const batchSize = 5;
  for (let i = 0; i < commands.length; i += batchSize) {
    const batch = commands.slice(i, i + batchSize);
    const batchCommand = batch.join(' && ');
    
    console.log(`\n🔄 Configurando lote ${Math.floor(i / batchSize) + 1}...`);
    const result = runFirebaseCommand(batchCommand);
    
    if (result) {
      console.log('✅ Lote configurado exitosamente');
    } else {
      console.error('❌ Error configurando lote');
    }
  }
}

// Verificar configuración actual
function verifyConfiguration() {
  console.log('\n🔍 Verificando configuración actual...');
  const result = runFirebaseCommand('firebase functions:config:get');
  
  if (result) {
    console.log('\n📋 Configuración actual:');
    console.log(result);
  }
}

// Función principal
function main() {
  try {
    // Verificar que Firebase CLI esté instalado
    runFirebaseCommand('firebase --version');
    
    // Verificar que estemos logueados
    const loginStatus = runFirebaseCommand('firebase projects:list');
    if (!loginStatus) {
      console.error('❌ No estás logueado en Firebase. Ejecuta: firebase login');
      process.exit(1);
    }
    
    // Configurar variables
    configureEnvironmentVariables();
    
    // Verificar configuración
    verifyConfiguration();
    
    console.log('\n🎉 CONFIGURACIÓN COMPLETADA');
    console.log('\n📝 Próximos pasos:');
    console.log('1. Ejecutar: npm run build');
    console.log('2. Ejecutar: firebase deploy --only hosting,functions');
    console.log('3. Verificar que la aplicación funcione correctamente');
    
  } catch (error) {
    console.error('❌ Error durante la configuración:', error.message);
    process.exit(1);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main();
}

module.exports = { configureEnvironmentVariables, verifyConfiguration };