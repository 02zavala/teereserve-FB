
'use server';
/**
 * @fileOverview A Genkit flow for sending a contact form email using Nodemailer with Zoho Mail.
 *
 * - sendContactEmail - A function that handles sending the email.
 * - SendContactEmailInput - The input type for the sendContactEmail function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import nodemailer from 'nodemailer';
import xoauth2 from 'xoauth2';

const SendContactEmailInputSchema = z.object({
  name: z.string().describe('The name of the person sending the message.'),
  email: z.string().email().describe('The email address of the sender.'),
  message: z.string().describe('The content of the message.'),
});
export type SendContactEmailInput = z.infer<typeof SendContactEmailInputSchema>;

// This flow doesn't need to return anything complex, just a success message.
const SendContactEmailOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});
export type SendContactEmailOutput = z.infer<typeof SendContactEmailOutputSchema>;


const sendContactEmailFlow = ai.defineFlow(
  {
    name: 'sendContactEmailFlow',
    inputSchema: SendContactEmailInputSchema,
    outputSchema: SendContactEmailOutputSchema,
  },
  async (input) => {
    const { name, email, message } = input;

    // IMPORTANT: You must configure Zoho Mail environment variables in your .env file
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
      from: `"${name}" <${process.env.ZOHO_MAIL_FROM}>`,
      to: process.env.CONTACT_FORM_RECIPIENT,
      replyTo: email,
      subject: `New Contact Form Message from ${name}`,
      text: message,
      html: `
        <h1>New Message from TeeReserve Contact Form</h1>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <hr />
        <p><strong>Message:</strong></p>
        <p>${message.replace(/\n/g, '<br>')}</p>
      `,
    };

    try {
      await transporter.sendMail(mailOptions);
      return { success: true, message: 'Email sent successfully.' };
    } catch (error) {
      console.error('Failed to send email:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown mailing error.';
      throw new Error(`Failed to send email: ${errorMessage}`);
    }
  }
);

export async function sendContactEmail(input: SendContactEmailInput): Promise<SendContactEmailOutput> {
  return sendContactEmailFlow(input);
}
