const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin with service account
try {
  const serviceAccount = require('../serviceAccountKey.json');
  
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: 'teereserve-golf'
    });
  }
} catch (error) {
  console.log('⚠️  No se encontró serviceAccountKey.json, intentando con credenciales por defecto...');
  
  if (!admin.apps.length) {
    admin.initializeApp({
      projectId: 'teereserve-golf'
    });
  }
}

const db = admin.firestore();

async function setupAdminAlerts() {
  try {
    console.log('🚀 Configurando sistema de alertas de administración...');

    // 1. Crear configuraciones de roles de alerta por defecto
    console.log('📋 Creando configuraciones de roles de alerta...');
    
    const alertRoleConfigs = [
      {
        alertType: 'booking_confirmed',
        allowedRoles: ['SuperAdmin', 'CourseOwner', 'Manager'],
        isActive: true,
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now()
      },
      {
        alertType: 'payment_failed',
        allowedRoles: ['SuperAdmin', 'CourseOwner'],
        isActive: true,
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now()
      },
      {
        alertType: 'event_ticket_purchased',
        allowedRoles: ['SuperAdmin', 'CourseOwner', 'EventManager'],
        isActive: true,
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now()
      }
    ];

    // Crear configuraciones una por una para evitar problemas de batch
    for (const config of alertRoleConfigs) {
      try {
        await db.collection('alertRoleConfigs').doc(config.alertType).set(config, { merge: true });
        console.log(`✅ Configuración creada: ${config.alertType}`);
      } catch (error) {
        console.error(`❌ Error creando configuración ${config.alertType}:`, error.message);
      }
    }

    // 2. Crear roles de usuario por defecto
    console.log('👥 Creando roles de usuario por defecto...');
    
    const userRoles = [
      {
        id: 'SuperAdmin',
        name: 'Super Administrador',
        permissions: ['all'],
        description: 'Acceso completo a todas las funciones del sistema'
      },
      {
        id: 'CourseOwner',
        name: 'Propietario del Campo',
        permissions: ['manage_course', 'view_bookings', 'manage_events', 'view_alerts'],
        description: 'Propietario del campo de golf con permisos de gestión'
      },
      {
        id: 'Manager',
        name: 'Gerente',
        permissions: ['view_bookings', 'manage_bookings', 'view_alerts'],
        description: 'Gerente con permisos de gestión de reservas'
      },
      {
        id: 'EventManager',
        name: 'Gestor de Eventos',
        permissions: ['manage_events', 'view_event_tickets', 'view_alerts'],
        description: 'Especialista en gestión de eventos y torneos'
      }
    ];

    for (const role of userRoles) {
      try {
        await db.collection('userRoles').doc(role.id).set({
          name: role.name,
          permissions: role.permissions,
          description: role.description,
          createdAt: admin.firestore.Timestamp.now(),
          updatedAt: admin.firestore.Timestamp.now()
        }, { merge: true });
        console.log(`✅ Rol creado: ${role.name}`);
      } catch (error) {
        console.error(`❌ Error creando rol ${role.id}:`, error.message);
      }
    }

    // 3. Crear usuario administrador de ejemplo
    console.log('👤 Creando configuración de usuario administrador de ejemplo...');
    
    const adminUserSettings = {
      telegramChatId: '', // Se debe configurar manualmente
      role: 'SuperAdmin',
      isActive: false, // Desactivado hasta que se configure el chat ID
      alertTypes: ['booking_confirmed', 'payment_failed', 'event_ticket_purchased'],
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now()
    };

    try {
      await db.collection('userAlertSettings').doc('admin-example').set(adminUserSettings);
      console.log('✅ Usuario administrador de ejemplo creado');
    } catch (error) {
      console.error('❌ Error creando usuario administrador:', error.message);
    }

    // 4. Crear registro de ejemplo para admin_alerts
    console.log('📊 Preparando estructura de admin_alerts...');
    
    const exampleAlert = {
      type: 'system_setup',
      recipientChatId: 'system',
      message: 'Sistema de alertas configurado correctamente',
      data: {
        setupDate: new Date().toISOString(),
        version: '1.0.0'
      },
      sentAt: admin.firestore.Timestamp.now(),
      status: 'sent'
    };

    try {
      await db.collection('admin_alerts').add(exampleAlert);
      console.log('✅ Estructura de admin_alerts preparada');
    } catch (error) {
      console.error('❌ Error creando estructura admin_alerts:', error.message);
    }

    console.log('\n🎉 ¡Sistema de alertas configurado exitosamente!');
    console.log('\n📝 Pasos siguientes:');
    console.log('1. Configurar las variables de entorno de Telegram:');
    console.log('   - TELEGRAM_BOT_TOKEN: Token del bot de Telegram');
    console.log('   - O configurar en Firebase Functions: firebase functions:config:set telegram.bot_token="TU_BOT_TOKEN"');
    console.log('\n2. Configurar usuarios con sus chat IDs de Telegram:');
    console.log('   - Actualizar la colección "userAlertSettings" con los chat IDs reales');
    console.log('   - Activar los usuarios cambiando "isActive" a true');
    console.log('\n3. Probar las notificaciones realizando una reserva de prueba');

  } catch (error) {
    console.error('❌ Error configurando sistema de alertas:', error);
    throw error;
  }
}

// Ejecutar la configuración
setupAdminAlerts()
  .then(() => {
    console.log('\n✅ Configuración completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error en la configuración:', error);
    process.exit(1);
  });