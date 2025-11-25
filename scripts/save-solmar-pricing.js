// Guarda el pricing de Solmar en producción
// Uso:
//   node scripts/save-solmar-pricing.js --email=oscargomez@teereserve.golf --password="Cabo2020"

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
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${text}`);
  }
  return json;
}

function buildSolmarPayload() {
  const courseId = 'solmar-golf-links';
  const seasonId = 'solmar-2025-11-01_2026-04-30';
  const season = {
    id: seasonId,
    courseId,
    name: 'Temporada Alta 2025–2026',
    startDate: '2025-11-01',
    endDate: '2026-04-30',
    priority: 1,
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const timeBands = [
    { id: 'solmar-morning', courseId, label: 'Morning', startTime: '07:00', endTime: '10:50', active: true },
    { id: 'solmar-mid', courseId, label: 'Midday', startTime: '11:00', endTime: '12:50', active: true },
    { id: 'solmar-afternoon', courseId, label: 'Afternoon', startTime: '13:00', endTime: '16:00', active: true },
    { id: 'solmar-twilight', courseId, label: 'Twilight', startTime: '16:01', endTime: '18:00', active: true },
  ].map(b => ({ ...b, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }));

  const priceRules = [
    // Tarifas fijas por banda horaria (prioridad alta)
    { id: 'solmar-rule-morning', courseId, name: 'Morning Rate', priceType: 'fixed', priceValue: 399, priority: 100, active: true, seasonId, timeBandId: 'solmar-morning' },
    { id: 'solmar-rule-mid', courseId, name: 'Midday Rate', priceType: 'fixed', priceValue: 360, priority: 95, active: true, seasonId, timeBandId: 'solmar-mid' },
    { id: 'solmar-rule-afternoon', courseId, name: 'Afternoon Rate', priceType: 'fixed', priceValue: 305, priority: 90, active: true, seasonId, timeBandId: 'solmar-afternoon' },
    // Asegurar piso mínimo por banda (se aplican al final por prioridad baja)
    { id: 'solmar-floor-morning', courseId, name: 'Floor Morning', priceType: 'delta', priceValue: 0, minPrice: 399, priority: 1, active: true, seasonId, timeBandId: 'solmar-morning' },
    { id: 'solmar-floor-mid', courseId, name: 'Floor Midday', priceType: 'delta', priceValue: 0, minPrice: 360, priority: 1, active: true, seasonId, timeBandId: 'solmar-mid' },
    { id: 'solmar-floor-afternoon', courseId, name: 'Floor Afternoon', priceType: 'delta', priceValue: 0, minPrice: 305, priority: 1, active: true, seasonId, timeBandId: 'solmar-afternoon' },
    { id: 'solmar-floor-twilight', courseId, name: 'Floor Twilight', priceType: 'delta', priceValue: 0, minPrice: 305, priority: 1, active: true, seasonId, timeBandId: 'solmar-twilight' },
  ].map(r => ({ ...r, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }));

  const baseProduct = {
    id: 'default',
    courseId,
    name: 'Green Fee Base',
    basePrice: 305,
    currency: 'USD',
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return { courseId, seasons: [season], timeBands, priceRules, specialOverrides: [], baseProduct };
}

async function main() {
  const argv = process.argv.slice(2);
  const email = argv.find(a => a.startsWith('--email='))?.split('=')[1] || process.env.ADMIN_EMAIL || 'oscargomez@teereserve.golf';
  const password = argv.find(a => a.startsWith('--password='))?.split('=')[1] || process.env.ADMIN_PASSWORD;
  if (!password) exitWith('❌ Falta contraseña: usa --password=TU_PASSWORD o ADMIN_PASSWORD en .env.local');

  console.log('🔐 Autenticando...');
  const token = await getIdToken({ email, password });
  console.log(`✅ Token obtenido (${token.length} chars)`);

  const payload = buildSolmarPayload();
  console.log('💾 Guardando pricing en producción...');
  const saveRes = await postJson('https://www.teereserve.golf/api/admin/pricing/save', payload, token);
  console.log('✅ Guardado:', saveRes?.data?.savedItems || saveRes);

  console.log('📥 Verificando carga (load)...');
  const loadRes = await postJson('https://www.teereserve.golf/api/admin/pricing/load', { courseIds: ['solmar-golf-links'] }, token);
  const solmar = Array.isArray(loadRes?.data) ? loadRes.data.find(d => d.courseId === 'solmar-golf-links') : loadRes?.data;
  console.log('✅ Load resumen:', {
    seasons: solmar?.seasons?.length || 0,
    timeBands: solmar?.timeBands?.length || 0,
    priceRules: solmar?.priceRules?.length || 0,
    baseProduct: solmar?.baseProduct ? 1 : 0,
  });

  console.log('🧹 Revalidando páginas públicas...');
  const rev = await postJson('https://www.teereserve.golf/api/admin/courses/revalidate', { courseId: 'solmar-golf-links' }, token);
  console.log('✅ Revalidación:', rev?.status ?? rev);

  console.log('🎯 Listo: pricing guardado y verificado.');
}

main().catch(err => {
  console.error('❌ Error:', err && err.message ? err.message : err);
  process.exit(1);
});