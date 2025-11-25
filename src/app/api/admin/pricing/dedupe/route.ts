import { NextRequest, NextResponse } from 'next/server';
import { auth as adminAuth, db as adminDb } from '@/lib/firebase-admin';

// Helper function to check if user is admin (same approach as pricing load route)
async function isAdmin(authHeader: string | null): Promise<boolean> {
  if (!authHeader?.startsWith('Bearer ')) {
    return false;
  }

  try {
    // Ensure Admin SDK is initialized
    if (!adminAuth || !adminDb) {
      console.error('Firebase Admin SDK not initialized in isAdmin');
      return false;
    }
    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
    const userData = userDoc.data();
    const role = (userData?.role || '').toLowerCase();
    return role === 'admin' || role === 'superadmin';
  } catch (error) {
    console.error('Error verifying admin status (dedupe):', error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación de administrador
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No authorization token provided' }, { status: 401 });
    }

    // Verificar permisos de administrador
    const isUserAdmin = await isAdmin(authHeader);
    if (!isUserAdmin) {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 401 });
    }

    const { courseId, type, strategy } = await request.json();

    if (!courseId) {
      return NextResponse.json({ error: 'Course ID is required' }, { status: 400 });
    }

    let removedCount = 0;

    if (type === 'timeBands' || type === 'all') {
      removedCount += await dedupeTimeBandsInFirestore(courseId);
    }

    if (type === 'priceRules' || type === 'all') {
      removedCount += await dedupePriceRulesInFirestore(courseId);
    }

    // Nueva opción: deduplicar por nombre directamente en Firestore
    if (type === 'priceRulesByName') {
      removedCount += await dedupePriceRulesByNameInFirestore(courseId, strategy === 'latest' ? 'latest' : 'highest_priority');
    }

    return NextResponse.json({ 
      success: true, 
      removedCount,
      message: `Successfully removed ${removedCount} duplicate items from Firestore`
    });

  } catch (error) {
    console.error('Error in dedupe API:', error);
    return NextResponse.json({ 
      error: 'Failed to deduplicate data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function dedupeTimeBandsInFirestore(courseId: string): Promise<number> {
  const timeBandsRef = adminDb.collection('pricing').doc(courseId).collection('timeBands');
  const snapshot = await timeBandsRef.get();
  
  if (snapshot.empty) return 0;

  const timeBands = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  let toDelete: string[] = [];

  // Para Puerto Los Cabos, mantener solo las 3 bandas principales
  if (courseId === 'puerto-los-cabos') {
    const targetBands = [
      { startTime: '07:00', endTime: '11:50' },
      { startTime: '12:00', endTime: '13:20' },
      { startTime: '13:30', endTime: '19:00' }
    ];

    const toKeep: string[] = [];
    
    // Encontrar las bandas que queremos mantener
    for (const target of targetBands) {
      const match = timeBands.find(b => 
        b.startTime === target.startTime && 
        b.endTime === target.endTime
      );
      if (match) {
        toKeep.push(match.id);
      }
    }

    // Marcar para eliminar todas las bandas que no están en toKeep
    toDelete = timeBands
      .filter(band => !toKeep.includes(band.id))
      .map(band => band.id);

  } else {
    // Para otros cursos, usar lógica de deduplicación estándar
    const seen = new Set<string>();
    const toKeepIds = new Set<string>();

    for (const band of timeBands) {
      const key = `${(band.label || '').trim().toLowerCase()}|${band.startTime}|${band.endTime}`;
      if (!seen.has(key)) {
        seen.add(key);
        toKeepIds.add(band.id);
      }
    }

    toDelete = timeBands
      .filter(band => !toKeepIds.has(band.id))
      .map(band => band.id);
  }

  // Eliminar los documentos duplicados en lotes
  const batch = adminDb.batch();
  for (const id of toDelete) {
    batch.delete(timeBandsRef.doc(id));
  }

  if (toDelete.length > 0) {
    await batch.commit();
  }

  return toDelete.length;
}

async function dedupePriceRulesInFirestore(courseId: string): Promise<number> {
  const priceRulesRef = adminDb.collection('pricing').doc(courseId).collection('priceRules');
  const snapshot = await priceRulesRef.get();
  
  if (snapshot.empty) return 0;

  const priceRules = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  let toDelete: string[] = [];

  // Para Puerto Los Cabos, mantener solo una regla por banda horaria
  if (courseId === 'puerto-los-cabos') {
    const rulesByTimeBand = new Map<string, any[]>();
    const generalRules: any[] = [];

    // Agrupar reglas por timeBandId
    for (const rule of priceRules) {
      if (rule.timeBandId) {
        if (!rulesByTimeBand.has(rule.timeBandId)) {
          rulesByTimeBand.set(rule.timeBandId, []);
        }
        rulesByTimeBand.get(rule.timeBandId)!.push(rule);
      } else {
        generalRules.push(rule);
      }
    }

    const toKeepIds = new Set<string>();

    // Mantener reglas generales (sin timeBandId)
    for (const rule of generalRules) {
      toKeepIds.add(rule.id);
    }

    // Para cada banda horaria, mantener solo la regla de mayor prioridad
    for (const [timeBandId, bandRules] of rulesByTimeBand.entries()) {
      if (bandRules.length > 0) {
        // Ordenar por prioridad (mayor primero) y luego por fecha de actualización
        const bestRule = bandRules.sort((a, b) => {
          if (b.priority !== a.priority) return b.priority - a.priority;
          const aUpdated = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
          const bUpdated = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
          return bUpdated - aUpdated;
        })[0];
        toKeepIds.add(bestRule.id);
      }
    }

    toDelete = priceRules
      .filter(rule => !toKeepIds.has(rule.id))
      .map(rule => rule.id);

  } else {
    // Para otros cursos, usar lógica de deduplicación estándar
    const seen = new Set<string>();
    const toKeepIds = new Set<string>();

    for (const rule of priceRules) {
      const keyParts = [
        (rule.name || '').trim().toLowerCase(),
        rule.seasonId || '',
        rule.timeBandId || '',
        (rule.dow || []).join(','),
        String(rule.leadTimeMin ?? ''),
        String(rule.leadTimeMax ?? ''),
        String(rule.occupancyMin ?? ''),
        String(rule.occupancyMax ?? ''),
        String(rule.playersMin ?? ''),
        String(rule.playersMax ?? ''),
        rule.priceType,
        String(rule.priceValue),
        String(rule.priority),
        String(rule.active),
        rule.effectiveFrom || '',
        rule.effectiveTo || '',
        String(rule.minPrice ?? ''),
        String(rule.maxPrice ?? ''),
        String(rule.roundTo ?? '')
      ];
      const key = keyParts.join('|');
      if (!seen.has(key)) {
        seen.add(key);
        toKeepIds.add(rule.id);
      }
    }

    toDelete = priceRules
      .filter(rule => !toKeepIds.has(rule.id))
      .map(rule => rule.id);
  }

  // Eliminar los documentos duplicados en lotes
  const batch = adminDb.batch();
  for (const id of toDelete) {
    batch.delete(priceRulesRef.doc(id));
  }

  if (toDelete.length > 0) {
    await batch.commit();
  }

  return toDelete.length;
}

// Deduplicación por nombre en Firestore, con estrategia para decidir cuál conservar
async function dedupePriceRulesByNameInFirestore(
  courseId: string,
  strategy: 'highest_priority' | 'latest' = 'highest_priority'
): Promise<number> {
  const priceRulesRef = adminDb.collection('pricing').doc(courseId).collection('priceRules');
  const snapshot = await priceRulesRef.get();
  if (snapshot.empty) return 0;

  const priceRules = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  const groups = new Map<string, any[]>();
  for (const r of priceRules) {
    const key = (r.name || '').trim().toLowerCase();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  }

  const toKeepIds = new Set<string>();
  for (const [, list] of groups.entries()) {
    if (list.length === 1) {
      toKeepIds.add(list[0].id);
    } else {
      let keep = list[0];
      if (strategy === 'highest_priority') {
        keep = list.reduce((acc, cur) => {
          const accP = acc.priority ?? 0;
          const curP = cur.priority ?? 0;
          if (curP > accP) return cur;
          if (curP === accP) {
            const accUpdated = acc.updatedAt ? new Date(acc.updatedAt).getTime() : 0;
            const curUpdated = cur.updatedAt ? new Date(cur.updatedAt).getTime() : 0;
            return curUpdated > accUpdated ? cur : acc;
          }
          return acc;
        }, list[0]);
      } else {
        keep = list.reduce((acc, cur) => {
          const accUpdated = acc.updatedAt ? new Date(acc.updatedAt).getTime() : 0;
          const curUpdated = cur.updatedAt ? new Date(cur.updatedAt).getTime() : 0;
          return curUpdated > accUpdated ? cur : acc;
        }, list[0]);
      }
      toKeepIds.add(keep.id);
    }
  }

  const toDelete = priceRules.filter(r => !toKeepIds.has(r.id)).map(r => r.id);
  const batch = adminDb.batch();
  for (const id of toDelete) {
    batch.delete(priceRulesRef.doc(id));
  }
  if (toDelete.length > 0) await batch.commit();
  return toDelete.length;
}