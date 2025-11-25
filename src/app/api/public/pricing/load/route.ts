import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { doc, getDoc } from 'firebase/firestore'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get('courseId')

    if (!courseId) {
      return NextResponse.json({ ok: false, error: 'Missing courseId' }, { status: 400 })
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log('[PUBLIC PRICING] loading courseId', courseId)
    }

    if (!db) {
      return NextResponse.json({ ok: true, data: { courseId, basePrice: null, pricingBands: [], currency: 'USD', minPrice: null } })
    }

    const courseRef = doc(db, 'courses', courseId)
    const snap = await getDoc(courseRef)

    if (!snap.exists()) {
      return NextResponse.json({ ok: true, data: { courseId, basePrice: null, pricingBands: [], currency: 'USD', minPrice: null } })
    }

    const data = snap.data() as any
    const basePrice = typeof data?.basePrice === 'number' ? data.basePrice : null
    const pricingBands = Array.isArray(data?.pricingBands) ? data.pricingBands : []
    const currency = typeof data?.currency === 'string' ? data.currency : 'USD'

    let minPrice: number | null = null
    if (pricingBands.length > 0) {
      const prices = pricingBands
        .map((b: any) => (typeof b?.price === 'number' ? b.price : null))
        .filter((v: number | null) => typeof v === 'number') as number[]
      if (prices.length > 0) {
        minPrice = Math.min(...prices)
      }
    }
    if (minPrice === null && typeof basePrice === 'number') {
      minPrice = basePrice
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log('[PUBLIC PRICING] bands loaded', { courseId, count: pricingBands.length })
      console.log('[PUBLIC PRICING] minPrice computed', { courseId, minPrice })
    }

    return NextResponse.json({ ok: true, data: { courseId, basePrice, pricingBands, currency, minPrice } })
  } catch (error) {
    return NextResponse.json({ ok: true, data: { courseId: null, basePrice: null, pricingBands: [], currency: 'USD', minPrice: null } })
  }
}

