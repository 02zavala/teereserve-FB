import { NextResponse } from 'next/server';
import { getBookingById } from '@/core/bookings';
import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const tenantId = (req.headers as any).get?.('x-tenant-id') || 'default';
    const booking = await getBookingById(String(tenantId), id);
    if (!booking) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
    return NextResponse.json({ ok: true, data: booking }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'Unexpected error' }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: paramsId } = await params;
    const data = await req.json();

    if (!db) {
        return NextResponse.json({ ok: false, error: 'Database not initialized' }, { status: 500 });
    }

    const bookingRef = doc(db, 'bookings', paramsId);
    
    // Filter out protected fields if necessary, but for admin API we allow most updates
    // Removing id from data to avoid overwriting it
    const { id, ...updateData } = data;

    const finalUpdateData = {
        ...updateData,
        updatedAt: new Date().toISOString()
    };

    await updateDoc(bookingRef, finalUpdateData);

    return NextResponse.json({ ok: true, data: finalUpdateData }, { status: 200 });
  } catch (error: any) {
    console.error('Error updating booking:', error);
    return NextResponse.json({ ok: false, error: error?.message || 'Unexpected error' }, { status: 500 });
  }
}