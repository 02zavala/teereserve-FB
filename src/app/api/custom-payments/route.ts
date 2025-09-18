import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, updateDoc, doc, getDoc } from 'firebase/firestore';
import { telegramService } from '@/lib/telegram-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      paymentMethod, 
      bookingId, 
      amount, 
      customerId, 
      customerEmail,
      customerName 
    } = body;

    // Validar datos requeridos
    if (!paymentMethod || !bookingId || !amount || !customerId) {
      return NextResponse.json(
        { error: 'Faltan datos requeridos' },
        { status: 400 }
      );
    }

    // Crear registro de pago personalizado
    const paymentData = {
      id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: paymentMethod,
      bookingId,
      customerId,
      customerEmail,
      customerName,
      amount,
      currency: 'USD',
      status: paymentMethod === 'cash' ? 'pending_cash' : 'pending_transfer',
      createdAt: new Date(),
      metadata: {
        paymentMethod,
        requiresManualConfirmation: true
      }
    };

    // Guardar en Firestore
    const paymentRef = await addDoc(collection(db, 'custom_payments'), paymentData);

    // Actualizar el estado de la reserva
    const bookingRef = doc(db, 'bookings', bookingId);
    await updateDoc(bookingRef, {
      paymentStatus: paymentMethod === 'cash' ? 'pending_cash_payment' : 'pending_bank_transfer',
      paymentMethod: paymentMethod,
      customPaymentId: paymentRef.id,
      updatedAt: new Date()
    });

    // Enviar notificación por Telegram a los administradores
    const message = paymentMethod === 'cash' 
      ? `🏌️ Nueva reserva con pago en efectivo pendiente
      
📋 Reserva: ${bookingId}
👤 Cliente: ${customerName}
📧 Email: ${customerEmail}
💰 Monto: $${amount.toLocaleString('en-US')} USD
⏰ Creada: ${new Date().toLocaleString('es-MX')}

⚠️ El cliente debe presentarse 15 minutos antes de su tee time para pagar en efectivo.`
      : `🏌️ Nueva reserva con transferencia bancaria pendiente
      
📋 Reserva: ${bookingId}
👤 Cliente: ${customerName}
📧 Email: ${customerEmail}
💰 Monto: $${amount.toLocaleString('en-US')} USD
⏰ Creada: ${new Date().toLocaleString('es-MX')}

💳 El cliente debe realizar la transferencia con referencia: ${bookingId}
⚠️ Confirmar pago manualmente una vez recibida la transferencia.`;

    await telegramService.sendAdminAlert(message, 'payment');

    return NextResponse.json({
      success: true,
      paymentId: paymentRef.id,
      status: paymentData.status,
      message: paymentMethod === 'cash' 
        ? 'Reserva confirmada. Recuerda pagar en efectivo en el club.'
        : 'Reserva pendiente. Realiza la transferencia bancaria para confirmar.'
    });

  } catch (error) {
    console.error('Error processing custom payment:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { paymentId, action, adminId } = body;

    if (!paymentId || !action) {
      return NextResponse.json(
        { error: 'Faltan datos requeridos' },
        { status: 400 }
      );
    }

    // Obtener el pago personalizado
    const paymentRef = doc(db, 'custom_payments', paymentId);
    const paymentDoc = await getDoc(paymentRef);

    if (!paymentDoc.exists()) {
      return NextResponse.json(
        { error: 'Pago no encontrado' },
        { status: 404 }
      );
    }

    const paymentData = paymentDoc.data();

    if (action === 'confirm') {
      // Confirmar el pago
      await updateDoc(paymentRef, {
        status: 'confirmed',
        confirmedAt: new Date(),
        confirmedBy: adminId
      });

      // Actualizar la reserva
      const bookingRef = doc(db, 'bookings', paymentData.bookingId);
      await updateDoc(bookingRef, {
        paymentStatus: 'paid',
        paidAt: new Date(),
        updatedAt: new Date()
      });

      // Notificar confirmación
      const message = `✅ Pago confirmado manualmente
      
📋 Reserva: ${paymentData.bookingId}
👤 Cliente: ${paymentData.customerName}
💰 Monto: $${paymentData.amount.toLocaleString('en-US')} USD
👨‍💼 Confirmado por: Admin ${adminId}
⏰ Confirmado: ${new Date().toLocaleString('es-MX')}`;

      await telegramService.sendAdminAlert(message, 'payment');

      return NextResponse.json({
        success: true,
        message: 'Pago confirmado exitosamente'
      });

    } else if (action === 'reject') {
      // Rechazar el pago
      await updateDoc(paymentRef, {
        status: 'rejected',
        rejectedAt: new Date(),
        rejectedBy: adminId
      });

      // Actualizar la reserva
      const bookingRef = doc(db, 'bookings', paymentData.bookingId);
      await updateDoc(bookingRef, {
        paymentStatus: 'payment_failed',
        updatedAt: new Date()
      });

      return NextResponse.json({
        success: true,
        message: 'Pago rechazado'
      });
    }

    return NextResponse.json(
      { error: 'Acción no válida' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error updating custom payment:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const bookingId = searchParams.get('bookingId');

    // Aquí podrías implementar la lógica para obtener pagos personalizados
    // Por ejemplo, obtener todos los pagos pendientes para el panel de admin

    return NextResponse.json({
      success: true,
      message: 'Endpoint para consultar pagos personalizados'
    });

  } catch (error) {
    console.error('Error fetching custom payments:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}