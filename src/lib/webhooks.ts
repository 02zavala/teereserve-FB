// Tipos de eventos webhook
export type WebhookEvent = 
  | 'user.registered'
  | 'booking.created'
  | 'booking.confirmed'
  | 'booking.cancelled'
  | 'payment.completed'
  | 'review.created';

interface WebhookPayload {
  event: WebhookEvent;
  timestamp: string;
  data: Record<string, any>;
}

// Configuración de webhooks desde variables de entorno
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;
const WEBHOOK_ENABLED = process.env.WEBHOOK_ENABLED === 'true';

// Función para enviar webhook a n8n
export async function sendWebhook(event: WebhookEvent, data: Record<string, any>) {
  if (!WEBHOOK_ENABLED || !N8N_WEBHOOK_URL) {
    console.log('Webhooks disabled or URL not configured');
    return;
  }

  const payload: WebhookPayload = {
    event,
    timestamp: new Date().toISOString(),
    data
  };

  try {
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': WEBHOOK_SECRET || '',
        'User-Agent': 'TeeReserve-Webhook/1.0'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.status} ${response.statusText}`);
    }

    console.log(`Webhook sent successfully for event: ${event}`);
  } catch (error) {
    console.error('Failed to send webhook:', error);
    // En producción, podrías querer implementar un sistema de reintentos
    // o almacenar los webhooks fallidos para procesarlos más tarde
  }
}