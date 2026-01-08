import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const STRIPE_API_VERSION = '2025-02-24.acacia' as const;
const MEASUREMENT_ID = 'G-LZ0Y4R86E7';

async function sendGa4Purchase(event: any) {
  const apiSecret = process.env.GA4_API_SECRET;
  if (!apiSecret) return;
  const url = `https://www.google-analytics.com/mp/collect?measurement_id=${MEASUREMENT_ID}&api_secret=${apiSecret}`;
  const payload = {
    client_id: event.client_id || `${Date.now()}.${Math.floor(Math.random() * 100000)}`,
    events: [
      {
        name: 'purchase',
        params: {
          transaction_id: event.transaction_id,
          value: event.value,
          currency: event.currency || 'USD',
          items: event.items || [],
        },
      },
    ],
  };
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function POST(req: NextRequest) {
  try {
    const sig = req.headers.get('stripe-signature');
    const whSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!sig || !whSecret) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }
    const raw = await req.text();
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: STRIPE_API_VERSION });
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(raw, sig, whSecret);
    } catch {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    if (event.type === 'payment_intent.succeeded') {
      const intent = event.data.object as Stripe.PaymentIntent;
      const md = intent.metadata || {} as any;
      const amountUsd = (typeof md.priceUsd === 'string' ? parseFloat(md.priceUsd) : intent.amount_received / 100) || 0;
      const clientId = md.client_id || null;
      const courseId = md.courseId || '';
      const courseName = md.courseName || 'Course';
      const items = [
        {
          item_id: courseId,
          item_name: courseName,
          item_category: 'golf_course',
          price: amountUsd,
          quantity: Number(md.players || '1') || 1,
        },
      ];
      await sendGa4Purchase({
        client_id: clientId,
        transaction_id: intent.id,
        value: amountUsd,
        currency: intent.currency?.toUpperCase() || 'USD',
        items,
      });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
