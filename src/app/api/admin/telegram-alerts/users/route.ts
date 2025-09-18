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
    const snapshot = await db.collection('userAlertSettings').get();
    const users = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return NextResponse.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Error fetching users' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userData = await request.json();
    
    // Validar datos requeridos
    if (!userData.telegramChatId || !userData.role) {
      return NextResponse.json(
        { error: 'Missing required fields: telegramChatId, role' },
        { status: 400 }
      );
    }

    // Preparar datos para guardar
    const userToSave = {
      telegramChatId: userData.telegramChatId,
      role: userData.role,
      isActive: userData.isActive ?? true,
      alertTypes: userData.alertTypes || [],
      createdAt: userData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Guardar o actualizar usuario
    if (userData.id) {
      await db.collection('userAlertSettings').doc(userData.id).set(userToSave, { merge: true });
    } else {
      await db.collection('userAlertSettings').add(userToSave);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving user:', error);
    return NextResponse.json(
      { error: 'Error saving user' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    await db.collection('userAlertSettings').doc(userId).delete();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Error deleting user' },
      { status: 500 }
    );
  }
}