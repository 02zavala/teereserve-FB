import { NextRequest, NextResponse } from 'next/server';
import { getCourses } from '@/lib/data';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { userId, courseId, date, numPlayers, location } = body;
    
    // Get available courses
    const availableCourses = await getCourses({});
    
    // Filter out the current course if provided
    const filteredCourses = availableCourses.filter(course => course.id !== courseId);
    
    // Take up to 3 courses for recommendations
    const recommendedCourses = filteredCourses.slice(0, 3).map(course => ({
      courseId: course.id,
      name: course.name,
      description: course.description.substring(0, 150) + '...',
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
    
    // Take up to 3 courses for recommendations
    const recommendedCourses = filteredCourses.slice(0, 3).map(course => ({
      courseId: course.id,
      name: course.name,
      description: course.description.substring(0, 150) + '...',
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