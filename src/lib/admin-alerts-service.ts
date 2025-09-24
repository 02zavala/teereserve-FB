import { logger } from './logger';
import { telegramService } from './telegram-service';
import { whatsappService, sendAdminWhatsAppAlert } from './whatsapp-service';
import { sendAdminBookingNotification } from './email';

export interface AdminAlertConfig {
  telegram: {
    enabled: boolean;
    chatId: string;
  };
  whatsapp: {
    enabled: boolean;
    phoneNumber: string;
  };
  email: {
    enabled: boolean;
    address: string;
  };
}

export interface BookingConfirmationData {
  bookingId: string;
  courseName: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  date: string;
  time: string;
  players: number;
  totalAmount: number;
  currency: string;
  paymentMethod: string;
  transactionId?: string;
  bookingUrl?: string;
  createdAt: Date;
}

export interface AlertResult {
  channel: 'telegram' | 'whatsapp' | 'email';
  success: boolean;
  error?: string;
}

class AdminAlertsService {
  private config: AdminAlertConfig;

  constructor() {
    this.config = {
      telegram: {
        enabled: process.env.ADMIN_TELEGRAM_ALERTS_ENABLED === 'true',
        chatId: process.env.ADMIN_TELEGRAM_CHAT_ID || ''
      },
      whatsapp: {
        enabled: process.env.ADMIN_WHATSAPP_ALERTS_ENABLED === 'true',
        phoneNumber: process.env.ADMIN_WHATSAPP_NUMBER || ''
      },
      email: {
        enabled: process.env.ADMIN_EMAIL_ALERTS_ENABLED === 'true',
        address: process.env.ADMIN_EMAIL_ADDRESS || 'info@teereserve.golf'
      }
    };
  }

  /**
   * Envía alertas por todos los canales configurados cuando una reserva se confirma
   */
  async sendBookingConfirmedAlert(data: BookingConfirmationData): Promise<AlertResult[]> {
    const results: AlertResult[] = [];
    
    logger.info('Sending admin alerts for confirmed booking', 'admin-alerts', {
      bookingId: data.bookingId,
      customerEmail: data.customerEmail,
      totalAmount: data.totalAmount
    });

    // Enviar por Telegram
    if (this.config.telegram.enabled && this.config.telegram.chatId) {
      try {
        const telegramData = {
          bookingId: data.bookingId,
          courseName: data.courseName,
          customerName: data.customerName,
          customerEmail: data.customerEmail,
          date: data.date,
          time: data.time,
          players: data.players,
          totalAmount: data.totalAmount,
          currency: data.currency,
          paymentMethod: data.paymentMethod,
          transactionId: data.transactionId
        };

        const success = await telegramService.sendBookingAlert(telegramData, this.config.telegram.chatId);
        results.push({ channel: 'telegram', success });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Failed to send Telegram admin alert:', error);
        results.push({ channel: 'telegram', success: false, error: errorMessage });
      }
    }

    // Enviar por WhatsApp
    if (this.config.whatsapp.enabled && this.config.whatsapp.phoneNumber) {
      try {
        const whatsappData = {
          bookingId: data.bookingId,
          courseName: data.courseName,
          customerName: data.customerName,
          customerEmail: data.customerEmail,
          date: data.date,
          time: data.time,
          players: data.players,
          totalAmount: data.totalAmount,
          currency: data.currency,
          paymentMethod: data.paymentMethod,
          transactionId: data.transactionId
        };

        const success = await sendAdminWhatsAppAlert(whatsappData, this.config.whatsapp.phoneNumber);
        results.push({ channel: 'whatsapp', success });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Failed to send WhatsApp admin alert:', error);
        results.push({ channel: 'whatsapp', success: false, error: errorMessage });
      }
    }

    // Enviar por Email
    if (this.config.email.enabled && this.config.email.address) {
      try {
        const success = await this.sendEmailAlert(data);
        results.push({ channel: 'email', success });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Failed to send email admin alert:', error);
        results.push({ channel: 'email', success: false, error: errorMessage });
      }
    }

    // Guardar resumen de alertas
    await this.saveAlertSummary(data, results);

    const successCount = results.filter(r => r.success).length;
    logger.info(`Admin alerts sent: ${successCount}/${results.length} successful`, 'admin-alerts', {
      bookingId: data.bookingId,
      results: results.map(r => ({ channel: r.channel, success: r.success }))
    });

    return results;
  }

  /**
   * Envía alerta por email al admin
   */
  private async sendEmailAlert(data: BookingConfirmationData): Promise<boolean> {
    try {
      const subject = `🏌️ Nueva Reserva Confirmada - ${data.courseName}`;
      
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #2E7D32, #4CAF50); color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">🏌️ Nueva Reserva Confirmada</h1>
          </div>
          
          <div style="padding: 20px; background-color: #f9f9f9;">
            <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h2 style="color: #2E7D32; margin-top: 0;">Detalles de la Reserva</h2>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #555;">ID de Reserva:</td>
                  <td style="padding: 8px 0;">${data.bookingId}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #555;">Campo:</td>
                  <td style="padding: 8px 0;">${data.courseName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #555;">Cliente:</td>
                  <td style="padding: 8px 0;">${data.customerName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #555;">Email:</td>
                  <td style="padding: 8px 0;"><a href="mailto:${data.customerEmail}">${data.customerEmail}</a></td>
                </tr>
                ${data.customerPhone ? `
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #555;">Teléfono:</td>
                  <td style="padding: 8px 0;">${data.customerPhone}</td>
                </tr>
                ` : ''}
              </table>
            </div>

            <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h2 style="color: #2E7D32; margin-top: 0;">Fecha y Hora</h2>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #555;">Fecha:</td>
                  <td style="padding: 8px 0;">${data.date}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #555;">Hora:</td>
                  <td style="padding: 8px 0;">${data.time}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #555;">Jugadores:</td>
                  <td style="padding: 8px 0;">${data.players}</td>
                </tr>
              </table>
            </div>

            <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h2 style="color: #2E7D32; margin-top: 0;">Información de Pago</h2>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #555;">Total:</td>
                  <td style="padding: 8px 0; font-size: 18px; font-weight: bold; color: #2E7D32;">${data.totalAmount} ${data.currency}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #555;">Método de Pago:</td>
                  <td style="padding: 8px 0;">${data.paymentMethod.replace('_', ' ').toUpperCase()}</td>
                </tr>
                ${data.transactionId ? `
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #555;">ID Transacción:</td>
                  <td style="padding: 8px 0; font-family: monospace;">${data.transactionId}</td>
                </tr>
                ` : ''}
              </table>
            </div>

            <div style="background: #E8F5E8; padding: 15px; border-radius: 8px; text-align: center;">
              <p style="margin: 0; color: #2E7D32; font-weight: bold;">✅ Estado: CONFIRMADA Y PAGADA</p>
            </div>

            ${data.bookingUrl ? `
            <div style="text-align: center; margin-top: 20px;">
              <a href="${data.bookingUrl}" style="background: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Ver Reserva Completa</a>
            </div>
            ` : ''}
          </div>

          <div style="background: #f0f0f0; padding: 15px; text-align: center; font-size: 12px; color: #666;">
            <p style="margin: 0;">Notificación automática de TeeReserve</p>
            <p style="margin: 5px 0 0 0;">Enviado el ${new Date().toLocaleString('es-ES')}</p>
          </div>
        </div>
      `;

      const textContent = `
NUEVA RESERVA CONFIRMADA

Detalles de la Reserva:
- ID: ${data.bookingId}
- Campo: ${data.courseName}
- Cliente: ${data.customerName}
- Email: ${data.customerEmail}
${data.customerPhone ? `- Teléfono: ${data.customerPhone}` : ''}

Fecha y Hora:
- Fecha: ${data.date}
- Hora: ${data.time}
- Jugadores: ${data.players}

Información de Pago:
- Total: ${data.totalAmount} ${data.currency}
- Método: ${data.paymentMethod.replace('_', ' ').toUpperCase()}
${data.transactionId ? `- ID Transacción: ${data.transactionId}` : ''}

Estado: CONFIRMADA Y PAGADA

${data.bookingUrl ? `Ver reserva: ${data.bookingUrl}` : ''}

---
Notificación automática de TeeReserve
Enviado el ${new Date().toLocaleString('es-ES')}
      `;

      await sendAdminBookingNotification(this.config.email.address, data);

      return true;
    } catch (error) {
      logger.error('Failed to send admin email alert:', error);
      return false;
    }
  }

  /**
   * Guarda un resumen de todas las alertas enviadas
   */
  private async saveAlertSummary(data: BookingConfirmationData, results: AlertResult[]): Promise<void> {
    try {
      const { getFirestore, collection, addDoc } = await import('firebase/firestore');
      const { db } = await import('./firebase');

      const alertSummary = {
        type: 'admin_alert_summary',
        bookingId: data.bookingId,
        customerEmail: data.customerEmail,
        totalAmount: data.totalAmount,
        currency: data.currency,
        sentAt: new Date(),
        results,
        successCount: results.filter(r => r.success).length,
        totalChannels: results.length,
        metadata: {
          courseName: data.courseName,
          customerName: data.customerName,
          date: data.date,
          time: data.time,
          paymentMethod: data.paymentMethod
        }
      };

      await addDoc(collection(db, 'admin_alert_summaries'), alertSummary);
      logger.info('Admin alert summary saved to Firestore');
    } catch (error) {
      logger.error('Failed to save admin alert summary:', error);
    }
  }

  /**
   * Envía alertas de prueba por todos los canales
   */
  async sendTestAlerts(): Promise<AlertResult[]> {
    const results: AlertResult[] = [];
    const testData: BookingConfirmationData = {
      bookingId: 'TEST-' + Date.now(),
      courseName: 'Campo de Prueba',
      customerName: 'Cliente de Prueba',
      customerEmail: 'test@example.com',
      date: new Date().toLocaleDateString('es-ES'),
      time: '10:00',
      players: 2,
      totalAmount: 50,
      currency: 'EUR',
      paymentMethod: 'stripe',
      transactionId: 'test_transaction_123',
      createdAt: new Date()
    };

    // Telegram
    if (this.config.telegram.enabled && this.config.telegram.chatId) {
      try {
        const success = await telegramService.sendTestAlert(this.config.telegram.chatId);
        results.push({ channel: 'telegram', success });
      } catch (error) {
        results.push({ channel: 'telegram', success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }

    // WhatsApp
    if (this.config.whatsapp.enabled && this.config.whatsapp.phoneNumber) {
      try {
        const success = await whatsappService.sendTestAlert(this.config.whatsapp.phoneNumber);
        results.push({ channel: 'whatsapp', success });
      } catch (error) {
        results.push({ channel: 'whatsapp', success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }

    // Email
    if (this.config.email.enabled && this.config.email.address) {
      try {
        const success = await this.sendEmailAlert(testData);
        results.push({ channel: 'email', success });
      } catch (error) {
        results.push({ channel: 'email', success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }

    return results;
  }

  /**
   * Obtiene el estado de configuración de todos los canales
   */
  getStatus() {
    return {
      telegram: {
        enabled: this.config.telegram.enabled,
        configured: !!(this.config.telegram.chatId && telegramService.isConfigured())
      },
      whatsapp: {
        enabled: this.config.whatsapp.enabled,
        configured: !!(this.config.whatsapp.phoneNumber && whatsappService.isConfigured())
      },
      email: {
        enabled: this.config.email.enabled,
        configured: !!this.config.email.address
      }
    };
  }

  /**
   * Actualiza la configuración del servicio
   */
  updateConfig(config: Partial<AdminAlertConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// Instancia singleton
export const adminAlertsService = new AdminAlertsService();

// Función helper principal para enviar alertas de admin
export async function sendAdminBookingAlert(data: BookingConfirmationData): Promise<AlertResult[]> {
  return await adminAlertsService.sendBookingConfirmedAlert(data);
}