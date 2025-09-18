import { NextRequest, NextResponse } from 'next/server';
import { recommendGolfCourses } from '@/ai/flows/recommend-golf-courses';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { userId, courseId, date, numPlayers, location } = body;
    
    const recommendationInput = {
      userId: userId || 'anonymous-user',
      courseId,
      date,
      numPlayers,
      location: location || 'Los Cabos'
    };
    
    const result = await recommendGolfCourses(recommendationInput);
    
    return NextResponse.json({
      success: true,
      recommendations: result.recommendations || []
    });
    
  } catch (error) {
    console.error('Error getting AI recommendations:', error);
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
    const recommendationInput = {
      userId: searchParams.get('userId') || 'anonymous-user',
      courseId: searchParams.get('courseId') || undefined,
      date: searchParams.get('date') || undefined,
      numPlayers: searchParams.get('numPlayers') ? parseInt(searchParams.get('numPlayers')!) : undefined,
      location: searchParams.get('location') || 'Los Cabos'
    };
    
    const result = await recommendGolfCourses(recommendationInput);
    
    return NextResponse.json({
      success: true,
      recommendations: result.recommendations || []
    });
    
  } catch (error) {
    console.error('Error getting AI recommendations:', error);
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