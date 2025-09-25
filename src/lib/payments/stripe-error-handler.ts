import { StripeError } from '@stripe/stripe-js';
import { Sentry } from '@/lib/sentry'; // Asumiendo que Sentry está configurado así

// --- Tipos ---

interface StripeErrorPayload {
  type: StripeError['type'];
  code?: StripeError['code'];
  decline_code?: string;
  payment_intent?: {
    id: string;
    // ... otros campos relevantes si son necesarios
  };
  // Stripe puede incluir información sobre fallbacks en el error
  fallbacksAvailable?: ('paypal' | 'link')[];
}

interface HandledError {
  userMessage: string;
  logPayload: object;
  fallbacksAvailable: ('paypal' | 'link')[];
  showRetryWithNewCard: boolean;
}

// --- Mapeo de Mensajes ---

const declineCodeMessages: { [key: string]: string } = {
  insufficient_funds: 'Fondos insuficientes. Por favor, prueba con otra tarjeta o utiliza un método de pago alternativo como PayPal.',
  do_not_honor: 'Tu banco no autorizó este cargo. Te recomendamos probar con otra tarjeta o contactar directamente a tu banco para más detalles.',
  generic_decline: 'La tarjeta fue rechazada por el banco. Intenta con otra tarjeta o contacta a tu banco.',
  fraudulent: 'El pago fue bloqueado por sospecha de fraude. Contacta a tu banco o utiliza otro método de pago.',
  lost_card: 'La tarjeta ha sido reportada como perdida. Utiliza otra tarjeta.',
  stolen_card: 'La tarjeta ha sido reportada como robada. Utiliza otra tarjeta.',
};

const errorCodeMessages: { [key: string]: string } = {
  card_declined: 'Tu tarjeta fue rechazada. Por favor, revisa los datos o prueba con otra.',
  incorrect_cvc: 'El código de seguridad (CVC) es incorrecto. Por favor, corrígelo.',
  expired_card: 'La tarjeta ha expirado. Por favor, utiliza una tarjeta válida.',
  invalid_expiry_year: 'El año de vencimiento de la tarjeta es inválido.',
  invalid_expiry_month: 'El mes de vencimiento de la tarjeta es inválido.',
  processing_error: 'Hubo un error al procesar tu pago. Por favor, inténtalo de nuevo en unos momentos.',
  authentication_required: 'Tu banco requiere autenticación adicional para completar este pago. Por favor, completa el paso de verificación (3D Secure).',
  api_error: 'El servicio de pagos no está disponible en este momento. Por favor, reintenta en unos minutos.',
  api_connection_error: 'No se pudo conectar con el servicio de pagos. Revisa tu conexión a internet e inténtalo de nuevo.',
  rate_limit: 'El sistema está experimentando un alto volumen de solicitudes. Por favor, espera un momento y vuelve a intentarlo.',
};

// --- Función Principal ---

/**
 * Procesa un error de Stripe, generando un mensaje para el usuario,
 * un payload para logging y determinando acciones de fallback.
 * @param error El objeto de error devuelto por `stripe.confirmPayment`.
 * @returns Un objeto con el mensaje para el usuario, datos para log y opciones de UI.
 */
export const handleStripeError = (error: StripeError): HandledError => {
  const { type, code, decline_code, message, payment_intent } = error;

  // @ts-ignore - Stripe puede incluir esto aunque no esté en los tipos oficiales
  const fallbacksAvailable = error.fallbacksAvailable || [];

  let userMessage = 'Ha ocurrido un error inesperado. Por favor, inténtalo de nuevo.';
  let showRetryWithNewCard = false;

  if (code && errorCodeMessages[code]) {
    userMessage = errorCodeMessages[code];
  } else if (message) {
    userMessage = message;
  }

  // Los decline_code son más específicos, por lo que tienen prioridad si existen.
  if (decline_code && declineCodeMessages[decline_code]) {
    userMessage = declineCodeMessages[decline_code];
  }

  // Determinar si se debe mostrar la opción de reintentar con otra tarjeta.
  if (type === 'card_error' || (code && ['card_declined', 'incorrect_cvc', 'expired_card'].includes(code))) {
    showRetryWithNewCard = true;
  }

  // Añadir información de depuración en modo no producción
  if (process.env.NODE_ENV !== 'production' && decline_code) {
    userMessage += ` [Código del banco: ${decline_code}]`;
  }

  // Construir el payload para logging, asegurando no incluir PII.
  const logPayload = {
    type,
    code,
    decline_code,
    payment_intent_id: payment_intent?.id,
    fallbacksAvailable,
    // No incluir `message` por defecto para evitar filtrar PII accidentalmente.
    // Se puede añadir explícitamente si se confirma que es seguro.
  };

  // Enviar a Sentry si está configurado
  if (Sentry) {
    Sentry.captureMessage(`Stripe Payment Error: ${code || type}`, {
      level: 'warning',
      extra: logPayload,
    });
  }

  // Loguear en consola para depuración
  console.warn('Stripe Payment Error:', logPayload);

  return {
    userMessage,
    logPayload,
    fallbacksAvailable,
    showRetryWithNewCard,
  };
};