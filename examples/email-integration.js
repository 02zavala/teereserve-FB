/**
 * Ejemplos de integración del sistema de email en TeeReserve
 * 
 * Este archivo muestra cómo integrar el sistema de notificaciones
 * en diferentes partes de la aplicación.
 */

// Ejemplo 1: Integración en el proceso de registro
export async function handleUserRegistration(userData, idToken) {
  try {
    // 1. Crear usuario en Firebase (ya implementado)
    const user = await createUserInFirebase(userData);
    
    // 2. Enviar email de verificación (App Router)
    const emailResponse = await fetch('/api/auth/send-verification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: user.email,
        displayName: user.displayName || user.email.split('@')[0],
        lang: 'es',
        idToken: idToken
      })
    });
    
    if (!emailResponse.ok) {
      console.warn('Error enviando email de verificación:', await emailResponse.text());
    } else {
      console.log('✅ Email de verificación enviado correctamente');
    }
    
    return { success: true, user };
  } catch (error) {
    console.error('Error en registro de usuario:', error);
    return { success: false, error: error.message };
  }
}

// Ejemplo 2: Integración en el proceso de reserva
export async function handleBookingConfirmation(bookingData, userEmail, idToken) {
  try {
    // 1. Procesar pago (ya implementado)
    const paymentResult = await processPayment(bookingData);
    
    if (paymentResult.success) {
      // 2. Guardar reserva en base de datos
      const booking = await saveBookingToDatabase(bookingData);
      
      // 3. Enviar confirmación por email al cliente (App Router)
      const emailResponse = await fetch('/api/guest-booking-confirmation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userEmail: userEmail,
          bookingDetails: {
            courseName: bookingData.courseName,
            date: new Date(bookingData.date).toLocaleDateString('es-ES'),
            time: bookingData.time,
            players: bookingData.players,
            totalPrice: String(bookingData.totalPrice),
            confirmationNumber: booking.confirmationNumber,
            courseLocation: bookingData.courseLocation,
            userName: bookingData.customerName
          }
        })
      });
      
      if (!emailResponse.ok) {
        console.warn('Error enviando confirmación de reserva:', await emailResponse.text());
      } else {
        console.log('✅ Confirmación de reserva enviada correctamente');
      }

      // 4. Enviar alerta a administradores (App Router)
      const adminNotificationResponse = await fetch('/api/test-admin-alerts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'booking',
          bookingData: {
            bookingId: booking.id || 'N/A',
            customerName: bookingData.customerName || userEmail,
            customerEmail: userEmail,
            customerPhone: bookingData.customerPhone || 'N/A',
            courseName: bookingData.courseName,
            date: new Date(bookingData.date).toLocaleDateString('es-ES'),
            time: bookingData.time,
            players: bookingData.players,
            totalAmount: bookingData.totalPrice,
            currency: 'USD',
            paymentMethod: 'stripe',
            transactionId: booking.transactionId,
            bookingUrl: `${process.env.NEXT_PUBLIC_BASE_URL || ''}/booking/${booking.id || 'test'}`,
            cardLast4: booking.cardLast4,
            cardBrand: booking.cardBrand
          }
        })
      });
      
      if (!adminNotificationResponse.ok) {
        console.warn('Error enviando notificación a administrador:', await adminNotificationResponse.text());
      } else {
        console.log('✅ Notificación a administrador enviada correctamente');
      }
      
      return { success: true, booking };
    }
    
    return { success: false, error: 'Error en el pago' };
  } catch (error) {
    console.error('Error en confirmación de reserva:', error);
    return { success: false, error: error.message };
  }
}

// Ejemplo 3: Integración en formulario de contacto
export async function handleContactForm(formData) {
  try {
    // Validar datos del formulario
    if (!formData.name || !formData.email || !formData.subject || !formData.message) {
      throw new Error('Todos los campos son requeridos');
    }
    
    // Enviar notificación de contacto (App Router)
    const emailResponse = await fetch('/api/contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData)
    });
    
    if (!emailResponse.ok) {
      const errorData = await emailResponse.json();
      throw new Error(errorData.error || 'Error enviando mensaje');
    }
    
    const result = await emailResponse.json();
    console.log('✅ Mensaje de contacto enviado:', result.emailId);
    
    return { success: true, message: 'Mensaje enviado correctamente' };
  } catch (error) {
    console.error('Error en formulario de contacto:', error);
    return { success: false, error: error.message };
  }
}

// Ejemplo 4: Hook de React para notificaciones
export function useEmailNotifications() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const sendWelcomeEmail = async (userEmail, userName, idToken) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/auth/send-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail, displayName: userName, lang: 'es', idToken })
      });
      
      if (!response.ok) {
        throw new Error('Error enviando email de verificación');
      }
      
      return await response.json();
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  const sendBookingConfirmation = async (userEmail, bookingDetails, idToken) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/guest-booking-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail, bookingDetails })
      });
      
      if (!response.ok) {
        throw new Error('Error enviando confirmación de reserva');
      }
      
      return await response.json();
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  return {
    sendWelcomeEmail,
    sendBookingConfirmation,
    loading,
    error
  };
}

// Ejemplo 5: Middleware para logging de emails
export function emailLogger(req, res, next) {
  const originalSend = res.send;
  
  res.send = function(data) {
    // Log del resultado del email
    const monitoredPaths = [
      '/api/auth/send-verification',
      '/api/guest-booking-confirmation',
      '/api/contact',
      '/api/test-admin-alerts'
    ];
    if (monitoredPaths.includes(req.path)) {
      const result = typeof data === 'string' ? JSON.parse(data) : data;
      
      if (result.success) {
        console.log(`📧 Email enviado exitosamente:`, {
          endpoint: req.path,
          emailId: result.emailId,
          timestamp: new Date().toISOString()
        });
      } else {
        console.error(`❌ Error enviando email:`, {
          endpoint: req.path,
          error: result.error,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    originalSend.call(this, data);
  };
  
  next();
}

// Funciones auxiliares (placeholder - implementar según necesidades)
function createUserInFirebase(userData) {
  // Implementar creación de usuario en Firebase
  return Promise.resolve({ email: userData.email, displayName: userData.name });
}

function processPayment(bookingData) {
  // Implementar procesamiento de pago
  return Promise.resolve({ success: true });
}

function saveBookingToDatabase(bookingData) {
  // Implementar guardado en base de datos
  return Promise.resolve({ id: 'booking-123', ...bookingData });
}