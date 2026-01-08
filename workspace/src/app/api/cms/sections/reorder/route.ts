import { NextRequest, NextResponse } from 'next/server';
import { reorderCMSSections } from '@/lib/data';
import { verifyIdToken } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await verifyIdToken(token);
    
    if (!decodedToken.admin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { sectionIds } = await request.json();
    
    if (!Array.isArray(sectionIds)) {
      return NextResponse.json(
        { error: 'Invalid section IDs format' },
        { status: 400 }
      );
    }

    await reorderCMSSections(sectionIds);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error reordering CMS sections:', error);
    return NextResponse.json(
      { error: 'Failed to reorder sections' },
      { status: 500 }
    );
  }
}