import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: NextRequest) {
    try {
        const { recipientEmail, bookingDetails } = await request.json();

        if (!recipientEmail || !bookingDetails) {
            return NextResponse.json(
                { error: 'Faltan datos requeridos' },
                { status: 400 }
            );
        }

        // Validar formato de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(recipientEmail)) {
            return NextResponse.json(
                { error: 'Formato de correo electrónico inválido' },
                { status: 400 }
            );
        }

        // Configurar transporter de Zoho Mail
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

        const {
            confirmationNumber,
            courseName,
            courseLocation,
            date,
            time,
            players,
            holes,
            totalPrice,
            userName,
            pricing_snapshot
        } = bookingDetails;

        const subject = `Comprobante de Reserva - ${courseName}`;
        const htmlContent = `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
                <div style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: white; text-align: center; padding: 30px;">
                    <h1 style="margin: 0; font-size: 28px; font-weight: bold;">🏌️ Comprobante de Reserva</h1>
                    <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">TeeReserve Golf</p>
                </div>
                
                <div style="padding: 30px;">
                    <p style="font-size: 16px; margin-bottom: 20px;">Hola,</p>
                    
                    <p style="font-size: 16px; margin-bottom: 25px;">Aquí tienes los detalles de la reserva confirmada:</p>
                    
                    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                        <h2 style="color: #10B981; margin-top: 0; margin-bottom: 15px; font-size: 20px;">Detalles de la Reserva</h2>
                        
                        <table style="width: 100%; border-collapse: collapse;">
                            ${confirmationNumber ? `
                            <tr>
                                <td style="padding: 8px 0; font-weight: bold; color: #555;">Número de Confirmación:</td>
                                <td style="padding: 8px 0; font-family: monospace; font-weight: bold; color: #10B981;">${confirmationNumber}</td>
                            </tr>` : ''}
                            <tr>
                                <td style="padding: 8px 0; font-weight: bold; color: #555;">Cliente:</td>
                                <td style="padding: 8px 0;">${userName}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; font-weight: bold; color: #555;">Campo:</td>
                                <td style="padding: 8px 0;">${courseName}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; font-weight: bold; color: #555;">Ubicación:</td>
                                <td style="padding: 8px 0;">${courseLocation}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; font-weight: bold; color: #555;">Fecha:</td>
                                <td style="padding: 8px 0;">${date}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; font-weight: bold; color: #555;">Hora:</td>
                                <td style="padding: 8px 0;">${time}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; font-weight: bold; color: #555;">Jugadores:</td>
                                <td style="padding: 8px 0;">${players}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; font-weight: bold; color: #555;">Hoyos:</td>
                                <td style="padding: 8px 0;">${holes}</td>
                            </tr>
                        </table>
                        
                        ${pricing_snapshot ? `
                        <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #ddd;">
                            <h3 style="color: #10B981; margin-bottom: 10px; font-size: 16px;">💰 Desglose de Precios</h3>
                            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                                <tr>
                                    <td style="padding: 4px 0; color: #555;">Subtotal:</td>
                                    <td style="padding: 4px 0; text-align: right;">$${(pricing_snapshot.subtotal_cents / 100).toFixed(2)}</td>
                                </tr>
                                ${pricing_snapshot.discount_cents > 0 ? `
                                <tr>
                                    <td style="padding: 4px 0; color: #dc3545;">Descuento${pricing_snapshot.promo_code ? ` (${pricing_snapshot.promo_code})` : ''}:</td>
                                    <td style="padding: 4px 0; text-align: right; color: #dc3545;">-$${(pricing_snapshot.discount_cents / 100).toFixed(2)}</td>
                                </tr>` : ''}
                                <tr>
                                    <td style="padding: 4px 0; color: #555;">IVA (${(pricing_snapshot.tax_rate * 100).toFixed(0)}%):</td>
                                    <td style="padding: 4px 0; text-align: right;">$${(pricing_snapshot.tax_cents / 100).toFixed(2)}</td>
                                </tr>
                                <tr style="border-top: 2px solid #10B981; font-weight: bold; font-size: 16px;">
                                    <td style="padding: 8px 0; color: #10B981;">Total Pagado:</td>
                                    <td style="padding: 8px 0; text-align: right; color: #10B981;">$${(pricing_snapshot.total_cents / 100).toFixed(2)}</td>
                                </tr>
                            </table>
                        </div>
                        ` : `
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr style="border-top: 2px solid #10B981;">
                                <td style="padding: 12px 0 8px 0; font-weight: bold; color: #10B981; font-size: 18px;">Total Pagado:</td>
                                <td style="padding: 12px 0 8px 0; font-weight: bold; color: #10B981; font-size: 18px;">$${totalPrice ? parseFloat(totalPrice).toFixed(2) : '0.00'}</td>
                            </tr>
                        `}
                        </table>
                    </div>
                    
                    <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 15px; margin-bottom: 25px;">
                        <h3 style="color: #856404; margin-top: 0; margin-bottom: 10px;">📋 Información Importante</h3>
                        <ul style="margin: 0; padding-left: 20px; color: #856404;">
                            <li>Llega al campo 30 minutos antes de tu hora de salida</li>
                            <li>Presenta este comprobante o tu identificación en recepción</li>
                            <li>Para cambios o cancelaciones, contacta directamente con el campo</li>
                        </ul>
                    </div>
                    
                    <p style="font-size: 16px; margin-bottom: 0;">¡Esperamos verte en el campo!</p>
                    <p style="font-size: 16px; margin-top: 5px; font-weight: bold; color: #10B981;">El equipo de TeeReserve</p>
                </div>
                
                <div style="background-color: #f1f1f1; text-align: center; padding: 15px; font-size: 12px; color: #666;">
                    <p style="margin: 0;">Este comprobante fue enviado desde TeeReserve Golf</p>
                    <p style="margin: 5px 0 0 0;">© 2024 TeeReserve. Todos los derechos reservados.</p>
                </div>
            </div>
        `;

        const mailOptions = {
            from: `"TeeReserve Golf" <${process.env.ZOHO_MAIL_FROM}>`,
            to: recipientEmail,
            subject: subject,
            html: htmlContent,
        };

        await transporter.sendMail(mailOptions);

        return NextResponse.json(
            { message: 'Comprobante enviado exitosamente' },
            { status: 200 }
        );

    } catch (error) {
        console.error('Error enviando comprobante:', error);
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        );
    }
}