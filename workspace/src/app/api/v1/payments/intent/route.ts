import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const paymentIntents = new Map<string, any>(); // Idempotency-Key -> intent

export async function POST(req: NextRequest) {
  try {
    const idemp = req.headers.get('Idempotency-Key') || undefined;
    const body = await req.json();
    const amount = Number(body?.amount ?? 0);
    const currency = String(body?.currency || 'USD');
    const description = String(body?.description || 'TeeReserve Payment');

    if (!amount || amount <= 0) {
      return NextResponse.json({ ok: false, error: 'Invalid amount' }, { status: 400 });
    }

    if (idemp && paymentIntents.has(idemp)) {
      return NextResponse.json({ ok: true, data: paymentIntents.get(idemp), idempotent: true }, { status: 200 });
    }

    const id = `pi_mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const clientSecret = `mock_secret_${Math.random().toString(36).slice(2)}`;
    const intent = { id, clientSecret, amount, currency, description, status: 'requires_confirmation' };
    if (idemp) paymentIntents.set(idemp, intent);

    return NextResponse.json({ ok: true, data: intent }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'Unexpected error' }, { status: 500 });
  }
}