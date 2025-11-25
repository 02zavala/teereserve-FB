import { NextRequest, NextResponse } from 'next/server';
import { getProvider } from '@/lib/integrations/router';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const provider = await getProvider();
    const idemp = req.headers.get('Idempotency-Key') || undefined;
    const payload = await req.json();

    const required = ['courseId', 'teeTime', 'playerCount', 'pricePublicUSD'];
    for (const k of required) if (!(k in payload)) {
      return NextResponse.json({ ok: false, error: `Missing field: ${k}` }, { status: 400 });
    }

    const booking = await provider.createBooking(
      {
        courseId: String(payload.courseId),
        teeTime: String(payload.teeTime),
        playerCount: Number(payload.playerCount),
        pricePublicUSD: Number(payload.pricePublicUSD),
        currency: payload.currency || 'USD',
        channel: payload.channel || 'direct',
        conciergeId: payload.conciergeId,
      },
      idemp
    );

    return NextResponse.json({ ok: true, data: booking }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'Unexpected error' }, { status: 500 });
  }
}