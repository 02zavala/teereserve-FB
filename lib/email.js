import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Servicio de email usando Resend
 */
export class EmailService {
  static async sendWelcomeEmail(userEmail, userName) {
    try {
      const { data, error } = await resend.emails.send({
        from: process.env.EMAIL_FROM || 'noreply@teereserve.golf',
        to: [userEmail],
        subject: '¡Bienvenido a TeeReserve! 🏌️‍♂️',
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
        console.error('Error enviando email de bienvenida:', error);
        return { success: false, error };
      }

      console.log('Email de bienvenida enviado:', data);
      return { success: true, data };
    } catch (error) {
      console.error('Error en sendWelcomeEmail:', error);
      return { success: false, error: error.message };
    }
  }

  static async sendBookingConfirmation(userEmail, bookingDetails) {
    try {
      const { data, error } = await resend.emails.send({
        from: process.env.EMAIL_FROM || 'noreply@teereserve.golf',
        to: [userEmail],
        subject: `Confirmación de Reserva - ${bookingDetails.courseName}`,
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
                    <span class="label">🆔 ID de Reserva:</span>
                    <span class="value">${bookingDetails.bookingId || 'TRG-' + Date.now()}</span>
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
                  
                  ${bookingDetails.subtotal ? `
                  <div class="detail-row">
                    <span class="label">💰 Subtotal:</span>
                    <span class="value">${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(bookingDetails.subtotal)}</span>
                  </div>
                  ` : ''}
                  
                  ${bookingDetails.discount ? `
                  <div class="detail-row">
                    <span class="label">🎟️ Descuento ${bookingDetails.discountCode ? '(' + bookingDetails.discountCode + ')' : ''}:</span>
                    <span class="value" style="color: #059669;">-${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(bookingDetails.discount)}</span>
                  </div>
                  ` : ''}
                  
                  ${bookingDetails.taxes ? `
                  <div class="detail-row">
                    <span class="label">🏛️ Impuestos (16%):</span>
                    <span class="value">${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(bookingDetails.taxes)}</span>
                  </div>
                  ` : ''}
                  
                  <div class="total">
                    💰 Total Final: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(bookingDetails.totalPrice)}
                  </div>
                  
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
                  <a href="https://teereserve.golf/manage-booking?id=${bookingDetails.bookingId || 'booking'}" class="manage-button">
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
        console.error('Error enviando confirmación de reserva:', error);
        return { success: false, error };
      }

      console.log('Confirmación de reserva enviada:', data);
      return { success: true, data };
    } catch (error) {
      console.error('Error en sendBookingConfirmation:', error);
      return { success: false, error: error.message };
    }
  }

  static async sendContactFormNotification(formData) {
    try {
      const { data, error } = await resend.emails.send({
        from: process.env.EMAIL_FROM || 'noreply@teereserve.golf',
        to: [process.env.CONTACT_FORM_RECIPIENT || 'info@teereserve.golf'],
        subject: `Nuevo mensaje de contacto - ${formData.subject}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #f59e0b; padding: 30px 20px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">Nuevo Mensaje de Contacto</h1>
            </div>
            <div style="padding: 30px 20px; background: #f9fafb;">
              <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <p style="margin: 0 0 10px 0; color: #1f2937;"><strong>Nombre:</strong> ${formData.name}</p>
                <p style="margin: 0 0 10px 0; color: #1f2937;"><strong>Email:</strong> ${formData.email}</p>
                <p style="margin: 0 0 10px 0; color: #1f2937;"><strong>Teléfono:</strong> ${formData.phone || 'No proporcionado'}</p>
                <p style="margin: 0 0 20px 0; color: #1f2937;"><strong>Asunto:</strong> ${formData.subject}</p>
                <div style="border-top: 1px solid #e5e7eb; padding-top: 15px;">
                  <p style="margin: 0 0 10px 0; color: #1f2937; font-weight: bold;">Mensaje:</p>
                  <p style="margin: 0; color: #4b5563; line-height: 1.6; white-space: pre-wrap;">${formData.message}</p>
                </div>
              </div>
            </div>
          </div>
        `,
      });

      if (error) {
        console.error('Error enviando notificación de contacto:', error);
        return { success: false, error };
      }

      console.log('Notificación de contacto enviada:', data);
      return { success: true, data };
    } catch (error) {
      console.error('Error en sendContactFormNotification:', error);
      return { success: false, error: error.message };
    }
  }

  static async sendPasswordResetEmail(userEmail, resetToken) {
    try {
      const resetUrl = `https://teereserve.golf/reset-password?token=${resetToken}`;
      
      const { data, error } = await resend.emails.send({
        from: process.env.EMAIL_FROM || 'noreply@teereserve.golf',
        to: [userEmail],
        subject: 'Restablecer contraseña - TeeReserve 🔐',
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
        console.error('Error enviando email de restablecimiento:', error);
        return { success: false, error };
      }

      console.log('Email de restablecimiento enviado:', data);
      return { success: true, data };
    } catch (error) {
      console.error('Error en sendPasswordResetEmail:', error);
      return { success: false, error: error.message };
    }
  }

  // Nueva función para email de reserva cancelada
  static async sendBookingCancellation(userEmail, userName, bookingDetails) {
    try {
      const { data, error } = await resend.emails.send({
        from: process.env.EMAIL_FROM || 'noreply@teereserve.golf',
        to: [userEmail],
        subject: 'Reserva Cancelada - TeeReserve ❌',
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
        console.error('Error enviando email de cancelación:', error);
        return { success: false, error };
      }

      console.log('Email de cancelación enviado:', data);
      return { success: true, data };
    } catch (error) {
      console.error('Error en sendBookingCancellation:', error);
      return { success: false, error: error.message };
    }
  }

  // Nueva función para recordatorio de reserva
  static async sendBookingReminder(userEmail, userName, bookingDetails) {
    try {
      const { data, error } = await resend.emails.send({
        from: process.env.EMAIL_FROM || 'noreply@teereserve.golf',
        to: [userEmail],
        subject: 'Recordatorio de Reserva - TeeReserve ⏰',
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
        console.error('Error enviando recordatorio de reserva:', error);
        return { success: false, error };
      }

      console.log('Recordatorio de reserva enviado:', data);
      return { success: true, data };
    } catch (error) {
      console.error('Error en sendBookingReminder:', error);
      return { success: false, error: error.message };
    }
  }
}

export default EmailService;