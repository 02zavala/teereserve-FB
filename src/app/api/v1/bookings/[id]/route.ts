import { NextResponse } from 'next/server';
import { getProvider } from '@/lib/integrations/router';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const provider = await getProvider();
    const booking = await provider.getBookingById(params.id);
    if (!booking) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
    return NextResponse.json({ ok: true, data: booking }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'Unexpected error' }, { status: 500 });
  }
}