// Ejemplo de uso del template de confirmación con desglose de precios

import { sendBookingConfirmationEmail } from '../src/ai/flows/send-booking-confirmation-email';
import { getBookingConfirmationTemplate } from '../src/lib/email-templates';

// Ejemplo 1: Reserva con desglose completo de precios
const bookingWithPricing = {
  bookingId: 'BK-2024-001',
  userName: 'Juan Pérez',
  userEmail: 'juan.perez@email.com',
  courseName: 'Solmar Golf Links',
  date: '2024-02-15',
  time: '10:30',
  players: 4,
  subtotal: 336.00,  // 4 jugadores x $84 cada uno
  discount: 33.60,   // 10% de descuento
  discountCode: 'SUMMER25',
  taxes: 24.19,      // 8% de impuestos sobre el subtotal con descuento
  taxRate: 8,
  totalPrice: 326.59,
  locale: 'es'
};

// Ejemplo 2: Reserva simple sin descuentos
const simpleBooking = {
  bookingId: 'BK-2024-002',
  userName: 'María González',
  userEmail: 'maria.gonzalez@email.com',
  courseName: 'Los Cabos Golf Resort',
  date: '2024-02-20',
  time: '14:00',
  players: 2,
  totalPrice: 168.00, // 2 jugadores x $84 cada uno
  locale: 'es'
};

// Función para enviar email de confirmación con desglose
export async function sendConfirmationWithPricing(bookingData) {
  try {
    const result = await sendBookingConfirmationEmail(bookingData);
    console.log('Email enviado:', result);
    return result;
  } catch (error) {
    console.error('Error enviando email:', error);
    throw error;
  }
}

// Función para generar template con datos de ejemplo
export function generateEmailTemplate(bookingData) {
  const templateData = {
    playerName: bookingData.userName,
    courseName: bookingData.courseName,
    date: bookingData.date,
    time: bookingData.time,
    playerCount: bookingData.players,
    bookingId: bookingData.bookingId,
    subtotal: bookingData.subtotal,
    discount: bookingData.discount,
    discountCode: bookingData.discountCode,
    taxes: bookingData.taxes,
    taxRate: bookingData.taxRate,
    totalAmount: bookingData.totalPrice,
    bookingUrl: `https://teereserve.golf/booking/${bookingData.bookingId}`
  };
  
  return getBookingConfirmationTemplate(templateData);
}

// Ejemplo de uso:
// const emailTemplate = generateEmailTemplate(bookingWithPricing);
// console.log('Template generado:', emailTemplate.html);

// Para enviar el email:
// await sendConfirmationWithPricing(bookingWithPricing);