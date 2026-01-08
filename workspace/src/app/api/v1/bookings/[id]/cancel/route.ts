import { NextResponse } from 'next/server';
import { getProvider } from '@/lib/integrations/router';

export const dynamic = 'force-dynamic';

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const provider = await getProvider();
    const result = await provider.cancelBooking(params.id);
    if (result.status === 'not_found') {
      return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true, data: result.booking }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'Unexpected error' }, { status: 500 });
  }
}