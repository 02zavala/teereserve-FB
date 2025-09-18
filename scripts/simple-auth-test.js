// Script simple para probar Firebase Auth
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');

function logToFile(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  fs.appendFileSync('auth-debug.log', logMessage);
  console.log(message);
}

function checkEnvVars() {
  logToFile('=== VERIFICACIÓN DE VARIABLES DE ENTORNO ===');
  
  const requiredVars = [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    'NEXT_PUBLIC_FIREBASE_APP_ID'
  ];
  
  let allPresent = true;
  
  requiredVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
      logToFile(`✅ ${varName}: ${value.substring(0, 20)}...`);
    } else {
      logToFile(`❌ ${varName}: NO ENCONTRADA`);
      allPresent = false;
    }
  });
  
  return allPresent;
}

async function testFirebaseInit() {
  logToFile('\n=== PRUEBA DE INICIALIZACIÓN DE FIREBASE ===');
  
  try {
    const { initializeApp } = require('firebase/app');
    const { getAuth } = require('firebase/auth');
    
    const firebaseConfig = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    };
    
    logToFile('Inicializando Firebase...');
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    
    logToFile('✅ Firebase inicializado correctamente');
    logToFile(`Project ID: ${firebaseConfig.projectId}`);
    logToFile(`Auth Domain: ${firebaseConfig.authDomain}`);
    
    return { app, auth };
  } catch (error) {
    logToFile(`❌ Error inicializando Firebase: ${error.message}`);
    logToFile(`Stack: ${error.stack}`);
    return null;
  }
}

async function main() {
  // Limpiar log anterior
  if (fs.existsSync('auth-debug.log')) {
    fs.unlinkSync('auth-debug.log');
  }
  
  logToFile('🔍 INICIANDO DIAGNÓSTICO DE FIREBASE AUTH');
  
  // Verificar variables de entorno
  const envOk = checkEnvVars();
  if (!envOk) {
    logToFile('❌ Faltan variables de entorno críticas');
    return;
  }
  
  // Probar inicialización
  const firebase = await testFirebaseInit();
  if (!firebase) {
    logToFile('❌ No se pudo inicializar Firebase');
    return;
  }
  
  logToFile('\n=== DIAGNÓSTICO COMPLETADO ===');
  logToFile('✅ Configuración básica de Firebase está correcta');
  logToFile('📝 El error auth/invalid-credential probablemente se debe a:');
  logToFile('   1. Usuario inexistente');
  logToFile('   2. Contraseña incorrecta');
  logToFile('   3. Email/Password no habilitado en Firebase Console');
  logToFile('   4. Restricciones de dominio en Firebase Console');
  
  logToFile('\n🔧 ACCIONES RECOMENDADAS:');
  logToFile('1. Verificar en Firebase Console > Authentication > Sign-in method');
  logToFile('2. Asegurar que "Email/Password" esté habilitado');
  logToFile('3. Verificar que el usuario existe en la pestaña "Users"');
  logToFile('4. Intentar crear un nuevo usuario para probar');
}

main().catch(error => {
  logToFile(`❌ Error fatal: ${error.message}`);
  console.error(error);
});