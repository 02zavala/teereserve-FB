import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';

// Initialize Firebase Admin
if (!getApps().length) {
  try {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  } catch (error) {
    console.error('Error initializing Firebase Admin:', error);
  }
}

const db = getFirestore();

export async function GET() {
  try {
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
    const configData = await request.json();
    
    // Validar datos requeridos
    if (!configData.alertType || !configData.allowedRoles) {
      return NextResponse.json(
        { error: 'Missing required fields: alertType, allowedRoles' },
        { status: 400 }
      );
    }

    // Preparar datos para guardar
    const configToSave = {
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