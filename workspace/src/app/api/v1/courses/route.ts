import { NextResponse } from 'next/server';
import { getProvider } from '@/lib/integrations/router';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const provider = await getProvider();
    const courses = await provider.getCourses();
    return NextResponse.json({ ok: true, data: courses }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'Unexpected error' }, { status: 500 });
  }
}