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
    const { userEmail, userName, idToken } = req.body;

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
    if (!userEmail || !userName) {
      return res.status(400).json({ 
        error: 'Email y nombre de usuario son requeridos' 
      });
    }

    // Enviar email de bienvenida
    const result = await EmailService.sendWelcomeEmail(userEmail, userName);

    if (!result.success) {
      console.error('Error enviando email de bienvenida:', result.error);
      return res.status(500).json({ 
        error: 'Error enviando email de bienvenida',
        details: result.error 
      });
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Email de bienvenida enviado correctamente',
      emailId: result.data?.id
    });

  } catch (error) {
    console.error('Error en API de email de bienvenida:', error);
    return res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
}