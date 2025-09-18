// Script para probar la búsqueda desde la consola del navegador
// Copiar y pegar en la consola del navegador cuando esté en la página de búsqueda

// Función de prueba para simular búsqueda
function testBookingSearch() {
  console.log('Testing booking search with different scenarios...');
  
  // Casos de prueba basados en los datos que vimos
  const testCases = [
    {
      name: 'Guest booking with userId="guest" and userEmail',
      booking: {
        id: 'test1',
        userId: 'guest',
        userEmail: 'test@example.com',
        isGuest: undefined,
        guest: undefined
      },
      email: 'test@example.com'
    },
    {
      name: 'Guest booking with isGuest=true and guest object',
      booking: {
        id: 'test2',
        userId: null,
        isGuest: true,
        guest: {
          email: 'guest@example.com'
        }
      },
      email: 'guest@example.com'
    },
    {
      name: 'Registered user booking',
      booking: {
        id: 'test3',
        userId: 'AuDqFQ3SpOX1CLooASLpW3fQY5S2',
        userEmail: 'user@example.com',
        isGuest: undefined
      },
      email: 'user@example.com'
    }
  ];
  
  testCases.forEach(testCase => {
    console.log(`\n--- ${testCase.name} ---`);
    const { booking, email } = testCase;
    
    try {
      let bookingEmail;
      
      if (booking.isGuest && booking.guest?.email) {
        bookingEmail = booking.guest.email;
        console.log('✅ Email found in guest object:', bookingEmail);
      } else if (booking.userId === 'guest') {
        if (booking.userEmail) {
          bookingEmail = booking.userEmail;
          console.log('✅ Email found in userEmail field:', bookingEmail);
        } else {
          console.log('❌ Guest booking but no email found');
          return;
        }
      } else if (booking.userId && booking.userId !== 'guest') {
        // For registered users, would normally fetch from user profile
        // For this test, use userEmail if available
        if (booking.userEmail) {
          bookingEmail = booking.userEmail;
          console.log('✅ Email found in userEmail field (registered user):', bookingEmail);
        } else {
          console.log('📝 Would fetch email from user profile for userId:', booking.userId);
          return;
        }
      } else {
        console.log('❌ Invalid booking data: missing user information');
        return;
      }
      
      // Check email match
      if (bookingEmail.toLowerCase() === email.trim().toLowerCase()) {
        console.log('✅ Email matches! Search would succeed.');
      } else {
        console.log('❌ Email mismatch! Search would fail.');
        console.log('Expected:', email);
        console.log('Found:', bookingEmail);
      }
      
    } catch (error) {
      console.log('❌ Error:', error.message);
    }
  });
}

// Ejecutar prueba
testBookingSearch();

console.log('\n=== Para probar en la aplicación real ===');
console.log('1. Ve a la página de búsqueda de reservas');
console.log('2. Usa estos datos de prueba basados en reservas reales:');
console.log('   - ID: 5m9SeYOMiGzEzoaZbpPW (userId="guest")');
console.log('   - ID: 83aKx6Ldq2sRrRIwxhBI (userId="guest")');
console.log('   - ID: 9yNWzQkBDuSRNvNNnmBC (isGuest=true, guest.email)');
console.log('3. Necesitarás el email correcto para cada reserva');