// Verifica pricing de Solmar en producción y fuerza revalidación
// Uso:
//   node scripts/verify-solmar-pricing.js --email=oscargomez@teereserve.golf --password="Cabo2020"

require('dotenv').config({ path: '.env.local' });

function exitWith(msg, code = 1) {
  console.error(msg);
  process.exit(code);
}

async function getIdToken({ email, password }) {
  const cfg = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
  const missing = Object.entries(cfg).filter(([_, v]) => !v || typeof v !== 'string').map(([k]) => k);
  if (missing.length) exitWith(`❌ Falta configurar variables de Firebase en .env.local: ${missing.join(', ')}`);

  const { initializeApp } = require('firebase/app');
  const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
  const app = initializeApp(cfg);
  const auth = getAuth(app);
  const { user } = await signInWithEmailAndPassword(auth, email, password);
  return user.getIdToken(true);
}

async function postJson(url, body, token) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${text}`);
  }
  return res.json();
}

async function main() {
  const argv = process.argv.slice(2);
  const email = argv.find(a => a.startsWith('--email='))?.split('=')[1] || process.env.ADMIN_EMAIL || 'oscargomez@teereserve.golf';
  const password = argv.find(a => a.startsWith('--password='))?.split('=')[1] || process.env.ADMIN_PASSWORD;
  if (!password) exitWith('❌ Falta contraseña: usa --password=TU_PASSWORD o ADMIN_PASSWORD en .env.local');

  console.log('🔐 Autenticando y obteniendo token...');
  const token = await getIdToken({ email, password });
  console.log(`✅ Token obtenido (longitud ${token.length})`);

  console.log('📥 Cargando pricing de Solmar en producción...');
  const pricing = await postJson('https://www.teereserve.golf/api/admin/pricing/load', { courseIds: ['solmar-golf-links'] }, token);
  console.log('✅ Pricing cargado. Resumen:');
  const seasons = pricing?.seasons?.length ?? 0;
  const bands = pricing?.timeBands?.length ?? 0;
  const rules = pricing?.priceRules?.length ?? 0;
  console.log(`- Temporadas: ${seasons}`);
  console.log(`- Time bands: ${bands}`);
  console.log(`- Price rules: ${rules}`);

  console.log('🧹 Revalidando páginas públicas de Solmar...');
  const rev = await postJson('https://www.teereserve.golf/api/admin/courses/revalidate', { courseId: 'solmar-golf-links' }, token);
  console.log('✅ Revalidación ejecutada:', rev?.status ?? rev);

  console.log('🎯 Listo: pricing verificado y revalidado.');
}

main().catch(err => {
  console.error('❌ Error:', err && err.message ? err.message : err);
  process.exit(1);
});