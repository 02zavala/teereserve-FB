import { NextRequest, NextResponse } from 'next/server';
import { getCourses, getCourseById } from '@/lib/data';

// Helper: Haversine distance in kilometers
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Helper: Distance between courses with graceful fallback
function computeDistanceKm(refCourse: any, otherCourse: any): number {
  const a = refCourse?.latLng;
  const b = otherCourse?.latLng;
  if (a && typeof a.lat === 'number' && typeof a.lng === 'number' && b && typeof b.lat === 'number' && typeof b.lng === 'number') {
    return haversineDistance(a.lat, a.lng, b.lat, b.lng);
  }
  if (refCourse?.location && otherCourse?.location && refCourse.location === otherCourse.location) {
    return 0;
  }
  // Fallback large distance when coords are missing or locations differ
  return 9999;
}

// Helper: Average price across courses
function averagePrice(courses: any[]): number {
  const prices = courses
    .map(c => c?.basePrice)
    .filter((p: any) => typeof p === 'number');
  if (!prices.length) return 0;
  return prices.reduce((sum: number, p: number) => sum + p, 0) / prices.length;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, courseId, date, numPlayers, location } = body;

    // Get available courses
    const availableCourses = await getCourses({});

    // Filter out the current course if provided
    const filteredCourses = availableCourses.filter(course => course.id !== courseId);

    // Reference course and price
    const currentCourse = courseId ? await getCourseById(courseId) : undefined;
    const refPrice = currentCourse?.basePrice ?? averagePrice(availableCourses);

    // Score courses by proximity (km) and price similarity
    const scored = filteredCourses.map(course => {
      const distanceKm = currentCourse ? computeDistanceKm(currentCourse, course) : 9999;
      const price = course.basePrice || 0;
      const priceDiff = Math.abs(price - (refPrice || 0));
      const normalizedPriceDiff = (refPrice || 1) > 0 ? priceDiff / (refPrice || 1) : priceDiff;
      const normalizedDistance = distanceKm / 100; // scale ~100km window
      const score = 0.6 * normalizedDistance + 0.4 * normalizedPriceDiff;
      return { course, score };
    });

    scored.sort((a, b) => a.score - b.score);

    // Take up to 3 courses for recommendations
    const recommendedCourses = scored.slice(0, 3).map(({ course }) => ({
      courseId: course.id,
      name: course.name,
      description: (course.description ? course.description.substring(0, 150) : '') + '...',
      price: course.basePrice || 0,
      imageUrl: course.imageUrls?.[0] || '/images/fallback.svg',
      tags: ['Popular Choice', 'Great Value'],
      location: course.location || 'Los Cabos'
    }));

    return NextResponse.json({
      success: true,
      recommendations: recommendedCourses
    });

  } catch (error) {
    console.error('Error getting recommendations:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get recommendations',
        recommendations: [] 
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  try {
    const courseId = searchParams.get('courseId') || undefined;

    // Get available courses
    const availableCourses = await getCourses({});

    // Filter out the current course if provided
    const filteredCourses = availableCourses.filter(course => course.id !== courseId);

    // Reference course and price
    const currentCourse = courseId ? await getCourseById(courseId) : undefined;
    const refPrice = currentCourse?.basePrice ?? averagePrice(availableCourses);

    // Score courses by proximity and price similarity
    const scored = filteredCourses.map(course => {
      const distanceKm = currentCourse ? computeDistanceKm(currentCourse, course) : 9999;
      const price = course.basePrice || 0;
      const priceDiff = Math.abs(price - (refPrice || 0));
      const normalizedPriceDiff = (refPrice || 1) > 0 ? priceDiff / (refPrice || 1) : priceDiff;
      const normalizedDistance = distanceKm / 100;
      const score = 0.6 * normalizedDistance + 0.4 * normalizedPriceDiff;
      return { course, score };
    });

    scored.sort((a, b) => a.score - b.score);

    // Take up to 3 courses for recommendations
    const recommendedCourses = scored.slice(0, 3).map(({ course }) => ({
      courseId: course.id,
      name: course.name,
      description: (course.description ? course.description.substring(0, 150) : '') + '...',
      price: course.basePrice || 0,
      imageUrl: course.imageUrls?.[0] || '/images/fallback.svg',
      tags: ['Popular Choice', 'Great Value'],
      location: course.location || 'Los Cabos'
    }));

    return NextResponse.json({
      success: true,
      recommendations: recommendedCourses
    });

  } catch (error) {
    console.error('Error getting recommendations:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get recommendations',
        recommendations: [] 
      },
      { status: 500 }
    );
  }
}