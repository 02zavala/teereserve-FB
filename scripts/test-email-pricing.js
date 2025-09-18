// Script para probar el template de email con desglose de precios

import { getBookingConfirmationTemplate } from '../src/lib/email-templates.ts';
import fs from 'fs';
import path from 'path';

// Datos de prueba con desglose completo
const testBookingData = {
  playerName: 'Juan Pérez',
  courseName: 'Solmar Golf Links',
  date: '15 de febrero de 2024',
  time: '10:30 AM',
  playerCount: 4,
  bookingId: 'BK-2024-001',
  subtotal: 336.00,
  discount: 33.60,
  discountCode: 'SUMMER25',
  taxes: 24.19,
  taxRate: 8,
  totalAmount: 326.59,
  bookingUrl: 'https://teereserve.golf/booking/BK-2024-001'
};

// Datos de prueba sin desglose (solo total)
const simpleBookingData = {
  playerName: 'María González',
  courseName: 'Los Cabos Golf Resort',
  date: '20 de febrero de 2024',
  time: '2:00 PM',
  playerCount: 2,
  bookingId: 'BK-2024-002',
  totalAmount: 168.00,
  bookingUrl: 'https://teereserve.golf/booking/BK-2024-002'
};

function testEmailTemplate() {
  console.log('🧪 Probando template de email con desglose de precios...');
  
  try {
    // Prueba 1: Con desglose completo
    console.log('\n📧 Generando email con desglose completo...');
    const emailWithPricing = getBookingConfirmationTemplate(testBookingData);
    
    // Guardar HTML para revisión
    const outputDir = path.join(process.cwd(), 'test-output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    fs.writeFileSync(
      path.join(outputDir, 'email-with-pricing.html'),
      emailWithPricing.html
    );
    
    console.log('✅ Email con desglose generado exitosamente');
    console.log('📄 Archivo guardado: test-output/email-with-pricing.html');
    
    // Prueba 2: Sin desglose (solo total)
    console.log('\n📧 Generando email simple...');
    const simpleEmail = getBookingConfirmationTemplate(simpleBookingData);
    
    fs.writeFileSync(
      path.join(outputDir, 'email-simple.html'),
      simpleEmail.html
    );
    
    console.log('✅ Email simple generado exitosamente');
    console.log('📄 Archivo guardado: test-output/email-simple.html');
    
    // Mostrar información del desglose
    console.log('\n💰 Desglose de precios de prueba:');
    console.log(`   Subtotal: $${testBookingData.subtotal} USD`);
    console.log(`   Descuento (${testBookingData.discountCode}): -$${testBookingData.discount} USD`);
    console.log(`   Impuestos (${testBookingData.taxRate}%): $${testBookingData.taxes} USD`);
    console.log(`   Total Final: $${testBookingData.totalAmount} USD`);
    
    console.log('\n🎯 Pruebas completadas exitosamente!');
    console.log('📂 Revisa los archivos HTML generados en la carpeta test-output/');
    
  } catch (error) {
    console.error('❌ Error durante las pruebas:', error);
    process.exit(1);
  }
}

// Ejecutar pruebas
testEmailTemplate();