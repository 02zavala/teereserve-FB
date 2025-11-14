import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import { generateReceiptPdf, saveReceiptToStorage } from '@/lib/receipt-pdf';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookingDetails, saveToStorage = true } = body || {};

    if (!bookingDetails || typeof bookingDetails !== 'object') {
      return new Response(JSON.stringify({ error: 'Missing bookingDetails' }), { status: 400 });
    }

    const { buffer, filename } = await generateReceiptPdf(bookingDetails, { lang: 'bilingual' });

    // Optionally save to Storage for audit/access
    if (saveToStorage && bookingDetails.bookingId) {
      try {
        await saveReceiptToStorage(buffer, bookingDetails.bookingId, bookingDetails.confirmationNumber);
      } catch (e) {
        console.warn('Receipt storage save failed (non-fatal):', e);
      }
    }

    // Stream the PDF as a Web ReadableStream to avoid body conversion issues
    const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(arrayBuffer));
        controller.close();
      }
    });

    return new NextResponse(stream, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: any) {
    console.error('[api/booking/receipt] Error:', error?.stack || error?.message || error);
    return new NextResponse(
      JSON.stringify({ error: 'Failed to generate receipt PDF', message: error?.message, stack: error?.stack }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}