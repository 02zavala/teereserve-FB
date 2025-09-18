
import { NextRequest, NextResponse } from 'next/server';
import { sendContactEmail } from '@/ai/flows/send-contact-email';
import { z } from 'zod';

// Schema for validating the request body
const contactSchema = z.object({
  name: z.string().min(1, { message: 'Name is required' }),
  email: z.string().email({ message: 'Invalid email format' }),
  message: z.string().min(1, { message: 'Message is required' }),
  recaptchaToken: z.string().optional(),
});

async function verifyRecaptcha(token: string | undefined): Promise<boolean> {
    const secretKey = process.env.RECAPTCHA_SECRET_KEY;
    
    // In a production environment, the secret key MUST be present.
    if (!secretKey || secretKey.startsWith('your_')) {
        console.error("reCAPTCHA secret key is not set or is a placeholder.");
        // Fail securely in production if the key is missing.
        if (process.env.NODE_ENV === 'production') {
            return false;
        }
        // Allow to pass in development if the key is missing for easier local testing.
        return true;
    }
    
    // If there's no token but a key is present, fail.
    if (!token) {
        return false;
    }

    const verificationUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${token}`;

    try {
        const response = await fetch(verificationUrl, { method: 'POST' });
        if (!response.ok) {
            throw new Error(`reCAPTCHA verification request failed with status: ${response.status}`);
        }
        const data = await response.json();
        return data.success;
    } catch (error) {
        console.error("Error verifying reCAPTCHA:", error);
        return false;
    }
}


export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validate request body
    const validation = contactSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input', details: validation.error.flatten() }, { status: 400 });
    }
    
    const { name, email, message, recaptchaToken } = validation.data;

    // Verify reCAPTCHA token
    const isHuman = await verifyRecaptcha(recaptchaToken);
    if (!isHuman) {
        return NextResponse.json({ error: 'reCAPTCHA verification failed. Are you a robot?' }, { status: 403 });
    }

    const result = await sendContactEmail({ name, email, message });

    if (result.success) {
      return NextResponse.json({ message: 'Message sent successfully!' }, { status: 200 });
    } else {
      // The flow should throw an error, but as a fallback:
      throw new Error(result.message || 'The email flow reported a failure.');
    }

  } catch (error) {
    console.error('API Contact Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json({ error: `Failed to send message: ${errorMessage}` }, { status: 500 });
  }
}
