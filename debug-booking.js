// Simple script to check booking data
console.log('🔍 Verificando datos de reserva...');

// Simulate the booking data that should be in the database
const bookingId = 'cRMQw1MGzqvsfz8YuAZH';
console.log('📋 ID de reserva:', bookingId);

// Let's check what URL parameters were used in the booking process
console.log('\n📊 Parámetros de la reserva (del log):');
console.log('- Course ID: solmar-golf-links');
console.log('- Date: 2025-09-15');
console.log('- Time: 07:00');
console.log('- Players: 1');
console.log('- Holes: 18');
console.log('- Price: 266.00');

// Calculate what the pricing_snapshot should contain
const basePrice = 266.00;
const taxRate = 0.16;
const subtotal = basePrice;
const tax = subtotal * taxRate;
const total = subtotal + tax;

console.log('\n💰 Cálculo esperado del pricing_snapshot:');
console.log('- Subtotal: $', subtotal.toFixed(2));
console.log('- Tax (16%): $', tax.toFixed(2));
console.log('- Total: $', total.toFixed(2));
console.log('- Discount: $0.00 (no discount applied)');

console.log('\n🔍 En centavos:');
console.log('- subtotal_cents:', Math.round(subtotal * 100));
console.log('- tax_cents:', Math.round(tax * 100));
console.log('- total_cents:', Math.round(total * 100));
console.log('- discount_cents: 0');

console.log('\n❓ El problema puede ser:');
console.log('1. La reserva no tiene pricing_snapshot guardado');
console.log('2. El pricing_snapshot tiene discount_cents = 0');
console.log('3. La página está usando datos incorrectos');

console.log('\n🔧 Solución: Verificar la URL actual de la página de confirmación');
console.log('URL esperada: /es/booking/confirm?id=' + bookingId);