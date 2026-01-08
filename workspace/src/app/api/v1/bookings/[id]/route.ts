import { NextResponse } from 'next/server';
import { getBookingById } from '@/core/bookings';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const tenantId = (req.headers as any).get?.('x-tenant-id') || 'default';
    const booking = await getBookingById(String(tenantId), params.id);
    if (!booking) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
    return NextResponse.json({ ok: true, data: booking }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'Unexpected error' }, { status: 500 });
  }
}