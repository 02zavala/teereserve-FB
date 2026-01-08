
import { FirebaseError } from 'firebase/app';

// =================================================================
// CUSTOM ERROR CLASSES
// =================================================================

/**
 * Base error class for all application-specific errors.
 */
export class AppError extends Error {
  constructor(message: string, public readonly metadata?: Record<string, unknown>) {
    super(message);
    this.name = 'AppError';
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * Error for data validation issues.
 */
export class ValidationError extends AppError {
  constructor(message: string, public readonly details?: Record<string, string>) {
    super(message, { details });
    this.name = 'ValidationError';
  }
}

/**
 * Error for authentication or authorization problems.
 */
export class AuthError extends AppError {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

/**
 * Error for network or connectivity issues.
 */
export class NetworkError extends AppError {
  constructor(message: string = 'A network error occurred. Please check your connection and try again.') {
    super(message);
    this.name = 'NetworkError';
  }
}


// =================================================================
// FIREBASE ERROR TRANSLATION
// =================================================================

/**
 * Spanish translations for common Firebase Auth error codes.
 */
const firebaseErrorMessages: Record<string, string> = {
  'auth/user-not-found': 'El usuario no fue encontrado. Por favor, verifica tu correo electrónico.',
  'auth/wrong-password': 'La contraseña es incorrecta. Por favor, inténtalo de nuevo.',
  'auth/invalid-email': 'El formato del correo electrónico no es válido.',
  'auth/email-already-in-use': 'Este correo electrónico ya está en uso por otra cuenta.',
  'auth/weak-password': 'La contraseña es demasiado débil. Debe tener al menos 6 caracteres.',
  'auth/requires-recent-login': 'Esta operación es sensible y requiere autenticación reciente. Por favor, inicia sesión de nuevo.',
  'auth/invalid-credential': 'La credencial proporcionada es incorrecta o ha expirado.',
  'auth/network-request-failed': 'Error de red. Por favor, comprueba tu conexión a internet.',
  'auth/too-many-requests': 'Hemos bloqueado todas las solicitudes de este dispositivo debido a actividad inusual. Inténtalo de nuevo más tarde.',
  'invalid-argument': 'Los datos proporcionados no son válidos. Por favor, verifica la información e inténtalo de nuevo.',
  'firestore/invalid-argument': 'Los datos de Firestore no son válidos. Por favor, verifica la información e inténtalo de nuevo.',
  'permission-denied': 'No tienes permisos para realizar esta operación.',
  'unavailable': 'El servicio no está disponible temporalmente. Por favor, inténtalo más tarde.',
  'unauthenticated': 'Debes iniciar sesión para realizar esta operación.'
};

/**
 * Translates a FirebaseError into a user-friendly Spanish message.
 * @param error The FirebaseError object.
 * @returns A user-friendly error message string.
 */
export function translateFirebaseError(error: FirebaseError): string {
  return firebaseErrorMessages[error.code] || 'Ocurrió un error inesperado. Por favor, inténtalo de nuevo.';
}


// =================================================================
// CENTRALIZED ERROR HANDLING
// =================================================================

interface ErrorHandlerOptions {
  toast?: (options: { title: string; description: string; variant: 'destructive' }) => void;
  log?: (error: Error, context?: Record<string, unknown>) => void;
  defaultMessage?: string;
}

/**
 * Centralized function to process and handle errors.
 * It can log the error and show a user-friendly toast notification.
 * @param error The error object to handle.
 * @param options Configuration for toast notifications and logging.
 */
export function handleError(error: unknown, options: ErrorHandlerOptions): void {
  const { toast, log, defaultMessage = 'An unexpected error occurred.' } = options;

  let title = 'Error';
  let description = defaultMessage;
  let context: Record<string, unknown> | undefined;

  if (error instanceof AppError) {
    title = error.name.replace('Error', ''); // e.g., "AuthError" -> "Auth"
    description = error.message;
    context = error.metadata;
  } else if (error instanceof FirebaseError) {
    title = 'Authentication Error';
    description = translateFirebaseError(error);
    context = { code: error.code, name: error.name };
  } else if (error instanceof Error) {
    description = error.message;
    context = { name: error.name, stack: error.stack };
  }

  // Log the error for debugging
  if (log) {
    const errorToLog = error instanceof Error ? error : new Error(String(error));
    log(errorToLog, context);
  }

  // Show a toast notification to the user
  if (toast) {
    toast({
      title,
      description,
      variant: 'destructive',
    });
  }
}
