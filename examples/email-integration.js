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
    
    // 2. Enviar email de bienvenida
    const emailResponse = await fetch('/api/email/welcome', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userEmail: user.email,
        userName: user.displayName || user.email.split('@')[0],
        idToken: idToken
      })
    });
    
    if (!emailResponse.ok) {
      console.warn('Error enviando email de bienvenida:', await emailResponse.text());
    } else {
      console.log('✅ Email de bienvenida enviado correctamente');
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
      
      // 3. Enviar confirmación por email al cliente
      const emailResponse = await fetch('/api/email/booking-confirmation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userEmail: userEmail,
          idToken: idToken,
          bookingDetails: {
            courseName: bookingData.courseName,
            date: new Date(bookingData.date).toLocaleDateString('es-ES'),
            time: bookingData.time,
            players: bookingData.players,
            totalPrice: bookingData.totalPrice
          }
        })
      });
      
      if (!emailResponse.ok) {
        console.warn('Error enviando confirmación de reserva:', await emailResponse.text());
      } else {
        console.log('✅ Confirmación de reserva enviada correctamente');
      }

      // 4. Enviar notificación a administradores
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@teereserve.golf';
      const adminNotificationResponse = await fetch('/api/email/admin-booking-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          adminEmail: adminEmail,
          idToken: idToken,
          bookingDetails: {
            bookingId: booking.id || 'N/A',
            customerName: bookingData.customerName || userEmail,
            customerEmail: userEmail,
            customerPhone: bookingData.customerPhone || 'N/A',
            courseName: bookingData.courseName,
            date: new Date(bookingData.date).toLocaleDateString('es-ES'),
            time: bookingData.time,
            players: bookingData.players,
            totalPrice: bookingData.totalPrice,
            paymentStatus: 'Completado',
            specialRequests: bookingData.specialRequests || null
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
    
    // Enviar notificación de contacto
    const emailResponse = await fetch('/api/email/contact', {
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
      const response = await fetch('/api/email/welcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail, userName, idToken })
      });
      
      if (!response.ok) {
        throw new Error('Error enviando email de bienvenida');
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
      const response = await fetch('/api/email/booking-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail, bookingDetails, idToken })
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
    if (req.path.startsWith('/api/email/')) {
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