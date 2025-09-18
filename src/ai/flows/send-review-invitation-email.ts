'use server';
/**
 * @fileOverview A Genkit flow for sending a review invitation email after a completed booking.
 *
 * - sendReviewInvitationEmail - A function that handles sending the review invitation email.
 * - SendReviewInvitationEmailInput - The input type for the sendReviewInvitationEmail function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import nodemailer from 'nodemailer';
import { format } from 'date-fns';
import { es, enUS } from 'date-fns/locale';

const SendReviewInvitationEmailInputSchema = z.object({
  bookingId: z.string().describe('The unique ID of the booking.'),
  userName: z.string().describe('The name of the user who made the booking.'),
  userEmail: z.string().email().describe('The email address of the user.'),
  courseName: z.string().describe('The name of the golf course.'),
  courseId: z.string().describe('The ID of the golf course.'),
  date: z.string().describe('The date of the booking (YYYY-MM-DD).'),
  locale: z.enum(['en', 'es']).default('en').describe('The locale for email content.'),
});

export type SendReviewInvitationEmailInput = z.infer<typeof SendReviewInvitationEmailInputSchema>;

const SendReviewInvitationEmailOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

const sendReviewInvitationEmailFlow = ai.defineFlow(
  {
    name: 'sendReviewInvitationEmailFlow',
    inputSchema: SendReviewInvitationEmailInputSchema,
    outputSchema: SendReviewInvitationEmailOutputSchema,
  },
  async (input) => {
    const {
      bookingId,
      userName,
      userEmail,
      courseName,
      courseId,
      date,
      locale,
    } = input;

    const dateLocale = locale === 'es' ? es : enUS;
    const formattedDate = format(new Date(date), "PPP", { locale: dateLocale });
    
    // Create review URL with pre-filled course information
    const reviewUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/${locale}/courses/${courseId}?review=true&booking=${bookingId}`;
    
    const content = locale === 'es' ? {
        subject: `¿Cómo estuvo tu experiencia en ${courseName}?`,
        title: '¡Comparte tu experiencia!',
        greeting: `Hola ${userName},`,
        body: `Esperamos que hayas disfrutado tu ronda en <strong>${courseName}</strong> el ${formattedDate}. Tu opinión es muy valiosa para nosotros y otros golfistas.`,
        reviewInvite: '¿Te gustaría compartir tu experiencia?',
        reviewDescription: 'Tu reseña ayuda a otros golfistas a descubrir grandes campos y nos ayuda a mejorar nuestro servicio.',
        benefits: {
            title: 'Al escribir una reseña obtienes:',
            items: [
                '🏌️ Badges exclusivos en tu perfil',
                '⭐ Puntos para el ranking mensual',
                '🎁 Posibilidad de ganar descuentos especiales',
                '👑 Reconocimiento como Top Reviewer'
            ]
        },
        ctaButton: 'Escribir Reseña',
        alternativeText: 'Si no puedes hacer clic en el botón, copia y pega este enlace en tu navegador:',
        footer: 'Gracias por ser parte de la comunidad TeeReserve Golf.',
        unsubscribe: 'Si no deseas recibir más invitaciones de reseñas, puedes darte de baja aquí.'
    } : {
        subject: `How was your experience at ${courseName}?`,
        title: 'Share Your Experience!',
        greeting: `Hi ${userName},`,
        body: `We hope you enjoyed your round at <strong>${courseName}</strong> on ${formattedDate}. Your feedback is valuable to us and fellow golfers.`,
        reviewInvite: 'Would you like to share your experience?',
        reviewDescription: 'Your review helps other golfers discover great courses and helps us improve our service.',
        benefits: {
            title: 'By writing a review you get:',
            items: [
                '🏌️ Exclusive badges on your profile',
                '⭐ Points for monthly ranking',
                '🎁 Chance to win special discounts',
                '👑 Recognition as Top Reviewer'
            ]
        },
        ctaButton: 'Write Review',
        alternativeText: 'If you can\'t click the button, copy and paste this link in your browser:',
        footer: 'Thank you for being part of the TeeReserve Golf community.',
        unsubscribe: 'If you don\'t want to receive more review invitations, you can unsubscribe here.'
    };
    
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

    const mailOptions = {
      from: `"TeeReserve Golf" <${process.env.ZOHO_MAIL_FROM}>`,
      to: userEmail,
      subject: content.subject,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); color: white; padding: 30px 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 28px; font-weight: bold;">${content.title}</h1>
          </div>
          
          <!-- Content -->
          <div style="padding: 30px 20px;">
            <p style="font-size: 16px; margin-bottom: 20px;">${content.greeting}</p>
            
            <p style="font-size: 16px; margin-bottom: 25px;">${content.body}</p>
            
            <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
              <h3 style="color: #16a34a; margin-top: 0; margin-bottom: 15px;">${content.reviewInvite}</h3>
              <p style="margin-bottom: 15px;">${content.reviewDescription}</p>
              
              <div style="margin-bottom: 20px;">
                <h4 style="color: #374151; margin-bottom: 10px;">${content.benefits.title}</h4>
                <ul style="margin: 0; padding-left: 20px;">
                  ${content.benefits.items.map(item => `<li style="margin-bottom: 5px;">${item}</li>`).join('')}
                </ul>
              </div>
            </div>
            
            <!-- CTA Button -->
            <div style="text-align: center; margin: 30px 0;">
              <a href="${reviewUrl}" style="display: inline-block; background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                ${content.ctaButton}
              </a>
            </div>
            
            <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
              ${content.alternativeText}<br>
              <a href="${reviewUrl}" style="color: #16a34a; word-break: break-all;">${reviewUrl}</a>
            </p>
          </div>
          
          <!-- Footer -->
          <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0; font-size: 14px; color: #6b7280;">${content.footer}</p>
            <p style="margin: 10px 0 0 0; font-size: 12px; color: #9ca3af;">
              ${content.unsubscribe}
            </p>
          </div>
        </div>
      `,
    };

    try {
      await transporter.sendMail(mailOptions);
      return {
        success: true,
        message: 'Review invitation email sent successfully',
      };
    } catch (error) {
      console.error('Error sending review invitation email:', error);
      return {
        success: false,
        message: `Failed to send review invitation email: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
);

export const sendReviewInvitationEmail = sendReviewInvitationEmailFlow;