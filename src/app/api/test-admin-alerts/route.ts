import { NextRequest, NextResponse } from 'next/server';
import { adminAlertsService } from '@/lib/admin-alerts-service';

export async function POST(request: NextRequest) {
  try {
    // Verificar que sea una petición autorizada (en producción, añadir autenticación)
    const authHeader = request.headers.get('authorization');
    if (!authHeader || authHeader !== `Bearer ${process.env.ADMIN_API_KEY}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type } = body;

    if (type === 'test') {
      // Enviar alertas de prueba
      const results = await adminAlertsService.sendTestAlerts();
      
      return NextResponse.json({
        success: true,
        message: 'Test alerts sent',
        results,
        summary: {
          total: results.length,
          successful: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length
        }
      });
    } else if (type === 'status') {
      // Obtener estado de configuración
      const status = adminAlertsService.getStatus();
      
      return NextResponse.json({
        success: true,
        status
      });
    } else if (type === 'booking') {
      // Simular alerta de reserva confirmada
      const { bookingData } = body;
      
      if (!bookingData) {
        return NextResponse.json({ error: 'bookingData is required' }, { status: 400 });
      }

      const testBookingData = {
        bookingId: bookingData.bookingId || 'TEST-' + Date.now(),
        courseName: bookingData.courseName || 'Campo de Prueba',
        customerName: bookingData.customerName || 'Cliente de Prueba',
        customerEmail: bookingData.customerEmail || 'test@example.com',
        customerPhone: bookingData.customerPhone,
        date: bookingData.date || new Date().toLocaleDateString('es-ES'),
        time: bookingData.time || '10:00',
        players: bookingData.players || 2,
        totalAmount: bookingData.totalAmount || 50,
        currency: bookingData.currency || 'EUR',
        paymentMethod: bookingData.paymentMethod || 'stripe',
        transactionId: bookingData.transactionId || 'test_transaction_' + Date.now(),
        bookingUrl: bookingData.bookingUrl || `${process.env.NEXT_PUBLIC_BASE_URL}/booking/test`,
        createdAt: new Date()
      };

      const results = await adminAlertsService.sendBookingConfirmedAlert(testBookingData);
      
      return NextResponse.json({
        success: true,
        message: 'Booking alert sent',
        bookingData: testBookingData,
        results,
        summary: {
          total: results.length,
          successful: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length
        }
      });
    } else {
      return NextResponse.json({ error: 'Invalid type. Use "test", "status", or "booking"' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in test-admin-alerts API:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verificar que sea una petición autorizada
    const authHeader = request.headers.get('authorization');
    if (!authHeader || authHeader !== `Bearer ${process.env.ADMIN_API_KEY}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Obtener estado de configuración
    const status = adminAlertsService.getStatus();
    
    return NextResponse.json({
      success: true,
      status,
      endpoints: {
        test: 'POST /api/test-admin-alerts with { "type": "test" }',
        status: 'POST /api/test-admin-alerts with { "type": "status" }',
        booking: 'POST /api/test-admin-alerts with { "type": "booking", "bookingData": {...} }'
      }
    });
  } catch (error) {
    console.error('Error in test-admin-alerts GET:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}