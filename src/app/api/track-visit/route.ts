// NUEVO: API endpoint para registrar visitas
import { NextRequest, NextResponse } from 'next/server';
import { logVisit } from '@/lib/data';
import { headers } from 'next/headers';

// Función para generar un sessionId único basado en IP y User-Agent
function generateSessionId(ip: string, userAgent: string): string {
    const combined = `${ip}-${userAgent}`;
    // Crear un hash simple para el sessionId
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
        const char = combined.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convertir a 32-bit integer
    }
    return Math.abs(hash).toString(36);
}

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
    
    // Fallback a la IP de la conexión
    return request.ip || 'unknown';
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { page, referer } = body;
        
        // Validar que se proporcione la página
        if (!page || typeof page !== 'string') {
            return NextResponse.json(
                { error: 'Page parameter is required' },
                { status: 400 }
            );
        }
        
        // Obtener información del request
        const userAgent = request.headers.get('user-agent') || '';
        const clientIP = getClientIP(request);
        const sessionId = generateSessionId(clientIP, userAgent);
        
        // Datos de la visita
        const visitData = {
            page: page.toLowerCase(),
            userAgent,
            referer: referer || '',
            sessionId,
            ipAddress: clientIP
        };
        
        // Registrar la visita en Firebase
        await logVisit(visitData);
        
        return NextResponse.json({ 
            success: true, 
            message: 'Visit tracked successfully',
            sessionId // Devolver sessionId para debugging si es necesario
        });
        
    } catch (error) {
        console.error('Error tracking visit:', error);
        
        // No fallar la request del usuario, solo loggear el error
        return NextResponse.json(
            { 
                success: false, 
                error: 'Failed to track visit',
                message: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}

// Método GET para verificar que el endpoint está funcionando
export async function GET() {
    return NextResponse.json({
        message: 'Visit tracking endpoint is active',
        timestamp: new Date().toISOString()
    });
}