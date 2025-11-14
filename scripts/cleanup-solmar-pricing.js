// Limpia reglas y bandas obsoletas para Solmar y verifica cotizaciones
// Uso:
//   node scripts/cleanup-solmar-pricing.js --email=oscargomez@teereserve.golf --password="Cabo2020"

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
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(body)
  });
  const text = await res.text();
  let data = null;
  try { data = JSON.parse(text); } catch {}
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text}`);
  return data;
}

async function cleanupSolmar(token) {
  const courseId = 'solmar-golf-links';
  console.log('📥 Cargando pricing actual...');
  const loadRes = await postJson('https://www.teereserve.golf/api/admin/pricing/load', { courseIds: [courseId] }, token);
  const solmar = Array.isArray(loadRes?.data) ? loadRes.data.find(d => d.courseId === courseId) : loadRes?.data;
  if (!solmar) exitWith('❌ No se pudo cargar pricing de Solmar');

  const allowedBands = new Set(['solmar-morning', 'solmar-mid', 'solmar-afternoon', 'solmar-twilight']);
  const allowedRules = new Set([
    'solmar-rule-morning',
    'solmar-rule-mid',
    'solmar-rule-afternoon',
    'solmar-floor-morning',
    'solmar-floor-mid',
    'solmar-floor-afternoon',
    'solmar-floor-twilight'
  ]);

  const timeBandsToDeactivate = (solmar.timeBands || [])
    .filter(b => b.courseId === courseId && !allowedBands.has(b.id) && b.active !== false)
    .map(b => ({
      id: b.id,
      courseId,
      label: b.label || 'Deprecated',
      startTime: b.startTime || '00:00',
      endTime: b.endTime || '23:59',
      active: false,
      createdAt: b.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

  const priceRulesToDeactivate = (solmar.priceRules || [])
    .filter(r => r.courseId === courseId && !allowedRules.has(r.id) && r.active !== false)
    .map(r => ({
      id: r.id,
      courseId,
      name: r.name || 'Deprecated',
      description: r.description || undefined,
      seasonId: r.seasonId || undefined,
      timeBandId: r.timeBandId || undefined,
      dow: r.dow || undefined,
      leadTimeMin: r.leadTimeMin || undefined,
      leadTimeMax: r.leadTimeMax || undefined,
      occupancyMin: r.occupancyMin || undefined,
      occupancyMax: r.occupancyMax || undefined,
      playersMin: r.playersMin || undefined,
      playersMax: r.playersMax || undefined,
      priceType: r.priceType || 'delta',
      priceValue: typeof r.priceValue === 'number' ? r.priceValue : 0,
      priority: typeof r.priority === 'number' ? r.priority : 1,
      active: false,
      effectiveFrom: r.effectiveFrom || undefined,
      effectiveTo: r.effectiveTo || undefined,
      minPrice: r.minPrice || undefined,
      maxPrice: r.maxPrice || undefined,
      roundTo: r.roundTo || undefined,
      createdAt: r.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

  if (timeBandsToDeactivate.length === 0 && priceRulesToDeactivate.length === 0) {
    console.log('✅ No hay elementos obsoletos activos.');
    return { deactivatedBands: 0, deactivatedRules: 0 };
  }

  console.log('🧹 Desactivando elementos obsoletos:', {
    timeBands: timeBandsToDeactivate.length,
    priceRules: priceRulesToDeactivate.length,
  });

  const payload = {
    courseId,
    timeBands: timeBandsToDeactivate,
    priceRules: priceRulesToDeactivate,
  };
  const saveRes = await postJson('https://www.teereserve.golf/api/admin/pricing/save', payload, token);
  console.log('✅ Guardado limpieza:', saveRes?.data?.savedItems || saveRes);
  return { deactivatedBands: timeBandsToDeactivate.length, deactivatedRules: priceRulesToDeactivate.length };
}

async function verifyQuotes() {
  const courseId = 'solmar-golf-links';
  const date = '2025-11-15'; // fecha dentro de temporada
  const players = 2;
  const holes = 18;
  const times = [
    { time: '07:30', expectedMin: 399 },
    { time: '11:15', expectedMin: 360 },
    { time: '15:00', expectedMin: 305 },
    { time: '16:30', expectedMin: 305 },
  ];

  for (const t of times) {
    const res = await postJson('https://www.teereserve.golf/api/checkout/quote', {
      courseId,
      date,
      time: t.time,
      players,
      holes
    });
    const perPlayer = (res.subtotal_cents / 100) / players; // sin impuestos
    console.log(`🧪 ${t.time} → ${perPlayer} USD por jugador (mín esperado ${t.expectedMin})`);
    if (perPlayer < t.expectedMin) {
      console.warn('⚠️ Menor al mínimo esperado. Revisar reglas y bandas.');
    }
  }
}

async function main() {
  const argv = process.argv.slice(2);
  const email = argv.find(a => a.startsWith('--email='))?.split('=')[1] || process.env.ADMIN_EMAIL || 'oscargomez@teereserve.golf';
  const password = argv.find(a => a.startsWith('--password='))?.split('=')[1] || process.env.ADMIN_PASSWORD;
  if (!password) exitWith('❌ Falta contraseña: usa --password=TU_PASSWORD o ADMIN_PASSWORD en .env.local');

  console.log('🔐 Autenticando...');
  const token = await getIdToken({ email, password });
  console.log(`✅ Token obtenido (${token.length} chars)`);

  const result = await cleanupSolmar(token);
  console.log('📊 Resumen limpieza:', result);

  console.log('📥 Carga post-limpieza y verificación rápida de cotizaciones...');
  await verifyQuotes();

  console.log('🎯 Listo: limpieza aplicada y verificada.');
}

main().catch(err => {
  console.error('❌ Error:', err && err.message ? err.message : err);
  process.exit(1);
});