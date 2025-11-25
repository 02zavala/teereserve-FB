// Script para obtener un ID token de Firebase usando email y contraseña
// Uso:
// 1) Configura .env.local con credenciales de Firebase (PRODUCCIÓN) y tu usuario admin
// 2) Ejecuta: node scripts/get-id-token.js

require('dotenv').config({ path: '.env.local' });

function exitWith(msg, code = 1) {
  console.error(msg);
  process.exit(code);
}

function mask(value, keep = 6) {
  if (!value || typeof value !== 'string') return String(value);
  return value.length > keep ? value.slice(0, keep) + '…' : value;
}

async function main() {
  const argv = process.argv.slice(2);
  const argEmail = argv.find(a => a.startsWith('--email='))?.split('=')[1];
  const argPassword = argv.find(a => a.startsWith('--password='))?.split('=')[1];
  const argRaw = argv.includes('--raw');

  // Solo requerimos las claves necesarias para Auth: apiKey, authDomain y projectId
  const cfg = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  };

  const email = argEmail || process.env.ADMIN_EMAIL || process.env.SUPERADMIN_EMAIL || 'oscargomez@teereserve.golf';
  const password = argPassword || process.env.ADMIN_PASSWORD || process.env.SUPERADMIN_PASSWORD;

  const missing = Object.entries(cfg)
    .filter(([_, v]) => !v || typeof v !== 'string')
    .map(([k]) => k);
  if (missing.length) {
    exitWith(`❌ Falta configurar variables de Firebase en .env.local: ${missing.join(', ')}`);
  }
  if (!password) {
    exitWith('❌ Falta contraseña. Provee ADMIN_PASSWORD en .env.local o usa --password=TU_PASSWORD');
  }

  console.log('🔧 Firebase config (producción):');
  console.log(`- projectId: ${cfg.projectId}`);
  console.log(`- authDomain: ${cfg.authDomain}`);
  console.log(`- apiKey: ${mask(cfg.apiKey)}`);
  
  // En modo raw, evita logs de configuración
  if (argv.includes('--raw')) {
    // we'll still need to initialize and sign-in below; logs suppressed
  } else {
    console.log('');
  }

  try {
    const { initializeApp } = require('firebase/app');
    const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');

    const app = initializeApp(cfg);
    const auth = getAuth(app);
    if (!argRaw) {
      console.log(`🔐 Iniciando sesión como: ${email}`);
    }

    const { user } = await signInWithEmailAndPassword(auth, email, password);
    const token = await user.getIdToken(true);

    // Decodificar cuerpo del JWT para verificar proyecto
    const bodyB64 = token.split('.')[1];
    const bodyJson = JSON.parse(Buffer.from(bodyB64, 'base64').toString('utf8'));

    const exp = new Date(bodyJson.exp * 1000).toISOString();
    if (argRaw) {
      console.log(token);
      process.exit(0);
    }
    console.log('\n✅ ID token obtenido');
    console.log(`- uid: ${user.uid}`);
    console.log(`- aud: ${bodyJson.aud}`);
    console.log(`- iss: ${bodyJson.iss}`);
    console.log(`- exp: ${exp}`);
    console.log('\n----- ID_TOKEN -----');
    console.log(token);
    console.log('--------------------');
    console.log('\n💡 Usa este token como Bearer en tus requests de producción.');
    console.log('\nUso alternativo: node scripts/get-id-token.js --email=oscargomez@teereserve.golf --password=TU_PASSWORD');
  } catch (err) {
    console.error('❌ Error al obtener ID token:', err && err.message ? err.message : err);
    if (err && err.code) {
      console.error('Código:', err.code);
    }
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}