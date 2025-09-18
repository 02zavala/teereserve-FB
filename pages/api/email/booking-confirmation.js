import { EmailService } from '../../../lib/email';
import { auth as adminAuth } from '../../../src/lib/firebase-admin';

// Helper function to verify token
const verifyIdToken = async (token) => {
  if (!adminAuth) {
    throw new Error("Firebase Admin SDK not initialized.");
  }
  return await adminAuth.verifyIdToken(token);
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { userEmail, bookingDetails, idToken } = req.body;

    // Verificar que el usuario esté autenticado
    if (!idToken) {
      return res.status(401).json({ error: 'Token de autenticación requerido' });
    }

    // Verificar el token de Firebase
    try {
      await verifyIdToken(idToken);
    } catch (error) {
      console.error('Error verificando token:', error);
      return res.status(401).json({ error: 'Token inválido' });
    }

    // Validar datos requeridos
    if (!userEmail || !bookingDetails) {
      return res.status(400).json({ 
        error: 'Email y detalles de reserva son requeridos' 
      });
    }

    // Validar estructura de bookingDetails
    const requiredFields = ['courseName', 'date', 'time', 'players', 'totalPrice'];
    const missingFields = requiredFields.filter(field => !bookingDetails[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({ 
        error: `Campos faltantes en detalles de reserva: ${missingFields.join(', ')}` 
      });
    }

    // Enviar confirmación de reserva
    const result = await EmailService.sendBookingConfirmation(userEmail, bookingDetails);

    if (!result.success) {
      console.error('Error enviando confirmación de reserva:', result.error);
      return res.status(500).json({ 
        error: 'Error enviando confirmación de reserva',
        details: result.error 
      });
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Confirmación de reserva enviada correctamente',
      emailId: result.data?.id
    });

  } catch (error) {
    console.error('Error en API de confirmación de reserva:', error);
    return res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
}
