import { EmailService } from '../../../lib/email';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { name, email, phone, subject, message } = req.body;

    // Validar datos requeridos
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ 
        error: 'Nombre, email, asunto y mensaje son requeridos' 
      });
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        error: 'Formato de email inválido' 
      });
    }

    // Preparar datos del formulario
    const formData = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone?.trim() || null,
      subject: subject.trim(),
      message: message.trim()
    };

    // Enviar notificación de contacto
    const result = await EmailService.sendContactFormNotification(formData);

    if (!result.success) {
      console.error('Error enviando notificación de contacto:', result.error);
      return res.status(500).json({ 
        error: 'Error enviando mensaje de contacto',
        details: result.error 
      });
    }

    // Enviar email de confirmación al usuario
    try {
      const confirmationResult = await EmailService.sendContactConfirmation(formData.email, formData.name);
      if (!confirmationResult.success) {
        console.warn('Error enviando confirmación al usuario:', confirmationResult.error);
      }
    } catch (error) {
      console.warn('Error enviando confirmación al usuario:', error);
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Mensaje de contacto enviado correctamente',
      emailId: result.data?.id
    });

  } catch (error) {
    console.error('Error en API de contacto:', error);
    return res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
}