import { getAuth, fetchSignInMethodsForEmail, GoogleAuthProvider, EmailAuthProvider } from 'firebase/auth';
import { app } from '@/lib/firebase';

/**
 * Detecta los métodos de autenticación disponibles para un email
 */
export async function detectAuthMethods(email: string) {
  try {
    if (!app) {
      throw new Error('Firebase app not initialized');
    }
    const auth = getAuth(app);
    const methods = await fetchSignInMethodsForEmail(auth, email);
    
    return {
      exists: methods.length > 0,
      methods,
      hasPassword: methods.includes(EmailAuthProvider.EMAIL_PASSWORD_SIGN_IN_METHOD),
      hasGoogle: methods.includes(GoogleAuthProvider.GOOGLE_SIGN_IN_METHOD),
      // Agregar más proveedores según sea necesario
    };
  } catch (error) {
    console.error('Error detecting auth methods:', error);
    return {
      exists: false,
      methods: [],
      hasPassword: false,
      hasGoogle: false,
    };
  }
}

/**
 * Maneja el error auth/email-already-in-use proporcionando información útil
 */
export async function handleEmailAlreadyInUse(email: string) {
  const authInfo = await detectAuthMethods(email);
  
  if (!authInfo.exists) {
    return {
      shouldRedirect: false,
      message: 'El email ya está en uso pero no se pudieron detectar los métodos de autenticación.',
      suggestedAction: 'login'
    };
  }
  
  let message = 'Este email ya está registrado. ';
  let suggestedAction = 'login';
  
  if (authInfo.hasPassword && authInfo.hasGoogle) {
    message += 'Puedes iniciar sesión con tu contraseña o con Google.';
    suggestedAction = 'login-multiple';
  } else if (authInfo.hasPassword) {
    message += 'Inicia sesión con tu contraseña.';
    suggestedAction = 'login-password';
  } else if (authInfo.hasGoogle) {
    message += 'Inicia sesión con Google.';
    suggestedAction = 'login-google';
  } else {
    message += 'Inicia sesión con el método que usaste originalmente.';
    suggestedAction = 'login';
  }
  
  return {
    shouldRedirect: true,
    message,
    suggestedAction,
    authInfo
  };
}

/**
 * Tipos para el manejo de errores de autenticación
 */
export interface AuthErrorInfo {
  shouldRedirect: boolean;
  message: string;
  suggestedAction: 'login' | 'login-password' | 'login-google' | 'login-multiple';
  authInfo?: {
    exists: boolean;
    methods: string[];
    hasPassword: boolean;
    hasGoogle: boolean;
  };
}

/**
 * Mensajes de error amigables para diferentes códigos de Firebase Auth
 */
export const friendlyAuthErrors: Record<string, string> = {
  'auth/email-already-in-use': 'Este email ya está registrado. Intenta iniciar sesión.',
  'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
  'auth/invalid-email': 'El formato del email no es válido.',
  'auth/user-not-found': 'No encontramos una cuenta con este email.',
  'auth/wrong-password': 'La contraseña es incorrecta.',
  'auth/too-many-requests': 'Demasiados intentos fallidos. Intenta más tarde.',
  'auth/network-request-failed': 'Error de conexión. Verifica tu internet.',
  'auth/invalid-credential': 'Las credenciales son incorrectas o han expirado.',
  'auth/account-exists-with-different-credential': 'Ya existe una cuenta con este email usando un método diferente.',
  'auth/popup-closed-by-user': 'Ventana cerrada por el usuario.',
  'auth/cancelled-popup-request': 'Solicitud de popup cancelada.',
};

/**
 * Obtiene un mensaje de error amigable para un código de error de Firebase
 */
export function getFriendlyErrorMessage(errorCode: string): string {
  return friendlyAuthErrors[errorCode] || 'Ha ocurrido un error inesperado. Intenta de nuevo.';
}