'use server';
/**
 * @fileOverview A Genkit flow for sending a welcome email after user registration.
 *
 * - sendWelcomeEmail - A function that handles sending the welcome email with idempotency.
 * - Uses Resend as primary provider and Zoho as fallback.
 * - Implements email sending logs to prevent duplicates.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import { getWelcomeEmailTemplate } from '@/lib/email-templates';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';

// Inicializar Firebase Admin si no está inicializado
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const SendWelcomeEmailInputSchema = z.object({
  userName: z.string().describe('The name of the new user.'),
  userEmail: z.string().email().describe('The email address of the new user.'),
  userId: z.string().optional().describe('The user ID for idempotency tracking.'),
  locale: z.enum(['en', 'es']).default('en').describe('The locale for email content.'),
});

export type SendWelcomeEmailInput = z.infer<typeof SendWelcomeEmailInputSchema>;

const SendWelcomeEmailOutputSchema = z.object({
  success: z.boolean(),
  messageId: z.string().optional(),
  error: z.string().optional(),
  provider: z.string().optional(),
  skipped: z.boolean().optional(),
});

export type SendWelcomeEmailOutput = z.infer<typeof SendWelcomeEmailOutputSchema>;

// Función para verificar si ya se envió el email de bienvenida
async function checkEmailSent(userId: string): Promise<boolean> {
  try {
    const db = getFirestore();
    const emailDoc = await db.collection('email_logs').doc(`welcome_${userId}`).get();
    return emailDoc.exists && emailDoc.data()?.sent === true;
  } catch (error) {
    console.error('Error checking email log:', error);
    return false;
  }
}

// Función para marcar el email como enviado
async function markEmailSent(userId: string, messageId?: string, provider?: string): Promise<void> {
  try {
    const db = getFirestore();
    await db.collection('email_logs').doc(`welcome_${userId}`).set({
      sent: true,
      sentAt: new Date(),
      messageId,
      provider,
      type: 'welcome'
    });
  } catch (error) {
    console.error('Error marking email as sent:', error);
  }
}

// Función para registrar errores de envío
async function logEmailError(userId: string, error: string, provider: string): Promise<void> {
  try {
    const db = getFirestore();
    await db.collection('email_errors').add({
      userId,
      error,
      provider,
      type: 'welcome',
      timestamp: new Date(),
    });
  } catch (logError) {
    console.error('Error logging email error:', logError);
  }
}

// Función para enviar con Resend
async function sendWithResend(input: SendWelcomeEmailInput) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const exploreUrl = `${baseUrl}/${input.locale}/courses`;
  
  const emailTemplate = getWelcomeEmailTemplate({
    userName: input.userName,
    exploreUrl,
    supportEmail: 'support@teereserve.com'
  });

  const result = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || 'TeeReserve Golf <noreply@teereserve.com>',
    to: input.userEmail,
    subject: emailTemplate.subject,
    html: emailTemplate.html,
    text: emailTemplate.text,
  });

  if (result.error) {
    throw new Error(`Resend error: ${result.error.message}`);
  }

  return {
    success: true,
    messageId: result.data?.id,
    provider: 'resend'
  };
}

// Función para enviar con Zoho (fallback)
async function sendWithZoho(input: SendWelcomeEmailInput) {
  const transporter = nodemailer.createTransport({
    host: 'smtp.zoho.com',
    port: 465,
    secure: true,
    auth: {
      type: 'OAuth2',
      user: process.env.ZOHO_MAIL_FROM,
      clientId: process.env.ZOHO_MAIL_CLIENT_ID,
      clientSecret: process.env.ZOHO_MAIL_CLIENT_SECRET,
      refreshToken: process.env.ZOHO_MAIL_REFRESH_TOKEN,
    },
  });

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const exploreUrl = `${baseUrl}/${input.locale}/courses`;
  
  const emailTemplate = getWelcomeEmailTemplate({
    userName: input.userName,
    exploreUrl,
    supportEmail: 'support@teereserve.com'
  });

  const info = await transporter.sendMail({
    from: `"TeeReserve Golf" <${process.env.ZOHO_MAIL_FROM}>`,
    to: input.userEmail,
    subject: emailTemplate.subject,
    html: emailTemplate.html,
    text: emailTemplate.text,
  });

  return {
    success: true,
    messageId: info.messageId,
    provider: 'zoho'
  };
}

const sendWelcomeEmailFlow = ai.defineFlow(
  {
    name: 'sendWelcomeEmailFlow',
    inputSchema: SendWelcomeEmailInputSchema,
    outputSchema: SendWelcomeEmailOutputSchema,
  },
  async (input) => {
    try {
      // Verificar idempotencia - si ya se envió, no enviar de nuevo
      if (input.userId) {
        const alreadySent = await checkEmailSent(input.userId);
        if (alreadySent) {
          console.log(`Welcome email already sent for user ${input.userId}`);
          return {
            success: true,
            skipped: true,
          };
        }
      }

      let result;
      let lastError;

      // Intentar con Resend primero
      if (process.env.RESEND_API_KEY) {
        try {
          console.log('Attempting to send welcome email with Resend...');
          result = await sendWithResend(input);
          console.log('Welcome email sent successfully with Resend:', result.messageId);
        } catch (error) {
          console.error('Resend failed:', error);
          lastError = error;
          if (input.userId) {
            await logEmailError(input.userId, error instanceof Error ? error.message : 'Unknown error', 'resend');
          }
        }
      }

      // Si Resend falló, intentar con Zoho
      if (!result && process.env.ZOHO_MAIL_CLIENT_ID) {
        try {
          console.log('Attempting to send welcome email with Zoho...');
          result = await sendWithZoho(input);
          console.log('Welcome email sent successfully with Zoho:', result.messageId);
        } catch (error) {
          console.error('Zoho failed:', error);
          lastError = error;
          if (input.userId) {
            await logEmailError(input.userId, error instanceof Error ? error.message : 'Unknown error', 'zoho');
          }
        }
      }

      if (result) {
        // Marcar como enviado para idempotencia
        if (input.userId) {
          await markEmailSent(input.userId, result.messageId, result.provider);
        }
        
        return {
          success: true,
          messageId: result.messageId,
          provider: result.provider,
        };
      } else {
        // Ambos proveedores fallaron
        const errorMessage = lastError instanceof Error ? lastError.message : 'All email providers failed';
        console.error('All email providers failed:', errorMessage);
        
        return {
          success: false,
          error: errorMessage,
        };
      }
    } catch (error) {
      console.error('Error in sendWelcomeEmail flow:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
);

export async function sendWelcomeEmail(input: SendWelcomeEmailInput): Promise<SendWelcomeEmailOutput> {
  return sendWelcomeEmailFlow(input);
}