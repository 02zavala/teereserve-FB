'use server';

import { Resend } from 'resend';
import { logger } from './logger';
import { fallbackService, withFallback } from './fallback-service';
import { getEmailVerificationTemplate } from './email-templates';

const resend = new Resend(process.env.RESEND_API_KEY);

// Estado del servicio de email
let emailServiceStatus = {
  resendAvailable: true,
  lastError: null,
  errorCount: 0,
  lastSuccessfulSend: null
};

/**
 * Función helper para manejar errores de email
 */
const handleEmailError = (operation, error, emailData) => {
  const errorMessage = error instanceof Error ? error.message : 'Unknown email error';
  emailServiceStatus.lastError = errorMessage;
  emailServiceStatus.errorCount++;
  
  // Detectar tipo de error
  let errorType = 'unknown';
  if (errorMessage.includes('network') || errorMessage.includes('timeout') || errorMessage.includes('ENOTFOUND')) {
    errorType = 'network';
    emailServiceStatus.resendAvailable = false;
  } else if (errorMessage.includes('unauthorized') || errorMessage.includes('API key')) {
    errorType = 'authentication';
  } else if (errorMessage.includes('rate limit') || errorMessage.includes('quota')) {
    errorType = 'rate_limit';
  }
  
  logger.error(`Email service failed for operation: ${operation}`, error, 'email', {
    errorType,
    emailTo: emailData?.to,
    subject: emailData?.subject,
    networkStatus: typeof navigator !== 'undefined' ? (navigator.onLine ? 'online' : 'offline') : 'unknown',
    fallbackAvailable: true,
    resendStatus: emailServiceStatus.resendAvailable ? 'available' : 'unavailable'
  });
  
  // Fallback: log email content for manual processing
  console.warn(`📧 Email fallback - Operation: ${operation}`, {
    to: emailData?.to,
    subject: emailData?.subject,
    timestamp: new Date().toISOString(),
    error: errorMessage
  });
  
  return {
    success: false,
    error: errorMessage,
    errorType,
    fallbackLogged: true
  };
};

/**
 * Función helper para marcar envío exitoso
 */
const markEmailSuccess = (operation, data) => {
  emailServiceStatus.lastSuccessfulSend = new Date().toISOString();
  emailServiceStatus.resendAvailable = true;
  emailServiceStatus.errorCount = Math.max(0, emailServiceStatus.errorCount - 1);
  
  logger.info(`Email sent successfully: ${operation}`, 'email', {
    messageId: data?.id,
    timestamp: emailServiceStatus.lastSuccessfulSend
  });
};

/**
 * Funciones de email usando Resend con fallbacks
 */
export async function sendWelcomeEmail(userEmail, userName) {
    const emailData = {
      from: process.env.EMAIL_FROM || 'noreply@teereserve.golf',
      to: [userEmail],
      subject: '¡Bienvenido a TeeReserve! 🏌️‍♂️'
    };
    
    try {
      const { data, error } = await resend.emails.send({
        ...emailData,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Bienvenido a TeeReserve</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .welcome-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981; }
              .feature-list { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
              .feature-item { margin: 10px 0; padding: 8px 0; }
              .cta-button { background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 15px 0; font-weight: bold; }
              .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
              .logo { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
              .logo-img { max-width: 150px; height: auto; margin-bottom: 15px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <img src="https://teereserve.golf/logo.png" alt="TeeReserve Golf" class="logo-img" />
                <div class="logo">🏌️ TeeReserve Golf</div>
                <h1>¡Bienvenido a TeeReserve!</h1>
                <p>Estimado/a ${userName}, tu cuenta ha sido creada exitosamente</p>
              </div>
              
              <div class="content">
                <div class="welcome-details">
                  <h2 style="color: #10b981; margin-top: 0;">🎉 ¡Gracias por unirte!</h2>
                  <p style="margin: 0; color: #333; line-height: 1.6;">
                    ¡Gracias por registrarte en TeeReserve! Estamos emocionados de tenerte como parte de nuestra comunidad golfística.
                  </p>
                </div>
                
                <div class="feature-list">
                  <h3 style="color: #10b981; margin-top: 0;">🚀 ¿Qué puedes hacer con TeeReserve?</h3>
                  
                  <div class="feature-item">
                    <strong>🏌️ Reservar Tee Times:</strong> Acceso a los mejores campos de golf
                  </div>
                  
                  <div class="feature-item">
                    <strong>📅 Gestionar Reservas:</strong> Administra todas tus reservas fácilmente
                  </div>
                  
                  <div class="feature-item">
                    <strong>⭐ Descubrir Campos:</strong> Explora nuevos campos y experiencias
                  </div>
                  
                  <div class="feature-item">
                    <strong>💳 Pagos Seguros:</strong> Confirmación instantánea y pagos protegidos
                  </div>
                </div>
                
                <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="color: #10b981; margin-top: 0;">🎯 Próximos Pasos</h3>
                  <ul style="margin: 0; padding-left: 20px;">
                    <li>Explora nuestros campos de golf disponibles</li>
                    <li>Completa tu perfil para una mejor experiencia</li>
                    <li>Realiza tu primera reserva</li>
                    <li>Únete a nuestra comunidad de golfistas</li>
                  </ul>
                </div>
                
                <div style="text-align: center; margin: 20px 0;">
                  <a href="https://teereserve.golf/dashboard" class="cta-button">
                    🎯 Explorar Campos de Golf
                  </a>
                </div>
                
                <div class="footer">
                  <p>¡Esperamos verte pronto en el campo!</p>
                  <p><strong>Equipo TeeReserve Golf</strong></p>
                  <p style="font-size: 12px; color: #999;">Este es un email automático, por favor no responda a este mensaje.</p>
                </div>
              </div>
            </div>
          </body>
          </html>
        `,
      });

      if (error) {
        return handleEmailError('sendWelcomeEmail', error, emailData);
      }

      markEmailSuccess('sendWelcomeEmail', data);
      return { success: true, data };
    } catch (error) {
      return handleEmailError('sendWelcomeEmail', error, emailData);
    }
  }

export async function sendBookingConfirmation(userEmail, bookingDetails) {
    const emailData = {
      from: process.env.EMAIL_FROM || 'noreply@teereserve.golf',
      to: [userEmail],
      subject: `Confirmación de Reserva - ${bookingDetails.courseName}`
    };
    
    try {
      const { data, error } = await resend.emails.send({
        ...emailData,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <title>Confirmación de Reserva</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #2d5016, #4a7c59); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .booking-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4a7c59; }
              .detail-row { display: flex; justify-content: space-between; margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #eee; }
              .label { font-weight: bold; color: #2d5016; }
              .value { color: #333; }
              .total { background: #2d5016; color: white; padding: 15px; border-radius: 8px; text-align: center; font-size: 18px; font-weight: bold; }
              .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
              .logo { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
              .logo-img { max-width: 150px; height: auto; margin-bottom: 15px; }
              .manage-button { background: #4a7c59; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 15px 0; font-weight: bold; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <img src="https://teereserve.golf/logo.png" alt="TeeReserve Golf" class="logo-img" />
                <div class="logo">🏌️ TeeReserve Golf</div>
                <h1>¡Reserva Confirmada!</h1>
                <p>Estimado/a ${bookingDetails.playerName || 'Cliente'}, su reserva ha sido confirmada exitosamente</p>
              </div>
              
              <div class="content">
                <div class="booking-details">
                  <h2 style="color: #2d5016; margin-top: 0;">📋 Detalles de la Reserva</h2>
                  
                  <div class="detail-row">
                    <span class="label">🆔 Número de Confirmación:</span>
                    <span class="value">${bookingDetails.confirmationNumber || 'TRG-' + Date.now()}</span>
                  </div>
                  
                  <div class="detail-row">
                    <span class="label">🏌️ Campo de Golf:</span>
                    <span class="value">${bookingDetails.courseName}</span>
                  </div>
                  
                  <div class="detail-row">
                    <span class="label">📅 Fecha:</span>
                    <span class="value">${bookingDetails.date}</span>
                  </div>
                  
                  <div class="detail-row">
                    <span class="label">🕐 Hora:</span>
                    <span class="value">${bookingDetails.time}</span>
                  </div>
                  
                  <div class="detail-row">
                    <span class="label">👥 Número de Jugadores:</span>
                    <span class="value">${bookingDetails.players}</span>
                  </div>
                  
                  ${bookingDetails.specialRequests ? `
                  <div class="detail-row">
                    <span class="label">📝 Indicaciones Especiales:</span>
                    <span class="value">${bookingDetails.specialRequests}</span>
                  </div>
                  ` : ''}
                  
                  <!-- Payment Summary Section -->
                  <h3 style="color: #2d5016; margin: 20px 0 10px 0; border-bottom: 2px solid #4a7c59; padding-bottom: 5px;">💳 Resumen de Pago</h3>
                  
                  ${(() => {
                    // Enhanced pricing calculation logic matching the success page
                    let priceBreakdown;
                    
                    if (bookingDetails.pricing_snapshot) {
                      priceBreakdown = {
                        subtotal_cents: bookingDetails.pricing_snapshot.subtotal_cents,
                        tax_cents: bookingDetails.pricing_snapshot.tax_cents,
                        discount_cents: bookingDetails.pricing_snapshot.discount_cents,
                        total_cents: bookingDetails.pricing_snapshot.total_cents,
                        currency: bookingDetails.pricing_snapshot.currency || 'USD',
                        tax_rate: bookingDetails.pricing_snapshot.tax_rate || 0.16,
                        discount_code: bookingDetails.pricing_snapshot.promoCode
                      };
                    } else {
                      // Fallback calculation matching success page logic
                      const totalPrice = bookingDetails.total_price || bookingDetails.totalPrice || 0;
                      const totalCents = Math.round(totalPrice * 100);
                      const taxRate = 0.16;
                      const couponCode = bookingDetails.couponCode || bookingDetails.discountCode;
                      
                      // Calculate discount if coupon is present (assuming 10% discount)
                      const discount_cents = couponCode ? Math.round(totalCents * 0.10) : 0;
                      
                      // Calculate subtotal and tax
                      const subtotalWithDiscount = totalCents + discount_cents;
                      const subtotal_cents = Math.round(subtotalWithDiscount / (1 + taxRate));
                      const tax_cents = Math.round(subtotal_cents * taxRate);
                      
                      priceBreakdown = {
                        subtotal_cents,
                        tax_cents,
                        discount_cents,
                        total_cents: totalCents,
                        currency: 'MXN',
                        tax_rate: taxRate,
                        discount_code: couponCode
                      };
                    }
                    
                    const formatter = new Intl.NumberFormat('es-MX', { 
                      style: 'currency', 
                      currency: priceBreakdown.currency, 
                      minimumFractionDigits: 2, 
                      maximumFractionDigits: 2 
                    });
                    
                    return `
                      <div class="detail-row">
                        <span class="label">Subtotal:</span>
                        <span class="value">${formatter.format(priceBreakdown.subtotal_cents / 100)}</span>
                      </div>
                      
                      <div class="detail-row">
                        <span class="label">Impuestos (${(priceBreakdown.tax_rate * 100).toFixed(0)}%):</span>
                        <span class="value">${formatter.format(priceBreakdown.tax_cents / 100)}</span>
                      </div>
                      
                      ${priceBreakdown.discount_cents > 0 ? `
                      <div class="detail-row">
                        <span class="label">Descuento${priceBreakdown.discount_code ? ' (' + priceBreakdown.discount_code + ')' : ''}:</span>
                        <span class="value" style="color: #059669;">-${formatter.format(priceBreakdown.discount_cents / 100)}</span>
                      </div>
                      ` : ''}
                      
                      <div class="total">
                        💰 Total: ${formatter.format(priceBreakdown.total_cents / 100)}
                      </div>
                    `;
                  })()}
                  
                </div>
                
                <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="color: #2d5016; margin-top: 0;">📋 Información Importante</h3>
                  <ul style="margin: 0; padding-left: 20px;">
                    <li>Por favor, llegue <strong>30 minutos antes</strong> de su hora reservada</li>
                    <li>Traiga una identificación válida</li>
                    <li>Revise las políticas de cancelación en nuestro sitio web</li>
                    <li>Para cambios o cancelaciones, contacte al campo directamente</li>
                  </ul>
                </div>
                
                <div style="text-align: center; margin: 20px 0;">
                  <a href="https://teereserve.golf/manage-booking?id=${bookingDetails.confirmationNumber || 'booking'}" class="manage-button">
                    🎯 Gestionar mi Reserva
                  </a>
                </div>
                
                <div class="footer">
                  <p>¡Esperamos verle en el campo!</p>
                  <p><strong>Equipo TeeReserve Golf</strong></p>
                  <p style="font-size: 12px; color: #999;">Este es un email automático, por favor no responda a este mensaje.</p>
                </div>
              </div>
            </div>
          </body>
          </html>
        `,
      });

      if (error) {
        return handleEmailError('sendBookingConfirmation', error, emailData);
      }

      markEmailSuccess('sendBookingConfirmation', data);
      return { success: true, data };
    } catch (error) {
      return handleEmailError('sendBookingConfirmation', error, emailData);
    }
  }

export async function sendContactFormNotification(formData) {
    const emailData = {
      from: 'TeeReserve <noreply@teereserve.golf>',
      to: ['info@teereserve.golf'],
      subject: `Nuevo mensaje de contacto de ${formData.name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Nuevo Mensaje de Contacto</h2>
          
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #1e40af;">Información del Contacto</h3>
            <p><strong>Nombre:</strong> ${formData.name}</p>
            <p><strong>Email:</strong> ${formData.email}</p>
            <p><strong>Teléfono:</strong> ${formData.phone || 'No proporcionado'}</p>
            <p><strong>Asunto:</strong> ${formData.subject}</p>
          </div>
          
          <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #1e40af;">Mensaje</h3>
            <p style="white-space: pre-wrap;">${formData.message}</p>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">
            <p>Este mensaje fue enviado desde el formulario de contacto de TeeReserve.</p>
            <p>Fecha: ${new Date().toLocaleString('es-ES')}</p>
          </div>
        </div>
      `
    };

    return await withFallback(
      'email',
      async () => {
        const { data, error } = await resend.emails.send({
          ...emailData
        });

        if (error) {
          throw new Error(`Resend API error: ${error.message || error}`);
        }

        return markEmailSuccess('sendContactFormNotification', data, formData);
      },
      async () => {
        // Fallback: Log the contact form data for manual processing
        logger.warn('Email service unavailable, logging contact form for manual processing', {
          formData,
          timestamp: new Date().toISOString(),
          type: 'contact_form_fallback'
        });

        // Could also save to database for admin review
        return {
          success: true,
          message: 'Mensaje recibido. Te contactaremos pronto.',
          fallback: true
        };
      }
    );
  }

export async function sendPasswordResetEmail(userEmail, resetToken) {
    const resetUrl = `https://teereserve.golf/reset-password?token=${resetToken}`;
    const emailData = {
      from: process.env.EMAIL_FROM || 'noreply@teereserve.golf',
      to: [userEmail],
      subject: 'Restablecer contraseña - TeeReserve 🔐'
    };
    
    try {
      const { data, error } = await resend.emails.send({
        ...emailData,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Restablecer Contraseña - TeeReserve</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #dc2626, #b91c1c); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .security-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626; }
              .instructions { background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #fecaca; }
              .cta-button { background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 15px 0; font-weight: bold; }
              .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
              .logo { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
              .logo-img { max-width: 150px; height: auto; margin-bottom: 15px; }
              .warning { background: #fef3cd; padding: 15px; border-radius: 6px; border-left: 4px solid #f59e0b; margin: 15px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <img src="https://teereserve.golf/logo.png" alt="TeeReserve Golf" class="logo-img" />
                <div class="logo">🔐 TeeReserve Golf</div>
                <h1>Restablecer Contraseña</h1>
                <p>Solicitud de restablecimiento de contraseña</p>
              </div>
              
              <div class="content">
                <div class="security-details">
                  <h2 style="color: #dc2626; margin-top: 0;">🔒 Solicitud de Restablecimiento</h2>
                  <p style="margin: 0; color: #333; line-height: 1.6;">
                    Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en TeeReserve.
                  </p>
                </div>
                
                <div class="instructions">
                  <h3 style="color: #dc2626; margin-top: 0;">📋 Instrucciones</h3>
                  <ol style="margin: 0; padding-left: 20px; color: #333;">
                    <li>Haz clic en el botón "Restablecer Contraseña" a continuación</li>
                    <li>Serás redirigido a una página segura</li>
                    <li>Ingresa tu nueva contraseña</li>
                    <li>Confirma los cambios</li>
                  </ol>
                </div>
                
                <div style="text-align: center; margin: 25px 0;">
                  <a href="${resetUrl}" class="cta-button">
                    🔐 Restablecer Contraseña
                  </a>
                </div>
                
                <div class="warning">
                  <h4 style="color: #f59e0b; margin-top: 0;">⚠️ Importante</h4>
                  <ul style="margin: 0; padding-left: 20px; color: #333;">
                    <li>Este enlace expirará en <strong>1 hora</strong> por seguridad</li>
                    <li>Si no solicitaste este cambio, ignora este email</li>
                    <li>Tu contraseña actual permanecerá sin cambios</li>
                    <li>Nunca compartas este enlace con terceros</li>
                  </ul>
                </div>
                
                <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="color: #10b981; margin-top: 0;">🛡️ Consejos de Seguridad</h3>
                  <ul style="margin: 0; padding-left: 20px;">
                    <li>Usa una contraseña fuerte y única</li>
                    <li>Incluye mayúsculas, minúsculas, números y símbolos</li>
                    <li>No reutilices contraseñas de otras cuentas</li>
                    <li>Considera usar un gestor de contraseñas</li>
                  </ul>
                </div>
                
                <div class="footer">
                  <p>¿Necesitas ayuda? Contáctanos en info@teereserve.golf</p>
                  <p><strong>Equipo de Seguridad TeeReserve</strong></p>
                  <p style="font-size: 12px; color: #999;">Este es un email automático, por favor no responda a este mensaje.</p>
                </div>
              </div>
            </div>
          </body>
          </html>
        `,
      });

      if (error) {
        return handleEmailError('sendPasswordResetEmail', error, emailData);
      }

      markEmailSuccess('sendPasswordResetEmail', data);
      return { success: true, data };
    } catch (error) {
      return handleEmailError('sendPasswordResetEmail', error, emailData);
    }
  }

// Nueva función para email de reserva cancelada
export async function sendBookingCancellation(userEmail, userName, bookingDetails) {
    const emailData = {
      from: process.env.EMAIL_FROM || 'noreply@teereserve.golf',
      to: [userEmail],
      subject: 'Reserva Cancelada - TeeReserve ❌'
    };
    
    try {
      const { data, error } = await resend.emails.send({
        ...emailData,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Reserva Cancelada - TeeReserve</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #ef4444, #dc2626); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .cancellation-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444; }
              .booking-info { background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #fecaca; }
              .detail-row { display: flex; justify-content: space-between; margin: 8px 0; padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
              .label { font-weight: 600; color: #475569; }
              .value { color: #1e293b; font-weight: 500; }
              .cta-button { background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 15px 0; font-weight: bold; }
              .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
              .logo { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
              .logo-img { max-width: 150px; height: auto; margin-bottom: 15px; }
              .refund-info { background: #f0f9ff; padding: 15px; border-radius: 6px; border-left: 4px solid #0ea5e9; margin: 15px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <img src="https://teereserve.golf/logo.png" alt="TeeReserve Golf" class="logo-img" />
                <div class="logo">❌ TeeReserve Golf</div>
                <h1>Reserva Cancelada</h1>
                <p>Tu reserva ha sido cancelada exitosamente</p>
              </div>
              
              <div class="content">
                <div class="cancellation-details">
                  <h2 style="color: #ef4444; margin-top: 0;">🚫 Cancelación Confirmada</h2>
                  <p style="margin: 0; color: #333; line-height: 1.6;">
                    Hola ${userName}, tu reserva ha sido cancelada exitosamente según tu solicitud.
                  </p>
                </div>
                
                <div class="booking-info">
                  <h3 style="color: #ef4444; margin-top: 0;">📋 Detalles de la Reserva Cancelada</h3>
                  
                  <div class="detail-row">
                    <span class="label">🆔 ID de Reserva:</span>
                    <span class="value">${bookingDetails.bookingId || 'N/A'}</span>
                  </div>
                  
                  <div class="detail-row">
                    <span class="label">🏌️ Campo de Golf:</span>
                    <span class="value">${bookingDetails.courseName}</span>
                  </div>
                  
                  <div class="detail-row">
                    <span class="label">📅 Fecha:</span>
                    <span class="value">${bookingDetails.date}</span>
                  </div>
                  
                  <div class="detail-row">
                    <span class="label">🕐 Hora:</span>
                    <span class="value">${bookingDetails.time}</span>
                  </div>
                  
                  <div class="detail-row">
                    <span class="label">👥 Número de Jugadores:</span>
                    <span class="value">${bookingDetails.players}</span>
                  </div>
                  
                  ${bookingDetails.totalPrice ? `
                  <div class="detail-row">
                    <span class="label">💰 Monto:</span>
                    <span class="value">$${bookingDetails.totalPrice} USD</span>
                  </div>
                  ` : ''}
                </div>
                
                <div class="refund-info">
                  <h4 style="color: #0ea5e9; margin-top: 0;">💳 Información de Reembolso</h4>
                  <ul style="margin: 0; padding-left: 20px; color: #333;">
                    <li>El reembolso será procesado en 3-5 días hábiles</li>
                    <li>El monto será devuelto al método de pago original</li>
                    <li>Recibirás una notificación cuando se complete</li>
                    <li>Para consultas, contacta nuestro soporte</li>
                  </ul>
                </div>
                
                <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="color: #10b981; margin-top: 0;">🎯 ¿Qué Sigue?</h3>
                  <ul style="margin: 0; padding-left: 20px;">
                    <li>Explora otros campos disponibles</li>
                    <li>Programa una nueva reserva</li>
                    <li>Revisa nuestras ofertas especiales</li>
                    <li>Únete a nuestros torneos</li>
                  </ul>
                </div>
                
                <div style="text-align: center; margin: 25px 0;">
                  <a href="https://teereserve.golf/courses" class="cta-button">
                    🏌️ Explorar Otros Campos
                  </a>
                </div>
                
                <div class="footer">
                  <p>¡Esperamos verte pronto en el campo!</p>
                  <p><strong>Equipo TeeReserve Golf</strong></p>
                  <p style="font-size: 12px; color: #999;">Este es un email automático, por favor no responda a este mensaje.</p>
                </div>
              </div>
            </div>
          </body>
          </html>
        `,
      });

      if (error) {
        return handleEmailError('sendBookingCancellation', error, emailData);
      }

      markEmailSuccess('sendBookingCancellation', data);
      return { success: true, data };
    } catch (error) {
      return handleEmailError('sendBookingCancellation', error, emailData);
    }
  }

// Nueva función para recordatorio de reserva
export async function sendBookingReminder(userEmail, userName, bookingDetails) {
    const emailData = {
      from: process.env.EMAIL_FROM || 'noreply@teereserve.golf',
      to: [userEmail],
      subject: 'Recordatorio de Reserva - TeeReserve ⏰'
    };
    
    try {
      const { data, error } = await resend.emails.send({
        ...emailData,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Recordatorio de Reserva - TeeReserve</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .reminder-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b; }
              .booking-info { background: #fffbeb; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #fed7aa; }
              .detail-row { display: flex; justify-content: space-between; margin: 8px 0; padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
              .label { font-weight: 600; color: #475569; }
              .value { color: #1e293b; font-weight: 500; }
              .cta-button { background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 15px 0; font-weight: bold; }
              .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
              .logo { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
              .logo-img { max-width: 150px; height: auto; margin-bottom: 15px; }
              .tips { background: #f0f9ff; padding: 15px; border-radius: 6px; border-left: 4px solid #0ea5e9; margin: 15px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <img src="https://teereserve.golf/logo.png" alt="TeeReserve Golf" class="logo-img" />
                <div class="logo">⏰ TeeReserve Golf</div>
                <h1>Recordatorio de Reserva</h1>
                <p>Tu tee time se acerca - ¡Prepárate para jugar!</p>
              </div>
              
              <div class="content">
                <div class="reminder-details">
                  <h2 style="color: #f59e0b; margin-top: 0;">⏰ ¡Tu Reserva es Mañana!</h2>
                  <p style="margin: 0; color: #333; line-height: 1.6;">
                    Hola ${userName}, este es un recordatorio amigable de que tienes una reserva programada para mañana.
                  </p>
                </div>
                
                <div class="booking-info">
                  <h3 style="color: #f59e0b; margin-top: 0;">📋 Detalles de tu Reserva</h3>
                  
                  <div class="detail-row">
                    <span class="label">🆔 ID de Reserva:</span>
                    <span class="value">${bookingDetails.bookingId || 'N/A'}</span>
                  </div>
                  
                  <div class="detail-row">
                    <span class="label">🏌️ Campo de Golf:</span>
                    <span class="value">${bookingDetails.courseName}</span>
                  </div>
                  
                  <div class="detail-row">
                    <span class="label">📅 Fecha:</span>
                    <span class="value">${bookingDetails.date}</span>
                  </div>
                  
                  <div class="detail-row">
                    <span class="label">🕐 Hora de Salida:</span>
                    <span class="value">${bookingDetails.time}</span>
                  </div>
                  
                  <div class="detail-row">
                    <span class="label">👥 Número de Jugadores:</span>
                    <span class="value">${bookingDetails.players}</span>
                  </div>
                  
                  ${bookingDetails.totalPrice ? `
                  <div class="detail-row">
                    <span class="label">💰 Total Pagado:</span>
                    <span class="value">${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(bookingDetails.totalPrice)}</span>
                  </div>
                  ` : ''}
                </div>
                
                <div class="tips">
                  <h4 style="color: #0ea5e9; margin-top: 0;">💡 Consejos para tu Ronda</h4>
                  <ul style="margin: 0; padding-left: 20px; color: #333;">
                    <li>Llega 30 minutos antes de tu tee time</li>
                    <li>Trae identificación y confirmación de reserva</li>
                    <li>Revisa las reglas del campo</li>
                    <li>Verifica el pronóstico del tiempo</li>
                  </ul>
                </div>
                
                <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="color: #10b981; margin-top: 0;">🎯 Información Adicional</h3>
                  <ul style="margin: 0; padding-left: 20px;">
                    <li>Código de vestimenta: Ropa de golf apropiada</li>
                    <li>Política de cancelación: Hasta 24 horas antes</li>
                    <li>Servicios disponibles: Pro shop, restaurante</li>
                    <li>Estacionamiento gratuito disponible</li>
                  </ul>
                </div>
                
                <div style="text-align: center; margin: 25px 0;">
                  <a href="https://teereserve.golf/bookings/${bookingDetails.bookingId || ''}" class="cta-button">
                    📱 Ver Detalles de Reserva
                  </a>
                </div>
                
                <div class="footer">
                  <p>¡Que tengas una excelente ronda!</p>
                  <p><strong>Equipo TeeReserve Golf</strong></p>
                  <p style="font-size: 12px; color: #999;">Este es un email automático, por favor no responda a este mensaje.</p>
                </div>
              </div>
            </div>
          </body>
          </html>
        `,
      });

      if (error) {
        return handleEmailError('sendBookingReminder', error, emailData);
      }

      markEmailSuccess('sendBookingReminder', data);
      return { success: true, data };
    } catch (error) {
      return handleEmailError('sendBookingReminder', error, emailData);
    }
  }

/**
 * Función para obtener el estado del servicio de email
 */
export async function getEmailServiceStatus() {
  return {
    ...emailServiceStatus,
    isHealthy: emailServiceStatus.resendAvailable && emailServiceStatus.errorCount < 5,
    lastErrorAge: emailServiceStatus.lastError ? 
      Date.now() - new Date(emailServiceStatus.lastSuccessfulSend || 0).getTime() : null
  };
}

/**
 * Función para resetear el estado de error del servicio
 */
export async function resetEmailServiceError() {
  emailServiceStatus.resendAvailable = true;
  emailServiceStatus.lastError = null;
  emailServiceStatus.errorCount = 0;
  
  logger.info('Email service error state reset', 'email', {
    timestamp: new Date().toISOString(),
    action: 'manual_reset'
  });
}

// Nueva función para notificación de reserva a administradores
export async function sendAdminBookingNotification(adminEmail, bookingDetails) {
    const emailData = {
      from: process.env.EMAIL_FROM || 'noreply@teereserve.golf',
      to: [adminEmail],
      subject: '🆕 Nueva Reserva Recibida - TeeReserve'
    };
    
    try {
      const { data, error } = await resend.emails.send({
        ...emailData,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Nueva Reserva Recibida - TeeReserve</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .booking-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981; }
              .booking-info { background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #bbf7d0; }
              .detail-row { display: flex; justify-content: space-between; margin: 8px 0; padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
              .label { font-weight: bold; color: #374151; }
              .value { color: #6b7280; }
              .special-requests { background: #fef3c7; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #f59e0b; }
              .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; }
              .admin-button { display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 5px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0; font-size: 28px;">🆕 Nueva Reserva</h1>
                <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">
                  Se ha recibido una nueva reserva en TeeReserve
                </p>
              </div>
              
              <div class="content">
                <div class="booking-details">
                  <p style="margin: 0; color: #333; line-height: 1.6;">
                    Se ha registrado una nueva reserva que requiere tu atención.
                  </p>
                </div>
                
                <div class="booking-info">
                  <h3 style="color: #10b981; margin-top: 0;">📋 Detalles de la Reserva</h3>
                  
                  <div class="detail-row">
                    <span class="label">🆔 ID de Reserva:</span>
                    <span class="value">${bookingDetails.bookingId || 'N/A'}</span>
                  </div>
                  
                  <div class="detail-row">
                    <span class="label">👤 Cliente:</span>
                    <span class="value">${bookingDetails.customerName || 'N/A'}</span>
                  </div>
                  
                  <div class="detail-row">
                    <span class="label">📧 Email:</span>
                    <span class="value">${bookingDetails.customerEmail || 'N/A'}</span>
                  </div>
                  
                  <div class="detail-row">
                    <span class="label">📱 Teléfono:</span>
                    <span class="value">${bookingDetails.customerPhone || 'N/A'}</span>
                  </div>
                  
                  <div class="detail-row">
                    <span class="label">🏌️ Campo de Golf:</span>
                    <span class="value">${bookingDetails.courseName}</span>
                  </div>
                  
                  <div class="detail-row">
                    <span class="label">📅 Fecha:</span>
                    <span class="value">${bookingDetails.date}</span>
                  </div>
                  
                  <div class="detail-row">
                    <span class="label">🕐 Hora de Salida:</span>
                    <span class="value">${bookingDetails.time}</span>
                  </div>
                  
                  <div class="detail-row">
                    <span class="label">👥 Número de Jugadores:</span>
                    <span class="value">${bookingDetails.players}</span>
                  </div>
                  
                  <div class="detail-row">
                    <span class="label">💰 Precio Total:</span>
                    <span class="value">€${bookingDetails.totalPrice}</span>
                  </div>
                  
                  <div class="detail-row">
                    <span class="label">💳 Estado del Pago:</span>
                    <span class="value">${bookingDetails.paymentStatus || 'Completado'}</span>
                  </div>
                </div>
                
                ${bookingDetails.specialRequests ? `
                <div class="special-requests">
                  <h4 style="color: #f59e0b; margin-top: 0;">⚠️ Indicaciones Especiales</h4>
                  <p style="margin: 0; color: #92400e; font-style: italic;">
                    "${bookingDetails.specialRequests}"
                  </p>
                </div>
                ` : ''}
                
                <div style="text-align: center; margin: 20px 0;">
                  <a href="https://teereserve.golf/admin/bookings" class="admin-button">
                    📊 Ver en Panel Admin
                  </a>
                  <a href="mailto:${bookingDetails.customerEmail}?subject=Re: Reserva ${bookingDetails.bookingId}" class="admin-button" style="background: #3b82f6;">
                    📧 Contactar Cliente
                  </a>
                </div>
                
                <div class="footer">
                  <p><strong>Panel de Administración TeeReserve</strong></p>
                  <p style="font-size: 12px; color: #999;">Este es un email automático de notificación.</p>
                </div>
              </div>
            </div>
          </body>
          </html>
        `,
      });

      if (error) {
        return handleEmailError('sendAdminBookingNotification', error, emailData);
      }

      markEmailSuccess('sendAdminBookingNotification', data);
      return { success: true, data };
    } catch (error) {
      return handleEmailError('sendAdminBookingNotification', error, emailData);
    }
  }

export async function sendVerificationEmail(userEmail, verifyUrl, options = {}) {
  const { displayName = 'Golfista', lang = 'es' } = options;
  const emailData = {
    from: process.env.EMAIL_FROM || 'noreply@teereserve.golf',
    to: [userEmail],
  };

  try {
    const template = getEmailVerificationTemplate({ displayName, verifyUrl, lang });
    const { data, error } = await resend.emails.send({
      ...emailData,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });

    if (error) {
      return handleEmailError('sendVerificationEmail', error, { ...emailData, subject: template.subject });
    }

    markEmailSuccess('sendVerificationEmail', data);
    return { success: true, data };
  } catch (error) {
    return handleEmailError('sendVerificationEmail', error, emailData);
  }
}