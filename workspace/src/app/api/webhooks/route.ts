import { NextRequest, NextResponse } from 'next/server';
import { WebhookEvent } from '@/lib/webhooks';

// Configuración de webhooks desde variables de entorno
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
const WEBHOOK_ENABLED = process.env.WEBHOOK_ENABLED === 'true';

// Endpoint para recibir webhooks (opcional, para integraciones bidireccionales)
export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('x-webhook-secret');
    
    // Verificar la firma del webhook
    if (WEBHOOK_SECRET && signature !== WEBHOOK_SECRET) {
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 401 }
      );
    }

    const payload = await request.json();
    console.log('Received webhook:', payload);

    // Aquí puedes procesar diferentes tipos de webhooks entrantes
    switch (payload.event) {
      case 'automation.trigger':
        // Manejar triggers de automatización desde n8n
        console.log('Processing automation trigger:', payload.data);
        break;
      
      case 'notification.send':
        // Manejar solicitudes de notificación desde n8n
        console.log('Processing notification request:', payload.data);
        break;
      
      default:
        console.log('Unknown webhook event:', payload.event);
    }

    return NextResponse.json({ success: true, received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

// Endpoint para verificar el estado del webhook (health check)
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    webhooks_enabled: WEBHOOK_ENABLED,
    timestamp: new Date().toISOString()
  });
}