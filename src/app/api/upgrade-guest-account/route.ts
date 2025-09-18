import { NextRequest, NextResponse } from 'next/server';
import { auth, db } from '@/lib/firebase-admin';
import { getFriendlyErrorMessage } from '@/lib/auth-utils';
import { FirestoreMigrationService } from '@/lib/firestore-migration';

interface UpgradeGuestAccountRequest {
  email: string;
  password: string;
  displayName: string;
  guestBookingIds?: string[];
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
    
    // Verify this is an anonymous user
    if (!decodedToken.firebase.sign_in_provider || decodedToken.firebase.sign_in_provider !== 'anonymous') {
      return NextResponse.json(
        { error: 'Only anonymous users can upgrade to account' },
        { status: 400 }
      );
    }

    const body: UpgradeGuestAccountRequest = await request.json();
    const { email, password, displayName, guestBookingIds = [] } = body;

    if (!email || !password || !displayName) {
      return NextResponse.json(
        { error: 'Missing required fields: email, password, displayName' },
        { status: 400 }
      );
    }

    // Using imported auth and db instances
    const anonymousUid = decodedToken.uid;

    try {
      // Check if email already exists
      let existingUser;
      try {
        existingUser = await auth.getUserByEmail(email);
      } catch (error: any) {
        if (error.code !== 'auth/user-not-found') {
          throw error;
        }
      }

      if (existingUser) {
        // Email already exists - return appropriate error
        const authMethods = await getAuthMethodsForEmail(email);
        return NextResponse.json(
          { 
            error: 'email-already-in-use',
            message: getFriendlyErrorMessage('auth/email-already-in-use'),
            authMethods,
            existingUserId: existingUser.uid
          },
          { status: 409 }
        );
      }

      // Create new user account
      const newUser = await auth.createUser({
        email,
        password,
        displayName,
        emailVerified: false
      });

      // Create user document in Firestore
      const userDocRef = db.collection('users').doc(newUser.uid);
      const userData = {
        email,
        displayName,
        createdAt: new Date(),
        isEmailVerified: false,
        accountType: 'upgraded_guest',
        originalAnonymousUid: anonymousUid,
        preferences: {
          notifications: true,
          marketing: false
        },
        migratedBookings: guestBookingIds
      };

      await userDocRef.set(userData);

      // Migrate guest bookings to new user using enhanced migration service
      const migrationService = new FirestoreMigrationService(db);
      const migrationResults = await migrationService.migrateGuestBookings(
        anonymousUid, 
        newUser.uid, 
        guestBookingIds,
        {
          validateAfterMigration: true,
          preserveOriginalData: true
        }
      );

      // Log the account upgrade
      await logAccountUpgrade(db, anonymousUid, newUser.uid, migrationResults);

      // Delete anonymous user (optional - Firebase will handle cleanup)
      try {
        await auth.deleteUser(anonymousUid);
      } catch (error) {
        console.warn('Could not delete anonymous user:', error);
        // Non-critical error, continue
      }

      return NextResponse.json({
        success: migrationResults.success,
        user: {
          uid: newUser.uid,
          email: newUser.email,
          displayName: newUser.displayName
        },
        migrationResults: {
          processedBookings: migrationResults.processedCount,
          migratedBookings: migrationResults.successCount,
          failedMigrations: migrationResults.failedCount,
          skippedBookings: migrationResults.skippedCount,
          errors: migrationResults.errors
        }
      });

    } catch (error: any) {
      console.error('Error upgrading guest account:', error);
      
      // Handle specific Firebase Auth errors
      if (error.code) {
        return NextResponse.json(
          { 
            error: error.code,
            message: getFriendlyErrorMessage(error.code)
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to upgrade account' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error in upgrade-guest-account API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to get authentication methods for an email
async function getAuthMethodsForEmail(email: string): Promise<string[]> {
  try {
    // Using imported auth instance
    const user = await auth.getUserByEmail(email);
    
    const methods: string[] = [];
    
    // Check for password provider
    if (user.providerData.some(provider => provider.providerId === 'password')) {
      methods.push('password');
    }
    
    // Check for Google provider
    if (user.providerData.some(provider => provider.providerId === 'google.com')) {
      methods.push('google');
    }
    
    // Check for other providers as needed
    user.providerData.forEach(provider => {
      if (!methods.includes(provider.providerId) && provider.providerId !== 'password') {
        methods.push(provider.providerId);
      }
    });
    
    return methods;
  } catch (error) {
    console.error('Error getting auth methods:', error);
    return [];
  }
}

// Helper function to migrate guest bookings with enhanced data integrity
async function migrateGuestBookings(
  db: FirebaseFirestore.Firestore,
  anonymousUid: string,
  newUserId: string,
  specificBookingIds: string[] = []
) {
  const results = {
    migratedCount: 0,
    failedCount: 0,
    errors: [] as string[],
    migratedBookingIds: [] as string[],
    skippedBookingIds: [] as string[]
  };

  try {
    // Query for guest bookings
    let bookingsQuery = db.collection('bookings')
      .where('userId', '==', anonymousUid)
      .where('isGuest', '==', true);

    const bookingsSnapshot = await bookingsQuery.get();
    
    // Use batch for atomic updates (max 500 operations per batch)
    const batch = db.batch();
    let operationCount = 0;
    const maxBatchSize = 450; // Leave some margin
    
    for (const doc of bookingsSnapshot.docs) {
      const bookingId = doc.id;
      const bookingData = doc.data();
      
      // If specific IDs provided, only migrate those
      if (specificBookingIds.length > 0 && !specificBookingIds.includes(bookingId)) {
        results.skippedBookingIds.push(bookingId);
        continue;
      }
      
      // Validate booking data before migration
      if (!bookingData || bookingData.status === 'canceled_customer' || bookingData.status === 'canceled_admin') {
        results.errors.push(`Booking ${bookingId} is canceled or invalid, skipping migration`);
        results.failedCount++;
        results.skippedBookingIds.push(bookingId);
        continue;
      }
      
      // Check if we need to commit current batch and start a new one
      if (operationCount >= maxBatchSize) {
        await batch.commit();
        // Start new batch (this would require refactoring to handle multiple batches)
        // For now, we'll limit to one batch
        break;
      }
      
      const bookingRef = db.collection('bookings').doc(bookingId);
      
      // Enhanced migration data with better tracking
      const migrationData = {
        userId: newUserId,
        isGuest: false,
        migratedAt: new Date(),
        originalAnonymousUid: anonymousUid,
        updatedAt: new Date(),
        migrationMetadata: {
          migratedFrom: 'guest_account_upgrade',
          originalGuestData: {
            userId: anonymousUid,
            guestInfo: bookingData.guest || null,
            originalCreatedAt: bookingData.createdAt
          },
          migrationTimestamp: new Date().toISOString()
        }
      };
      
      batch.update(bookingRef, migrationData);
      
      results.migratedCount++;
      results.migratedBookingIds.push(bookingId);
      operationCount++;
    }

    // Commit the batch if there are operations
    if (operationCount > 0) {
      await batch.commit();
    }

    // Additional validation: verify migrations were successful
    if (results.migratedCount > 0) {
      await validateMigrationSuccess(db, newUserId, results.migratedBookingIds);
    }

  } catch (error) {
    console.error('Error migrating guest bookings:', error);
    results.failedCount += results.migratedCount;
    results.migratedCount = 0;
    results.errors.push(error instanceof Error ? error.message : 'Unknown migration error');
  }

  return results;
}

// Helper function to validate migration success
async function validateMigrationSuccess(
  db: FirebaseFirestore.Firestore,
  newUserId: string,
  migratedBookingIds: string[]
) {
  try {
    const validationPromises = migratedBookingIds.map(async (bookingId) => {
      const bookingDoc = await db.collection('bookings').doc(bookingId).get();
      const data = bookingDoc.data();
      
      if (!data || data.userId !== newUserId || data.isGuest !== false) {
        throw new Error(`Migration validation failed for booking ${bookingId}`);
      }
    });
    
    await Promise.all(validationPromises);
    console.log(`Migration validation successful for ${migratedBookingIds.length} bookings`);
  } catch (error) {
    console.error('Migration validation failed:', error);
    throw error;
  }
}

// Helper function to log account upgrade for audit purposes
async function logAccountUpgrade(
  db: FirebaseFirestore.Firestore,
  anonymousUid: string,
  newUserId: string,
  migrationResults: any
) {
  try {
    const auditLogRef = db.collection('auditLogs').doc();
    await auditLogRef.set({
      action: 'guest_account_upgrade',
      anonymousUid,
      newUserId,
      migrationResults,
      timestamp: new Date(),
      metadata: {
        migratedBookings: migrationResults.migratedCount,
        failedMigrations: migrationResults.failedCount
      }
    });
  } catch (error) {
    console.error('Error logging account upgrade:', error);
    // Non-critical error, don't throw
  }
}