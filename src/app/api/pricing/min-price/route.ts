import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

/**
 * GET /api/pricing/min-price?courseId=...
 * Devuelve el precio mínimo ("Desde $X") derivado de BaseProduct y PriceRules activos.
 * - Lee de Firestore: pricing/{courseId}/baseProducts/default y pricing/{courseId}/priceRules
 * - Aplica reglas activas y dentro de ventana de efectividad (si existe)
 * - Calcula candidato por regla: fixed -> valor, delta -> base + valor, multiplier -> base * valor
 * - Respeta minPrice, maxPrice, roundTo si están definidos en la regla
 * - Fallback a courses/{courseId}.basePrice si no hay BaseProduct
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId');

    if (!courseId) {
      return NextResponse.json(
        { ok: false, error: 'Missing courseId' },
        { status: 400 }
      );
    }

    const now = new Date();

    // 1) Base product
    let basePrice: number | undefined;
    try {
      const baseDoc = await db
        .collection('pricing')
        .doc(courseId)
        .collection('baseProducts')
        .doc('default')
        .get();
      if (baseDoc.exists) {
        const bp = baseDoc.data() as any;
        // Soportar ambos esquemas: greenFeeBaseUsd (engine) y basePrice (API save)
        if (typeof bp?.greenFeeBaseUsd === 'number') basePrice = bp.greenFeeBaseUsd;
        else if (typeof bp?.basePrice === 'number') basePrice = bp.basePrice;
      }
    } catch (e) {
      // Continuar con fallback
    }

    // Fallback: usar courses/{courseId}.basePrice
    if (typeof basePrice !== 'number') {
      try {
        const courseDoc = await db.collection('courses').doc(courseId).get();
        if (courseDoc.exists) {
          const data = courseDoc.data() as any;
          if (typeof data?.basePrice === 'number') basePrice = data.basePrice;
        }
      } catch (e) {
        // Ignorar, se manejará más abajo
      }
    }

    if (typeof basePrice !== 'number' || isNaN(basePrice)) {
      return NextResponse.json(
        { ok: false, error: 'Base price not found for course' },
        { status: 404 }
      );
    }

    // 2) Reglas de precio
    let minPrice = basePrice;
    try {
      const rulesSnap = await db
        .collection('pricing')
        .doc(courseId)
        .collection('priceRules')
        .get();

      const rules = rulesSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      for (const rule of rules) {
        // Solo reglas activas
        if (rule.active === false) continue;

        // Filtrar por ventana de efectividad si existe
        const fromOk = !rule.effectiveFrom || new Date(rule.effectiveFrom) <= now;
        const toOk = !rule.effectiveTo || new Date(rule.effectiveTo) >= now;
        if (!fromOk || !toOk) continue;

        let candidate = basePrice;
        switch (rule.priceType) {
          case 'fixed':
            candidate = Number(rule.priceValue) || basePrice;
            break;
          case 'delta':
            candidate = basePrice + (Number(rule.priceValue) || 0);
            break;
          case 'multiplier':
            candidate = basePrice * (Number(rule.priceValue) || 1);
            break;
          default:
            candidate = basePrice;
        }

        // Aplicar límites si están definidos
        if (typeof rule.minPrice === 'number') {
          candidate = Math.max(candidate, rule.minPrice);
        }
        if (typeof rule.maxPrice === 'number') {
          candidate = Math.min(candidate, rule.maxPrice);
        }
        // Redondeo si aplica
        if (typeof rule.roundTo === 'number' && rule.roundTo > 0) {
          candidate = Math.round(candidate / rule.roundTo) * rule.roundTo;
        }

        if (candidate < minPrice) {
          minPrice = candidate;
        }
      }
    } catch (e) {
      // Si falla la lectura de reglas, devolvemos basePrice
    }

    // Asegurar no negativo
    minPrice = Math.max(0, Number(minPrice) || 0);

    return NextResponse.json({
      ok: true,
      data: {
        courseId,
        currency: 'USD',
        minPrice
      }
    });
  } catch (error: any) {
    console.error('Error calculating min price:', error);
    return NextResponse.json(
      { ok: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}