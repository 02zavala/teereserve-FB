import { NextResponse } from 'next/server';
import { sendBookingConfirmation, sendAdminBookingNotification } from '@/lib/email.js';
import { telegramService } from '@/lib/telegram-service';
import { generateReceiptPdf } from '@/lib/receipt-pdf';

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function GET() {
  return NextResponse.json({ status: 'ok' });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { recipientEmail, bookingDetails } = body || {};

    if (!recipientEmail || !isValidEmail(recipientEmail)) {
      return NextResponse.json(
        { error: 'Correo inválido o faltante' },
        { status: 400 }
      );
    }

    if (!bookingDetails || typeof bookingDetails !== 'object') {
      return NextResponse.json(
        { error: 'Detalles de reserva faltantes' },
        { status: 400 }
      );
    }

    // Validar campos clave mínimos
    const required = ['courseName', 'date', 'time', 'players'];
    const missing = required.filter((f) => !bookingDetails[f]);
    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Campos faltantes en la reserva: ${missing.join(', ')}` },
        { status: 400 }
      );
    }

    // Normalizar datos y compatibilidad con la plantilla
    const normalizedDetails = {
      playerName: bookingDetails.userName || bookingDetails.playerName || 'Cliente',
      confirmationNumber: bookingDetails.confirmationNumber,
      courseName: bookingDetails.courseName,
      courseLocation: bookingDetails.courseLocation,
      date: bookingDetails.date,
      time: bookingDetails.time,
      players: bookingDetails.players,
      holes: bookingDetails.holes || '18',
      totalPrice: bookingDetails.totalPrice,
      pricing_snapshot: bookingDetails.pricing_snapshot,
      paymentMethod: bookingDetails.paymentMethod,
      transactionId: bookingDetails.transactionId,
      cardLast4: bookingDetails.cardLast4 || bookingDetails.card_last4 || bookingDetails.last4 || bookingDetails?.paymentDetails?.last4,
      cardBrand: bookingDetails.cardBrand || bookingDetails.card_brand || bookingDetails.brand || bookingDetails?.paymentDetails?.brand,
      customerPhone: bookingDetails.customerPhone || bookingDetails.phone || bookingDetails.contactPhone,
    };

    // Generar PDF del recibo y adjuntarlo
    const { buffer, filename } = await generateReceiptPdf({
      bookingId: normalizedDetails?.confirmationNumber,
      confirmationNumber: normalizedDetails?.confirmationNumber,
      courseName: normalizedDetails.courseName,
      courseLocation: normalizedDetails.courseLocation,
      date: normalizedDetails.date,
      time: normalizedDetails.time,
      players: normalizedDetails.players,
      holes: normalizedDetails.holes,
      totalPrice: normalizedDetails.totalPrice,
      customerName: normalizedDetails.playerName,
      customerEmail: recipientEmail,
    }, { lang: 'bilingual' });

    const result = await sendBookingConfirmation(recipientEmail, normalizedDetails, [{
      filename,
      content: buffer.toString('base64'),
    }]);

    if (!result?.success) {
      return NextResponse.json(
        {
          error: 'Error enviando el comprobante',
          details: String((result as any)?.error) || 'Fallo desconocido',
        },
        { status: 500 }
      );
    }

    // Enviar notificación básica al correo del administrador (no bloquea la respuesta)
    try {
      const adminEmail = process.env.ADMIN_EMAIL_ADDRESS || 'info@teereserve.golf';
      const adminDetails = {
        bookingId: normalizedDetails.confirmationNumber || 'N/A',
        customerName: normalizedDetails.playerName || 'Cliente',
        customerEmail: recipientEmail,
        customerPhone: normalizedDetails.customerPhone || 'N/A',
        courseName: normalizedDetails.courseName,
        date: normalizedDetails.date,
        time: normalizedDetails.time,
        players: normalizedDetails.players,
        totalPrice: normalizedDetails.totalPrice,
        paymentStatus: 'Completado',
      };

      await sendAdminBookingNotification(adminEmail, adminDetails);
    } catch (adminEmailError) {
      console.warn('[send-booking-receipt] Admin booking notification failed:', adminEmailError);
    }

    // Enviar alerta por Telegram al chat de admin (si está configurado)
    try {
      const adminChatId = process.env.ADMIN_TELEGRAM_CHAT_ID || process.env.TELEGRAM_CHAT_ID;
      if (adminChatId && process.env.TELEGRAM_BOT_TOKEN) {
        telegramService.updateConfig({ chatId: adminChatId, enabled: true });
        // Moneda: forzar USD como estándar solicitado
        const currency = 'USD';

        // Método de pago: normalizar, pero mostrar la etiqueta tal como se recibe
        const pmRawOriginal = (normalizedDetails.paymentMethod || '').trim();
        const pmRaw = pmRawOriginal.toLowerCase().replace(/\s+/g, '_');
        let paymentMethod: 'stripe' | 'paypal' | 'apple_pay' | 'google_pay' = 'stripe';
        if (pmRaw.includes('paypal')) paymentMethod = 'paypal';
        else if (pmRaw.includes('apple')) paymentMethod = 'apple_pay';
        else if (pmRaw.includes('google')) paymentMethod = 'google_pay';
        else if (pmRaw.includes('card') || pmRaw.includes('tarjeta') || pmRaw.includes('visa') || pmRaw.includes('master') || pmRaw.includes('stripe')) paymentMethod = 'stripe';
        if (normalizedDetails.cardLast4 || normalizedDetails.cardBrand) paymentMethod = 'stripe';
        const alert = {
          type: 'booking' as const,
          courseName: normalizedDetails.courseName,
          playerCount: normalizedDetails.players,
          date: normalizedDetails.date,
          time: normalizedDetails.time,
          paymentMethod,
          paymentLabel: pmRawOriginal || paymentMethod,
          transactionId: (normalizedDetails.confirmationNumber || normalizedDetails.transactionId || 'unknown'),
          amount: Number(normalizedDetails.totalPrice) || 0,
          currency,
          customerEmail: recipientEmail,
          customerName: normalizedDetails.playerName || 'Cliente',
          customerPhone: normalizedDetails.customerPhone,
          cardLast4: normalizedDetails.cardLast4,
          cardBrand: normalizedDetails.cardBrand,
        };
        await telegramService.sendBookingAlert(alert);
      }
    } catch (tgError) {
      console.warn('[send-booking-receipt] Admin Telegram alert failed:', tgError);
    }

    return NextResponse.json({ success: true, message: 'Comprobante enviado correctamente' });
  } catch (error: any) {
    const message = error?.message || 'Error interno del servidor';
    console.error('[send-booking-receipt] POST error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
