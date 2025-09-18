import { NextRequest, NextResponse } from 'next/server';
import { auth, db } from '@/lib/firebase-admin';
import { FirestoreMigrationService } from '@/lib/firestore-migration';

interface LinkGuestBookingsRequest {
  guestUserId: string;
  authenticatedUserId: string;
  bookingIds?: string[];
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization required' },
        { status: 401 }
      );
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);

    const body: LinkGuestBookingsRequest = await request.json();
    const { guestUserId, authenticatedUserId, bookingIds = [] } = body;

    if (!guestUserId || !authenticatedUserId) {
      return NextResponse.json(
        { error: 'Missing required fields: guestUserId, authenticatedUserId' },
        { status: 400 }
      );
    }

    // Verify the requesting user is the authenticated user
    if (decodedToken.uid !== authenticatedUserId) {
      return NextResponse.json(
        { error: 'Unauthorized: can only link bookings to your own account' },
        { status: 403 }
      );
    }

    // db is already imported from firebase-admin config

    // Link guest bookings to authenticated user using enhanced migration service
    const migrationService = new FirestoreMigrationService(db);
    const linkingResults = await migrationService.linkGuestBookings(
      guestUserId,
      authenticatedUserId,
      bookingIds,
      {
        validateAfterMigration: true,
        preserveOriginalData: true
      }
    );

    // Update user document to track linked bookings
    await updateUserWithLinkedBookings(
      db,
      authenticatedUserId,
      guestUserId,
      linkingResults
    );

    // Log the booking linking for audit purposes
    await logBookingLinking(
      db,
      guestUserId,
      authenticatedUserId,
      linkingResults
    );

    return NextResponse.json({
      success: linkingResults.success,
      linkedBookings: linkingResults.successCount,
      failedBookings: linkingResults.failedCount,
      skippedBookings: linkingResults.skippedCount,
      processedBookings: linkingResults.processedCount,
      errors: linkingResults.errors,
      message: linkingResults.success 
        ? `Successfully linked ${linkingResults.successCount} booking(s) to your account`
        : `Linking completed with ${linkingResults.failedCount} failures and ${linkingResults.skippedCount} skipped bookings`
    });

  } catch (error) {
    console.error('Error linking guest bookings:', error);
    return NextResponse.json(
      { error: 'Failed to link guest bookings' },
      { status: 500 }
    );
  }
}

// Helper function to link guest bookings to authenticated user with enhanced validation
async function linkGuestBookingsToUser(
  db: FirebaseFirestore.Firestore,
  guestUserId: string,
  authenticatedUserId: string,
  specificBookingIds: string[] = []
) {
  const results = {
    linkedCount: 0,
    failedCount: 0,
    errors: [] as string[],
    linkedBookingIds: [] as string[],
    skippedBookingIds: [] as string[]
  };

  try {
    // Validate that users are different
    if (guestUserId === authenticatedUserId) {
      throw new Error('Cannot link bookings to the same user');
    }

    // Query for guest bookings
    let bookingsQuery = db.collection('bookings')
      .where('userId', '==', guestUserId)
      .where('isGuest', '==', true);

    const bookingsSnapshot = await bookingsQuery.get();
    
    if (bookingsSnapshot.empty) {
      return {
        ...results,
        errors: ['No guest bookings found for the specified user']
      };
    }
    
    // Use batch for atomic updates (max 500 operations per batch)
    const batch = db.batch();
    let operationCount = 0;
    const maxBatchSize = 450; // Leave some margin
    
    for (const doc of bookingsSnapshot.docs) {
      const bookingId = doc.id;
      const bookingData = doc.data();
      
      // If specific IDs provided, only link those
      if (specificBookingIds.length > 0 && !specificBookingIds.includes(bookingId)) {
        results.skippedBookingIds.push(bookingId);
        continue;
      }
      
      // Enhanced validation for booking linking
      if (!bookingData) {
        results.errors.push(`Booking ${bookingId} has no data, skipping`);
        results.failedCount++;
        results.skippedBookingIds.push(bookingId);
        continue;
      }
      
      // Check if booking is still valid for linking
      if (bookingData.status === 'canceled_customer' || bookingData.status === 'canceled_admin') {
        results.errors.push(`Booking ${bookingId} is canceled and cannot be linked`);
        results.failedCount++;
        results.skippedBookingIds.push(bookingId);
        continue;
      }
      
      // Check if booking is already linked to another user
      if (!bookingData.isGuest && bookingData.userId !== guestUserId) {
        results.errors.push(`Booking ${bookingId} is already linked to another user`);
        results.failedCount++;
        results.skippedBookingIds.push(bookingId);
        continue;
      }
      
      // Check batch size limit
      if (operationCount >= maxBatchSize) {
        await batch.commit();
        // For now, we'll limit to one batch - in production, implement multiple batches
        results.errors.push('Batch size limit reached, some bookings may not be processed');
        break;
      }
      
      const bookingRef = db.collection('bookings').doc(bookingId);
      
      // Enhanced linking data with better tracking
      const linkingData = {
        userId: authenticatedUserId,
        isGuest: false,
        linkedAt: new Date(),
        originalGuestUserId: guestUserId,
        updatedAt: new Date(),
        // Preserve guest information for reference and audit
        linkingMetadata: {
          linkedFrom: 'guest_booking_linking',
          originalGuestData: {
            userId: guestUserId,
            guestInfo: bookingData.guest || null,
            originalCreatedAt: bookingData.createdAt,
            originalStatus: bookingData.status
          },
          linkingTimestamp: new Date().toISOString(),
          linkedByUser: authenticatedUserId
        }
      };
      
      batch.update(bookingRef, linkingData);
      
      results.linkedCount++;
      results.linkedBookingIds.push(bookingId);
      operationCount++;
    }

    // Commit the batch if there are operations
    if (operationCount > 0) {
      await batch.commit();
      
      // Validate linking success
      await validateLinkingSuccess(db, authenticatedUserId, results.linkedBookingIds);
    }

  } catch (error) {
    console.error('Error linking guest bookings:', error);
    results.failedCount += results.linkedCount;
    results.linkedCount = 0;
    results.errors.push(error instanceof Error ? error.message : 'Unknown linking error');
  }

  return results;
}

// Helper function to validate linking success
async function validateLinkingSuccess(
  db: FirebaseFirestore.Firestore,
  authenticatedUserId: string,
  linkedBookingIds: string[]
) {
  try {
    const validationPromises = linkedBookingIds.map(async (bookingId) => {
      const bookingDoc = await db.collection('bookings').doc(bookingId).get();
      const data = bookingDoc.data();
      
      if (!data || data.userId !== authenticatedUserId || data.isGuest !== false) {
        throw new Error(`Linking validation failed for booking ${bookingId}`);
      }
    });
    
    await Promise.all(validationPromises);
    console.log(`Linking validation successful for ${linkedBookingIds.length} bookings`);
  } catch (error) {
    console.error('Linking validation failed:', error);
    throw error;
  }
}

// Helper function to update user document with linked booking information
async function updateUserWithLinkedBookings(
  db: FirebaseFirestore.Firestore,
  authenticatedUserId: string,
  guestUserId: string,
  linkingResults: any
) {
  try {
    const userDocRef = db.collection('users').doc(authenticatedUserId);
    const userDoc = await userDocRef.get();
    
    const updateData: any = {
      updatedAt: new Date()
    };
    
    // Add linked bookings info
    if (linkingResults.linkedCount > 0) {
      updateData.linkedGuestBookings = {
        guestUserId,
        linkedAt: new Date(),
        bookingCount: linkingResults.linkedCount,
        bookingIds: linkingResults.linkedBookingIds
      };
      
      // If user document doesn't exist, create it
      if (!userDoc.exists) {
        updateData.createdAt = new Date();
        updateData.accountType = 'linked_guest_bookings';
      }
    }
    
    await userDocRef.set(updateData, { merge: true });
    
  } catch (error) {
    console.error('Error updating user with linked bookings:', error);
    // Non-critical error, don't throw
  }
}

// Helper function to log booking linking for audit purposes
async function logBookingLinking(
  db: FirebaseFirestore.Firestore,
  guestUserId: string,
  authenticatedUserId: string,
  linkingResults: any
) {
  try {
    const auditLogRef = db.collection('auditLogs').doc();
    await auditLogRef.set({
      action: 'guest_bookings_linked',
      guestUserId,
      authenticatedUserId,
      linkingResults,
      timestamp: new Date(),
      metadata: {
        linkedBookings: linkingResults.linkedCount,
        failedLinkings: linkingResults.failedCount,
        bookingIds: linkingResults.linkedBookingIds
      }
    });
  } catch (error) {
    console.error('Error logging booking linking:', error);
    // Non-critical error, don't throw
  }
}

// GET endpoint to retrieve guest bookings that can be linked
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization required' },
        { status: 401 }
      );
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);
    
    const { searchParams } = new URL(request.url);
    const guestUserId = searchParams.get('guestUserId');
    
    if (!guestUserId) {
      return NextResponse.json(
        { error: 'Missing guestUserId parameter' },
        { status: 400 }
      );
    }

    // db is already imported from firebase-admin config
    
    // Get guest bookings
    const bookingsQuery = db.collection('bookings')
      .where('userId', '==', guestUserId)
      .where('isGuest', '==', true)
      .orderBy('createdAt', 'desc');
    
    const bookingsSnapshot = await bookingsQuery.get();
    
    const bookings = bookingsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || null
    }));
    
    return NextResponse.json({
      success: true,
      bookings,
      count: bookings.length
    });
    
  } catch (error) {
    console.error('Error retrieving guest bookings:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve guest bookings' },
      { status: 500 }
    );
  }
}