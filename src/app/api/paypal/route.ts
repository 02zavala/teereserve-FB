import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/firebase-admin';
import { logger } from '@/lib/logger';

const PAYPAL_BASE_URL = process.env.NEXT_PUBLIC_PAYPAL_ENVIRONMENT === 'production' 
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

// Get PayPal access token
async function getPayPalAccessToken() {
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    throw new Error('PayPal credentials not configured');
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  
  const response = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials'
  });

  if (!response.ok) {
    throw new Error('Failed to get PayPal access token');
  }

  const data = await response.json();
  return data.access_token;
}

// Create PayPal order
export async function POST(request: NextRequest) {
  try {
    const { amount, currency = 'USD', courseId, courseName, idToken } = await request.json();

    if (!amount || !courseId || !courseName || !idToken) {
      return NextResponse.json(
        { error: 'Missing required fields: amount, courseId, courseName, idToken' },
        { status: 400 }
      );
    }

    // Verify the user's authentication
    let decodedToken;
    try {
      decodedToken = await auth.verifyIdToken(idToken);
    } catch (authError) {
      logger.error('PayPal order creation: Authentication failed', authError as Error);
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      );
    }

    const userId = decodedToken.uid;
    const userEmail = decodedToken.email;

    logger.info(`PayPal order creation: Starting order creation for user ${userId}, course ${courseId}, amount ${amount} ${currency}`);

    // Get PayPal access token
    const accessToken = await getPayPalAccessToken();

    // Create PayPal order
    const orderData = {
      intent: 'CAPTURE',
      purchase_units: [{
        reference_id: `course_${courseId}_${Date.now()}`,
        description: `TeeReserve Golf Course: ${courseName}`,
        amount: {
          currency_code: currency,
          value: amount.toString()
        },
        custom_id: userId,
        invoice_id: `TR_${courseId}_${userId}_${Date.now()}`
      }],
      payment_source: {
        paypal: {
          experience_context: {
            payment_method_preference: 'IMMEDIATE_PAYMENT_REQUIRED',
            brand_name: 'TeeReserve Golf',
            locale: 'en-US',
            landing_page: 'LOGIN',
            shipping_preference: 'NO_SHIPPING',
            user_action: 'PAY_NOW',
            return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/payment/success`,
            cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/payment/cancelled`
          }
        }
      },
      application_context: {
        brand_name: 'TeeReserve Golf',
        locale: 'en-US',
        landing_page: 'LOGIN',
        shipping_preference: 'NO_SHIPPING',
        user_action: 'PAY_NOW'
      }
    };

    const response = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'PayPal-Request-Id': `TR_${Date.now()}_${userId}`
      },
      body: JSON.stringify(orderData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      logger.error(`PayPal order creation: Failed to create order for user ${userId}, course ${courseId}: ${JSON.stringify(errorData)}`);
      
      return NextResponse.json(
        { error: 'Failed to create PayPal order', details: errorData },
        { status: response.status }
      );
    }

    const orderResult = await response.json();
    
    logger.info(`PayPal order creation: Order created successfully for user ${userId}, course ${courseId}, order ${orderResult.id}, status ${orderResult.status}`);

    return NextResponse.json({
      success: true,
      orderId: orderResult.id,
      status: orderResult.status,
      links: orderResult.links
    });

  } catch (error) {
    logger.error('PayPal order creation: Unexpected error', error as Error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'An unexpected error occurred while creating PayPal order. Please try again.' 
      },
      { status: 500 }
    );
  }
}

// Capture PayPal order
export async function PUT(request: NextRequest) {
  try {
    const { orderId, idToken } = await request.json();

    if (!orderId || !idToken) {
      return NextResponse.json(
        { error: 'Order ID and authentication token are required' },
        { status: 400 }
      );
    }

    // Verify the user's authentication
    let decodedToken;
    try {
      decodedToken = await auth.verifyIdToken(idToken);
    } catch (authError) {
      logger.error('PayPal order capture: Authentication failed', authError as Error);
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      );
    }

    const userId = decodedToken.uid;

    logger.info(`PayPal order capture: Starting order capture for user ${userId}, order ${orderId}`);

    // Get PayPal access token
    const accessToken = await getPayPalAccessToken();

    // Capture the order
    const response = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'PayPal-Request-Id': `TR_CAPTURE_${Date.now()}_${userId}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      logger.error(`PayPal order capture: Failed to capture order for user ${userId}, order ${orderId}: ${JSON.stringify(errorData)}`);
      
      return NextResponse.json(
        { error: 'Failed to capture PayPal order', details: errorData },
        { status: response.status }
      );
    }

    const captureResult = await response.json();
    
    logger.info(`PayPal order capture: Order captured successfully for user ${userId}, order ${orderId}, capture ${captureResult.purchase_units?.[0]?.payments?.captures?.[0]?.id}, status ${captureResult.status}`);

    // Extract payment details
    const capture = captureResult.purchase_units?.[0]?.payments?.captures?.[0];
    const paymentDetails = {
      orderId: captureResult.id,
      captureId: capture?.id,
      status: captureResult.status,
      amount: capture?.amount,
      createTime: capture?.create_time,
      updateTime: capture?.update_time,
      payerInfo: {
        email: captureResult.payer?.email_address,
        payerId: captureResult.payer?.payer_id,
        name: captureResult.payer?.name
      }
    };

    return NextResponse.json({
      success: true,
      captured: true,
      paymentDetails,
      message: 'Payment captured successfully via PayPal'
    });

  } catch (error) {
    logger.error('PayPal order capture: Unexpected error', error as Error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'An unexpected error occurred while capturing PayPal payment. Please try again.' 
      },
      { status: 500 }
    );
  }
}