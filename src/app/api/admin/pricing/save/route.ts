import { NextRequest, NextResponse } from 'next/server';
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
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  priceType: z.enum(['fixed', 'delta', 'multiplier']),
  priceValue: z.number(),
  priority: z.number(),
  active: z.boolean(),
  leadTimeMin: z.number().optional(),
  occupancyMin: z.number().optional(),
  playersMin: z.number().optional(),
  playersMax: z.number().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
});

const specialOverrideSchema = z.object({
  id: z.string(),
  courseId: z.string(),
  date: z.string(),
  timeBandId: z.string().optional(),
  priceOverride: z.number(),
  reason: z.string(),
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
    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);
    
    // Get user document to check role
    const userDoc = await db.collection('users').doc(decodedToken.uid).get();
    const userData = userDoc.data();
    
    return userData?.role === 'admin';
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
    
    // Use a batch write for atomicity
    const batch = db.batch();
    
    // Save seasons
    if (seasons && seasons.length > 0) {
      for (const season of seasons) {
        const seasonData = {
          ...season,
          updatedAt: timestamp
        };
        const seasonRef = db.collection('pricing').doc(courseId).collection('seasons').doc(season.id);
        batch.set(seasonRef, seasonData, { merge: true });
      }
    }
    
    // Save time bands
    if (timeBands && timeBands.length > 0) {
      for (const timeBand of timeBands) {
        const timeBandData = {
          ...timeBand,
          updatedAt: timestamp
        };
        const timeBandRef = db.collection('pricing').doc(courseId).collection('timeBands').doc(timeBand.id);
        batch.set(timeBandRef, timeBandData, { merge: true });
      }
    }
    
    // Save price rules
    if (priceRules && priceRules.length > 0) {
      for (const priceRule of priceRules) {
        const priceRuleData = {
          ...priceRule,
          updatedAt: timestamp
        };
        const priceRuleRef = db.collection('pricing').doc(courseId).collection('priceRules').doc(priceRule.id);
        batch.set(priceRuleRef, priceRuleData, { merge: true });
      }
    }
    
    // Save special overrides
    if (specialOverrides && specialOverrides.length > 0) {
      for (const override of specialOverrides) {
        const overrideData = {
          ...override,
          updatedAt: timestamp
        };
        const overrideRef = db.collection('pricing').doc(courseId).collection('specialOverrides').doc(override.id);
        batch.set(overrideRef, overrideData, { merge: true });
      }
    }
    
    // Save base product
    if (baseProduct) {
      const baseProductData = {
        ...baseProduct,
        updatedAt: timestamp
      };
      const baseProductRef = db.collection('pricing').doc(courseId).collection('baseProducts').doc('default');
      batch.set(baseProductRef, baseProductData, { merge: true });
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
    
    return NextResponse.json({
      ok: true,
      message: 'Pricing data saved successfully',
      data: {
        courseId,
        timestamp,
        savedItems: {
          seasons: seasons?.length || 0,
          timeBands: timeBands?.length || 0,
          priceRules: priceRules?.length || 0,
          specialOverrides: specialOverrides?.length || 0,
          baseProduct: baseProduct ? 1 : 0
        }
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
      { ok: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}