const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc } = require('firebase/firestore');

// Configuración de Firebase (usando las mismas variables de entorno)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function createSampleEvent() {
  try {
    console.log('🏌️ Creando evento de ejemplo: World Wide Technology Championship Los Cabos...');

    // Evento principal
    const eventData = {
      type: 'event',
      title: 'World Wide Technology Championship Los Cabos 2024',
      content: {
        eventTitle: 'World Wide Technology Championship Los Cabos 2024',
        eventDescription: 'Vive el mejor golf del mundo en Los Cabos. Disfruta de golf de clase mundial y sumérgete en el maravilloso paisaje de Los Cabos con increíbles vistas del Océano Pacífico.',
        eventDate: '2024-11-15',
        eventTime: '08:00',
        eventLocation: 'El Cardonal Golf Course, Los Cabos, México',
        eventPrice: 1500,
        eventCurrency: 'MXN',
        maxTickets: 5000,
        soldTickets: 0,
        isTicketSaleActive: true,
        ticketSaleStartDate: '2024-10-01',
        ticketSaleEndDate: '2024-11-14',
        eventFeatures: [
          'Acceso completo al campo de golf',
          'Vistas panorámicas del Océano Pacífico',
          'Opciones gastronómicas variadas',
          '2 niños gratis por cada adulto',
          'Estacionamiento incluido',
          'Acceso a todas las instalaciones del torneo'
        ],
        ticketTypes: [
          {
            name: 'Admisión General',
            price: 1500,
            description: 'Acceso al campo de golf y las instalaciones del torneo para disfrutar del mejor golf del mundo, las diferentes opciones de alimentos y las vistas panorámicas del Océano Pacífico.',
            features: [
              'Acceso completo al campo',
              'Opciones de alimentos disponibles',
              'Vistas del Océano Pacífico',
              '2 niños de 15 años o menores gratis por adulto'
            ],
            maxQuantity: 3000
          },
          {
            name: 'The Skybox',
            price: 8500,
            description: 'Opción premium y tradicional dentro de la hospitalidad del golf, para patrocinadores premier y todos los clientes que quieran vivir la emoción del último hoyo.',
            features: [
              'Ubicación: Green del 18',
              'Buffet premium incluido',
              'Barra libre premium',
              'Vista privilegiada del último hoyo',
              'Ambiente VIP exclusivo'
            ],
            maxQuantity: 200
          },
          {
            name: 'Tacos on 17 by La Lupita',
            price: 4500,
            description: 'El lugar para ver y ser visto mientras te relacionas con otros VIPs en el lugar más animado del torneo. ¡Disfruta de la deliciosa cocina mexicana y el ambiente más divertido con sabor a Cabo!',
            features: [
              'Ubicación: Entre los greens de los hoyos 17 y 10',
              'Selección de tacos incluidos',
              'Tequila y mezcal premium',
              'Cerveza artesanal',
              'Ambiente festivo mexicano',
              'Networking con otros VIPs'
            ],
            maxQuantity: 300
          },
          {
            name: 'Clubhouse - The Woods',
            price: 12000,
            description: 'Vive la emoción del PGA TOUR desde el corazón de la casa club, en el exclusivo restaurante The Woods, inspirado en la visión única de Tiger Woods.',
            features: [
              'Ubicación: Tee del 1 y green del 18',
              'Cocteles con Tequila Maestro Dobel incluidos',
              'Restaurante exclusivo The Woods',
              'Inspirado en la visión de Tiger Woods',
              'Vista del primer tee y último green',
              'Experiencia gastronómica de lujo'
            ],
            maxQuantity: 150
          }
        ]
      },
      isActive: true,
      order: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'admin-demo'
    };

    // Agregar el evento a Firestore
    const docRef = await addDoc(collection(db, 'cmsSections'), eventData);
    console.log('✅ Evento creado exitosamente con ID:', docRef.id);

    // Crear sección de texto complementaria
    const textSectionData = {
      type: 'text',
      title: 'Información Importante del Torneo',
      content: {
        body: 'El World Wide Technology Championship es uno de los eventos de golf más prestigiosos de México. Este torneo del PGA TOUR ofrece una experiencia única combinando golf de clase mundial con la belleza natural de Los Cabos. Los asistentes podrán disfrutar de instalaciones de primer nivel, gastronomía excepcional y vistas espectaculares del Océano Pacífico.',
        subtitle: 'Detalles del Evento',
        highlights: [
          'Torneo oficial del PGA TOUR',
          'Campo diseñado por Tiger Woods',
          'Vistas panorámicas del Océano Pacífico',
          'Experiencia gastronómica de clase mundial'
        ]
      },
      isActive: true,
      order: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'admin-demo'
    };

    const textDocRef = await addDoc(collection(db, 'cmsSections'), textSectionData);
    console.log('✅ Sección de texto creada exitosamente con ID:', textDocRef.id);

    // Crear CTA para compra de boletos
    const ctaSectionData = {
      type: 'cta',
      title: 'Compra tus Boletos Ahora',
      content: {
        headline: '¡No te pierdas el evento de golf más importante de México!',
        description: 'Asegura tu lugar en el World Wide Technology Championship Los Cabos 2024. Boletos limitados disponibles.',
        buttonText: 'Comprar Boletos',
        buttonLink: '/eventos/wwtc-los-cabos-2024',
        backgroundColor: '#1a365d',
        textColor: '#ffffff'
      },
      isActive: true,
      order: 2,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'admin-demo'
    };

    const ctaDocRef = await addDoc(collection(db, 'cmsSections'), ctaSectionData);
    console.log('✅ Sección CTA creada exitosamente con ID:', ctaDocRef.id);

    console.log('\n🎉 ¡Evento de ejemplo creado exitosamente!');
    console.log('📍 Puedes verlo en tu homepage y gestionarlo desde el panel de admin');
    console.log('🔗 Panel de admin: http://localhost:3001/es/admin/content');

  } catch (error) {
    console.error('❌ Error al crear el evento de ejemplo:', error);
  }
}

// Ejecutar el script
createSampleEvent();