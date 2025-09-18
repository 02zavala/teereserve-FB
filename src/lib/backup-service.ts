import { db } from './firebase-admin';
import { format } from 'date-fns';
import type { Booking, GolfCourse, UserProfile, PriceRule, Season, TimeBand, SpecialOverride, BaseProduct, Coupon } from '@/types';

export interface BackupData {
  timestamp: string;
  version: string;
  collections: {
    bookings: Booking[];
    courses: GolfCourse[];
    users: UserProfile[];
    priceRules: PriceRule[];
    seasons: Season[];
    timeBands: TimeBand[];
    specialOverrides: SpecialOverride[];
    baseProducts: BaseProduct[];
    coupons: Coupon[];
  };
  metadata: {
    totalRecords: number;
    backupSize: string;
    collections: Record<string, number>;
  };
}

export interface BackupOptions {
  includeCollections?: string[];
  excludeCollections?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  maxRecords?: number;
}

class BackupService {
  private readonly BACKUP_VERSION = '1.0.0';
  private readonly DEFAULT_MAX_RECORDS = 10000;

  /**
   * Creates a complete backup of critical data
   */
  async createBackup(options: BackupOptions = {}): Promise<BackupData> {
    if (!db) {
      throw new Error('Firebase Admin is not initialized');
    }

    const timestamp = new Date().toISOString();
    const collections = await this.backupCollections(options);
    const metadata = this.generateMetadata(collections);

    const backupData: BackupData = {
      timestamp,
      version: this.BACKUP_VERSION,
      collections,
      metadata
    };

    console.log(`Backup created successfully at ${timestamp}`);
    console.log(`Total records: ${metadata.totalRecords}`);
    console.log(`Estimated size: ${metadata.backupSize}`);

    return backupData;
  }

  /**
   * Backs up all critical collections
   */
  private async backupCollections(options: BackupOptions): Promise<BackupData['collections']> {
    const collections: BackupData['collections'] = {
      bookings: [],
      courses: [],
      users: [],
      priceRules: [],
      seasons: [],
      timeBands: [],
      specialOverrides: [],
      baseProducts: [],
      coupons: []
    };

    // Define which collections to backup
    const collectionsToBackup = options.includeCollections || Object.keys(collections);
    const excludedCollections = options.excludeCollections || [];

    for (const collectionName of collectionsToBackup) {
      if (excludedCollections.includes(collectionName)) {
        continue;
      }

      try {
        switch (collectionName) {
          case 'bookings':
            collections.bookings = await this.backupBookings(options);
            break;
          case 'courses':
            collections.courses = await this.backupCourses(options);
            break;
          case 'users':
            collections.users = await this.backupUsers(options);
            break;
          case 'priceRules':
            collections.priceRules = await this.backupPriceRules(options);
            break;
          case 'seasons':
            collections.seasons = await this.backupSeasons(options);
            break;
          case 'timeBands':
            collections.timeBands = await this.backupTimeBands(options);
            break;
          case 'specialOverrides':
            collections.specialOverrides = await this.backupSpecialOverrides(options);
            break;
          case 'baseProducts':
            collections.baseProducts = await this.backupBaseProducts(options);
            break;
          case 'coupons':
            collections.coupons = await this.backupCoupons(options);
            break;
        }
      } catch (error) {
        console.error(`Error backing up ${collectionName}:`, error);
        // Continue with other collections even if one fails
      }
    }

    return collections;
  }

  /**
   * Backup bookings with optional date filtering
   */
  private async backupBookings(options: BackupOptions): Promise<Booking[]> {
    const bookingsRef = db.collection('bookings');
    let bookingsQuery = bookingsRef.orderBy('createdAt', 'desc');

    if (options.dateRange) {
      bookingsQuery = bookingsRef
        .where('createdAt', '>=', options.dateRange.start.toISOString())
        .where('createdAt', '<=', options.dateRange.end.toISOString())
        .orderBy('createdAt', 'desc');
    }

    if (options.maxRecords) {
      bookingsQuery = bookingsQuery.limit(options.maxRecords);
    }

    const snapshot = await bookingsQuery.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
  }

  /**
   * Backup courses and their subcollections
   */
  private async backupCourses(options: BackupOptions): Promise<GolfCourse[]> {
    const coursesRef = db.collection('courses');
    const snapshot = await coursesRef.get();
    
    const courses: GolfCourse[] = [];
    
    for (const courseDoc of snapshot.docs) {
      const courseData = { id: courseDoc.id, ...courseDoc.data() } as Omit<GolfCourse, 'reviews'>;
      
      // Backup reviews for this course
      const reviewsRef = db.collection('courses').doc(courseDoc.id).collection('reviews');
      const reviewsSnapshot = await reviewsRef.get();
      const reviews = reviewsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      courses.push({ ...courseData, reviews } as GolfCourse);
    }
    
    return courses;
  }

  /**
   * Backup user profiles
   */
  private async backupUsers(options: BackupOptions): Promise<UserProfile[]> {
    const usersRef = db.collection('users');
    let usersQuery = usersRef.orderBy('createdAt', 'desc');

    if (options.maxRecords) {
      usersQuery = usersQuery.limit(options.maxRecords);
    }

    const snapshot = await usersQuery.get();
    return snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
  }

  /**
   * Backup price rules
   */
  private async backupPriceRules(options: BackupOptions): Promise<PriceRule[]> {
    const priceRulesRef = db.collection('priceRules');
    const snapshot = await priceRulesRef.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PriceRule));
  }

  /**
   * Backup seasons
   */
  private async backupSeasons(options: BackupOptions): Promise<Season[]> {
    const seasonsRef = db.collection('seasons');
    const snapshot = await seasonsRef.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Season));
  }

  /**
   * Backup time bands
   */
  private async backupTimeBands(options: BackupOptions): Promise<TimeBand[]> {
    const timeBandsRef = db.collection('timeBands');
    const snapshot = await timeBandsRef.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TimeBand));
  }

  /**
   * Backup special overrides
   */
  private async backupSpecialOverrides(options: BackupOptions): Promise<SpecialOverride[]> {
    const overridesRef = db.collection('specialOverrides');
    const snapshot = await overridesRef.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SpecialOverride));
  }

  /**
   * Backup base products
   */
  private async backupBaseProducts(options: BackupOptions): Promise<BaseProduct[]> {
    const baseProductsRef = db.collection('baseProducts');
    const snapshot = await baseProductsRef.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BaseProduct));
  }

  /**
   * Backup coupons
   */
  private async backupCoupons(options: BackupOptions): Promise<Coupon[]> {
    const couponsRef = db.collection('coupons');
    const snapshot = await couponsRef.get();
    return snapshot.docs.map(doc => ({ code: doc.id, ...doc.data() } as Coupon));
  }

  /**
   * Generate metadata for the backup
   */
  private generateMetadata(collections: BackupData['collections']): BackupData['metadata'] {
    const collectionCounts: Record<string, number> = {};
    let totalRecords = 0;

    Object.entries(collections).forEach(([name, data]) => {
      const count = Array.isArray(data) ? data.length : 0;
      collectionCounts[name] = count;
      totalRecords += count;
    });

    // Estimate backup size (rough calculation)
    const estimatedSizeBytes = totalRecords * 1024; // Assume 1KB per record on average
    const backupSize = this.formatBytes(estimatedSizeBytes);

    return {
      totalRecords,
      backupSize,
      collections: collectionCounts
    };
  }

  /**
   * Format bytes to human readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Save backup to local file system (for development/testing)
   */
  async saveBackupToFile(backupData: BackupData, filePath?: string): Promise<string> {
    const fileName = filePath || `backup-${format(new Date(), 'yyyy-MM-dd-HH-mm-ss')}.json`;
    const fs = await import('fs/promises');
    
    try {
      await fs.writeFile(fileName, JSON.stringify(backupData, null, 2));
      console.log(`Backup saved to: ${fileName}`);
      return fileName;
    } catch (error) {
      console.error('Error saving backup to file:', error);
      throw error;
    }
  }

  /**
   * Create incremental backup (only changes since last backup)
   */
  async createIncrementalBackup(lastBackupTimestamp: string, options: BackupOptions = {}): Promise<BackupData> {
    const incrementalOptions: BackupOptions = {
      ...options,
      dateRange: {
        start: new Date(lastBackupTimestamp),
        end: new Date()
      }
    };

    return this.createBackup(incrementalOptions);
  }

  /**
   * Validate backup data integrity
   */
  validateBackup(backupData: BackupData): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check required fields
    if (!backupData.timestamp) errors.push('Missing timestamp');
    if (!backupData.version) errors.push('Missing version');
    if (!backupData.collections) errors.push('Missing collections');
    if (!backupData.metadata) errors.push('Missing metadata');

    // Validate collections structure
    const requiredCollections = ['bookings', 'courses', 'users'];
    for (const collection of requiredCollections) {
      if (!Array.isArray(backupData.collections[collection as keyof BackupData['collections']])) {
        errors.push(`Invalid or missing ${collection} collection`);
      }
    }

    // Validate metadata
    if (backupData.metadata && typeof backupData.metadata.totalRecords !== 'number') {
      errors.push('Invalid metadata.totalRecords');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export const backupService = new BackupService();
export default backupService;