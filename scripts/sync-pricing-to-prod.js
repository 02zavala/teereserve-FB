/**
 * Sync pricing data from a SOURCE Firestore project (local/dev) to a DESTINATION (production).
 * - Backs up destination pricing per course to ./backups before any changes.
 * - Optionally wipes destination pricing collections before writing.
 *
 * Usage:
 *   node scripts/sync-pricing-to-prod.js --courses=puerto-los-cabos,cabo-real-golf-club --wipe=true
 *
 * Required env for SOURCE (your current local/dev project):
 *   FIREBASE_PROJECT_ID
 *   FIREBASE_CLIENT_EMAIL
 *   FIREBASE_PRIVATE_KEY  (use escaped newlines: replace \n with real newlines)
 *
 * Required env for DESTINATION (production target):
 *   PROD_FIREBASE_PROJECT_ID
 *   PROD_FIREBASE_CLIENT_EMAIL
 *   PROD_FIREBASE_PRIVATE_KEY
 */

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

function initAdminApp(prefix, appName) {
  const projectId = process.env[`${prefix}FIREBASE_PROJECT_ID`];
  const clientEmail = process.env[`${prefix}FIREBASE_CLIENT_EMAIL`];
  let privateKey = process.env[`${prefix}FIREBASE_PRIVATE_KEY`];

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(`Missing credentials for ${prefix} environment. Set ${prefix}FIREBASE_PROJECT_ID, ${prefix}FIREBASE_CLIENT_EMAIL, ${prefix}FIREBASE_PRIVATE_KEY`);
  }

  // Support escaped newlines
  if (privateKey.includes('\\n')) {
    privateKey = privateKey.replace(/\\n/g, '\n');
  }

  return admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey })
  }, appName);
}

function hasProdCreds() {
  return Boolean(
    process.env['PROD_FIREBASE_PROJECT_ID'] &&
    process.env['PROD_FIREBASE_CLIENT_EMAIL'] &&
    process.env['PROD_FIREBASE_PRIVATE_KEY']
  );
}

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { courses: [], wipe: false, dedupe: false };
  for (const arg of args) {
    if (arg.startsWith('--courses=')) {
      const val = arg.split('=')[1];
      opts.courses = val.split(',').map(s => s.trim()).filter(Boolean);
    } else if (arg.startsWith('--wipe=')) {
      const val = arg.split('=')[1];
      opts.wipe = val === 'true' || val === '1';
    } else if (arg.startsWith('--dedupe=')) {
      const val = arg.split('=')[1];
      opts.dedupe = val === 'true' || val === '1';
    }
  }
  if (opts.courses.length === 0) {
    throw new Error('You must provide --courses=<id1,id2,...>');
  }
  return opts;
}

async function readPricing(db, courseId) {
  const baseRef = db.collection('pricing').doc(courseId);
  const [seasonsSnap, timeBandsSnap, priceRulesSnap, overridesSnap, baseProductDoc] = await Promise.all([
    baseRef.collection('seasons').get().catch(() => null),
    baseRef.collection('timeBands').get().catch(() => null),
    baseRef.collection('priceRules').get().catch(() => null),
    baseRef.collection('specialOverrides').get().catch(() => null),
    baseRef.collection('baseProducts').doc('default').get().catch(() => null),
  ]);

  const toArray = (snap) => snap ? snap.docs.map(doc => ({ id: doc.id, data: doc.data() })) : [];
  return {
    seasons: toArray(seasonsSnap),
    timeBands: toArray(timeBandsSnap),
    priceRules: toArray(priceRulesSnap),
    specialOverrides: toArray(overridesSnap),
    baseProduct: (baseProductDoc && baseProductDoc.exists) ? { id: baseProductDoc.id, data: baseProductDoc.data() } : null,
  };
}

async function listAllCourses(db) {
  // List all doc IDs under top-level 'pricing' collection
  const snap = await db.collection('pricing').get();
  return snap.docs.map(d => d.id);
}

async function backupDestination(dbDest, courseId) {
  const backupDir = path.join(process.cwd(), 'backups');
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir);
  const data = await readPricing(dbDest, courseId);
  const outPath = path.join(backupDir, `pricing-backup-${courseId}-${Date.now()}.json`);
  fs.writeFileSync(outPath, JSON.stringify(data, null, 2));
  return outPath;
}

async function wipeDestination(dbDest, courseId) {
  const baseRef = dbDest.collection('pricing').doc(courseId);
  const collections = ['seasons', 'timeBands', 'priceRules', 'specialOverrides'];
  for (const col of collections) {
    const snap = await baseRef.collection(col).get();
    const batch = dbDest.batch();
    snap.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
  }
  // Optionally delete base product doc
  await baseRef.collection('baseProducts').doc('default').delete().catch(() => {});
}

async function writeDestination(dbDest, courseId, data) {
  const baseRef = dbDest.collection('pricing').doc(courseId);
  const batch = dbDest.batch();
  for (const s of data.seasons || []) {
    batch.set(baseRef.collection('seasons').doc(s.id), s.data, { merge: false });
  }
  for (const tb of data.timeBands || []) {
    batch.set(baseRef.collection('timeBands').doc(tb.id), tb.data, { merge: false });
  }
  for (const pr of data.priceRules || []) {
    batch.set(baseRef.collection('priceRules').doc(pr.id), pr.data, { merge: false });
  }
  for (const ov of data.specialOverrides || []) {
    batch.set(baseRef.collection('specialOverrides').doc(ov.id), ov.data, { merge: false });
  }
  await batch.commit();

  if (data.baseProduct) {
    await baseRef.collection('baseProducts').doc('default').set(data.baseProduct.data, { merge: false });
  }
}

function prKey(d) {
  const safe = (v) => v === undefined || v === null ? '' : String(v);
  return [
    safe(d.name),
    safe(d.seasonId),
    safe(d.timeBandId),
    Array.isArray(d.dow) ? d.dow.sort().join(',') : safe(d.dow),
    safe(d.playersMin),
    safe(d.playersMax),
    safe(d.leadTimeMin),
    safe(d.leadTimeMax),
    safe(d.occupancyMin),
    safe(d.occupancyMax),
    safe(d.priceType)
  ].join('|');
}

async function dedupePriceRules(dbDest, courseId) {
  const baseRef = dbDest.collection('pricing').doc(courseId);
  const snap = await baseRef.collection('priceRules').get();
  const groups = new Map();
  const docs = snap.docs.map(doc => ({ id: doc.id, ref: doc.ref, data: doc.data() }));
  for (const doc of docs) {
    const key = prKey(doc.data);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(doc);
  }
  let deletions = 0;
  for (const [key, list] of groups.entries()) {
    if (list.length <= 1) continue;
    // Keep highest priority, then latest updatedAt, then max id lexicographically
    list.sort((a, b) => {
      const pa = a.data.priority ?? 0;
      const pb = b.data.priority ?? 0;
      if (pb !== pa) return pb - pa;
      const ua = a.data.updatedAt || '';
      const ub = b.data.updatedAt || '';
      if (ub !== ua) return ub.localeCompare(ua);
      return b.id.localeCompare(a.id);
    });
    const keep = list[0];
    const remove = list.slice(1);
    for (const r of remove) {
      await r.ref.delete();
      deletions++;
    }
  }
  return deletions;
}

function tbKey(d) {
  const safe = (v) => v === undefined || v === null ? '' : String(v);
  return [safe(d.name), safe(d.start), safe(d.end)].join('|');
}

async function dedupeTimeBands(dbDest, courseId) {
  const baseRef = dbDest.collection('pricing').doc(courseId);
  const snap = await baseRef.collection('timeBands').get();
  const groups = new Map();
  const docs = snap.docs.map(doc => ({ id: doc.id, ref: doc.ref, data: doc.data() }));
  for (const doc of docs) {
    const key = tbKey(doc.data);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(doc);
  }
  let deletions = 0;
  for (const [key, list] of groups.entries()) {
    if (list.length <= 1) continue;
    // Keep latest updatedAt, then max id lexicographically
    list.sort((a, b) => {
      const ua = a.data.updatedAt || '';
      const ub = b.data.updatedAt || '';
      if (ub !== ua) return ub.localeCompare(ua);
      return b.id.localeCompare(a.id);
    });
    const remove = list.slice(1);
    for (const r of remove) {
      await r.ref.delete();
      deletions++;
    }
  }
  return deletions;
}

async function main() {
  const { courses, wipe, dedupe } = parseArgs();
  const srcApp = initAdminApp('', 'src');
  const destApp = hasProdCreds() ? initAdminApp('PROD_', 'dest') : srcApp;
  const dbSrc = srcApp.firestore();
  const dbDest = destApp.firestore();

  let courseList = courses;
  if (courseList.length === 1 && courseList[0].toUpperCase() === 'ALL') {
    courseList = await listAllCourses(dbSrc);
    if (courseList.length === 0) {
      throw new Error('No courses found under pricing/ in source project.');
    }
  }

  console.log(`Syncing courses: ${courseList.join(', ')} | wipe=${wipe} | dedupe=${dedupe}`);

  for (const courseId of courseList) {
    console.log(`\n=== Course: ${courseId} ===`);
    const backupPath = await backupDestination(dbDest, courseId);
    console.log(`Destination backup saved: ${backupPath}`);

    const srcData = await readPricing(dbSrc, courseId);
    const counts = {
      seasons: srcData.seasons.length,
      timeBands: srcData.timeBands.length,
      priceRules: srcData.priceRules.length,
      specialOverrides: srcData.specialOverrides.length,
      baseProduct: srcData.baseProduct ? 1 : 0,
    };
    console.log(`Source counts:`, counts);

    if (wipe) {
      console.log(`Wiping destination pricing for ${courseId}...`);
      await wipeDestination(dbDest, courseId);
    }

    console.log(`Writing destination pricing for ${courseId}...`);
    await writeDestination(dbDest, courseId, srcData);
    if (dedupe) {
      console.log(`Running dedupe on destination for ${courseId}...`);
      const tbDel = await dedupeTimeBands(dbDest, courseId);
      const prDel = await dedupePriceRules(dbDest, courseId);
      console.log(`Dedupe removed ${tbDel} timeBands and ${prDel} priceRules.`);
    }
    console.log(`Done.`);
  }

  console.log('\nSync complete.');
  process.exit(0);
}

main().catch(err => {
  console.error('Sync failed:', err);
  process.exit(1);
});