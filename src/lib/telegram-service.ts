import { logger } from './logger';

export interface TelegramConfig {
  botToken: string;
  chatId: string;
  enabled: boolean;
}

export interface BookingAlert {
  type: 'booking' | 'event_ticket';
  courseName?: string;
  eventName?: string;
  playerCount: number;
  date: string;
  time: string;
  paymentMethod: 'stripe' | 'paypal' | 'apple_pay' | 'google_pay';
  transactionId: string;
  amount: number;
  currency: string;
  customerEmail: string;
  customerName?: string;
}

export interface AlertRecord {
  id?: string;
  type: 'booking' | 'event_ticket';
  message: string;
  sentAt: Date;
  success: boolean;
  error?: string;
  metadata: {
    transactionId: string;
    customerEmail: string;
    amount: number;
    currency: string;
  };
}

export class TelegramService {
  private config: TelegramConfig;

  constructor() {
    this.config = {
      botToken: process.env.TELEGRAM_BOT_TOKEN || '',
      chatId: process.env.TELEGRAM_CHAT_ID || '',
      enabled: process.env.TELEGRAM_ALERTS_ENABLED === 'true'
    };
  }

  /**
   * Verifica si el servicio está configurado correctamente
   */
  isConfigured(): boolean {
    return !!(this.config.botToken && this.config.chatId && this.config.enabled);
  }

  /**
   * Formatea el mensaje de alerta según el tipo
   */
  private formatMessage(alert: BookingAlert): string {
    const paymentMethodEmojis = {
      stripe: '💳',
      paypal: '🅿️',
      apple_pay: '🍎',
      google_pay: '🔵'
    };

    const emoji = paymentMethodEmojis[alert.paymentMethod] || '💳';
    
    if (alert.type === 'booking') {
      return `🏌️ *Nueva Reserva Confirmada*

🏌️ *Campo:* ${alert.courseName}
👥 *Jugadores:* ${alert.playerCount}
📅 *Fecha:* ${alert.date}
⏰ *Hora:* ${alert.time}
${emoji} *Pago:* ${alert.paymentMethod.replace('_', ' ').toUpperCase()}
💰 *Monto:* ${alert.amount} ${alert.currency}
✅ *Estado:* Transacción confirmada
📧 *Cliente:* ${alert.customerEmail}
🔗 *ID:* \`${alert.transactionId}\``;
    } else {
      return `🎫 *Nuevo Ticket de Evento*

🎪 *Evento:* ${alert.eventName}
👥 *Tickets:* ${alert.playerCount}
📅 *Fecha:* ${alert.date}
⏰ *Hora:* ${alert.time}
${emoji} *Pago:* ${alert.paymentMethod.replace('_', ' ').toUpperCase()}
💰 *Monto:* ${alert.amount} ${alert.currency}
✅ *Estado:* Transacción confirmada
📧 *Cliente:* ${alert.customerEmail}
🔗 *ID:* \`${alert.transactionId}\``;
    }
  }

  /**
   * Envía un mensaje a Telegram
   */
  private async sendMessage(message: string): Promise<boolean> {
    if (!this.isConfigured()) {
      logger.warn('Telegram service not configured, skipping notification');
      return false;
    }

    try {
      const url = `https://api.telegram.org/bot${this.config.botToken}/sendMessage`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: this.config.chatId,
          text: message,
          parse_mode: 'Markdown',
          disable_web_page_preview: true
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Telegram API error: ${errorData.description || response.statusText}`);
      }

      logger.info('Telegram notification sent successfully');
      return true;
    } catch (error) {
      logger.error('Failed to send Telegram notification:', error);
      return false;
    }
  }

  /**
   * Guarda el registro de alerta en Firestore
   */
  private async saveAlertRecord(alert: BookingAlert, message: string, success: boolean, error?: string): Promise<void> {
    try {
      const { getFirestore, collection, addDoc } = await import('firebase/firestore');
      const { db } = await import('./firebase');

      const alertRecord: AlertRecord = {
        type: alert.type,
        message,
        sentAt: new Date(),
        success,
        error,
        metadata: {
          transactionId: alert.transactionId,
          customerEmail: alert.customerEmail,
          amount: alert.amount,
          currency: alert.currency
        }
      };

      await addDoc(collection(db, 'admin_alerts'), alertRecord);
      logger.info('Alert record saved to Firestore');
    } catch (error) {
      logger.error('Failed to save alert record:', error);
    }
  }

  /**
   * Envía una alerta de reserva o evento
   */
  async sendBookingAlert(alert: BookingAlert): Promise<boolean> {
    try {
      const message = this.formatMessage(alert);
      const success = await this.sendMessage(message);
      
      // Guardar registro de la alerta
      await this.saveAlertRecord(alert, message, success, success ? undefined : 'Failed to send message');
      
      return success;
    } catch (error) {
      logger.error('Error sending booking alert:', error);
      await this.saveAlertRecord(alert, '', false, error instanceof Error ? error.message : 'Unknown error');
      return false;
    }
  }

  /**
   * Envía una alerta de prueba
   */
  async sendTestAlert(): Promise<boolean> {
    const testMessage = `🧪 *Alerta de Prueba*

✅ El sistema de notificaciones de Telegram está funcionando correctamente.
📅 Enviado: ${new Date().toLocaleString('es-ES')}`;

    return await this.sendMessage(testMessage);
  }

  /**
   * Envía un mensaje crudo a un chat específico
   */
  async sendMessageTo(chatId: string, message: string): Promise<boolean> {
    if (!this.config.botToken || !this.config.enabled) {
      logger.warn('Telegram service not configured (bot token or enabled false), skipping notification');
      return false;
    }

    try {
      const url = `https://api.telegram.org/bot${this.config.botToken}/sendMessage`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'Markdown',
          disable_web_page_preview: true
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Telegram API error: ${errorData.description || response.statusText}`);
      }

      logger.info('Telegram notification sent successfully to specific chat');
      return true;
    } catch (error) {
      logger.error('Failed to send Telegram notification to specific chat:', error);
      return false;
    }
  }

  /**
   * Actualiza la configuración del servicio
   */
  updateConfig(config: Partial<TelegramConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// Instancia singleton
export const telegramService = new TelegramService();

// Función helper para enviar alertas desde webhooks
export async function sendPaymentAlert(
  type: 'booking' | 'event_ticket',
  data: {
    courseName?: string;
    eventName?: string;
    playerCount: number;
    date: string;
    time: string;
    paymentMethod: string;
    transactionId: string;
    amount: number;
    currency: string;
    customerEmail: string;
    customerName?: string;
  }
): Promise<boolean> {
  const alert: BookingAlert = {
    type,
    courseName: data.courseName,
    eventName: data.eventName,
    playerCount: data.playerCount,
    date: data.date,
    time: data.time,
    paymentMethod: data.paymentMethod as any,
    transactionId: data.transactionId,
    amount: data.amount,
    currency: data.currency,
    customerEmail: data.customerEmail,
    customerName: data.customerName
  };

  return await telegramService.sendBookingAlert(alert);
}