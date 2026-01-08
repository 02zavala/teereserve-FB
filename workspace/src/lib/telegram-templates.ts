export interface BookingNotificationData {
  bookingId: string;
  playerCount: number;
  date: string;
  time: string;
  paymentMethod: 'stripe' | 'paypal' | 'apple_pay' | 'google_pay';
  transactionStatus: 'confirmed' | 'pending' | 'failed';
  amount: number;
  currency: string;
  customerName?: string;
  customerEmail?: string;
  courseName?: string;
  transactionId?: string;
}

export interface EventTicketNotificationData {
  eventId: string;
  eventName: string;
  ticketType: string;
  quantity: number;
  date: string;
  time: string;
  paymentMethod: 'stripe' | 'paypal' | 'apple_pay' | 'google_pay';
  transactionStatus: 'confirmed' | 'pending' | 'failed';
  amount: number;
  currency: string;
  customerName?: string;
  customerEmail?: string;
  transactionId?: string;
}

export class TelegramMessageTemplates {
  static formatBookingNotification(data: BookingNotificationData): string {
    const statusEmoji = this.getStatusEmoji(data.transactionStatus);
    const paymentEmoji = this.getPaymentMethodEmoji(data.paymentMethod);
    
    return `🏌️ *Nueva Reserva de Campo*

👥 *Jugadores:* ${data.playerCount}
📅 *Fecha:* ${data.date}
⏰ *Hora:* ${data.time}
${data.courseName ? `🏌️ *Campo:* ${data.courseName}\n` : ''}
${paymentEmoji} *Método de pago:* ${this.formatPaymentMethod(data.paymentMethod)}
💰 *Monto:* ${data.amount} ${data.currency.toUpperCase()}
${statusEmoji} *Estado:* ${this.formatTransactionStatus(data.transactionStatus)}

👤 *Cliente:* ${data.customerName || 'N/A'}
📧 *Email:* ${data.customerEmail || 'N/A'}
🆔 *ID Reserva:* \`${data.bookingId}\`
${data.transactionId ? `💳 *ID Transacción:* \`${data.transactionId}\`` : ''}

⏰ *Notificación enviada:* ${new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })}`;
  }

  static formatEventTicketNotification(data: EventTicketNotificationData): string {
    const statusEmoji = this.getStatusEmoji(data.transactionStatus);
    const paymentEmoji = this.getPaymentMethodEmoji(data.paymentMethod);
    
    return `🎟️ *Nueva Compra de Tickets*

🏆 *Evento:* ${data.eventName}
🎫 *Tipo de Ticket:* ${data.ticketType}
🔢 *Cantidad:* ${data.quantity}
📅 *Fecha del Evento:* ${data.date}
⏰ *Hora:* ${data.time}
${paymentEmoji} *Método de pago:* ${this.formatPaymentMethod(data.paymentMethod)}
💰 *Monto:* ${data.amount} ${data.currency.toUpperCase()}
${statusEmoji} *Estado:* ${this.formatTransactionStatus(data.transactionStatus)}

👤 *Cliente:* ${data.customerName || 'N/A'}
📧 *Email:* ${data.customerEmail || 'N/A'}
🆔 *ID Evento:* \`${data.eventId}\`
${data.transactionId ? `💳 *ID Transacción:* \`${data.transactionId}\`` : ''}

⏰ *Notificación enviada:* ${new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })}`;
  }

  static formatPaymentFailedNotification(data: BookingNotificationData | EventTicketNotificationData): string {
    const paymentEmoji = this.getPaymentMethodEmoji(data.paymentMethod);
    const isBooking = 'playerCount' in data;
    
    return `❌ *Pago Fallido*

${isBooking ? '🏌️ *Reserva de Campo*' : '🎟️ *Compra de Tickets*'}
${isBooking ? `👥 *Jugadores:* ${(data as BookingNotificationData).playerCount}` : `🎫 *Tickets:* ${(data as EventTicketNotificationData).quantity} x ${(data as EventTicketNotificationData).ticketType}`}
📅 *Fecha:* ${data.date}
⏰ *Hora:* ${data.time}
${paymentEmoji} *Método de pago:* ${this.formatPaymentMethod(data.paymentMethod)}
💰 *Monto:* ${data.amount} ${data.currency.toUpperCase()}

👤 *Cliente:* ${data.customerName || 'N/A'}
📧 *Email:* ${data.customerEmail || 'N/A'}
${data.transactionId ? `💳 *ID Transacción:* \`${data.transactionId}\`` : ''}

⚠️ *Acción requerida:* Revisar el estado del pago y contactar al cliente si es necesario.

⏰ *Notificación enviada:* ${new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })}`;
  }

  private static getStatusEmoji(status: string): string {
    switch (status) {
      case 'confirmed':
        return '✅';
      case 'pending':
        return '⏳';
      case 'failed':
        return '❌';
      default:
        return '❓';
    }
  }

  private static getPaymentMethodEmoji(method: string): string {
    switch (method) {
      case 'stripe':
        return '💳';
      case 'paypal':
        return '🅿️';
      case 'apple_pay':
        return '🍎';
      case 'google_pay':
        return '🔵';
      default:
        return '💳';
    }
  }

  private static formatPaymentMethod(method: string): string {
    switch (method) {
      case 'stripe':
        return 'Stripe (Tarjeta)';
      case 'paypal':
        return 'PayPal';
      case 'apple_pay':
        return 'Apple Pay';
      case 'google_pay':
        return 'Google Pay';
      default:
        return method.toUpperCase();
    }
  }

  private static formatTransactionStatus(status: string): string {
    switch (status) {
      case 'confirmed':
        return 'Confirmado';
      case 'pending':
        return 'Pendiente';
      case 'failed':
        return 'Fallido';
      default:
        return status;
    }
  }
}