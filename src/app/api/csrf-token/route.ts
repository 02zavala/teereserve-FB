import { NextRequest, NextResponse } from 'next/server';
import { SecurityUtils } from '@/lib/security';

export async function GET(request: NextRequest) {
  try {
    // Obtener token existente del cookie
    const existingToken = request.cookies.get('csrf-token')?.value;
    
    if (existingToken) {
      // Devolver token existente
      return NextResponse.json({ token: existingToken });
    }
    
    // Generar nuevo token
    const newToken = SecurityUtils.generateCSRFToken();
    
    const response = NextResponse.json({ token: newToken });
    
    // Establecer cookie con el nuevo token
    response.cookies.set('csrf-token', newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24, // 24 horas
      path: '/'
    });
    
    return response;
  } catch (error) {
    console.error('Error generando CSRF token:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// Endpoint para validar token CSRF
export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();
    const cookieToken = request.cookies.get('csrf-token')?.value;
    
    if (!token || !cookieToken) {
      return NextResponse.json(
        { valid: false, error: 'Token no proporcionado' },
        { status: 400 }
      );
    }
    
    const isValid = SecurityUtils.validateCSRFToken(token, cookieToken);
    
    return NextResponse.json({ valid: isValid });
  } catch (error) {
    console.error('Error validando CSRF token:', error);
    return NextResponse.json(
      { valid: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}