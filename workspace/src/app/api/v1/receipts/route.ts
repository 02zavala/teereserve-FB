import { NextRequest, NextResponse } from 'next/server';
import { generateReceiptPdf } from '@/lib/receipt-pdf';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const details = {
      bookingId: payload.bookingId,
      confirmationNumber: payload.confirmationNumber,
      courseName: payload.courseName || 'Course',
      courseLocation: payload.courseLocation || undefined,
      date: payload.date || new Date().toISOString().slice(0, 10),
      time: payload.time || new Date().toISOString().slice(11, 19),
      players: Number(payload.players || 1),
      holes: Number(payload.holes || 18),
      totalPrice: typeof payload.totalPrice === 'number' ? payload.totalPrice : Number(payload.totalPrice || 0),
      customerName: payload.customerName || undefined,
      customerEmail: payload.customerEmail || undefined,
    };

    const { buffer, filename } = await generateReceiptPdf(details, { lang: payload.lang || 'bilingual' });
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'Unexpected error' }, { status: 500 });
  }
}