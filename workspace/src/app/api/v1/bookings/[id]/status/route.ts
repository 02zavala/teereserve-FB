import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { status, reason, ...data } = await req.json();

    if (!db) {
        return NextResponse.json({ ok: false, error: 'Database not initialized' }, { status: 500 });
    }

    if (!status) {
      return NextResponse.json({ ok: false, error: 'Status is required' }, { status: 400 });
    }

    const bookingRef = doc(db, 'bookings', id);
    const bookingSnap = await getDoc(bookingRef);

    if (!bookingSnap.exists()) {
      return NextResponse.json({ ok: false, error: 'Booking not found' }, { status: 404 });
    }
    
    // Construct update data
    const updateData: any = {
      status,
      updatedAt: new Date().toISOString()
    };
    
    if (reason) {
        updateData.statusChangeReason = reason;
    }

    // Add specific fields based on status
    if (status === 'checked_in') {
        updateData.checkInTime = new Date().toISOString();
        if (data.locationVerified) {
            updateData.checkInLocationVerified = true;
        }
    } else if (status === 'no_show') {
        updateData.noShowTime = new Date().toISOString();
    } else if (status === 'completed') {
        updateData.completedTime = new Date().toISOString();
    }

    await updateDoc(bookingRef, updateData);

    return NextResponse.json({ ok: true, data: { ...bookingSnap.data(), ...updateData } }, { status: 200 });

  } catch (error: any) {
    console.error('Error updating booking status:', error);
    return NextResponse.json({ ok: false, error: error?.message || 'Unexpected error' }, { status: 500 });
  }
}
