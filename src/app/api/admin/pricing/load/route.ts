import { NextRequest, NextResponse } from 'next/server';
import { auth, db } from '@/lib/firebase-admin';

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

export async function GET(request: NextRequest) {
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

    // Get courseId from query parameters
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId');
    
    if (!courseId) {
      return NextResponse.json(
        { ok: false, error: 'courseId parameter is required' },
        { status: 400 }
      );
    }

    // Load all pricing data for the course
    const pricingData = {
      seasons: [] as any[],
      timeBands: [] as any[],
      priceRules: [] as any[],
      specialOverrides: [] as any[],
      baseProduct: null as any
    };
    
    // Load seasons
    try {
      const seasonsSnapshot = await db.collection('pricing').doc(courseId).collection('seasons').get();
      pricingData.seasons = seasonsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.warn('No seasons found for course:', courseId);
    }
    
    // Load time bands
    try {
      const timeBandsSnapshot = await db.collection('pricing').doc(courseId).collection('timeBands').get();
      pricingData.timeBands = timeBandsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.warn('No time bands found for course:', courseId);
    }
    
    // Load price rules
    try {
      const priceRulesSnapshot = await db.collection('pricing').doc(courseId).collection('priceRules').get();
      pricingData.priceRules = priceRulesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.warn('No price rules found for course:', courseId);
    }
    
    // Load special overrides
    try {
      const overridesSnapshot = await db.collection('pricing').doc(courseId).collection('specialOverrides').get();
      pricingData.specialOverrides = overridesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.warn('No special overrides found for course:', courseId);
    }
    
    // Load base product
    try {
      const baseProductDoc = await db.collection('pricing').doc(courseId).collection('baseProducts').doc('default').get();
      if (baseProductDoc.exists) {
        pricingData.baseProduct = {
          id: baseProductDoc.id,
          ...baseProductDoc.data()
        };
      }
    } catch (error) {
      console.warn('No base product found for course:', courseId);
    }
    
    // Get course metadata
    let courseMetadata: any = null;
    try {
      const courseDoc = await db.collection('pricing').doc(courseId).get();
      if (courseDoc.exists) {
        courseMetadata = courseDoc.data() || null;
      }
    } catch (error) {
      console.warn('No course metadata found for course:', courseId);
    }
    
    return NextResponse.json({
      ok: true,
      data: {
        courseId,
        ...pricingData,
        metadata: courseMetadata
      }
    });
    
  } catch (error: any) {
    console.error('Error loading pricing data:', error);
    
    return NextResponse.json(
      { ok: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST endpoint for bulk loading multiple courses
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

    const body = await request.json();
    const { courseIds } = body;
    
    if (!courseIds || !Array.isArray(courseIds)) {
      return NextResponse.json(
        { ok: false, error: 'courseIds array is required' },
        { status: 400 }
      );
    }

    const results: any[] = [];
    
    for (const courseId of courseIds) {
      try {
        // Load pricing data for each course
        const pricingData = {
          courseId,
          seasons: [] as any[],
          timeBands: [] as any[],
          priceRules: [] as any[],
          specialOverrides: [] as any[],
          baseProduct: null as any
        };
        
        // Load all collections in parallel
        const [seasonsSnapshot, timeBandsSnapshot, priceRulesSnapshot, overridesSnapshot, baseProductDoc] = await Promise.all([
          db.collection('pricing').doc(courseId).collection('seasons').get().catch(() => null),
          db.collection('pricing').doc(courseId).collection('timeBands').get().catch(() => null),
          db.collection('pricing').doc(courseId).collection('priceRules').get().catch(() => null),
          db.collection('pricing').doc(courseId).collection('specialOverrides').get().catch(() => null),
          db.collection('pricing').doc(courseId).collection('baseProducts').doc('default').get().catch(() => null)
        ]);
        
        if (seasonsSnapshot) {
          pricingData.seasons = seasonsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }
        
        if (timeBandsSnapshot) {
          pricingData.timeBands = timeBandsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }
        
        if (priceRulesSnapshot) {
          pricingData.priceRules = priceRulesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }
        
        if (overridesSnapshot) {
          pricingData.specialOverrides = overridesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }
        
        if (baseProductDoc && baseProductDoc.exists) {
          pricingData.baseProduct = { id: baseProductDoc.id, ...baseProductDoc.data() };
        }
        
        results.push(pricingData);
        
      } catch (error) {
        console.error(`Error loading pricing data for course ${courseId}:`, error);
        results.push({
          courseId,
          error: 'Failed to load pricing data'
        });
      }
    }
    
    return NextResponse.json({
      ok: true,
      data: results
    });
    
  } catch (error: any) {
    console.error('Error in bulk load pricing data:', error);
    
    return NextResponse.json(
      { ok: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}