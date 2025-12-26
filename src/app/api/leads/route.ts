import { NextRequest, NextResponse } from 'next/server';
import { db, auth } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, source, lang, pageUrl, referrer } = body || {};

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    let userId: string | null = null;
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ') && auth) {
      try {
        const token = authHeader.split('Bearer ')[1];
        const decoded = await auth.verifyIdToken(token);
        userId = decoded.uid;
      } catch {
        // Ignore token errors; leads can be anonymous
      }
    }

    if (!db) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }
    const leadsCol = db.collection('leads');

    // Upsert by email to avoid duplicates
    const existingSnap = await leadsCol.where('email', '==', email).limit(1).get();
    if (!existingSnap.empty) {
      const docRef = existingSnap.docs[0].ref;
      await docRef.update({
        source: source || 'unknown',
        lang: lang || 'en',
        pageUrl: pageUrl || null,
        referrer: referrer || null,
        userId: userId || null,
        updatedAt: new Date(),
      });
      return NextResponse.json({ ok: true, updated: true });
    }

    const leadData = {
      email,
      source: source || 'unknown',
      lang: lang || 'en',
      pageUrl: pageUrl || null,
      referrer: referrer || null,
      userId: userId || null,
      status: 'new',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await leadsCol.add(leadData);
    return NextResponse.json({ ok: true, created: true });
  } catch (error) {
    console.error('Leads API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
