import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

export async function GET() {
  try {
    if (!db) return NextResponse.json({ error: 'Admin Firestore not initialized' }, { status: 500 });
    const snapshot = await db.collection('alertRoleConfigs').get();
    const configs = snapshot.docs.map(doc => ({
      alertType: doc.id,
      ...doc.data()
    }));

    return NextResponse.json(configs);
  } catch (error) {
    console.error('Error fetching role configs:', error);
    return NextResponse.json(
      { error: 'Error fetching role configurations' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!db) return NextResponse.json({ error: 'Admin Firestore not initialized' }, { status: 500 });
    const configData = await request.json();
    
    // Validar datos requeridos
    if (!configData.alertType || !configData.allowedRoles) {
      return NextResponse.json(
        { error: 'Missing required fields: alertType, allowedRoles' },
        { status: 400 }
      );
    }

    // Preparar datos para guardar
    const configToSave: {
      alertType: string;
      allowedRoles: any[];
      isActive: boolean;
      updatedAt: string;
      createdAt?: string;
    } = {
      alertType: configData.alertType,
      allowedRoles: configData.allowedRoles,
      isActive: configData.isActive ?? true,
      updatedAt: new Date().toISOString()
    };

    // Si no existe createdAt, agregarlo
    const existingDoc = await db.collection('alertRoleConfigs').doc(configData.alertType).get();
    if (!existingDoc.exists) {
      configToSave.createdAt = new Date().toISOString();
    }

    await db.collection('alertRoleConfigs').doc(configData.alertType).set(configToSave, { merge: true });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving role config:', error);
    return NextResponse.json(
      { error: 'Error saving role configuration' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!db) return NextResponse.json({ error: 'Admin Firestore not initialized' }, { status: 500 });
    const { searchParams } = new URL(request.url);
    const alertType = searchParams.get('alertType');

    if (!alertType) {
      return NextResponse.json(
        { error: 'Alert type is required' },
        { status: 400 }
      );
    }

    await db.collection('alertRoleConfigs').doc(alertType).delete();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting role config:', error);
    return NextResponse.json(
      { error: 'Error deleting role configuration' },
      { status: 500 }
    );
  }
}
