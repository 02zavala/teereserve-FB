/**
 * Script de debug para verificar la configuración de Firebase Auth
 * y diagnosticar problemas de autenticación
 */

// Cargar variables de entorno
require('dotenv').config({ path: '.env.local' });

const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, doc, getDoc } = require('firebase/firestore');

// Configuración de Firebase desde variables de entorno
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

function validateConfig() {
  console.log('🔧 Verificando configuración de Firebase...');
  
  const requiredFields = [
    'apiKey',
    'authDomain', 
    'projectId',
    'storageBucket',
    'messagingSenderId',
    'appId'
  ];
  
  const missingFields = requiredFields.filter(field => !firebaseConfig[field]);
  
  if (missingFields.length > 0) {
    console.error('❌ Faltan las siguientes variables de entorno:');
    missingFields.forEach(field => {
      console.error(`   - NEXT_PUBLIC_FIREBASE_${field.toUpperCase()}`);
    });
    return false;
  }
  
  console.log('✅ Configuración de Firebase válida');
  console.log('📋 Configuración actual:');
  console.log(`   - Project ID: ${firebaseConfig.projectId}`);
  console.log(`   - Auth Domain: ${firebaseConfig.authDomain}`);
  console.log(`   - API Key: ${firebaseConfig.apiKey?.substring(0, 10)}...`);
  
  return true;
}

async function testFirebaseConnection() {
  try {
    console.log('\n🚀 Inicializando Firebase...');
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);
    
    console.log('✅ Firebase inicializado correctamente');
    console.log(`   - Auth disponible: ${auth ? 'Sí' : 'No'}`);
    console.log(`   - Firestore disponible: ${db ? 'Sí' : 'No'}`);
    
    return { auth, db };
  } catch (error) {
    console.error('❌ Error inicializando Firebase:', error.message);
    return null;
  }
}

async function testAuthMethods(auth) {
  console.log('\n🔐 Probando métodos de autenticación...');
  
  // Probar con credenciales de prueba
  const testEmail = 'test@example.com';
  const testPassword = 'TestPassword123!';
  
  try {
    console.log('📧 Intentando crear usuario de prueba...');
    const userCredential = await createUserWithEmailAndPassword(auth, testEmail, testPassword);
    console.log('✅ Usuario de prueba creado exitosamente');
    console.log(`   - UID: ${userCredential.user.uid}`);
    console.log(`   - Email: ${userCredential.user.email}`);
    
    // Intentar hacer login con el usuario recién creado
    console.log('\n🔑 Intentando login con usuario de prueba...');
    const loginResult = await signInWithEmailAndPassword(auth, testEmail, testPassword);
    console.log('✅ Login exitoso');
    console.log(`   - UID: ${loginResult.user.uid}`);
    
    return true;
  } catch (error) {
    console.error('❌ Error en prueba de autenticación:', error.code, error.message);
    
    // Analizar errores específicos
    switch (error.code) {
      case 'auth/email-already-in-use':
        console.log('📝 El email de prueba ya existe, intentando login...');
        try {
          const loginResult = await signInWithEmailAndPassword(auth, testEmail, testPassword);
          console.log('✅ Login exitoso con usuario existente');
          return true;
        } catch (loginError) {
          console.error('❌ Error en login:', loginError.code, loginError.message);
          return false;
        }
        break;
      case 'auth/weak-password':
        console.log('📝 Contraseña muy débil');
        break;
      case 'auth/invalid-email':
        console.log('📝 Email inválido');
        break;
      case 'auth/operation-not-allowed':
        console.log('📝 Autenticación por email/contraseña no habilitada en Firebase Console');
        break;
      case 'auth/invalid-credential':
        console.log('📝 Credenciales inválidas - verificar configuración');
        break;
      default:
        console.log(`📝 Error desconocido: ${error.code}`);
    }
    return false;
  }
}

async function checkFirebaseConsoleSettings() {
  console.log('\n⚙️ Verificaciones recomendadas en Firebase Console:');
  console.log('1. Ve a https://console.firebase.google.com/');
  console.log(`2. Selecciona el proyecto: ${firebaseConfig.projectId}`);
  console.log('3. Ve a Authentication > Sign-in method');
  console.log('4. Verifica que "Email/Password" esté habilitado');
  console.log('5. Verifica que no haya restricciones de dominio');
  console.log('6. Revisa la pestaña "Users" para ver usuarios existentes');
}

async function main() {
  console.log('🔍 Iniciando diagnóstico de Firebase Auth\n');
  
  // Verificar configuración
  if (!validateConfig()) {
    process.exit(1);
  }
  
  // Probar conexión
  const firebase = await testFirebaseConnection();
  if (!firebase) {
    process.exit(1);
  }
  
  // Probar autenticación
  const authWorking = await testAuthMethods(firebase.auth);
  
  // Mostrar recomendaciones
  await checkFirebaseConsoleSettings();
  
  console.log('\n📊 Resumen del diagnóstico:');
  console.log(`   - Configuración: ✅ Válida`);
  console.log(`   - Conexión Firebase: ✅ Exitosa`);
  console.log(`   - Autenticación: ${authWorking ? '✅ Funcionando' : '❌ Con problemas'}`);
  
  if (!authWorking) {
    console.log('\n🚨 Acciones recomendadas:');
    console.log('1. Verificar configuración en Firebase Console');
    console.log('2. Asegurar que Email/Password esté habilitado');
    console.log('3. Verificar que no hay restricciones de dominio');
    console.log('4. Revisar logs de Firebase Console para más detalles');
  }
}

// Ejecutar solo si es llamado directamente
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { validateConfig, testFirebaseConnection, testAuthMethods };