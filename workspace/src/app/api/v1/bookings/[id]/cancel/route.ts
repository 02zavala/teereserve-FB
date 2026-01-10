import { NextResponse } from 'next/server';
import { getProvider } from '@/lib/integrations/router';
import { sendBookingCancellation } from '@/lib/email';
import { getCourseById } from '@/lib/data';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { cancellationPolicyService } from '@/lib/cancellation-policies';

export const dynamic = 'force-dynamic';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    let body = {};
    try {
      body = await req.json();
    } catch (e: any) {
      // Body might be empty
    }
    const { reason, customRefundAmount, force, ...otherData } = body as any;

    // 1. Get booking from Firestore (Primary Source of Truth for user info)
    if (!db) {
        throw new Error('Database not initialized');
    }
    const bookingRef = doc(db, 'bookings', id);
    const bookingSnap = await getDoc(bookingRef);
    
    const bookingData = bookingSnap.exists() ? { id: bookingSnap.id, ...bookingSnap.data() } as any : null;

    // Calculate refund amount if not provided
    let finalRefundAmount = customRefundAmount;
    
    if (bookingData && finalRefundAmount === undefined) {
      try {
        const bookingDateStr = bookingData.date || (bookingData.teeTime ? bookingData.teeTime.split('T')[0] : null);
        const bookingTimeStr = bookingData.time || (bookingData.teeTime ? bookingData.teeTime.split('T')[1]?.substring(0, 5) : '00:00');
        
        if (bookingDateStr) {
           const bookingDate = new Date(`${bookingDateStr}T${bookingTimeStr}`);
           const total = Number(bookingData.totalPrice || bookingData.pricePublicUSD || 0);
           
           const calculation = cancellationPolicyService.calculateRefund(
              bookingData.courseId || 'default-course',
              bookingDate,
              total,
              reason
           );
           finalRefundAmount = calculation.netRefund;
        }
      } catch (calcError) {
        console.warn('Failed to calculate auto-refund:', calcError);
      }
    }

    // 2. Cancel in Tee Sheet Provider (Release slot)
    let providerSuccess = false;
    let providerError: any = null;
    let providerResult: any = null;
    
    try {
        const provider = await getProvider();
        providerResult = await provider.cancelBooking(id, reason, finalRefundAmount);
        
        if (providerResult.status === 'not_found' && !bookingData && !force) {
            return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
        }
        providerSuccess = true;
    } catch (err: any) {
        console.error('Provider cancellation failed:', err);
        providerError = err;
        
        // If not forced, rethrow or return error
        if (!force) {
            // Check if we should fail or proceed. 
            // If booking exists in DB but provider failed, we usually want to block unless forced.
            throw new Error(`Provider cancellation failed: ${err.message || 'Unknown error'}`);
        }
        // If forced, continue to update Firestore
    }

    // 3. Update Firestore with cancellation details
    if (bookingSnap.exists()) {
        await updateDoc(bookingRef, {
            status: 'canceled_admin', // Default to admin cancellation for this endpoint
            cancellationReason: reason,
            refundAmount: finalRefundAmount,
            cancelledAt: new Date().toISOString(),
            providerError: providerError ? (providerError.message || JSON.stringify(providerError)) : null,
            forcedCancellation: !!force
        });
    } else if (!providerSuccess && !force) {
         // If neither provider worked nor DB had it, and not forced -> 404
         return NextResponse.json({ ok: false, error: 'Booking not found in system or provider' }, { status: 404 });
    }

    // 4. Send Email
    // Use bookingData from Firestore if available, otherwise provider result
    const booking = bookingData || (providerResult ? providerResult.booking : null);

    if (booking) {
      try {
        const course = await getCourseById(booking.courseId);
        
        // Handle different data structures between Firestore and Provider
        const date = booking.date || (booking.teeTime ? booking.teeTime.split('T')[0] : 'N/A');
        const time = booking.time || (booking.teeTime ? booking.teeTime.split('T')[1].substring(0,5) : 'N/A');
        const players = booking.players || booking.playerCount;
        const totalPrice = booking.totalPrice || booking.pricePublicUSD;

        const bookingDetails = {
          bookingId: booking.id,
          courseName: course?.name || booking.courseId,
          date,
          time,
          players,
          totalPrice
        };
        
        // Get user email - prioritize customerInfo, then guest, then direct fields
        const userEmail = 
            booking.customerInfo?.email || 
            booking.guest?.email || 
            booking.userEmail || 
            (booking.userId && booking.userId.includes('@') ? booking.userId : null);
            
        const userName = 
            booking.customerInfo?.name || 
            (booking.guest ? `${booking.guest.firstName} ${booking.guest.lastName}` : null) || 
            booking.userName || 
            'Golfer';

        if (userEmail) {
           await sendBookingCancellation(userEmail, userName, bookingDetails);
        } else {
            console.warn('No email found for booking cancellation:', booking.id);
        }
      } catch (emailError) {
        console.error('Failed to send cancellation email:', emailError);
        // Continue execution
      }
    }

    return NextResponse.json({ ok: true, data: booking }, { status: 200 });
  } catch (error: any) {
    console.error('Error processing cancellation:', error);
    return NextResponse.json({ ok: false, error: error?.message || 'Unexpected error' }, { status: 500 });
  }
}