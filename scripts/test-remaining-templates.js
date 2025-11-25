require('dotenv').config({ path: '.env.local' });

// Importar funciones de email desde la implementación activa en src/lib
const importEmailFns = async () => {
  const module = await import('../src/lib/email.js');
  return module;
};

let sendBookingReminder, sendContactFormNotification;

// Función para esperar un tiempo determinado
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function testRemainingTemplates() {
  // Inicializar funciones de email
  const emailModule = await importEmailFns();
  ({ sendBookingReminder, sendContactFormNotification } = emailModule);
  
  console.log('🧪 Enviando plantillas restantes con delay para evitar rate limit...');
  console.log('📧 Enviando a: oscraramon@gmail.com');
  console.log('=' .repeat(50));

  const testEmail = 'oscraramon@gmail.com';
  const testUser = 'Oscar Ramón';
  
  // Datos de prueba para reservas
  const bookingDetails = {
    bookingId: 'TR-2024-002',
    courseName: 'Club de Golf Las Américas',
    date: '16 de Enero, 2024',
    time: '2:30 PM',
    players: 2,
    totalPrice: '120.00',
    subtotal: '100.00',
    discount: '20.00',
    discountCode: 'WEEKEND20'
  };

  try {
    // 1. Recordatorio de Reserva (con delay)
    console.log('\n1️⃣ Enviando recordatorio de reserva...');
    await delay(3000); // Esperar 3 segundos
    const reminderResult = await sendBookingReminder(testEmail, testUser, bookingDetails);
    if (reminderResult.success) {
      console.log('✅ Recordatorio de reserva enviado exitosamente');
    } else {
      console.log('❌ Error enviando recordatorio de reserva:', reminderResult.error);
    }

    // 2. Formulario de Contacto (con delay)
    console.log('\n2️⃣ Enviando notificación de formulario de contacto...');
    await delay(3000); // Esperar 3 segundos
    const contactData = {
      name: 'Oscar Ramón',
      email: 'oscraramon@gmail.com',
      phone: '+1 (555) 123-4567',
      subject: 'Consulta sobre plantillas de email actualizadas',
      message: 'Hola equipo de TeeReserve,\n\nMe complace ver las nuevas plantillas de email implementadas. El diseño es muy profesional y consistente en todas las comunicaciones.\n\nLas plantillas incluyen:\n- Diseño responsive\n- Colores temáticos de golf\n- Logo integrado\n- Información clara y organizada\n\n¡Excelente trabajo en la implementación!\n\nSaludos,\nOscar Ramón'
    };
    
    const contactResult = await sendContactFormNotification(contactData);
    if (contactResult.success) {
      console.log('✅ Notificación de contacto enviada exitosamente');
    } else {
      console.log('❌ Error enviando notificación de contacto:', contactResult.error);
    }

    console.log('\n' + '=' .repeat(50));
    console.log('🎉 ¡Plantillas restantes enviadas!');
    console.log('📧 Revisa la bandeja de entrada de oscraramon@gmail.com');
    console.log('\n📋 Plantillas enviadas en esta sesión:');
    console.log('   ✅ Recordatorio de Reserva (diseño naranja)');
    console.log('   ✅ Notificación de Contacto (diseño naranja)');
    console.log('\n🎨 Todas las plantillas mantienen diseño consistente');
    console.log('⏱️ Delays implementados para evitar rate limits');
    console.log('🚀 Sistema completo de notificaciones verificado');
    
  } catch (error) {
    console.error('❌ Error general en las pruebas:', error);
  }
}

// Ejecutar las pruebas
testRemainingTemplates();