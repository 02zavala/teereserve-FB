import { getFirestore } from 'firebase-admin/firestore';
import type { Firestore } from 'firebase-admin/firestore';

export interface MigrationResult {
  success: boolean;
  processedCount: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  errors: string[];
  processedIds: string[];
  failedIds: string[];
  skippedIds: string[];
}

export interface MigrationOptions {
  batchSize?: number;
  validateAfterMigration?: boolean;
  dryRun?: boolean;
  preserveOriginalData?: boolean;
}

export interface BookingMigrationData {
  userId: string;
  isGuest: boolean;
  migratedAt?: Date;
  linkedAt?: Date;
  originalUserId?: string;
  updatedAt: Date;
  migrationMetadata?: {
    migratedFrom: string;
    originalGuestData: {
      userId: string;
      guestInfo: any;
      originalCreatedAt: any;
      originalStatus?: string;
    };
    migrationTimestamp: string;
    linkedByUser?: string;
  };
}

/**
 * Enhanced Firestore migration utility for guest booking operations
 */
export class FirestoreMigrationService {
  private db: Firestore | null = null;
  private defaultOptions: MigrationOptions = {
    batchSize: 450,
    validateAfterMigration: true,
    dryRun: false,
    preserveOriginalData: true
  };

  constructor(db?: Firestore) {
    if (db) {
      this.db = db;
    }
  }

  private getDb(): Firestore {
    if (!this.db) {
      this.db = getFirestore();
    }
    return this.db;
  }

  /**
   * Migrate guest bookings to a new authenticated user account
   */
  async migrateGuestBookings(
    anonymousUid: string,
    newUserId: string,
    specificBookingIds: string[] = [],
    options: MigrationOptions = {}
  ): Promise<MigrationResult> {
    const opts = { ...this.defaultOptions, ...options };
    const result: MigrationResult = {
      success: false,
      processedCount: 0,
      successCount: 0,
      failedCount: 0,
      skippedCount: 0,
      errors: [],
      processedIds: [],
      failedIds: [],
      skippedIds: []
    };

    try {
      // Validate input parameters
      if (!anonymousUid || !newUserId) {
        throw new Error('Both anonymousUid and newUserId are required');
      }

      if (anonymousUid === newUserId) {
        throw new Error('Source and target user IDs cannot be the same');
      }

      // Query for guest bookings
      const bookingsQuery = this.getDb().collection('bookings')
        .where('userId', '==', anonymousUid)
        .where('isGuest', '==', true);

      const bookingsSnapshot = await bookingsQuery.get();
      
      if (bookingsSnapshot.empty) {
        result.success = true;
        result.errors.push('No guest bookings found for migration');
        return result;
      }

      // Process bookings in batches
      const bookings = bookingsSnapshot.docs;
      result.processedCount = bookings.length;

      for (let i = 0; i < bookings.length; i += opts.batchSize!) {
        const batch = bookings.slice(i, i + opts.batchSize!);
        const batchResult = await this.processMigrationBatch(
          batch,
          anonymousUid,
          newUserId,
          specificBookingIds,
          opts,
          'guest_account_upgrade'
        );

        // Aggregate results
        result.successCount += batchResult.successCount;
        result.failedCount += batchResult.failedCount;
        result.skippedCount += batchResult.skippedCount;
        result.errors.push(...batchResult.errors);
        result.processedIds.push(...batchResult.processedIds);
        result.failedIds.push(...batchResult.failedIds);
        result.skippedIds.push(...batchResult.skippedIds);
      }

      // Validate migration if requested
      if (opts.validateAfterMigration && result.successCount > 0) {
        await this.validateMigration(newUserId, result.processedIds.filter(id => 
          !result.failedIds.includes(id) && !result.skippedIds.includes(id)
        ));
      }

      result.success = result.failedCount === 0;
      return result;

    } catch (error) {
      console.error('Migration failed:', error);
      result.errors.push(error instanceof Error ? error.message : 'Unknown migration error');
      result.success = false;
      return result;
    }
  }

  /**
   * Link guest bookings to an existing authenticated user
   */
  async linkGuestBookings(
    guestUserId: string,
    authenticatedUserId: string,
    specificBookingIds: string[] = [],
    options: MigrationOptions = {}
  ): Promise<MigrationResult> {
    const opts = { ...this.defaultOptions, ...options };
    const result: MigrationResult = {
      success: false,
      processedCount: 0,
      successCount: 0,
      failedCount: 0,
      skippedCount: 0,
      errors: [],
      processedIds: [],
      failedIds: [],
      skippedIds: []
    };

    try {
      // Validate input parameters
      if (!guestUserId || !authenticatedUserId) {
        throw new Error('Both guestUserId and authenticatedUserId are required');
      }

      if (guestUserId === authenticatedUserId) {
        throw new Error('Guest and authenticated user IDs cannot be the same');
      }

      // Query for guest bookings
      const bookingsQuery = this.getDb().collection('bookings')
        .where('userId', '==', guestUserId)
        .where('isGuest', '==', true);

      const bookingsSnapshot = await bookingsQuery.get();
      
      if (bookingsSnapshot.empty) {
        result.success = true;
        result.errors.push('No guest bookings found for linking');
        return result;
      }

      // Process bookings in batches
      const bookings = bookingsSnapshot.docs;
      result.processedCount = bookings.length;

      for (let i = 0; i < bookings.length; i += opts.batchSize!) {
        const batch = bookings.slice(i, i + opts.batchSize!);
        const batchResult = await this.processMigrationBatch(
          batch,
          guestUserId,
          authenticatedUserId,
          specificBookingIds,
          opts,
          'guest_booking_linking'
        );

        // Aggregate results
        result.successCount += batchResult.successCount;
        result.failedCount += batchResult.failedCount;
        result.skippedCount += batchResult.skippedCount;
        result.errors.push(...batchResult.errors);
        result.processedIds.push(...batchResult.processedIds);
        result.failedIds.push(...batchResult.failedIds);
        result.skippedIds.push(...batchResult.skippedIds);
      }

      // Validate linking if requested
      if (opts.validateAfterMigration && result.successCount > 0) {
        await this.validateMigration(authenticatedUserId, result.processedIds.filter(id => 
          !result.failedIds.includes(id) && !result.skippedIds.includes(id)
        ));
      }

      result.success = result.failedCount === 0;
      return result;

    } catch (error) {
      console.error('Linking failed:', error);
      result.errors.push(error instanceof Error ? error.message : 'Unknown linking error');
      result.success = false;
      return result;
    }
  }

  /**
   * Process a batch of bookings for migration/linking
   */
  private async processMigrationBatch(
    bookingDocs: any[],
    sourceUserId: string,
    targetUserId: string,
    specificBookingIds: string[],
    options: MigrationOptions,
    operationType: 'guest_account_upgrade' | 'guest_booking_linking'
  ): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: false,
      processedCount: 0,
      successCount: 0,
      failedCount: 0,
      skippedCount: 0,
      errors: [],
      processedIds: [],
      failedIds: [],
      skippedIds: []
    };

    const batch = this.getDb().batch();
    let operationCount = 0;

    for (const doc of bookingDocs) {
      const bookingId = doc.id;
      const bookingData = doc.data();
      result.processedCount++;
      result.processedIds.push(bookingId);

      try {
        // Check if specific booking IDs are provided and this booking is not in the list
        if (specificBookingIds.length > 0 && !specificBookingIds.includes(bookingId)) {
          result.skippedCount++;
          result.skippedIds.push(bookingId);
          continue;
        }

        // Validate booking data
        const validationResult = this.validateBookingForMigration(bookingData, bookingId);
        if (!validationResult.isValid) {
          result.failedCount++;
          result.failedIds.push(bookingId);
          result.errors.push(...validationResult.errors);
          continue;
        }

        // Skip if dry run
        if (options.dryRun) {
          result.successCount++;
          continue;
        }

        // Prepare migration data
        const migrationData = this.prepareMigrationData(
          bookingData,
          sourceUserId,
          targetUserId,
          operationType
        );

        // Add to batch
        const bookingRef = this.getDb().collection('bookings').doc(bookingId);
        batch.update(bookingRef, migrationData as any);
        operationCount++;
        result.successCount++;

      } catch (error) {
        result.failedCount++;
        result.failedIds.push(bookingId);
        result.errors.push(`Failed to process booking ${bookingId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Commit batch if not dry run and has operations
    if (!options.dryRun && operationCount > 0) {
      try {
        await batch.commit();
      } catch (error) {
        result.errors.push(`Batch commit failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        result.failedCount = result.successCount;
        result.successCount = 0;
      }
    }

    result.success = result.failedCount === 0;
    return result;
  }

  /**
   * Validate booking data before migration
   */
  private validateBookingForMigration(bookingData: any, bookingId: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!bookingData) {
      errors.push(`Booking ${bookingId} has no data`);
      return { isValid: false, errors };
    }

    // Check if booking is canceled
    if (bookingData.status === 'canceled_customer' || bookingData.status === 'canceled_admin') {
      errors.push(`Booking ${bookingId} is canceled and cannot be migrated`);
      return { isValid: false, errors };
    }

    // Check if booking is already migrated/linked
    if (!bookingData.isGuest) {
      errors.push(`Booking ${bookingId} is already linked to an authenticated user`);
      return { isValid: false, errors };
    }

    return { isValid: true, errors: [] };
  }

  /**
   * Prepare migration data based on operation type
   */
  private prepareMigrationData(
    bookingData: any,
    sourceUserId: string,
    targetUserId: string,
    operationType: 'guest_account_upgrade' | 'guest_booking_linking'
  ): BookingMigrationData {
    const baseData: BookingMigrationData = {
      userId: targetUserId,
      isGuest: false,
      updatedAt: new Date()
    };

    if (operationType === 'guest_account_upgrade') {
      return {
        ...baseData,
        migratedAt: new Date(),
        originalUserId: sourceUserId,
        migrationMetadata: {
          migratedFrom: 'guest_account_upgrade',
          originalGuestData: {
            userId: sourceUserId,
            guestInfo: bookingData.guest || null,
            originalCreatedAt: bookingData.createdAt
          },
          migrationTimestamp: new Date().toISOString()
        }
      };
    } else {
      return {
        ...baseData,
        linkedAt: new Date(),
        originalUserId: sourceUserId,
        migrationMetadata: {
          migratedFrom: 'guest_booking_linking',
          originalGuestData: {
            userId: sourceUserId,
            guestInfo: bookingData.guest || null,
            originalCreatedAt: bookingData.createdAt,
            originalStatus: bookingData.status
          },
          migrationTimestamp: new Date().toISOString(),
          linkedByUser: targetUserId
        }
      };
    }
  }

  /**
   * Validate that migration was successful
   */
  private async validateMigration(targetUserId: string, bookingIds: string[]): Promise<void> {
    try {
      const validationPromises = bookingIds.map(async (bookingId) => {
        const bookingDoc = await this.getDb().collection('bookings').doc(bookingId).get();
        const data = bookingDoc.data();
        
        if (!data || data.userId !== targetUserId || data.isGuest !== false) {
          throw new Error(`Migration validation failed for booking ${bookingId}`);
        }
      });
      
      await Promise.all(validationPromises);
      console.log(`Migration validation successful for ${bookingIds.length} bookings`);
    } catch (error) {
      console.error('Migration validation failed:', error);
      throw error;
    }
  }

  /**
   * Get migration statistics for a user
   */
  async getMigrationStats(userId: string): Promise<{
    totalBookings: number;
    migratedBookings: number;
    linkedBookings: number;
    guestBookings: number;
  }> {
    try {
      const bookingsSnapshot = await this.getDb().collection('bookings')
        .where('userId', '==', userId)
        .get();

      const stats = {
        totalBookings: 0,
        migratedBookings: 0,
        linkedBookings: 0,
        guestBookings: 0
      };

      bookingsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        stats.totalBookings++;
        
        if (data.isGuest) {
          stats.guestBookings++;
        } else if (data.migratedAt) {
          stats.migratedBookings++;
        } else if (data.linkedAt) {
          stats.linkedBookings++;
        }
      });

      return stats;
    } catch (error) {
      console.error('Error getting migration stats:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const firestoreMigrationService = new FirestoreMigrationService();