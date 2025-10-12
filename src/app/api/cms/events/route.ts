import { NextRequest, NextResponse } from 'next/server';
import { auth as adminAuth } from '@/lib/firebase-admin';
import { 
  getCMSSections, 
  createCMSSection, 
  updateCMSSection,
  deleteCMSSection 
} from '@/lib/data';

// GET - Obtener todas las secciones de eventos
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token de autorización requerido' }, { status: 401 });
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    
    if (!decodedToken.admin) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    const sections = await getCMSSections();
    const eventSections = sections.filter(section => section.type === 'event');
    
    return NextResponse.json(eventSections);
  } catch (error) {
    console.error('Error al obtener secciones de eventos:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// POST - Crear nueva sección de evento
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token de autorización requerido' }, { status: 401 });
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    
    if (!decodedToken.admin) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    const sectionData = await request.json();
    
    // Validar que sea una sección de evento
    if (sectionData.type !== 'event') {
      return NextResponse.json({ error: 'Tipo de sección inválido' }, { status: 400 });
    }

    // Validar campos requeridos para eventos
    if (!sectionData.content?.title || !sectionData.content?.description) {
      return NextResponse.json({ 
        error: 'Título y descripción son requeridos para eventos' 
      }, { status: 400 });
    }

    const newSection = await createCMSSection(sectionData);
    return NextResponse.json(newSection, { status: 201 });
  } catch (error) {
    console.error('Error al crear sección de evento:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// PUT - Actualizar sección de evento existente
export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token de autorización requerido' }, { status: 401 });
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    
    if (!decodedToken.admin) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    const { id, ...updateData } = await request.json();
    
    if (!id) {
      return NextResponse.json({ error: 'ID de sección requerido' }, { status: 400 });
    }

    // Validar que sea una sección de evento
    if (updateData.type && updateData.type !== 'event') {
      return NextResponse.json({ error: 'Tipo de sección inválido' }, { status: 400 });
    }

    const updatedSection = await updateCMSSection(id, updateData);
    return NextResponse.json(updatedSection);
  } catch (error) {
    console.error('Error al actualizar sección de evento:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// DELETE - Eliminar sección de evento
export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token de autorización requerido' }, { status: 401 });
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    
    if (!decodedToken.admin) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'ID de sección requerido' }, { status: 400 });
    }

    await deleteCMSSection(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error al eliminar sección de evento:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}