'use server';
/**
 * @fileOverview A Genkit flow for sending a booking confirmation email.
 *
 * - sendBookingConfirmationEmail - A function that handles sending the email.
 * - SendBookingConfirmationEmailInput - The input type for the sendBookingConfirmationEmail function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import nodemailer from 'nodemailer';
import { format } from 'date-fns';
import { es, enUS } from 'date-fns/locale';

const SendBookingConfirmationEmailInputSchema = z.object({
  bookingId: z.string().describe('The unique ID of the booking.'),
  userName: z.string().describe('The name of the user who made the booking.'),
  userEmail: z.string().email().describe('The email address of the user.'),
  courseName: z.string().describe('The name of the golf course.'),
  date: z.string().describe('The date of the booking (YYYY-MM-DD).'),
  time: z.string().describe('The time of the booking (HH:mm).'),
  players: z.number().describe('The number of players for the booking.'),
  totalPrice: z.number().describe('The total price of the booking.'),
  subtotal: z.number().optional().describe('The subtotal before discounts and taxes.'),
  discount: z.number().optional().describe('The discount amount applied.'),
  discountCode: z.string().optional().describe('The discount code used.'),
  taxes: z.number().optional().describe('The tax amount.'),
  taxRate: z.number().optional().describe('The tax rate percentage.'),
  locale: z.enum(['en', 'es']).default('en').describe('The locale for email content.'),
});

export type SendBookingConfirmationEmailInput = z.infer<typeof SendBookingConfirmationEmailInputSchema>;

const SendBookingConfirmationEmailOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

export type SendBookingConfirmationEmailOutput = z.infer<typeof SendBookingConfirmationEmailOutputSchema>;

const sendBookingConfirmationEmailFlow = ai.defineFlow(
  {
    name: 'sendBookingConfirmationEmailFlow',
    inputSchema: SendBookingConfirmationEmailInputSchema,
    outputSchema: SendBookingConfirmationEmailOutputSchema,
  },
  async (input) => {
    const {
      bookingId,
      userName,
      userEmail,
      courseName,
      date,
      time,
      players,
      totalPrice,
      subtotal,
      discount,
      discountCode,
      taxes,
      taxRate,
      locale,
    } = input;

    const dateLocale = locale === 'es' ? es : enUS;
    const formattedDate = format(new Date(date), "PPP", { locale: dateLocale });
    
    // Función para formatear moneda correctamente
    const formatCurrency = (amount: number): string => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount);
    };
    
    const content = locale === 'es' ? {
        subject: `Tu reserva en ${courseName} está confirmada`,
        title: '¡Reserva Confirmada!',
        greeting: `Hola ${userName},`,
        body: `Tu tee time en <strong>${courseName}</strong> está confirmado. ¡Prepárate para una ronda increíble!`,
        detailsTitle: 'Detalles de la Reserva',
        bookingIdLabel: 'ID de Reserva:',
        dateLabel: 'Fecha:',
        timeLabel: 'Hora:',
        playersLabel: 'Jugadores:',
        priceBreakdownTitle: 'Desglose de Precios',
        subtotalLabel: 'Subtotal:',
        discountLabel: 'Descuento',
        taxesLabel: 'Impuestos',
        totalLabel: 'Total Final:',
        importantInfoTitle: 'Información Importante',
        arrival: 'Por favor, llega al campo 30 minutos antes de tu hora de salida.',
        cancellation: 'Para cambios o cancelaciones, contacta directamente con el campo. Aplican políticas de cancelación.',
        footer: 'Gracias por reservar con TeeReserve Golf.'
    } : {
        subject: `Your Booking at ${courseName} is Confirmed`,
        title: 'Booking Confirmed!',
        greeting: `Hi ${userName},`,
        body: `Your tee time at <strong>${courseName}</strong> is confirmed. Get ready for an incredible round!`,
        detailsTitle: 'Booking Details',
        bookingIdLabel: 'Booking ID:',
        dateLabel: 'Date:',
        timeLabel: 'Time:',
        playersLabel: 'Players:',
        priceBreakdownTitle: 'Price Breakdown',
        subtotalLabel: 'Subtotal:',
        discountLabel: 'Discount',
        taxesLabel: 'Taxes',
        totalLabel: 'Total Final:',
        importantInfoTitle: 'Important Information',
        arrival: 'Please arrive at the course 30 minutes before your tee time.',
        cancellation: 'For changes or cancellations, please contact the course directly. Cancellation policies apply.',
        footer: 'Thank you for booking with TeeReserve Golf.'
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
            <div style="background-color: #042f21; color: white; padding: 20px; text-align: center;">
                <h1 style="margin: 0; font-size: 24px;">${content.title}</h1>
            </div>
            <div style="padding: 30px;">
                <p>${content.greeting}</p>
                <p>${content.body}</p>
                <div style="background-color: #f9f9f9; padding: 20px; border-radius: 5px; margin: 20px 0;">
                    <h2 style="border-bottom: 2px solid #eee; padding-bottom: 10px; margin-top: 0; font-size: 20px;">${content.detailsTitle}</h2>
                    <p><strong>${content.bookingIdLabel}</strong> ${bookingId}</p>
                    <p><strong>${content.dateLabel}</strong> ${formattedDate}</p>
                    <p><strong>${content.timeLabel}</strong> ${time}</p>
                    <p><strong>${content.playersLabel}</strong> ${players}</p>
                    
                    ${subtotal ? `
                    <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #ddd;">
                        <h3 style="margin-top: 0; font-size: 18px; color: #333;">${content.priceBreakdownTitle}</h3>
                        <p><strong>${content.subtotalLabel}</strong> ${formatCurrency(subtotal)}</p>
                        ${discount ? `<p><strong>${content.discountLabel} ${discountCode ? '(' + discountCode + ')' : ''}:</strong> <span style="color: #059669;">-${formatCurrency(discount)}</span></p>` : ''}
                        ${taxes ? `<p><strong>${content.taxesLabel} ${taxRate ? '(' + taxRate + '%)' : ''}:</strong> ${formatCurrency(taxes)}</p>` : ''}
                        <p style="font-size: 1.2em; margin-top: 10px;"><strong>${content.totalLabel}</strong> <span style="color: #059669; font-weight: bold;">${formatCurrency(totalPrice)}</span></p>
                    </div>
                    ` : `<p style="font-size: 1.2em;"><strong>${content.totalLabel}</strong> <span style="color: #059669; font-weight: bold;">${formatCurrency(totalPrice)}</span></p>`}
                </div>
                <div style="border-top: 1px solid #eee; padding-top: 20px;">
                    <h3 style="font-size: 18px;">${content.importantInfoTitle}</h3>
                    <ul style="padding-left: 20px;">
                        <li>${content.arrival}</li>
                        <li>${content.cancellation}</li>
                    </ul>
                </div>
            </div>
            <div style="background-color: #f1f1f1; text-align: center; padding: 15px; font-size: 12px; color: #666;">
                <p>${content.footer}</p>
            </div>
        </div>
      `,
    };

    try {
      await transporter.sendMail(mailOptions);
      return { success: true, message: 'Confirmation email sent successfully.' };
    } catch (error) {
      console.error('Failed to send confirmation email:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown mailing error.';
      // We don't throw an error here because the booking itself was successful.
      // We just log it and return a failure status. The user has seen the success page.
      return { success: false, message: `Failed to send email: ${errorMessage}` };
    }
  }
);

export async function sendBookingConfirmationEmail(input: SendBookingConfirmationEmailInput): Promise<SendBookingConfirmationEmailOutput> {
  return sendBookingConfirmationEmailFlow(input);
}
