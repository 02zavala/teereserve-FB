// NUEVO: API endpoint para registrar IP de usuarios durante autenticación
import { NextRequest, NextResponse } from 'next/server';
import { logUserIPAdmin } from '@/lib/data-admin';

// Función para obtener la IP del cliente
function getClientIP(request: NextRequest): string {
    // Intentar obtener la IP de varios headers
    const forwarded = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip');
    const cfConnectingIP = request.headers.get('cf-connecting-ip');
    
    if (forwarded) {
        // x-forwarded-for puede contener múltiples IPs, tomar la primera
        return forwarded.split(',')[0].trim();
    }
    
    if (realIP) {
        return realIP;
    }
    
    if (cfConnectingIP) {
        return cfConnectingIP;
    }
    
    // Fallback genérico si no se puede determinar
    return 'unknown';
}

// Función para obtener información de geolocalización básica (opcional)
function getLocationFromIP(ip: string): string {
    // En una implementación real, podrías usar un servicio como:
    // - MaxMind GeoIP
    // - ipapi.co
    // - ipgeolocation.io
    // Por ahora, retornamos un placeholder
    return 'Unknown';
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { userId, action } = body;
        
        // Validar parámetros requeridos
        const allowedActions = ['login', 'register', 'guest_booking', 'visit'];
        if (!action || !allowedActions.includes(action)) {
            return NextResponse.json(
                { error: 'Valid action parameter is required (login, register, guest_booking, visit)' },
                { status: 400 }
            );
        }

        // Para acciones distintas de 'visit', exigir userId
        if (action !== 'visit' && (!userId || typeof userId !== 'string')) {
            return NextResponse.json(
                { error: 'userId parameter is required for this action' },
                { status: 400 }
            );
        }
        
        // Obtener información del request
        const userAgent = request.headers.get('user-agent') || '';
        const clientIP = getClientIP(request);
        const location = getLocationFromIP(clientIP);
        
        // Datos del registro de IP
        const ipData = {
            userId: userId ?? null,
            ipAddress: clientIP,
            action: action as 'login' | 'register' | 'guest_booking' | 'visit',
            userAgent,
            location
        };
        
        // Registrar la IP en Firebase usando Admin SDK
        await logUserIPAdmin(ipData);
        
        return NextResponse.json({ 
            success: true, 
            message: 'User IP logged successfully',
            data: {
                userId,
                action,
                ipAddress: clientIP,
                timestamp: new Date().toISOString()
            }
        });
        
    } catch (error) {
        console.error('Error logging user IP:', error);
        
        // No fallar la autenticación del usuario, solo loggear el error
        return NextResponse.json(
            { 
                success: false, 
                error: 'Failed to log user IP',
                message: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}

// Método GET para verificar que el endpoint está funcionando
export async function GET() {
    return NextResponse.json({
        message: 'User IP logging endpoint is active',
        timestamp: new Date().toISOString(),
        supportedActions: ['login', 'register', 'guest_booking', 'visit']
    });
}
