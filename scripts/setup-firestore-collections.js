// Script para configurar las colecciones de Firestore manualmente
// Este script genera los datos que se deben agregar a Firestore

console.log('🚀 Generando configuración para Firestore...\n');

// 1. Configuraciones de roles de alerta
console.log('📋 CONFIGURACIONES DE ROLES DE ALERTA (Colección: alertRoleConfigs)');
console.log('================================================================\n');

const alertRoleConfigs = [
  {
    documentId: 'booking_confirmed',
    data: {
      alertType: 'booking_confirmed',
      allowedRoles: ['SuperAdmin', 'CourseOwner', 'Manager'],
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  },
  {
    documentId: 'payment_failed',
    data: {
      alertType: 'payment_failed',
      allowedRoles: ['SuperAdmin', 'CourseOwner'],
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  },
  {
    documentId: 'event_ticket_purchased',
    data: {
      alertType: 'event_ticket_purchased',
      allowedRoles: ['SuperAdmin', 'CourseOwner', 'EventManager'],
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  }
];

alertRoleConfigs.forEach(config => {
  console.log(`Documento ID: ${config.documentId}`);
  console.log('Datos:', JSON.stringify(config.data, null, 2));
  console.log('---\n');
});

// 2. Roles de usuario
console.log('👥 ROLES DE USUARIO (Colección: userRoles)');
console.log('==========================================\n');

const userRoles = [
  {
    documentId: 'SuperAdmin',
    data: {
      name: 'Super Administrador',
      permissions: ['all'],
      description: 'Acceso completo a todas las funciones del sistema',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  },
  {
    documentId: 'CourseOwner',
    data: {
      name: 'Propietario del Campo',
      permissions: ['manage_course', 'view_bookings', 'manage_events', 'view_alerts'],
      description: 'Propietario del campo de golf con permisos de gestión',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  },
  {
    documentId: 'Manager',
    data: {
      name: 'Gerente',
      permissions: ['view_bookings', 'manage_bookings', 'view_alerts'],
      description: 'Gerente con permisos de gestión de reservas',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  },
  {
    documentId: 'EventManager',
    data: {
      name: 'Gestor de Eventos',
      permissions: ['manage_events', 'view_event_tickets', 'view_alerts'],
      description: 'Especialista en gestión de eventos y torneos',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  }
];

userRoles.forEach(role => {
  console.log(`Documento ID: ${role.documentId}`);
  console.log('Datos:', JSON.stringify(role.data, null, 2));
  console.log('---\n');
});

// 3. Configuración de usuario administrador de ejemplo
console.log('👤 CONFIGURACIÓN DE USUARIO ADMINISTRADOR (Colección: userAlertSettings)');
console.log('======================================================================\n');

const adminUserSettings = {
  documentId: 'admin-example',
  data: {
    telegramChatId: '', // Se debe configurar manualmente
    role: 'SuperAdmin',
    isActive: false, // Desactivado hasta que se configure el chat ID
    alertTypes: ['booking_confirmed', 'payment_failed', 'event_ticket_purchased'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
};

console.log(`Documento ID: ${adminUserSettings.documentId}`);
console.log('Datos:', JSON.stringify(adminUserSettings.data, null, 2));
console.log('---\n');

// 4. Ejemplo de alerta para admin_alerts
console.log('📊 EJEMPLO DE ALERTA (Colección: admin_alerts)');
console.log('==============================================\n');

const exampleAlert = {
  data: {
    type: 'system_setup',
    recipientChatId: 'system',
    message: 'Sistema de alertas configurado correctamente',
    data: {
      setupDate: new Date().toISOString(),
      version: '1.0.0'
    },
    sentAt: new Date().toISOString(),
    status: 'sent'
  }
};

console.log('Datos (usar "Agregar documento" con ID automático):');
console.log(JSON.stringify(exampleAlert.data, null, 2));
console.log('---\n');

console.log('🎉 CONFIGURACIÓN GENERADA EXITOSAMENTE!');
console.log('\n📝 PASOS PARA CONFIGURAR EN FIREBASE CONSOLE:');
console.log('1. Ir a Firebase Console: https://console.firebase.google.com/');
console.log('2. Seleccionar el proyecto "teereserve-golf"');
console.log('3. Ir a Firestore Database');
console.log('4. Crear las colecciones y documentos con los datos mostrados arriba');
console.log('\n🔧 CONFIGURACIÓN ADICIONAL NECESARIA:');
console.log('1. Configurar TELEGRAM_BOT_TOKEN en las variables de entorno');
console.log('2. Actualizar telegramChatId en userAlertSettings con IDs reales');
console.log('3. Cambiar isActive a true para activar las notificaciones');
console.log('\n✅ Una vez configurado, las notificaciones de Telegram funcionarán automáticamente');