import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

export async function GET(request: NextRequest) {
  try {
    if (!db) return NextResponse.json({ error: 'Admin Firestore not initialized' }, { status: 500 });
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Obtener alertas ordenadas por fecha de envío (más recientes primero)
    let query = db.collection('admin_alerts')
      .orderBy('sentAt', 'desc')
      .limit(limit);

    if (offset > 0) {
      // Para paginación, necesitaríamos implementar cursor-based pagination
      // Por simplicidad, usamos offset básico
      query = query.offset(offset);
    }

    const snapshot = await query.get();
    const alerts = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Obtener el total de documentos para paginación
    const totalSnapshot = await db.collection('admin_alerts').get();
    const total = totalSnapshot.size;

    return NextResponse.json({
      alerts,
      total,
      hasMore: (offset + limit) < total
    });
  } catch (error) {
    console.error('Error fetching alert history:', error);
    return NextResponse.json(
      { error: 'Error fetching alert history' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!db) return NextResponse.json({ error: 'Admin Firestore not initialized' }, { status: 500 });
    const { searchParams } = new URL(request.url);
    const alertId = searchParams.get('id');
    const clearAll = searchParams.get('clearAll') === 'true';

    if (clearAll) {
      // Eliminar todas las alertas (usar con precaución)
      const batch = db.batch();
      const snapshot = await db.collection('admin_alerts').get();
      
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      return NextResponse.json({ success: true, message: 'All alerts cleared' });
    } else if (alertId) {
      // Eliminar una alerta específica
      await db.collection('admin_alerts').doc(alertId).delete();
      return NextResponse.json({ success: true, message: 'Alert deleted' });
    } else {
      return NextResponse.json(
        { error: 'Alert ID or clearAll parameter is required' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error deleting alert(s):', error);
    return NextResponse.json(
      { error: 'Error deleting alert(s)' },
      { status: 500 }
    );
  }
}
