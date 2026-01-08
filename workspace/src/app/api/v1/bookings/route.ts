import { NextRequest, NextResponse } from 'next/server';
import { createBooking } from '@/core/bookings';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const idemp = req.headers.get('Idempotency-Key') || undefined;
    const payload = await req.json();
    const tenantId = req.headers.get('x-tenant-id') || 'default';
    const input = {
      tenantId,
      courseId: String(payload.courseId),
      date: payload.date || String(payload.teeTime).slice(0, 10),
      time: payload.time || String(payload.teeTime).slice(11, 16),
      players: Number(payload.playerCount || payload.players || 1),
      guest: payload.guest,
    }
    const booking = await createBooking(input)
    return NextResponse.json({ ok: true, data: booking, meta: { idempotencyKey: idemp } }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'Unexpected error' }, { status: 500 });
  }
}