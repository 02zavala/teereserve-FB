import { NextRequest, NextResponse } from 'next/server';
import { getProvider } from '@/lib/integrations/router';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const provider = await getProvider();
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date') || new Date().toISOString().slice(0, 10);
    const slots = await provider.getAvailability(params.id, date);
    return NextResponse.json({ ok: true, data: slots, meta: { date } }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'Unexpected error' }, { status: 500 });
  }
}