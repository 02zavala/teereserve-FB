import { NextRequest, NextResponse } from 'next/server';
import { getCMSSections, createCMSSection } from '@/lib/data';
import { verifyIdToken } from '@/lib/firebase-admin';

export async function GET() {
  try {
    const sections = await getCMSSections();
    return NextResponse.json(sections);
  } catch (error) {
    console.error('Error fetching CMS sections:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sections' },
      { status: 500 }
    );
  }
}

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

    const sectionData = await request.json();
    const section = await createCMSSection({
      ...sectionData,
      createdBy: decodedToken.uid
    });

    return NextResponse.json(section, { status: 201 });
  } catch (error) {
    console.error('Error creating CMS section:', error);
    return NextResponse.json(
      { error: 'Failed to create section' },
      { status: 500 }
    );
  }
}