const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc } = require('firebase/firestore');

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBqkIwGgqOQ8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8",
  authDomain: "teereserve-golf.firebaseapp.com",
  projectId: "teereserve-golf",
  storageBucket: "teereserve-golf.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456789012345678"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function createWWTCEvent() {
  try {
    console.log('🏌️ Creando evento World Wide Technology Championship...');

    // Datos del evento basados en la información proporcionada
    const eventData = {
      type: 'event',
      title: 'World Wide Technology Championship',
      description: 'Únete al prestigioso World Wide Technology Championship en Los Cabos. Un torneo de golf de clase mundial con vistas espectaculares al océano y experiencias gastronómicas únicas.',
      startDate: '2024-11-07',
      endDate: '2024-11-10',
      location: 'El Cardonal at Diamante, Los Cabos, México',
      image: '/hero-3.jpg',
      isActive: true,
      order: 1,
      content: {
        sections: [
          {
            type: 'hero',
            title: 'World Wide Technology Championship',
            subtitle: 'Los Cabos, México • Noviembre 7-10, 2024',
            description: 'Experimenta el golf de clase mundial en uno de los destinos más espectaculares del mundo.',
            image: '/hero-3.jpg'
          },
          {
            type: 'text',
            title: 'Sobre el Torneo',
            content: 'El World Wide Technology Championship es un evento del PGA Tour que se celebra anualmente en Los Cabos. Este torneo combina golf de élite con la belleza natural de Baja California Sur, ofreciendo a los espectadores una experiencia única con vistas al Mar de Cortés.'
          },
          {
            type: 'tickets',
            title: 'Opciones de Boletos',
            tickets: [
              {
                id: 'general-admission',
                name: 'General Admission',
                price: 35,
                currency: 'USD',
                description: 'Acceso general al torneo con vistas a múltiples hoyos',
                features: [
                  'Acceso a áreas públicas del campo',
                  'Vista de múltiples hoyos',
                  'Acceso a tiendas de merchandising',
                  'Estacionamiento incluido'
                ],
                available: true,
                maxQuantity: 10
              },
              {
                id: 'skybox',
                name: 'Skybox Experience',
                price: 150,
                currency: 'USD',
                description: 'Experiencia premium con vista elevada y servicios exclusivos',
                features: [
                  'Vista elevada del campo',
                  'Servicio de comida y bebida',
                  'Asientos cómodos con sombra',
                  'Acceso a baños privados',
                  'Estacionamiento VIP'
                ],
                available: true,
                maxQuantity: 4
              },
              {
                id: 'tacos-on-17',
                name: 'Tacos on 17',
                price: 75,
                currency: 'USD',
                description: 'Experiencia gastronómica única en el hoyo 17',
                features: [
                  'Vista privilegiada del hoyo 17',
                  'Tacos gourmet y bebidas incluidas',
                  'Ambiente festivo y relajado',
                  'Acceso a área de descanso',
                  'Experiencia culinaria mexicana auténtica'
                ],
                available: true,
                maxQuantity: 6
              },
              {
                id: 'clubhouse',
                name: 'Clubhouse Access',
                price: 100,
                currency: 'USD',
                description: 'Acceso exclusivo al clubhouse con servicios premium',
                features: [
                  'Acceso completo al clubhouse',
                  'Comida buffet incluida',
                  'Bar premium con bebidas',
                  'Aire acondicionado',
                  'Televisores con cobertura del torneo',
                  'Estacionamiento preferencial'
                ],
                available: true,
                maxQuantity: 8
              }
            ]
          },
          {
            type: 'cta',
            title: '¡Reserva tu lugar ahora!',
            description: 'No te pierdas este evento único. Los boletos se agotan rápidamente.',
            buttonText: 'Comprar Boletos',
            buttonLink: '/es/book',
            backgroundColor: '#059669'
          }
        ]
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Crear el evento en Firestore
    const eventRef = await addDoc(collection(db, 'cmsSections'), eventData);
    console.log('✅ Evento creado exitosamente con ID:', eventRef.id);

    // Crear sección de texto adicional sobre Los Cabos
    const locationSection = {
      type: 'text',
      title: 'Destino Los Cabos',
      content: 'Los Cabos ofrece una combinación perfecta de golf de clase mundial y belleza natural. El campo El Cardonal at Diamante, diseñado por Tiger Woods, presenta desafíos únicos con vistas espectaculares al océano Pacífico.',
      isActive: true,
      order: 2,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const locationRef = await addDoc(collection(db, 'cmsSections'), locationSection);
    console.log('✅ Sección de ubicación creada con ID:', locationRef.id);

    console.log('🎉 ¡Evento World Wide Technology Championship creado exitosamente!');
    console.log('📍 Ubicación: El Cardonal at Diamante, Los Cabos');
    console.log('📅 Fechas: Noviembre 7-10, 2024');
    console.log('🎫 Tipos de boletos configurados:');
    console.log('   • General Admission: $35 USD');
    console.log('   • Skybox Experience: $150 USD');
    console.log('   • Tacos on 17: $75 USD');
    console.log('   • Clubhouse Access: $100 USD');

  } catch (error) {
    console.error('❌ Error creando el evento:', error);
  }
}

// Ejecutar la función
createWWTCEvent();