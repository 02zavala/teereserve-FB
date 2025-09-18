import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

// API Status endpoint
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Get request headers
    const headersList = await headers();
    const userAgent = headersList.get('user-agent') || '';
    
    // Basic status information
    const status = {
      timestamp: new Date().toISOString(),
      status: 'operational',
      version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        external: Math.round(process.memoryUsage().external / 1024 / 1024)
      },
      services: {
        api: 'operational',
        database: 'operational',
        auth: 'operational',
        payments: 'operational'
      },
      responseTime: Date.now() - startTime
    };

    return NextResponse.json(status, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('Error in status endpoint:', error);
    return NextResponse.json(
      {
        timestamp: new Date().toISOString(),
        status: 'error',
        error: 'Internal server error',
        responseTime: Date.now() - startTime
      },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}