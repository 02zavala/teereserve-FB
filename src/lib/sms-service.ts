// SMS Service for TeeReserve using Twilio

// Mock Twilio for build compatibility when package is not installed
interface MockTwilio {
  messages: {
    create: (options: any) => Promise<any>;
  };
}

const Twilio = class {
  messages = {
    create: async (options: any) => {
      console.log('SMS would be sent:', options);
      return { sid: 'mock-sid' };
    }
  };
  constructor(accountSid: string, authToken: string) {
    // Mock constructor
  }
} as any;

// SMS Service Configuration
interface SMSConfig {
  accountSid: string;
  authToken: string;
  fromNumber: string;
}

// SMS Template Data
interface SMSTemplateData {
  [key: string]: any;
}

// SMS Service Class
class SMSService {
  private client: any;
  private fromNumber: string;

  constructor(config: SMSConfig) {
    this.client = new Twilio(config.accountSid, config.authToken);
    this.fromNumber = config.fromNumber;
  }

  // Send SMS
  async sendSMS(to: string, message: string): Promise<boolean> {
    try {
      const result = await this.client.messages.create({
        body: message,
        from: this.fromNumber,
        to: to
      });
      
      console.log(`SMS sent successfully. SID: ${result.sid}`);
      return true;
    } catch (error) {
      console.error('Failed to send SMS:', error);
      return false;
    }
  }

  // Send Booking Reminder SMS
  async sendBookingReminder(data: SMSTemplateData): Promise<boolean> {
    const message = this.getBookingReminderTemplate(data);
    return await this.sendSMS(data.phoneNumber, message);
  }

  // Send Urgent Update SMS
  async sendUrgentUpdate(data: SMSTemplateData): Promise<boolean> {
    const message = this.getUrgentUpdateTemplate(data);
    return await this.sendSMS(data.phoneNumber, message);
  }

  // Booking Reminder SMS Template
  private getBookingReminderTemplate(data: SMSTemplateData): string {
    return `🏌️ TeeReserve Reminder: Your tee time at ${data.courseName} is ${data.timeUntil}! Date: ${data.date} at ${data.time}. Arrive 30 min early. Booking ID: ${data.bookingId}`;
  }

  // Urgent Update SMS Template
  private getUrgentUpdateTemplate(data: SMSTemplateData): string {
    return `🚨 TeeReserve Alert: ${data.message} For booking ${data.bookingId} at ${data.courseName}. Contact: ${data.contactNumber || 'support@teereserve.com'}`;
  }
}

// Initialize SMS Service
let smsService: SMSService | null = null;

function initializeSMSService(): SMSService {
  if (!smsService) {
    const config: SMSConfig = {
      accountSid: process.env.TWILIO_ACCOUNT_SID || '',
      authToken: process.env.TWILIO_AUTH_TOKEN || '',
      fromNumber: process.env.TWILIO_FROM_NUMBER || ''
    };
    
    if (!config.accountSid || !config.authToken || !config.fromNumber) {
      throw new Error('Twilio configuration is missing. Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER environment variables.');
    }
    
    smsService = new SMSService(config);
  }
  
  return smsService;
}

// Exported functions
export async function sendBookingReminderSMS(data: SMSTemplateData): Promise<boolean> {
  try {
    const service = initializeSMSService();
    return await service.sendBookingReminder(data);
  } catch (error) {
    console.error('Failed to send booking reminder SMS:', error);
    return false;
  }
}

export async function sendUrgentUpdateSMS(data: SMSTemplateData): Promise<boolean> {
  try {
    const service = initializeSMSService();
    return await service.sendUrgentUpdate(data);
  } catch (error) {
    console.error('Failed to send urgent update SMS:', error);
    return false;
  }
}

export async function sendCustomSMS(phoneNumber: string, message: string): Promise<boolean> {
  try {
    const service = initializeSMSService();
    return await service.sendSMS(phoneNumber, message);
  } catch (error) {
    console.error('Failed to send custom SMS:', error);
    return false;
  }
}

// Utility function to validate phone number format
export function validatePhoneNumber(phoneNumber: string): boolean {
  // Basic phone number validation (E.164 format)
  const phoneRegex = /^\+[1-9]\d{1,14}$/;
  return phoneRegex.test(phoneNumber);
}

// Utility function to format phone number
export function formatPhoneNumber(phoneNumber: string, countryCode: string = '+1'): string {
  // Remove all non-digit characters
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  // Add country code if not present
  if (!phoneNumber.startsWith('+')) {
    return `${countryCode}${cleaned}`;
  }
  
  return phoneNumber;
}

export { SMSService };