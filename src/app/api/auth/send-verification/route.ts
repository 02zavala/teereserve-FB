import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth as adminAuth } from '@/lib/firebase-admin';
import { sendVerificationEmail } from '@/lib/email.js';

const payloadSchema = z.object({
  email: z.string().email(),
  lang: z.enum(['es', 'en']).default('es'),
  displayName: z.string().optional(),
  idToken: z.string(),
  origin: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parsed = payloadSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
    }

    const { email, lang, displayName, idToken, origin } = parsed.data;

    // Verify the token to ensure the request is by the authenticated user
    const decoded = await adminAuth.verifyIdToken(idToken);
    if ((decoded.email || '').toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json({ error: 'Token/email mismatch' }, { status: 403 });
    }

    const requestOrigin = origin || req.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'https://teereserve.golf';

    const actionCodeSettings = {
      url: `${requestOrigin}/${lang}/auth/action`,
      handleCodeInApp: true,
    };

    // Generate verification link with Admin SDK
    const link = await adminAuth.generateEmailVerificationLink(email, actionCodeSettings);

    // Build a direct in-app verification URL using the oobCode
    let verifyUrl = link;
    try {
      const urlObj = new URL(link);
      const oobCode = urlObj.searchParams.get('oobCode');
      const mode = urlObj.searchParams.get('mode') || 'verifyEmail';
      const apiKeyParam = urlObj.searchParams.get('apiKey');
      if (oobCode) {
        verifyUrl = `${requestOrigin}/${lang}/auth/action?mode=${mode}&oobCode=${encodeURIComponent(oobCode)}${apiKeyParam ? `&apiKey=${apiKeyParam}` : ''}`;
      }
    } catch {}

    const result = await sendVerificationEmail(email, verifyUrl, { displayName: displayName || decoded.name || 'Golfer', lang });
    if (!result?.success) {
      return NextResponse.json({ error: result?.error || 'Failed to send verification email' }, { status: 500 });
    }

    return NextResponse.json({ success: true, verifyUrl });
  } catch (error) {
    console.error('API /auth/send-verification error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}