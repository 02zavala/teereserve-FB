import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { i18n } from '@/i18n-config';
import { auth, db } from '@/lib/firebase-admin';
import { z } from 'zod';

// Validation schemas
const seasonSchema = z.object({
  id: z.string(),
  courseId: z.string(),
  name: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  priority: z.number(),
  active: z.boolean(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
});

const timeBandSchema = z.object({
  id: z.string(),
  courseId: z.string(),
  label: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  active: z.boolean(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
});

const priceRuleSchema = z.object({
  id: z.string(),
  courseId: z.string(),
  name: z.string(),
  description: z.string().optional(),
  seasonId: z.string().optional(),
  timeBandId: z.string().optional(),
  dow: z.array(z.number()).optional(),
  leadTimeMin: z.number().optional(),
  leadTimeMax: z.number().optional(),
  occupancyMin: z.number().optional(),
  occupancyMax: z.number().optional(),
  playersMin: z.number().optional(),
  playersMax: z.number().optional(),
  priceType: z.enum(['fixed', 'delta', 'multiplier']),
  priceValue: z.number(),
  priority: z.number(),
  active: z.boolean(),
  effectiveFrom: z.string().optional(),
  effectiveTo: z.string().optional(),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  roundTo: z.number().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
});

const specialOverrideSchema = z.object({
  id: z.string(),
  courseId: z.string(),
  name: z.string(),
  description: z.string().optional(),
  startDate: z.string(),
  endDate: z.string(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  overrideType: z.enum(['price', 'block']),
  priceValue: z.number().optional(),
  priority: z.number(),
  active: z.boolean(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
});

const baseProductSchema = z.object({
  id: z.string(),
  courseId: z.string(),
  name: z.string(),
  description: z.string().optional(),
  basePrice: z.number(),
  currency: z.string().default('USD'),
  active: z.boolean(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
});

const savePricingDataSchema = z.object({
  courseId: z.string(),
  seasons: z.array(seasonSchema).optional(),
  timeBands: z.array(timeBandSchema).optional(),
  priceRules: z.array(priceRuleSchema).optional(),
  specialOverrides: z.array(specialOverrideSchema).optional(),
  baseProduct: baseProductSchema.optional()
});

// Helper function to check if user is admin
async function isAdmin(authHeader: string | null): Promise<boolean> {
  if (!authHeader?.startsWith('Bearer ')) {
    return false;
  }

  try {
    if (!auth || !db) {
      console.error('Firebase Admin SDK not initialized');
      return false;
    }
    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);
    
    // Get user document to check role
    const userDoc = await db.collection('users').doc(decodedToken.uid).get();
    const userData = userDoc.data();
    
    const role = (userData?.role || '').toLowerCase();
    return role === 'admin' || role === 'superadmin';
  } catch (error) {
    console.error('Error verifying admin status:', error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication and admin role
    const authHeader = request.headers.get('authorization');
    const isUserAdmin = await isAdmin(authHeader);
    
    if (!isUserAdmin) {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = savePricingDataSchema.parse(body);
    
    const { courseId, seasons, timeBands, priceRules, specialOverrides, baseProduct } = validatedData;
    const timestamp = new Date().toISOString();
    
    if (!db) {
      return NextResponse.json(
        { ok: false, error: 'Admin Firestore not initialized' },
        { status: 500 }
      );
    }
    // Use a batch write for atomicity
    const batch = db.batch();
    
    let propagationFailed = false;

    // Helper to sync collection (delete missing, upsert present)
    const syncCollection = async (collectionName: string, items: any[] | undefined) => {
      if (items === undefined) return;
      
      const collectionRef = db!.collection('pricing').doc(courseId).collection(collectionName);
      const snapshot = await collectionRef.get();
      const existingIds = new Set(snapshot.docs.map(doc => doc.id));
      const payloadIds = new Set(items.map(item => item.id));
      
      // Delete removed items
      for (const id of existingIds) {
        if (!payloadIds.has(id)) {
          batch.delete(collectionRef.doc(id));
        }
      }
      
      // Save current items
      for (const item of items) {
        const itemData = { ...item, updatedAt: timestamp };
        batch.set(collectionRef.doc(item.id), itemData, { merge: true });
      }
    };

    // Sync all collections
    await syncCollection('seasons', seasons);
    await syncCollection('timeBands', timeBands);
    await syncCollection('priceRules', priceRules);
    await syncCollection('specialOverrides', specialOverrides);
    
    // Save base product
    if (baseProduct) {
      const baseProductData = {
        ...baseProduct,
        updatedAt: timestamp
      };
      const baseProductRef = db.collection('pricing').doc(courseId).collection('baseProducts').doc('default');
      batch.set(baseProductRef, baseProductData, { merge: true });

      // Propagate basePrice and pricingBands to public courses collection to ensure UI reflects latest pricing
    try {
      const resolvedBasePrice = baseProduct?.basePrice;
      const coursePublicRef = db.collection('courses').doc(courseId);
      
      const updateData: any = { updatedAt: timestamp };
      
      if (resolvedBasePrice !== undefined) {
        updateData.basePrice = resolvedBasePrice;
      }

      // Generate public pricingBands from active timeBands and their rules
      // This ensures the frontend displays the correct bands and approximate prices
      if (timeBands) {
        // Sort bands by start time
        const sortedBands = [...timeBands]
          .filter(tb => tb.active)
          .sort((a, b) => {
             return a.startTime.localeCompare(b.startTime);
          });

        const publicBands = sortedBands.map(tb => {
            // Find a matching price rule. 
            // We prioritize rules that are specifically for this band and are active.
            // Since we might have multiple rules (e.g. per season), this is a best-effort display price.
            // We look for a fixed price rule.
            let rule = priceRules?.find(pr => 
              pr.active && 
              pr.timeBandId === tb.id && 
              pr.priceType === 'fixed'
            );
            
            // If no specific rule found, we might fallback to base price or 0
            const price = rule ? rule.priceValue : (resolvedBasePrice || 0);
            
            return {
              label: tb.label,
              startTime: tb.startTime,
              endTime: tb.endTime,
              price: price
            };
        });
        
        updateData.pricingBands = publicBands;
      }

      batch.set(coursePublicRef, updateData, { merge: true });
    } catch (propErr) {
      console.error('Failed to propagate basePrice to courses collection:', propErr);
      propagationFailed = true;
    }
    }
    
    // Update course pricing metadata
    const courseRef = db.collection('pricing').doc(courseId);
    batch.set(courseRef, {
      courseId,
      lastUpdated: timestamp,
      updatedBy: 'admin' // You could get this from the auth token
    }, { merge: true });

    // Commit the batch
    await batch.commit();

    // Trigger ISR revalidation for public pages depending on pricing
    let revalidationFailed = false;
    try {
      for (const locale of i18n.locales) {
        revalidatePath(`/${locale}`);
        revalidatePath(`/${locale}/courses`);
        revalidatePath(`/${locale}/courses/${courseId}`);
      }
    } catch (revalErr) {
      console.error('Failed to revalidate paths after pricing save:', revalErr);
      revalidationFailed = true;
    }
    
    const isOk = !revalidationFailed && !propagationFailed;
    let message = 'Pricing data saved successfully';
    if (revalidationFailed) message = 'Pricing data saved, but revalidation failed.';
    if (propagationFailed) message = 'Pricing data saved, but failed to propagate basePrice.';
    if (revalidationFailed && propagationFailed) message = 'Pricing data saved, but revalidation and propagation failed.';

    return NextResponse.json({
      ok: isOk,
      message,
      data: {
        courseId,
        timestamp,
        savedItems: {
          seasons: seasons?.length || 0,
          timeBands: timeBands?.length || 0,
          priceRules: priceRules?.length || 0,
          specialOverrides: specialOverrides?.length || 0,
          baseProduct: baseProduct ? 1 : 0
        },
        revalidationFailed,
        propagationFailed
      }
    });
    
  } catch (error: any) {
    console.error('Error saving pricing data:', error);
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { ok: false, error: 'Invalid data format', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { ok: false, error: 'Internal server error', details: error.message, stack: error.stack },
      { status: 500 }
    );
  }
}
