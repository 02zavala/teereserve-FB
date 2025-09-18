import { NextRequest, NextResponse } from 'next/server';
import { sendBookingConfirmation } from '@/lib/email.js';
import { z } from 'zod';
import { calculatePriceBreakdown } from '@/lib/money-utils';

// Force Node.js runtime for email service compatibility
export const runtime = 'nodejs';

// Schema for validating the request body
const guestBookingConfirmationSchema = z.object({
  userEmail: z.string().email({ message: 'Invalid email format' }),
  bookingDetails: z.object({
    courseName: z.string().min(1, { message: 'Course name is required' }),
    date: z.string().min(1, { message: 'Date is required' }),
    time: z.string().min(1, { message: 'Time is required' }),
    players: z.number().min(1, { message: 'Players must be at least 1' }),
    totalPrice: z.string().min(1, { message: 'Total price is required' }),
    confirmationNumber: z.string().optional(),
    courseLocation: z.string().optional(),
    holes: z.number().optional(),
    userName: z.string().optional(),
    discountCode: z.string().optional(),
    discountAmount: z.number().optional(),
    pricing_snapshot: z.object({
      subtotal_cents: z.number(),
      tax_cents: z.number(),
      discount_cents: z.number(),
      total_cents: z.number(),
      currency: z.string(),
      tax_rate: z.number(),
      promo_code: z.string().optional(),
      quote_hash: z.string(),
      created_at: z.string()
    }).optional()
  })
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const validation = guestBookingConfirmationSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { userEmail, bookingDetails } = validation.data;

    // Send booking confirmation email
    try {
      const emailData: any = {
        ...bookingDetails,
        totalPrice: parseFloat(bookingDetails.totalPrice)
      };

      // If pricing_snapshot is available, use it directly
      if (bookingDetails.pricing_snapshot) {
        emailData.pricing_snapshot = bookingDetails.pricing_snapshot;
      } else {
        // Fallback: Calculate price breakdown from total for legacy support
        const totalPriceCents = Math.round(parseFloat(bookingDetails.totalPrice) * 100);
        const discountCents = bookingDetails.discountAmount ? Math.round(bookingDetails.discountAmount * 100) : 0;
        const priceBreakdown = calculatePriceBreakdown(totalPriceCents, 0.16, discountCents, 'USD');
        
        // Add discount code if provided
        if (bookingDetails.discountCode) {
          priceBreakdown.discount_code = bookingDetails.discountCode;
        }

        emailData.subtotal = priceBreakdown.subtotal_cents / 100;
        emailData.tax = priceBreakdown.tax_cents / 100;
        emailData.discount = priceBreakdown.discount_cents / 100;
        emailData.discountCode = bookingDetails.discountCode;
      }

      await sendBookingConfirmation(userEmail, emailData);
      
      return NextResponse.json(
        { message: 'Booking confirmation email sent successfully' },
        { status: 200 }
      );
    } catch (emailError) {
      console.error('Error sending booking confirmation email:', emailError);
      return NextResponse.json(
        { error: 'Failed to send booking confirmation email' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('API Guest Booking Confirmation Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json(
      { error: `Failed to send booking confirmation: ${errorMessage}` },
      { status: 500 }
    );
  }
}