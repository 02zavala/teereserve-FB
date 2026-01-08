import { logger } from './logger';

export interface WhatsAppConfig {
  accessToken: string;
  phoneNumberId: string;
  businessAccountId: string;
  enabled: boolean;
}

export interface WhatsAppMessage {
  to: string;
  type: 'text' | 'template';
  text?: {
    body: string;
  };
  template?: {
    name: string;
    language: {
      code: string;
    };
    components?: any[];
  };
}

export interface BookingAlertData {
  bookingId: string;
  courseName: string;
  customerName: string;
  customerEmail: string;
  date: string;
  time: string;
  players: number;
  totalAmount: number;
  currency: string;
  paymentMethod: string;
  transactionId?: string;
}

class WhatsAppService {
  private config: WhatsAppConfig;
  private baseUrl = 'https://graph.facebook.com/v18.0';

  constructor() {
    this.config = {
      accessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
      phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
      businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '',
      enabled: process.env.WHATSAPP_ALERTS_ENABLED === 'true'
    };
  }

  /**
   * Verifica si el servicio está configurado correctamente
   */
  isConfigured(): boolean {
    return !!(
      this.config.accessToken && 
      this.config.phoneNumberId && 
      this.config.enabled
    );
  }

  /**
   * Formatea el mensaje de alerta para admin
   */
  private formatAdminAlert(data: BookingAlertData): string {
    const paymentMethodEmojis: Record<string, string> = {
      stripe: '💳',
      paypal: '🅿️',
      apple_pay: '🍎',
      google_pay: '🔵'
    };

    const emoji = paymentMethodEmojis[data.paymentMethod] || '💳';
    
    return `🏌️ *NUEVA RESERVA CONFIRMADA*

📋 *Detalles de la Reserva:*
• ID: ${data.bookingId}
• Campo: ${data.courseName}
• Cliente: ${data.customerName}
• Email: ${data.customerEmail}

📅 *Fecha y Hora:*
• Fecha: ${data.date}
• Hora: ${data.time}
• Jugadores: ${data.players}

💰 *Información de Pago:*
• Total: ${data.totalAmount} ${data.currency}
• Método: ${data.paymentMethod.replace('_', ' ').toUpperCase()} ${emoji}
${data.transactionId ? `• ID Transacción: ${data.transactionId}` : ''}

✅ *Estado: CONFIRMADA Y PAGADA*

_Notificación automática de TeeReserve_`;
  }

  /**
   * Envía un mensaje de texto a WhatsApp
   */
  private async sendTextMessage(to: string, message: string): Promise<boolean> {
    if (!this.isConfigured()) {
      logger.warn('WhatsApp service not configured, skipping notification');
      return false;
    }

    try {
      const url = `${this.baseUrl}/${this.config.phoneNumberId}/messages`;
      
      const payload: WhatsAppMessage = {
        to: to,
        type: 'text',
        text: {
          body: message
        }
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`WhatsApp API error: ${errorData.error?.message || response.statusText}`);
      }

      const result = await response.json();
      logger.info('WhatsApp message sent successfully', 'whatsapp', {
        messageId: result.messages?.[0]?.id,
        to: to
      });
      
      return true;
    } catch (error) {
      logger.error('Failed to send WhatsApp message:', error, 'whatsapp', {
        to: to,
        configured: this.isConfigured()
      });
      return false;
    }
  }

  /**
   * Envía alerta de reserva confirmada a admin
   */
  async sendBookingAlert(data: BookingAlertData, adminPhoneNumber: string): Promise<boolean> {
    try {
      const message = this.formatAdminAlert(data);
      const success = await this.sendTextMessage(adminPhoneNumber, message);
      
      // Guardar registro de la alerta
      await this.saveAlertRecord(data, message, success, adminPhoneNumber);
      
      return success;
    } catch (error) {
      logger.error('Error sending WhatsApp booking alert:', error);
      await this.saveAlertRecord(data, '', false, adminPhoneNumber, error instanceof Error ? error.message : 'Unknown error');
      return false;
    }
  }

  /**
   * Guarda el registro de alerta en Firestore
   */
  private async saveAlertRecord(
    data: BookingAlertData, 
    message: string, 
    success: boolean, 
    phoneNumber: string,
    error?: string
  ): Promise<void> {
    try {
      const { getFirestore, collection, addDoc } = await import('firebase/firestore');
      const { db } = await import('./firebase');

      const alertRecord = {
        type: 'whatsapp_admin_alert',
        bookingId: data.bookingId,
        phoneNumber: phoneNumber,
        message,
        sentAt: new Date(),
        success,
        error,
        metadata: {
          courseName: data.courseName,
          customerEmail: data.customerEmail,
          totalAmount: data.totalAmount,
          currency: data.currency
        }
      };

      if (!db) return;
      await addDoc(collection(db, 'admin_alerts'), alertRecord);
      logger.info('WhatsApp alert record saved to Firestore');
    } catch (error) {
      logger.error('Failed to save WhatsApp alert record:', error);
    }
  }

  /**
   * Envía una alerta de prueba
   */
  async sendTestAlert(adminPhoneNumber: string): Promise<boolean> {
    const testMessage = `🧪 *PRUEBA DE WHATSAPP*

✅ El sistema de notificaciones de WhatsApp está funcionando correctamente.

📅 Enviado: ${new Date().toLocaleString('es-ES')}

_Sistema de alertas TeeReserve_`;

    return await this.sendTextMessage(adminPhoneNumber, testMessage);
  }

  /**
   * Actualiza la configuración del servicio
   */
  updateConfig(config: Partial<WhatsAppConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Obtiene el estado del servicio
   */
  getStatus() {
    return {
      configured: this.isConfigured(),
      enabled: this.config.enabled,
      hasAccessToken: !!this.config.accessToken,
      hasPhoneNumberId: !!this.config.phoneNumberId
    };
  }
}

// Instancia singleton
export const whatsappService = new WhatsAppService();

// Función helper para enviar alertas de admin
export async function sendAdminWhatsAppAlert(
  bookingData: BookingAlertData,
  adminPhoneNumber: string = process.env.ADMIN_WHATSAPP_NUMBER || ''
): Promise<boolean> {
  if (!adminPhoneNumber) {
    logger.warn('Admin WhatsApp number not configured');
    return false;
  }

  return await whatsappService.sendBookingAlert(bookingData, adminPhoneNumber);
}