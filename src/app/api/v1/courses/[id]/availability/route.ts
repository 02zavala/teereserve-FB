import { NextRequest, NextResponse } from 'next/server';
import { listTeeTimes } from '@/core/courses';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date') || new Date().toISOString().slice(0, 10);
    const tenantId = req.headers.get('x-tenant-id') || 'default';
    const slots = await listTeeTimes(tenantId, params.id, date);
    return NextResponse.json({ ok: true, data: slots, meta: { date } }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'Unexpected error' }, { status: 500 });
  }
}