import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const { phoneNumber, bookingDetails } = await request.json();

        if (!phoneNumber || !bookingDetails) {
            return NextResponse.json(
                { error: 'Faltan datos requeridos' },
                { status: 400 }
            );
        }

        const {
            courseName,
            courseLocation,
            date,
            time,
            players,
            holes,
            totalPrice,
            userName
        } = bookingDetails;

        // Formatear el mensaje para WhatsApp
        const message = `🏌️ *Confirmación de Reserva - TeeReserve*\n\n` +
            `¡Hola ${userName}!\n\n` +
            `Tu reserva ha sido confirmada exitosamente:\n\n` +
            `📍 *Campo:* ${courseName}\n` +
            `📍 *Ubicación:* ${courseLocation}\n` +
            `📅 *Fecha:* ${date}\n` +
            `⏰ *Hora:* ${time}\n` +
            `👥 *Jugadores:* ${players}\n` +
            `⛳ *Hoyos:* ${holes}\n` +
            `💰 *Total Pagado:* $${totalPrice ? parseFloat(totalPrice).toFixed(2) : '0.00'}\n\n` +
            `📋 *Información Importante:*\n` +
            `• Llega 30 minutos antes de tu hora de salida\n` +
            `• Presenta este mensaje o tu identificación en recepción\n` +
            `• Para cambios o cancelaciones, contacta directamente con el campo\n\n` +
            `¡Esperamos verte en el campo! 🏌️‍♂️\n\n` +
            `_Reservado a través de TeeReserve Golf_`;

        // Crear URL de WhatsApp
        const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;

        // En un entorno de producción, aquí podrías integrar con una API de WhatsApp Business
        // Por ahora, devolvemos la URL para que se pueda abrir manualmente
        
        return NextResponse.json(
            { 
                message: 'URL de WhatsApp generada exitosamente',
                whatsappUrl: whatsappUrl,
                success: true
            },
            { status: 200 }
        );

    } catch (error) {
        console.error('Error generando notificación de WhatsApp:', error);
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        );
    }
}