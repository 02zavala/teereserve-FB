import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { auth } from '@/lib/firebase-admin';
import { logger } from '@/lib/logger';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
});

export async function POST(request: NextRequest) {
  try {
    const { paymentMethodId, idToken } = await request.json();

    if (!paymentMethodId || !idToken) {
      return NextResponse.json(
        { error: 'Payment method ID and authentication token are required' },
        { status: 400 }
      );
    }

    // Verify the user's authentication
    let decodedToken;
    try {
      decodedToken = await auth.verifyIdToken(idToken);
    } catch (authError) {
      logger.error('Card validation: Authentication failed', authError as Error);
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      );
    }

    const userId = decodedToken.uid;
    logger.info(`Card validation: Starting validation charge - userId: ${userId}, paymentMethodId: ${paymentMethodId}`);

    // Create a $1 USD validation charge
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 100, // $1.00 USD in cents
      currency: 'usd',
      payment_method: paymentMethodId,
      confirm: true,
      description: 'TeeReserve - Card Validation Charge',
      metadata: {
        type: 'card_validation',
        userId: userId,
        timestamp: new Date().toISOString()
      },
      // Enable 3D Secure
      payment_method_options: {
        card: {
          request_three_d_secure: 'automatic'
        }
      },
      return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/payment/validation-complete`
    });

    logger.info(`Card validation: Payment intent created - userId: ${userId}, paymentIntentId: ${paymentIntent.id}, status: ${paymentIntent.status}`);

    // If the payment requires additional action (3D Secure)
    if (paymentIntent.status === 'requires_action') {
      return NextResponse.json({
        success: false,
        requiresAction: true,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id
      });
    }

    // If the payment succeeded immediately
    if (paymentIntent.status === 'succeeded') {
      // Immediately refund the validation charge
      try {
        const refund = await stripe.refunds.create({
          payment_intent: paymentIntent.id,
          reason: 'requested_by_customer',
          metadata: {
            type: 'card_validation_refund',
            userId: userId,
            originalPaymentIntent: paymentIntent.id
          }
        });

        logger.info(`Card validation: Validation charge refunded - userId: ${userId}, paymentIntentId: ${paymentIntent.id}, refundId: ${refund.id}, refundStatus: ${refund.status}`);

        return NextResponse.json({
          success: true,
          validated: true,
          paymentIntentId: paymentIntent.id,
          refundId: refund.id,
          message: 'Card validated successfully. The $1 charge has been refunded.'
        });
      } catch (refundError) {
        logger.error(`Card validation: Refund failed - userId: ${userId}, paymentIntentId: ${paymentIntent.id}`, refundError as Error);

        return NextResponse.json({
          success: true,
          validated: true,
          paymentIntentId: paymentIntent.id,
          warning: 'Card validated but refund failed. Please contact support.',
          message: 'Card validated successfully, but there was an issue with the refund.'
        });
      }
    }

    // If the payment failed
    if (paymentIntent.status === 'requires_payment_method') {
      logger.warn(`Card validation: Payment failed - userId: ${userId}, paymentIntentId: ${paymentIntent.id}, status: ${paymentIntent.status}`);

      return NextResponse.json({
        success: false,
        validated: false,
        error: 'Card validation failed. Please check your card details and try again.'
      }, { status: 400 });
    }

    // Handle other statuses
    logger.warn(`Card validation: Unexpected payment status - userId: ${userId}, paymentIntentId: ${paymentIntent.id}, status: ${paymentIntent.status}`);

    return NextResponse.json({
      success: false,
      validated: false,
      status: paymentIntent.status,
      error: 'Unexpected payment status. Please try again.'
    }, { status: 400 });

  } catch (error) {
    logger.error('Card validation: Unexpected error', error as Error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'An unexpected error occurred during card validation. Please try again.' 
      },
      { status: 500 }
    );
  }
}

// Handle validation completion after 3D Secure
export async function PUT(request: NextRequest) {
  try {
    const { paymentIntentId, idToken } = await request.json();

    if (!paymentIntentId || !idToken) {
      return NextResponse.json(
        { error: 'Payment intent ID and authentication token are required' },
        { status: 400 }
      );
    }

    // Verify the user's authentication
    let decodedToken;
    try {
      decodedToken = await auth.verifyIdToken(idToken);
    } catch (authError) {
      logger.error('Card validation completion: Authentication failed', authError as Error);
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      );
    }

    const userId = decodedToken.uid;
    
    // Retrieve the payment intent to check its status
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    logger.info(`Card validation completion: Checking payment status - userId: ${userId}, paymentIntentId: ${paymentIntentId}, status: ${paymentIntent.status}`);

    if (paymentIntent.status === 'succeeded') {
      // Refund the validation charge
      try {
        const refund = await stripe.refunds.create({
          payment_intent: paymentIntentId,
          reason: 'requested_by_customer',
          metadata: {
            type: 'card_validation_refund',
            userId: userId,
            originalPaymentIntent: paymentIntentId
          }
        });

        logger.info(`Card validation completion: Validation charge refunded - userId: ${userId}, paymentIntentId: ${paymentIntentId}, refundId: ${refund.id}, refundStatus: ${refund.status}`);

        return NextResponse.json({
          success: true,
          validated: true,
          paymentIntentId,
          refundId: refund.id,
          message: 'Card validated successfully. The $1 charge has been refunded.'
        });
      } catch (refundError) {
        logger.error(`Card validation completion: Refund failed - userId: ${userId}, paymentIntentId: ${paymentIntentId}`, refundError as Error);

        return NextResponse.json({
          success: true,
          validated: true,
          paymentIntentId,
          warning: 'Card validated but refund failed. Please contact support.',
          message: 'Card validated successfully, but there was an issue with the refund.'
        });
      }
    } else {
      return NextResponse.json({
        success: false,
        validated: false,
        status: paymentIntent.status,
        error: 'Card validation was not completed successfully.'
      }, { status: 400 });
    }

  } catch (error) {
    logger.error('Card validation completion: Unexpected error', error as Error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'An unexpected error occurred during card validation completion. Please try again.' 
      },
      { status: 500 }
    );
  }
}