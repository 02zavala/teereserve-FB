import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

export interface TelegramConfig {
  botToken: string;
  chatId: string;
}

export interface AlertRecord {
  id?: string;
  type: 'booking_confirmed' | 'payment_failed' | 'event_ticket_purchased';
  recipientChatId: string;
  message: string;
  data: any;
  sentAt: admin.firestore.Timestamp;
  status: 'sent' | 'failed';
  error?: string;
}

export class TelegramService {
  private botToken: string;

  constructor() {
    // Get bot token from Firebase functions config
    this.botToken = functions.config().telegram?.bot_token || process.env.TELEGRAM_BOT_TOKEN || '';
    
    if (!this.botToken) {
      console.warn('Telegram bot token not configured. Notifications will not be sent.');
    }
  }

  /**
   * Send a booking alert via Telegram
   */
  async sendBookingAlert(chatId: string, message: string, data: any): Promise<boolean> {
    if (!this.botToken) {
      console.warn('Telegram bot token not configured. Skipping notification.');
      return false;
    }

    try {
      const success = await this.sendMessage(chatId, message);
      
      // Save alert record to Firestore
      await this.saveAlertRecord({
        type: 'booking_confirmed',
        recipientChatId: chatId,
        message,
        data,
        sentAt: admin.firestore.Timestamp.now(),
        status: success ? 'sent' : 'failed'
      });

      return success;
    } catch (error) {
      console.error('Error sending booking alert:', error);
      
      // Save failed alert record
      await this.saveAlertRecord({
        type: 'booking_confirmed',
        recipientChatId: chatId,
        message,
        data,
        sentAt: admin.firestore.Timestamp.now(),
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return false;
    }
  }

  /**
   * Send an event ticket alert via Telegram
   */
  async sendEventTicketAlert(chatId: string, message: string, data: any): Promise<boolean> {
    if (!this.botToken) {
      console.warn('Telegram bot token not configured. Skipping notification.');
      return false;
    }

    try {
      const success = await this.sendMessage(chatId, message);
      
      // Save alert record to Firestore
      await this.saveAlertRecord({
        type: 'event_ticket_purchased',
        recipientChatId: chatId,
        message,
        data,
        sentAt: admin.firestore.Timestamp.now(),
        status: success ? 'sent' : 'failed'
      });

      return success;
    } catch (error) {
      console.error('Error sending event ticket alert:', error);
      
      // Save failed alert record
      await this.saveAlertRecord({
        type: 'event_ticket_purchased',
        recipientChatId: chatId,
        message,
        data,
        sentAt: admin.firestore.Timestamp.now(),
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return false;
    }
  }

  /**
   * Send a payment failed alert via Telegram
   */
  async sendPaymentFailedAlert(chatId: string, message: string, data: any): Promise<boolean> {
    if (!this.botToken) {
      console.warn('Telegram bot token not configured. Skipping notification.');
      return false;
    }

    try {
      const success = await this.sendMessage(chatId, message);
      
      // Save alert record to Firestore
      await this.saveAlertRecord({
        type: 'payment_failed',
        recipientChatId: chatId,
        message,
        data,
        sentAt: admin.firestore.Timestamp.now(),
        status: success ? 'sent' : 'failed'
      });

      return success;
    } catch (error) {
      console.error('Error sending payment failed alert:', error);
      
      // Save failed alert record
      await this.saveAlertRecord({
        type: 'payment_failed',
        recipientChatId: chatId,
        message,
        data,
        sentAt: admin.firestore.Timestamp.now(),
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return false;
    }
  }

  /**
   * Send a message via Telegram Bot API
   */
  private async sendMessage(chatId: string, message: string): Promise<boolean> {
    try {
      const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'Markdown',
          disable_web_page_preview: true
        })
      });

      const result = await response.json();
      
      if (!response.ok) {
        console.error('Telegram API error:', result);
        return false;
      }

      console.log('Telegram message sent successfully:', result.result?.message_id);
      return true;
    } catch (error) {
      console.error('Error sending Telegram message:', error);
      return false;
    }
  }

  /**
   * Save alert record to Firestore for auditing
   */
  private async saveAlertRecord(record: AlertRecord): Promise<void> {
    try {
      await admin.firestore()
        .collection('admin_alerts')
        .add(record);
    } catch (error) {
      console.error('Error saving alert record:', error);
    }
  }

  /**
   * Test the Telegram bot configuration
   */
  async testBot(): Promise<{ success: boolean; botInfo?: any; error?: string }> {
    if (!this.botToken) {
      return { success: false, error: 'Bot token not configured' };
    }

    try {
      const url = `https://api.telegram.org/bot${this.botToken}/getMe`;
      const response = await fetch(url);
      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.description || 'Unknown error' };
      }

      return { success: true, botInfo: result.result };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}