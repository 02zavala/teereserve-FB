// Ejecuta dedupe de precios en producción para todos los cursos y guarda un reporte
// Uso:
//   node scripts/run-dedupe-all.js --email=oscargomez@teereserve.golf --password="TU_PASSWORD" --base=https://teereserve.golf --type=all

const fs = require('fs');
const path = require('path');
const https = require('https');

require('dotenv').config({ path: '.env.local' });

function mask(value, keep = 6) {
  if (!value || typeof value !== 'string') return String(value);
  return value.length > keep ? value.slice(0, keep) + '…' : value;
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`No se pudo parsear JSON de ${url}: ${e.message}`));
        }
      });
    });
    req.on('error', reject);
  });
}

async function getFirebaseConfig() {
  const cfg = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  };
  if (cfg.apiKey && cfg.authDomain && cfg.projectId) return cfg;

  const candidates = [
    'https://teereserve-golf.firebaseapp.com/__/firebase/init.json',
    'https://teereserve-golf.web.app/__/firebase/init.json',
  ];
  for (const u of candidates) {
    try {
      const j = await fetchJson(u);
      if (j && j.apiKey && j.authDomain && j.projectId) {
        return { apiKey: j.apiKey, authDomain: j.authDomain, projectId: j.projectId };
      }
    } catch (_) {}
  }
  throw new Error('No hay configuración de Firebase disponible. Define NEXT_PUBLIC_* o habilita init.json.');
}

function httpJson(method, url, token, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const opts = {
      method,
      hostname: u.hostname,
      path: u.pathname + (u.search || ''),
      headers: {
        accept: 'application/json',
      },
    };
    if (token) opts.headers['authorization'] = `Bearer ${token}`;
    let payload = null;
    if (body) {
      payload = JSON.stringify(body);
      opts.headers['content-type'] = 'application/json';
      opts.headers['content-length'] = Buffer.byteLength(payload);
    }
    const req = https.request(opts, (res) => {
      let raw = '';
      res.on('data', (c) => (raw += c));
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = raw.length ? JSON.parse(raw) : null;
        } catch (e) {
          return reject(new Error(`HTTP ${res.statusCode} parse error: ${e.message} | raw=${raw.slice(0, 200)}`));
        }
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(parsed || {});
        } else {
          reject(new Error(`HTTP ${res.statusCode} ${res.statusMessage}: ${raw}`));
        }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function httpJson(method, url, token, body, redirects = 0) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const opts = {
      method,
      hostname: u.hostname,
      path: u.pathname + (u.search || ''),
      headers: {
        accept: 'application/json',
      },
    };
    if (token) opts.headers['authorization'] = `Bearer ${token}`;
    let payload = null;
    if (body) {
      payload = JSON.stringify(body);
      opts.headers['content-type'] = 'application/json';
      opts.headers['content-length'] = Buffer.byteLength(payload);
    }
    const req = https.request(opts, (res) => {
      let raw = '';
      res.on('data', (c) => (raw += c));
      res.on('end', () => {
        // Handle redirects explicitly (e.g., teereserve.golf -> www.teereserve.golf)
        if (res.statusCode >= 300 && res.statusCode < 400) {
          const loc = res.headers.location;
          let nextUrl = loc || null;
          if (!nextUrl) {
            try {
              const j = raw ? JSON.parse(raw) : null;
              if (j && typeof j.redirect === 'string') nextUrl = j.redirect;
            } catch (_) {}
          }
          if (nextUrl && redirects < 5) {
            return resolve(httpJson(method, nextUrl, token, body, redirects + 1));
          }
          return reject(new Error(`Redirect (${res.statusCode}) sin ubicación. raw=${raw.slice(0,200)}`));
        }

        let parsed = null;
        try {
          parsed = raw.length ? JSON.parse(raw) : null;
        } catch (e) {
          return reject(new Error(`HTTP ${res.statusCode} parse error: ${e.message} | raw=${raw.slice(0, 200)}`));
        }
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(parsed || {});
        } else {
          reject(new Error(`HTTP ${res.statusCode} ${res.statusMessage}: ${raw}`));
        }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function main() {
  const argv = process.argv.slice(2);
  const email = argv.find((a) => a.startsWith('--email='))?.split('=')[1] || process.env.ADMIN_EMAIL || process.env.SUPERADMIN_EMAIL || 'oscargomez@teereserve.golf';
  const password = argv.find((a) => a.startsWith('--password='))?.split('=')[1] || process.env.ADMIN_PASSWORD || process.env.SUPERADMIN_PASSWORD;
  const base = argv.find((a) => a.startsWith('--base='))?.split('=')[1] || 'https://www.teereserve.golf';
  const type = argv.find((a) => a.startsWith('--type='))?.split('=')[1] || 'all';

  if (!password) {
    console.error('❌ Falta contraseña. Usa --password=TU_PASSWORD o define ADMIN_PASSWORD en .env.local');
    process.exit(1);
  }

  const outDir = path.join('scripts', 'output');
  const outFile = path.join(outDir, 'dedupe-report.json');
  fs.mkdirSync(outDir, { recursive: true });

  try {
    const cfg = await getFirebaseConfig();
    console.log('🔧 Firebase (prod):');
    console.log(`- projectId: ${cfg.projectId}`);
    console.log(`- authDomain: ${cfg.authDomain}`);
    console.log(`- apiKey: ${mask(cfg.apiKey)}`);

    const { initializeApp } = require('firebase/app');
    const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
    const app = initializeApp(cfg);
    const auth = getAuth(app);
    console.log(`🔐 Iniciando sesión como: ${email}`);
    const { user } = await signInWithEmailAndPassword(auth, email, password);
    const token = await user.getIdToken(true);
    console.log('✅ Token obtenido, llamando APIs admin…');

    const listRes = await httpJson('GET', `${base}/api/admin/courses/list`, token);
    if (!listRes?.ok) throw new Error(`Listado de cursos falló: ${JSON.stringify(listRes)}`);
    const courses = Array.isArray(listRes.courses) ? listRes.courses : [];
    console.log(`📚 Cursos encontrados: ${courses.length}`);

    const results = [];
    for (const c of courses) {
      const courseId = c.id || c.courseId || c;
      console.log(`🧹 Dedupe (${type}) -> ${courseId}`);
      try {
        const ded = await httpJson('POST', `${base}/api/admin/pricing/dedupe`, token, { courseId, type });
        results.push({ courseId, ok: true, removedCount: ded.removedCount ?? ded.success ? (ded.removedCount || 0) : 0, response: ded });
        console.log(`   → removedCount=${ded.removedCount ?? 0}`);
      } catch (e) {
        results.push({ courseId, ok: false, error: e.message });
        console.log(`   ✖ error: ${e.message}`);
      }
    }

    // Verificación rápida de quote para Puerto Los Cabos (si existe en listado)
    const plc = courses.find((c) => (c.id || c) === 'puerto-los-cabos');
    let quoteCheck = null;
    if (plc) {
      const today = new Date();
      const dateStr = new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10); // +2 días
      try {
        quoteCheck = await httpJson('POST', `${base}/api/checkout/quote`, null, {
          courseId: 'puerto-los-cabos',
          date: dateStr,
          time: '08:00',
          players: 2,
          holes: 18,
        });
        console.log(`💳 Quote para 'puerto-los-cabos' (${dateStr} 08:00): total_cents=${quoteCheck.total_cents}`);
      } catch (e) {
        console.log(`💳 Quote fallo: ${e.message}`);
        quoteCheck = { error: e.message };
      }
    }

    const report = { base, type, coursesCount: courses.length, results, quoteCheck };
    fs.writeFileSync(outFile, JSON.stringify(report, null, 2), 'utf8');
    console.log(`📝 Reporte guardado en ${outFile}`);
  } catch (err) {
    console.error('❌ Error ejecutando dedupe:', err && err.message ? err.message : err);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}