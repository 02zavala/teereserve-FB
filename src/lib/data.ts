import type { GolfCourse, Review, TeeTime, Booking, BookingInput, ReviewInput, UserProfile, Scorecard, ScorecardInput, AchievementId, TeamMember, AboutPageContent, Coupon, CouponInput, ReviewLike, ReviewComment, ReviewBadge, UserReviewStats, CMSSection, CMSTemplate, EventTicket, Post, PostInput } from '@/types';
import { db, storage, auth } from './firebase';
import { logger } from './logger';
import { collection, collectionGroup, getDocs, doc, getDoc, addDoc, updateDoc, query, where, setDoc, CollectionReference, writeBatch, serverTimestamp, orderBy, limit, deleteDoc, runTransaction, increment, QueryConstraint, getCountFromServer } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { format, startOfDay, subDays, isAfter, parse, set, isToday, isBefore, addMinutes } from 'date-fns';
import { sendBookingConfirmationEmail } from '@/ai/flows/send-booking-confirmation-email';
import { sendReviewInvitationEmail } from '@/ai/flows/send-review-invitation-email';
import { Locale } from '@/i18n-config';
import { slugify } from './normalize';


interface CourseDataInput {
    name: string;
    location: string;
    address?: string;
    description: string;
    rules?: string;
    basePrice: number;
    newImages: File[];
    existingImageUrls: string[];
    teeTimeInterval: number;
    operatingHours: {
        openingTime: string;
        closingTime: string;
    };
    availableHoles: number[];
    totalYards?: number;
    par: number;
    holeDetails?: {
        holes9?: { yards?: number; par?: number };
        holes18?: { yards?: number; par?: number };
        holes27?: { yards?: number; par?: number };
    };
    hidden?: boolean;
    latLng?: { lat: number; lng: number };
    slug?: string;
}

// NOTE: The images for this initial set of courses are static assets.
// They are located in the `/public` folder and served directly.
// Any new courses added via the admin panel will have their images uploaded to Firebase Storage.
export const initialCourses: Omit<GolfCourse, 'reviews'>[] = [
    {
        id: 'puerto-los-cabos',
        name: 'Puerto Los Cabos Golf Club',
        location: 'San José del Cabo',
        description: 'Instalación de 27 hoyos con tres combinaciones de 18, diseñadas por Jack Nicklaus y Greg Norman. Fairways ondulantes, greens elevados y vistas al Mar de Cortés. Incluye comida/drink stations gratuitas cada pocos hoyos. Ubicado en una comunidad planificada de 2,000 acres.',
        rules: 'Standard golf etiquette and club rules apply.',
        basePrice: 180,
        teeTimeInterval: 10,
        operatingHours: {
          openingTime: "06:00",
          closingTime: "19:00"
        },
        availableHoles: [9, 18, 27],
        totalYards: 10200,
        par: 108,
        holeDetails: {
          holes9: { yards: 3400, par: 36 },
          holes18: { yards: 6800, par: 72 },
          holes27: { yards: 10200, par: 108 }
        },
        imageUrls: [
            "/images/fallback.svg"
        ],
        latLng: { lat: 23.064, lng: -109.682 }
    },
    {
        id: 'vidanta-golf-los-cabos',
        name: 'Vidanta Golf Los Cabos',
        location: 'San José del Cabo',
        description: 'Curso original de 9 hoyos en Los Cabos, con 3,000 yardas de verde bordeado por el Mar de Cortés y las montañas Sierra de La Laguna. Diseñado para juego suave en terreno parcialmente plano, con oportunidades para drives y putts creativos. Clubhouse elevado para vistas.',
        rules: 'Standard golf etiquette and club rules apply.',
        basePrice: 220,
        teeTimeInterval: 10,
        operatingHours: {
          openingTime: "08:00",
          closingTime: "17:00"
        },
        availableHoles: [9],
        totalYards: 3000,
        par: 36,
        holeDetails: {
          holes9: { yards: 3000, par: 36 }
        },
        imageUrls: ['/images/fallback.svg'],
        latLng: { lat: 23.045, lng: -109.708 }
    },
    {
        id: 'cabo-real-golf-club',
        name: 'Cabo Real Golf Club',
        location: 'Cabo San Lucas',
        description: 'Diseñado por Robert Trent Jones Jr., estilo target con fairways multi-temáticos en 2,800 acres de resort con playa. Hoyos tallados en desierto y montañas, con vistas al Mar de Cortés. Anfitrión de torneos PGA.',
        rules: 'Standard golf etiquette and club rules apply.',
        basePrice: 190,
        teeTimeInterval: 10,
        operatingHours: {
          openingTime: "07:00",
          closingTime: "18:00"
        },
        availableHoles: [18],
        par: 72,
        imageUrls: ['/images/fallback.svg'],
        latLng: { lat: 22.955, lng: -109.789 }
    },
    {
        id: 'club-campestre-san-jose',
        name: 'Club Campestre San José',
        location: 'San José del Cabo',
        description: 'Diseñado por Jack Nicklaus, usa pasto Paspalum resistente al agua salada. Fairways verdes en colinas de Sierra de la Laguna, con vistas al Mar de Cortés. Terreno desértico rodante, greens elevados.',
        rules: 'Standard golf etiquette and club rules apply.',
        basePrice: 100,
        teeTimeInterval: 10,
        operatingHours: {
          openingTime: "07:30",
          closingTime: "17:30"
        },
        availableHoles: [18],
        par: 72,
        imageUrls: ['/images/fallback.svg'],
        latLng: { lat: 23.078, lng: -109.735 }
    },
    {
        id: 'cabo-san-lucas-country-club',
        name: 'Cabo San Lucas Country Club',
        location: 'Cabo San Lucas',
        description: "18 hoyos en terreno suavemente inclinado con vistas al Mar de Cortés y Land's End. Diseñado por Roy Dye, desafiante con vistas panorámicas desde casi todos los hoyos. Incluye restaurante y comunidad cerrada.",
        rules: 'Standard golf etiquette and club rules apply.',
        basePrice: 120,
        teeTimeInterval: 10,
        operatingHours: {
          openingTime: "06:30",
          closingTime: "18:30"
        },
        availableHoles: [18],
        par: 72,
        imageUrls: ['/images/fallback.svg'],
        latLng: { lat: 22.898, lng: -109.897 }
    },
    {
        id: 'diamante-golf',
        name: 'Diamante Golf (Dunes / Cardonal)',
        location: 'Cabo San Lucas',
        description: 'Dunes por Davis Love III, estilo links con vistas al Pacífico y arroyos nativos; Cardonal por Tiger Woods, con fairways anchos y greens slick. Vistas largas al océano y dunas.',
        rules: 'Standard golf etiquette and club rules apply.',
        basePrice: 300,
        teeTimeInterval: 10,
        operatingHours: {
          openingTime: "06:00",
          closingTime: "19:00"
        },
        availableHoles: [18],
        par: 72,
        imageUrls: ['/images/fallback.svg'],
        latLng: { lat: 22.951, lng: -110.021 }
    },
    {
        id: 'el-cortes-golf-club',
        name: 'El Cortés Golf Club',
        location: 'La Paz',
        description: 'Firma de Gary Player, 18 hoyos con vistas panorámicas al Mar de Cortés. Cambios de elevación dramáticos, desierto y mar, con practice range y halfway house escénica.',
        rules: 'Standard golf etiquette and club rules apply.',
        basePrice: 80,
        teeTimeInterval: 10,
        operatingHours: {
          openingTime: "07:00",
          closingTime: "18:00"
        },
        availableHoles: [18],
        par: 72,
        imageUrls: ['/images/fallback.svg'],
        latLng: { lat: 24.195, lng: -110.320 }
    },
    {
        id: 'paraiso-del-mar-golf',
        name: 'Paraíso del Mar Golf',
        location: 'La Paz',
        description: 'Diseñado por Arthur Hills, estilo links oceánico de 18 hoyos en 7,039 yardas. Paisaje de dunas reminiscentes de Escocia, con vistas al Golfo de California.',
        rules: 'Standard golf etiquette and club rules apply.',
        basePrice: 90,
        teeTimeInterval: 10,
        operatingHours: {
          openingTime: "07:00",
          closingTime: "18:00"
        },
        availableHoles: [18],
        par: 72,
        imageUrls: ['/images/fallback.svg'],
        latLng: { lat: 24.237, lng: -110.334 }
    },
    {
        id: 'tpc-danzante-bay',
        name: 'TPC Danzante Bay',
        location: 'Loreto',
        description: '18 hoyos multi-temáticos por Rees Jones, con valles, arroyos, dunas y colinas. Vistas panorámicas a Danzante Bay y Mar de Cortés, greens slick y vientos desafiantes.',
        rules: 'Standard golf etiquette and club rules apply.',
        basePrice: 150,
        teeTimeInterval: 10,
        operatingHours: {
          openingTime: "06:30",
          closingTime: "18:30"
        },
        availableHoles: [18],
        par: 72,
        imageUrls: ['/images/fallback.svg'],
        latLng: { lat: 25.828, lng: -111.306 }
    },
    {
        id: 'costa-palmas-golf-club',
        name: 'Costa Palmas Golf Club',
        location: 'La Ribera, East Cape',
        description: 'Diseñado por Robert Trent Jones II, links-like con fairways anchos, condiciones firmes y rápidas. Vistas de desierto y mar, terreno divertido para todos los niveles.',
        rules: 'Standard golf etiquette and club rules apply.',
        basePrice: 250,
        teeTimeInterval: 10,
        operatingHours: {
          openingTime: "06:00",
          closingTime: "19:00"
        },
        availableHoles: [18],
        par: 72,
        imageUrls: ['/images/fallback.svg'],
        latLng: { lat: 23.633, lng: -109.689 }
    },
    {
        id: 'iberostar-cancun-golf-club',
        name: 'Iberostar Cancún Golf Club',
        location: 'Boulevard Kukulcan Km 17 Zona Hotelera, Cancún, Quintana Roo, 77500',
        description: 'Iberostar Cancún Golf Club is a world-class 18-hole, par-72 championship course designed by Japanese legend Isao Aoki, offering an unforgettable golf experience in the heart of Cancún’s Hotel Zone. Surrounded by natural beauty and located next to the Caribbean Sea, this course is known for its exceptional layout, scenic views, and tropical setting with abundant wildlife, including crocodiles, iguanas, and a wide variety of birds. Golfers enjoy premium services such as unlimited food and beverages, including both alcoholic and non-alcoholic options, a shared golf cart, use of the driving range and putting green, and access to first-class facilities with personalized attention. Iberostar Cancún Golf Club is ideal for golfers of all skill levels looking to combine the sport with luxury and relaxation in a breathtaking seaside environment.',
        rules: 'Standard golf etiquette and club rules apply.',
        basePrice: 149,
        teeTimeInterval: 10,
        operatingHours: {
          openingTime: "07:00",
          closingTime: "15:00"
        },
        availableHoles: [18],
        totalYards: 6735,
        par: 72,
        translations: {
          es: {
            name: 'Iberostar Cancún Golf Club',
            location: 'Boulevard Kukulcán Km 17, Zona Hotelera, Cancún, Quintana Roo, 77500',
            description: 'Campo de campeonato par 72 de 18 hoyos diseñado por la leyenda japonesa Isao Aoki, ubicado en el corazón de la Zona Hotelera de Cancún junto al Mar Caribe. Ofrece un trazado excepcional, vistas escénicas y un entorno tropical con vida silvestre. Servicios premium como alimentos y bebidas ilimitadas, carrito compartido, uso de driving range y putting green, y atención personalizada.',
            rules: 'Etiqueta estándar de golf y reglas del club.'
          },
          en: {
            name: 'Iberostar Cancun Golf Club',
            location: 'Boulevard Kukulkan Km 17, Hotel Zone, Cancun, Quintana Roo, 77500',
            description: 'World-class 18-hole, par-72 championship course designed by Isao Aoki with premium services (unlimited food and beverages, shared cart, range and putting green) in Cancun’s Hotel Zone by the Caribbean Sea.',
            rules: 'Standard golf etiquette and club rules apply.'
          }
        },
        imageUrls: ['/images/fallback.svg'],
        latLng: { lat: 21.063728, lng: -86.782595 }
    },
    {
        id: 'el-cameleon-mayakoba-golf-course',
        name: 'El Camaleón Mayakoba Golf Course',
        location: 'Carretera Fed. Chetumal Pto. Juárez Km. 298, 77710 Playa del Carmen, Q.R.',
        description: 'The complex also offers a spectacular 18-hole golf course designed by renowned architect and PGA TOUR legend Greg Norman. The golf course is home to the Mayakoba Golf Classic, Mexico’s historic first-ever PGA TOUR event. Six miles of fresh water canals surrounded by exotic mangroves and birds lead to a beautiful white sand beach and to the turquoise waters of the Caribbean Sea. Guests are peacefully transported in boats through the resorts contemplating a revolutionary vision of beauty and harmony.',
        rules: 'Standard golf etiquette and club rules apply.',
        basePrice: 270,
        teeTimeInterval: 10,
        operatingHours: {
          openingTime: "07:00",
          closingTime: "16:00"
        },
        availableHoles: [18],
        totalYards: 7024,
        par: 72,
        translations: {
          es: {
            name: 'El Camaleón Mayakoba Golf Course',
            location: 'Carretera Fed. Chetumal Pto. Juárez Km. 298, 77710 Playa del Carmen, Q.R.',
            description: 'Campo de 18 hoyos diseñado por Greg Norman, sede de eventos del PGA TOUR, con canales de agua dulce, manglares y acceso a playa de arena blanca en el Caribe. Experiencia única con transporte en bote dentro del complejo.',
            rules: 'Etiqueta estándar de golf y reglas del club.'
          },
          en: {
            name: 'El Camaleon Mayakoba Golf Course',
            location: 'Federal Highway Chetumal - Puerto Juárez Km. 298, Playa del Carmen, QR 77710',
            description: 'Spectacular 18-hole course by Greg Norman, home to PGA TOUR events, featuring freshwater canals, mangroves, and a white sand beach by the Caribbean. Unique experience with boat transportation through the resort.',
            rules: 'Standard golf etiquette and club rules apply.'
          }
        },
        imageUrls: ['/images/fallback.svg'],
        latLng: { lat: 20.689640, lng: -87.031266 }
    },
    {
        id: 'riviera-cancun-golf-resort',
        name: 'Riviera Cancún Golf & Resort',
        location: 'Blvd. Kukulcan 25.3, Zona Hotelera, 77500 Cancún, Q.R.',
        description: 'The natural landscape of mangroves that shelters exotic flora and fauna, exceptional views of the Caribbean Sea and undulating fairways and greens make of Riviera Cancun Golf & Resorts the perfect sum of challenges for players of every skill level. The undisturbed natural terrain, along with the ever changing trade-winds will remind golfers of a traditional Links course that requires precise and accurate shot-making skills tee-to-green. Its 18 Holes par 72, which harmoniously integrate with nature on 7,060 yards, were designed by the worldwideleading golf designer Golden Bear, Jack Nicklaus. This is a golf course that rewards the player who calculates well the risk vs. reward shot value and offers the opportunity to experience a peaceful atmosphere to perform a perfect game.',
        rules: 'Standard golf etiquette and club rules apply.',
        basePrice: 180,
        teeTimeInterval: 10,
        operatingHours: {
          openingTime: "07:00",
          closingTime: "16:00"
        },
        availableHoles: [18],
        totalYards: 7060,
        par: 72,
        translations: {
          es: {
            name: 'Riviera Cancún Golf & Resort',
            location: 'Blvd. Kukulcán 25.3, Zona Hotelera, 77500 Cancún, Q.R.',
            description: 'El paisaje natural de manglares que alberga flora y fauna exótica, las vistas excepcionales del Mar Caribe y los fairways y greens ondulados hacen de Riviera Cancún el equilibrio perfecto de desafíos para jugadores de todos los niveles. Su diseño de 18 hoyos par 72, con 7,060 yardas y obra del legendario Jack Nicklaus, premia el cálculo de riesgo vs. recompensa y ofrece un ambiente tranquilo para un juego perfecto.',
            rules: 'Etiqueta estándar de golf y reglas del club.'
          },
          en: {
            name: 'Riviera Cancun Golf & Resort',
            location: 'Boulevard Kukulkan 25.3, Hotel Zone, Cancun, QR 77500',
            description: 'Natural mangrove landscape with exotic wildlife, Caribbean Sea views, and undulating fairways/greens create a balanced challenge for all skill levels. 18-hole, par-72 course (7,060 yards) designed by Jack Nicklaus, rewarding precise shot-making and risk vs. reward decisions.',
            rules: 'Standard golf etiquette and club rules apply.'
          }
        },
        imageUrls: ['/images/fallback.svg'],
        latLng: { lat: 21.011714, lng: -86.823707 }
    },
      {
          id: 'el-tinto-golf-course',
        name: 'El Tinto Golf Course',
        location: 'Carr. Federal 307, Chetumal Km 388, 77580 Cancún, Q.R.',
        description: '"El Tinto" is the golf course within our development which was designed by the world-renowned golf professional Nick Price. This challenging field contains 7,435 yards and is ready to meet any field design standard and service to its players, whether amateur or professional, ensuring them an excellent golfing experience.',
        rules: 'Standard golf etiquette and club rules apply.',
        basePrice: 130,
        teeTimeInterval: 10,
        operatingHours: {
          openingTime: "08:30",
          closingTime: "13:30"
        },
        availableHoles: [18],
        totalYards: 7439,
        par: 72,
        translations: {
          es: {
            name: 'El Tinto Golf Course',
            location: 'Carretera Federal 307, Chetumal Km 388, 77580 Cancún, Q.R.',
            description: 'Campo diseñado por Nick Price con 7,435 yardas. Retador para jugadores amateurs y profesionales, preparado para cumplir estándares de diseño y servicio, garantizando una excelente experiencia de golf.',
            rules: 'Etiqueta estándar de golf y reglas del club.'
          },
          en: {
            name: 'El Tinto Golf Course',
            location: 'Federal Highway 307, Chetumal Km 388, Cancun, QR 77580',
            description: 'Course designed by Nick Price with 7,435 yards. Challenging for amateurs and professionals, meeting top design and service standards to ensure an excellent golfing experience.',
            rules: 'Standard golf etiquette and club rules apply.'
          }
        },
        imageUrls: ['/images/fallback.svg'],
        latLng: { lat: 21.004963, lng: -86.872889 }
    },
    {
        id: 'iberostar-playa-paraiso-golf-club',
        name: 'Iberostar Playa Paraiso Golf Club',
        location: 'Carr. Chetumal, Carr. Cancún - Tulum 309, 77710 Playa del Carmen, Q.R.',
        description: 'For more than a decade, Iberostar Playa Paraíso Golf Club has secured its place in the history books of international golf. The club has hosted prestigious events such as the World Amateur Team Championships 2016, Big Break Mexico, Iberostar Riviera Maya Open, is an 11-time host of the classification round for the Mayakoba Golf Classic OHL PGA TOUR and host of the Bupa Match Play – PGA Tour Latinoamérica 2018-2019. Iberostar Playa Paraíso Golf Club shows its high standard, being a preferred course for the most demanding golfers. With several starting points, players of all levels can enjoy the course.',
        rules: 'Standard golf etiquette and club rules apply.',
        basePrice: 288,
        teeTimeInterval: 10,
        operatingHours: {
          openingTime: "08:00",
          closingTime: "11:00"
        },
        availableHoles: [18],
        totalYards: 6800,
        par: 72,
        translations: {
          es: {
            name: 'Iberostar Playa Paraíso Golf Club',
            location: 'Carretera Chetumal, Cancún - Tulum 309, 77710 Playa del Carmen, Q.R.',
            description: 'Con más de una década de historia, ha sido sede de eventos de alto prestigio como el World Amateur Team Championships, Big Break Mexico, Iberostar Riviera Maya Open, clasificación del Mayakoba Golf Classic (OHL PGA TOUR) y Bupa Match Play (PGA Tour Latinoamérica). Preferido por golfistas exigentes, con múltiples tees para todo nivel.',
            rules: 'Etiqueta estándar de golf y reglas del club.'
          },
          en: {
            name: 'Iberostar Playa Paraiso Golf Club',
            location: 'Chetumal Highway, Cancun - Tulum 309, Playa del Carmen, QR 77710',
            description: 'With over a decade of history, host of prestigious events including World Amateur Team Championships, Big Break Mexico, Iberostar Riviera Maya Open, Mayakoba Golf Classic qualifying (OHL PGA TOUR), and Bupa Match Play (PGA Tour Latinoamérica). Preferred by demanding golfers; multiple tees for all levels.',
            rules: 'Standard golf etiquette and club rules apply.'
          }
        },
        imageUrls: ['/images/fallback.svg'],
        latLng: { lat: 20.763084, lng: -86.966412 }
    },
  ];

const uploadImages = async (courseName: string, files: File[]): Promise<string[]> => {
    if (!storage) {
        console.warn("Firebase Storage is not initialized. Skipping image upload.");
        return [];
    }
    const storageInstance = storage; // Create a non-null reference
    const uploadPromises = files.map(file => {
        // Sanitize file name
        const cleanFileName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '');
        const storageRef = ref(storageInstance, `courses/${courseName.toLowerCase().replace(/\s+/g, '-')}/${Date.now()}-${cleanFileName}`);
        return uploadBytes(storageRef, file).then(snapshot => getDownloadURL(snapshot.ref));
    });
    return Promise.all(uploadPromises);
};

export const uploadReviewImage = async (courseId: string, userId: string, file: File): Promise<string> => {
    if (!storage) {
        throw new Error("Firebase Storage is not initialized.");
    }
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '');
    const storageRef = ref(storage, `reviews/${courseId}/${userId}-${Date.now()}-${cleanFileName}`);
    const snapshot = await uploadBytes(storageRef, file);
    return getDownloadURL(snapshot.ref);
};

export const uploadProfilePicture = async (userId: string, file: File): Promise<string> => {
    if (!storage) {
        throw new Error("Firebase Storage is not initialized.");
    }
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '');
    const storageRef = ref(storage, `profile-pictures/${userId}/${Date.now()}-${cleanFileName}`);
    const snapshot = await uploadBytes(storageRef, file);
    return getDownloadURL(snapshot.ref);
};

export const uploadPostImage = async (userId: string, file: File): Promise<string> => {
    if (!storage) {
        throw new Error("Firebase Storage is not initialized.");
    }
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '');
    const storageRef = ref(storage, `posts/${userId}/${Date.now()}-${cleanFileName}`);
    const snapshot = await uploadBytes(storageRef, file);
    return getDownloadURL(snapshot.ref);
};


// *** Firestore Data Functions ***

// Helper function to serialize Firestore timestamps
const serializeTimestamps = (data: any): any => {
  if (data && typeof data === 'object') {
    if (data.toDate && typeof data.toDate === 'function') {
      // This is a Firestore Timestamp
      return data.toDate().toISOString();
    }
    if (Array.isArray(data)) {
      return data.map(serializeTimestamps);
    }
    const serialized: any = {};
    for (const [key, value] of Object.entries(data)) {
      serialized[key] = serializeTimestamps(value);
    }
    return serialized;
  }
  return data;
};

export const getCourses = async ({ location, includeHidden = false, isFeatured }: { location?: string; includeHidden?: boolean; isFeatured?: boolean }): Promise<GolfCourse[]> => {
  const coursesMap = new Map<string, Omit<GolfCourse, 'reviews'>>();

  // Add initial static courses to the map
  initialCourses.forEach(course => {
      coursesMap.set(course.id, course);
  });

  // Fetch courses from Firestore only if db is initialized
  if (db) {
      try {
          const coursesCol = collection(db, 'courses');
          const constraints: QueryConstraint[] = [];
          if (isFeatured) {
              constraints.push(where("isFeatured", "==", true));
          }
          const firestoreQuery = query(coursesCol, ...constraints);
          const firestoreSnapshot = await getDocs(firestoreQuery);
          
          firestoreSnapshot.forEach(doc => {
              const rawCourseData = doc.data();
              const serializedCourseData = serializeTimestamps(rawCourseData) as Omit<GolfCourse, 'id' | 'reviews'>;
              coursesMap.set(doc.id, {
                  id: doc.id,
                  ...serializedCourseData
              });
          });
      } catch (error: any) {
           if (error.code === 'not-found' || (error.message && error.message.includes("NOT_FOUND"))) {
            console.warn(`
              *****************************************************************
              * Firestore Database Not Found.                                 *
              *                                                               *
              * This error usually means you haven't created a Firestore      *
              * database in your Firebase project yet. The app will continue  *
              * to run with local example data, but it will not be able to    *
              * save or load any new data.                                    *
              *                                                               *
              * PLEASE GO TO YOUR FIREBASE CONSOLE TO CREATE ONE:             *
              * https://console.firebase.google.com/project/_/firestore       *
              *****************************************************************
            `);
          } else if (error.code === 'permission-denied' || error.code === 'unauthenticated') {
            console.warn("Firestore access denied. The app will run with local data only. Error:", error.message);
          } else if (error.code === 'unavailable' || error.code === 'unknown' || error.message?.includes('network-request-failed') || error.message?.includes('offline')) {
            console.warn("Firestore temporarily unavailable due to network issues. Using local data. Error:", error.message);
            // Log network connectivity issue for monitoring
            if (typeof window !== 'undefined') {
              console.info('Network connectivity issue detected. App will continue with cached/local data.');
            }
          } else {
            console.error("Error fetching courses from Firestore:", error);
          }
      }
  }
  
  let coursesWithoutReviews = Array.from(coursesMap.values());

  if (isFeatured) {
      coursesWithoutReviews = coursesWithoutReviews.filter(course => course.isFeatured);
  }

  // Filtrar cursos ocultos si no se incluyen explícitamente
  if (!includeHidden) {
    coursesWithoutReviews = coursesWithoutReviews.filter(course => !course.hidden);
  }

  if (location && location !== 'all') {
    coursesWithoutReviews = coursesWithoutReviews.filter(course => course.location === location);
  }
  
  // Load reviews for each course
  const allCourses: GolfCourse[] = await Promise.all(
    coursesWithoutReviews.map(async (course) => {
      const reviews = await getReviewsForCourse(course.id);
      return { ...course, reviews };
    })
  );
  
  return allCourses;
};

export const getCourseById = async (id: string): Promise<GolfCourse | undefined> => {
    if (!id) return undefined;
    
    // First, check Firestore for a dynamically added course if db is available
    if (db) {
        try {
            const courseDocRef = doc(db, 'courses', id);
            const courseSnap = await getDoc(courseDocRef);

            if (courseSnap.exists()) {
                const rawCourseData = { id: courseSnap.id, ...courseSnap.data() };
                const serializedCourseData = serializeTimestamps(rawCourseData) as GolfCourse;
                serializedCourseData.reviews = await getReviewsForCourse(id);
                return serializedCourseData;
            }
        } catch (error: any) {
            // Handle different types of Firestore errors
            if (error.code === 'unavailable') {
                console.warn(`Firestore unavailable when fetching course ${id}. Falling back to static data.`, {
                    code: error.code,
                    message: error.message,
                    connectivity: typeof window !== 'undefined' && navigator?.onLine ? 'online' : 'offline'
                });
            } else if (error.code === 'network-request-failed' || error.message?.includes('offline')) {
                console.warn(`Network error fetching course ${id}. Falling back to static data.`, {
                    code: error.code,
                    message: error.message,
                    connectivity: typeof window !== 'undefined' && navigator?.onLine ? 'online' : 'offline'
                });
            } else if (error.code !== 'not-found' && !(error.message && error.message.includes("NOT_FOUND"))) {
                console.error(`Firestore error fetching course ${id}. Falling back to static data.`, error);
            }
        }
    }
    
    // If not in Firestore, find the course in our static data
    const courseFromStatic = initialCourses.find(c => c.id === id);

    if (courseFromStatic) {
        // Attach reviews
        const courseData = { ...courseFromStatic, reviews: await getReviewsForCourse(id) };
        return courseData;
    } 
    
    console.log("No such document!");
    return undefined;
};

export const getCourseBySlugOrId = async (slugOrId: string): Promise<GolfCourse | undefined> => {
    if (!slugOrId) return undefined;

    const byId = await getCourseById(slugOrId);
    if (byId) return byId;

    if (db) {
        try {
            const q = query(collection(db, 'courses'), where('slug', '==', slugOrId), limit(1));
            const qs = await getDocs(q);
            if (!qs.empty) {
                const courseDoc = qs.docs[0];
                const rawCourseData = { id: courseDoc.id, ...courseDoc.data() };
                const serializedCourseData = serializeTimestamps(rawCourseData) as GolfCourse;
                serializedCourseData.reviews = await getReviewsForCourse(courseDoc.id);
                return serializedCourseData;
            }
        } catch (error: any) {
            if (error.code === 'unavailable') {
                console.warn(`Firestore unavailable when fetching course ${slugOrId} by slug. Falling back to static data.`, {
                    code: error.code,
                    message: error.message,
                    connectivity: typeof window !== 'undefined' && navigator?.onLine ? 'online' : 'offline'
                });
            } else if (error.code === 'network-request-failed' || error.message?.includes('offline')) {
                console.warn(`Network error fetching course ${slugOrId} by slug. Falling back to static data.`, {
                    code: error.code,
                    message: error.message,
                    connectivity: typeof window !== 'undefined' && navigator?.onLine ? 'online' : 'offline'
                });
            } else if (error.code !== 'not-found' && !(error.message && error.message.includes("NOT_FOUND"))) {
                console.error(`Firestore error fetching course by slug ${slugOrId}. Falling back to static data.`, error);
            }
        }
    }

    return undefined;
};

export const getCourseLocations = async (): Promise<string[]> => {
    const courseList = await getCourses({});
    return [...new Set(courseList.map(c => c.location))];
}

// Helper function to remove undefined values from objects
const removeUndefinedValues = (obj: any): any => {
    const cleaned: any = {};
    Object.keys(obj).forEach(key => {
        if (obj[key] !== undefined) {
            if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
                const nestedCleaned = removeUndefinedValues(obj[key]);
                if (Object.keys(nestedCleaned).length > 0) {
                    cleaned[key] = nestedCleaned;
                }
            } else {
                cleaned[key] = obj[key];
            }
        }
    });
    return cleaned;
};

export const addCourse = async (courseData: CourseDataInput): Promise<string> => {
    if (!db) throw new Error("Firestore is not initialized.");
    // Helper to generate a unique, slug-based course ID
    const generateUniqueCourseId = async (candidateBase: string): Promise<string> => {
        let base = slugify(candidateBase);
        if (!base) base = `course-${Date.now()}`;
        let candidate = base;
        let suffix = 1;
        while (true) {
            const candidateRef = doc(db, 'courses', candidate);
            const candidateSnap = await getDoc(candidateRef);
            if (!candidateSnap.exists()) {
                return candidate;
            }
            suffix += 1;
            candidate = `${base}-${suffix}`;
        }
    };

    // This will add a new course to Firestore, it won't be in the initial static list
    const { newImages, ...restOfData } = courseData;
    const newImageUrls = await uploadImages(courseData.name, newImages);

    // Generate unique slug ID for the course document
    const slugId = await generateUniqueCourseId(restOfData.slug || restOfData.name);
    
    const courseDocData = removeUndefinedValues({
      name: restOfData.name,
      location: restOfData.location,
      address: restOfData.address,
      description: restOfData.description,
      rules: restOfData.rules || "",
      basePrice: restOfData.basePrice,
      imageUrls: [...restOfData.existingImageUrls, ...newImageUrls],
      teeTimeInterval: restOfData.teeTimeInterval,
      operatingHours: restOfData.operatingHours,
      availableHoles: restOfData.availableHoles,
      totalYards: restOfData.totalYards,
      par: restOfData.par,
      holeDetails: restOfData.holeDetails,
      hidden: restOfData.hidden || false,
      latLng: restOfData.latLng,
      slug: slugId,
    });
    
    const coursesCol = collection(db, 'courses');
    const courseDocRef = doc(coursesCol, slugId);
    await setDoc(courseDocRef, {
      ...courseDocData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return courseDocRef.id;
}

export const updateCourse = async (courseId: string, courseData: CourseDataInput): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    const operationId = `upd-${courseId}-${Date.now()}`;
    const userId = auth?.currentUser?.uid || 'unknown';
    const userEmail = auth?.currentUser?.email || undefined;

    try {
        const { newImages, existingImageUrls, ...restOfData } = courseData;
        const newImageUrls = await uploadImages(courseData.name, newImages);

        const allImageUrls = [...existingImageUrls, ...newImageUrls];

        const courseDocRef = doc(db, 'courses', courseId);
        
        // Check if document exists, if not create it
        const courseSnap = await getDoc(courseDocRef);
        const previousData = courseSnap.exists() ? courseSnap.data() : null;

        const courseUpdateData = removeUndefinedValues({
            name: restOfData.name,
            location: restOfData.location,
            address: restOfData.address,
            description: restOfData.description,
            rules: restOfData.rules || "",
            basePrice: restOfData.basePrice,
            imageUrls: allImageUrls,
            teeTimeInterval: restOfData.teeTimeInterval,
            operatingHours: restOfData.operatingHours,
            availableHoles: restOfData.availableHoles,
            totalYards: restOfData.totalYards,
            par: restOfData.par,
            holeDetails: restOfData.holeDetails,
            hidden: restOfData.hidden,
            latLng: restOfData.latLng,
            slug: restOfData.slug,
        });

        // Compute shallow changes for audit
        const fieldChanges: Record<string, { from: any; to: any }> = {};
        const keys = Object.keys(courseUpdateData);
        for (const key of keys) {
            const prev = previousData ? (previousData as any)[key] : undefined;
            const next = (courseUpdateData as any)[key];
            if (JSON.stringify(prev) !== JSON.stringify(next)) {
                fieldChanges[key] = { from: prev ?? null, to: next };
            }
        }

        const basePriceChange = fieldChanges['basePrice'];

        if (courseSnap.exists()) {
            await updateDoc(courseDocRef, {
                ...courseUpdateData,
                updatedAt: serverTimestamp()
            });
        } else {
            // If document doesn't exist, create it with setDoc
            // Find the static course data to get additional fields like latLng
            const staticCourse = initialCourses.find(c => c.id === courseId);
            const cleanedSetDocData = removeUndefinedValues({
                id: courseId,
                ...courseUpdateData,
                latLng: staticCourse?.latLng || { lat: 0, lng: 0 },
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            await setDoc(courseDocRef, cleanedSetDocData);
        }

        // Structured log
        logger.info('Course updated', {
            operationId,
            courseId,
            userId,
            userEmail,
            basePriceChange,
            changedFields: Object.keys(fieldChanges),
        });

        // Firestore audit record
        try {
            await addDoc(collection(db, 'admin_audit_logs'), {
                type: courseSnap.exists() ? 'update_course' : 'create_course',
                operationId,
                courseId,
                userId,
                userEmail,
                timestamp: serverTimestamp(),
                changes: fieldChanges,
            });
        } catch (auditErr) {
            // Do not block operation if audit fails
            logger.warn('Failed to write admin audit log', { operationId, courseId, error: String(auditErr) });
        }
    } catch (error) {
        // Error log and audit
        logger.error('Failed to update course', { operationId, courseId, error: String(error) });
        try {
            await addDoc(collection(db, 'admin_audit_logs'), {
                type: 'update_course_failed',
                operationId,
                courseId,
                userId,
                userEmail,
                timestamp: serverTimestamp(),
                error: String(error),
            });
        } catch {}
        throw error;
    }
}

export const deleteCourse = async (courseId: string): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    // Note: This will not delete subcollections like reviews or tee times automatically.
    // For a production app, a Cloud Function would be needed to handle cascading deletes.
    const courseDocRef = doc(db, 'courses', courseId);
    await deleteDoc(courseDocRef);
}

export const updateCourseVisibility = async (courseId: string, hidden: boolean): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    const courseDocRef = doc(db, 'courses', courseId);
    await updateDoc(courseDocRef, {
        hidden,
        updatedAt: serverTimestamp()
    });
}

export const updateCourseFeaturedStatus = async (courseId: string, isFeatured: boolean): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    const courseDocRef = doc(db, 'courses', courseId);
    await updateDoc(courseDocRef, {
        isFeatured,
        updatedAt: serverTimestamp()
    });
};

// *** Tee Time Functions ***

const generateDefaultTeeTimes = (basePrice: number, course?: GolfCourse, date?: Date): Omit<TeeTime, 'id' | 'date'>[] => {
    const times: Omit<TeeTime, 'id' | 'date'>[] = [];
    
    // Get interval from course configuration or default to 10 minutes for exact timing
    const intervalMinutes = course?.teeTimeInterval || 10;
    
    // Get operating hours from course configuration or use defaults
    const openingTime = course?.operatingHours?.openingTime ? 
        parseTimeToDecimal(course.operatingHours.openingTime) : 7.0; // 07:00
    const lastTeeTime = course?.operatingHours?.closingTime ? 
        parseTimeToDecimal(course.operatingHours.closingTime) : 18.0; // 18:00
    
    // Check if this is today's date for auto-blocking past times
    const now = new Date();
    const isToday = date ? date.toDateString() === now.toDateString() : false;
    const nowTimeDecimal = isToday ? now.getHours() + (now.getMinutes() / 60) : 0;

    // Start with exact minutes based on interval
    let currentTimeMinutes = Math.floor(openingTime * 60);
    const lastTeeTimeMinutes = Math.floor(lastTeeTime * 60);
    
    // Ensure we start on exact interval boundaries
    const remainder = currentTimeMinutes % intervalMinutes;
    if (remainder !== 0) {
        currentTimeMinutes += (intervalMinutes - remainder);
    }
    
    while (currentTimeMinutes <= lastTeeTimeMinutes) {
        const hour = Math.floor(currentTimeMinutes / 60);
        const minute = currentTimeMinutes % 60;
        
        const formattedTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        const currentTimeDecimal = hour + (minute / 60);
        
        const priceMultiplier = 1; // Dynamic pricing disabled — always use basePrice
        
        // Auto-block past times if it's today
        const status = isToday && currentTimeDecimal <= nowTimeDecimal ? 'blocked' : 'available';
        
        times.push({
            time: formattedTime,
            status,
            price: basePrice,
            maxPlayers: 4, // Máximo estándar de 4 jugadores por tee time
            bookedPlayers: 0, // Inicialmente sin jugadores reservados
            availableSpots: 4, // Todos los espacios disponibles inicialmente
            bookingIds: [] // Sin reservas inicialmente
        });

        // Increment by exact interval minutes
        currentTimeMinutes += intervalMinutes;
    }
    return times;
};

// Helper function to parse time string to decimal
const parseTimeToDecimal = (timeString: string): number => {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours + (minutes / 60);
};


export const getTeeTimesForCourse = async (courseId: string, date: Date, basePrice: number): Promise<TeeTime[]> => {
    const now = new Date();
    const isRequestForToday = isToday(date);
    const dateString = format(startOfDay(date), 'yyyy-MM-dd');
    
    // Get course information for interval and operating hours
    const course = await getCourseById(courseId);

    // If the course is hidden, do not expose any availability
    if (course?.hidden) {
        return [];
    }

    // Daily cutoff logic
    if (isRequestForToday) {
        const cutoffTime = set(now, { hours: 19, minutes: 0, seconds: 0, milliseconds: 0 });
        if (isAfter(now, cutoffTime)) {
            const allTimes = generateDefaultTeeTimes(basePrice, course, date);
            return allTimes.map(t => ({
                ...t,
                id: `${dateString}-${t.time}`,
                date: dateString,
                status: 'blocked'
            }));
        }
    }

    if (!db) {
        console.warn("Firestore not available. Generating local tee times.");
        let defaultTimes = generateDefaultTeeTimes(basePrice, course, date);

        // Filter for today's available times
        if (isRequestForToday) {
            const minLeadTime = addMinutes(now, 30);
            defaultTimes = defaultTimes.filter(t => {
                const teeDateTime = parse(t.time, 'HH:mm', date);
                return isAfter(teeDateTime, minLeadTime);
            });
        }

        return defaultTimes.map((t, i) => ({ ...t, id: `local-${i}`, date: dateString }));
    }

    const teeTimesCol = collection(db, 'courses', courseId, 'teeTimes');
    const q = query(teeTimesCol, where('date', '==', dateString));
    
    try {
        const snapshot = await getDocs(q);
        let teeTimesResult: TeeTime[];

        if (snapshot.empty) {
            console.log(`No tee times found for ${dateString}, generating new ones.`);
            const defaultTimes = generateDefaultTeeTimes(basePrice, course, date);
            const batch = writeBatch(db);
            const newTimesWithIds: TeeTime[] = [];

            defaultTimes.forEach(timeData => {
                const timeDocRef = doc(teeTimesCol); 
                const newTeeTime: TeeTime = {
                    ...timeData,
                    id: timeDocRef.id,
                    date: dateString,
                };
                 batch.set(timeDocRef, {
                    date: newTeeTime.date,
                    time: newTeeTime.time,
                    price: newTeeTime.price,
                    status: newTeeTime.status,
                    maxPlayers: newTeeTime.maxPlayers,
                    bookedPlayers: newTeeTime.bookedPlayers,
                    availableSpots: newTeeTime.availableSpots,
                    bookingIds: newTeeTime.bookingIds
                });
                newTimesWithIds.push(newTeeTime);
            });
            
            await batch.commit();
            console.log(`Successfully created ${newTimesWithIds.length} tee times for ${dateString}.`);
            teeTimesResult = newTimesWithIds;
        } else {
            teeTimesResult = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as TeeTime));
        }

        // Apply dynamic pricing per tee time using the quote API (players: 1, holes: 18)
        // This ensures displayed prices respect current bands and rules.
        const dateStringForApi = dateString;
        const enrichedTimes = await Promise.all(
            teeTimesResult.map(async (t) => {
                try {
                    const response = await fetch('/api/checkout/quote', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            courseId,
                            date: dateStringForApi,
                            time: t.time,
                            players: 1,
                            holes: 18,
                            basePrice: basePrice
                        }),
                    });
                    if (!response.ok) {
                        // Fallback to basePrice when quote fails
                        return { ...t, price: basePrice } as TeeTime;
                    }
                    const quote = await response.json();
                    const perPlayerUsd = (quote.subtotal_cents || 0) / 100; // players=1, holes=18
                    return { ...t, price: perPlayerUsd } as TeeTime;
                } catch (err) {
                    console.warn('Quote failed for time', t.time, err);
                    return { ...t, price: basePrice } as TeeTime;
                }
            })
        );

        // Filter for today's available times after fetching/creating
        let filteredTimes = enrichedTimes;
        if (isRequestForToday) {
            const minLeadTime = addMinutes(now, 30);
            filteredTimes = filteredTimes.filter(t => {
                const teeDateTime = parse(t.time, 'HH:mm', date);
                return isAfter(teeDateTime, minLeadTime);
            });
        }
        
        return filteredTimes.sort((a,b) => a.time.localeCompare(b.time));

    } catch (error) {
        console.error("Error getting or creating tee times: ", error);
        return [];
    }
};

export const updateTeeTimesForCourse = async (courseId: string, date: Date, teeTimes: TeeTime[]): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    const teeTimesCol = collection(db, 'courses', courseId, 'teeTimes');

    const batch = writeBatch(db);
    teeTimes.forEach(tt => {
        const docRef = doc(teeTimesCol, tt.id);
        const payload: any = {
            // Always persist these core fields
            date: tt.date || format(startOfDay(date), 'yyyy-MM-dd'),
            time: tt.time,
            price: tt.price,
            status: tt.status,
        };
        // Persist optional fields when present (keeps booking logic consistent)
        if (typeof tt.maxPlayers !== 'undefined') payload.maxPlayers = tt.maxPlayers;
        if (typeof tt.bookedPlayers !== 'undefined') payload.bookedPlayers = tt.bookedPlayers;
        if (typeof tt.availableSpots !== 'undefined') payload.availableSpots = tt.availableSpots;
        if (typeof tt.bookingIds !== 'undefined') payload.bookingIds = tt.bookingIds;

        // Use set with merge to upsert documents when they don't exist yet
        batch.set(docRef, payload, { merge: true });
    });

    await batch.commit();
};


// *** Booking Functions ***

// Function to generate confirmation number TRG- + random characters (max 10 total)
function generateConfirmationNumber(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'TRG-';
    // Generate 6 random characters to make total 10 (TRG- = 4 chars + 6 random = 10)
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// *** Payment Failure Logging ***

interface FailedPaymentLog {
    paymentIntentId: string;
    amount: number; // Monto en centavos (valor original de Stripe)
    amountInDollars?: number; // Monto en dólares para facilitar lectura
    currency: string;
    errorCode?: string;
    errorDeclineCode?: string;
    errorMessage?: string;
    bookingId?: string;
    fxRate?: number;
    currencyAttempt?: string;
    priceUsd?: number;
    createdAt: any; // serverTimestamp
}

interface SuccessfulPaymentLog {
    paymentIntentId: string;
    bookingId: string;
    final_currency: string;
    amount_received: number; // Monto en centavos (valor original de Stripe)
    amountInDollars?: number; // Monto en dólares para facilitar lectura
    fxRate: number;
    currencyAttempt: string;
    priceUsd: number;
    createdAt: any; // serverTimestamp
}

export async function logFailedPayment(data: Omit<FailedPaymentLog, 'createdAt'>): Promise<void> {
    if (!db) {
        console.warn("Firestore not available. Skipping failed payment logging.");
        return;
    }
    try {
        const failedPaymentsCol = collection(db, 'failed_payments');
        await addDoc(failedPaymentsCol, {
            ...data,
            createdAt: serverTimestamp()
        });
        console.log(`Logged failed payment: ${data.paymentIntentId}`);
    } catch (error) {
        console.error("Error logging failed payment:", error);
        // No relanzar el error para no interrumpir el flujo del webhook
    }
}

export async function logSuccessfulPayment(data: Omit<SuccessfulPaymentLog, 'createdAt'>): Promise<void> {
    if (!db) {
        console.warn("Firestore not available. Skipping successful payment logging.");
        return;
    }
    try {
        const successfulPaymentsCol = collection(db, 'successful_payments');
        await addDoc(successfulPaymentsCol, {
            ...data,
            createdAt: serverTimestamp()
        });
        console.log(`Logged successful payment: ${data.paymentIntentId} for booking: ${data.bookingId}`);
    } catch (error) {
        console.error("Error logging successful payment:", error);
        // No relanzar el error para no interrumpir el flujo del webhook
    }
}

export async function createBooking(bookingData: BookingInput, lang: Locale): Promise<string> {
    if (!db) throw new Error("Firestore is not initialized.");
    const dbInstance = db; // Create a non-null reference
    const bookingsCol = collection(dbInstance, 'bookings');
    const bookingDocRef = doc(bookingsCol);
    const teeTimeDocRef = doc(dbInstance, 'courses', bookingData.courseId, 'teeTimes', bookingData.teeTimeId);

    let userProfile: UserProfile | undefined = undefined;
    const confirmationNumber = generateConfirmationNumber();
    const isGuestBooking = bookingData.userId === 'guest';

    // Enforce first-reservation restriction for WELCOME coupon
    const isWelcomeCoupon = (bookingData.couponCode || '').toUpperCase() === 'WELCOME';
    if (isWelcomeCoupon) {
        let hasPriorBooking = false;
        try {
            if (!isGuestBooking) {
                // Check user achievements and prior bookings by userId
                const preUserDocRef = doc(dbInstance, 'users', bookingData.userId);
                const preUserDoc = await getDoc(preUserDocRef);
                if (preUserDoc.exists()) {
                    const profile = preUserDoc.data() as UserProfile;
                    userProfile = profile; // reuse later
                    if (Array.isArray(profile.achievements) && profile.achievements.includes('firstBooking')) {
                        hasPriorBooking = true;
                    }
                }
                if (!hasPriorBooking) {
                    const priorByUserId = query(collection(dbInstance, 'bookings'), where('userId', '==', bookingData.userId), limit(1));
                    const priorByUserSnap = await getDocs(priorByUserId);
                    if (priorByUserSnap.size > 0) hasPriorBooking = true;
                }
            } else if (bookingData.userEmail) {
                // Check prior bookings by email for guest bookings
                const priorByEmail = query(collection(dbInstance, 'bookings'), where('userEmail', '==', bookingData.userEmail), limit(1));
                const priorByEmailSnap = await getDocs(priorByEmail);
                if (priorByEmailSnap.size > 0) hasPriorBooking = true;
            }
        } catch (e) {
            console.warn('Failed to verify WELCOME eligibility:', e);
        }
        if (hasPriorBooking) {
            throw new Error("WELCOME coupon is only valid for your first reservation.");
        }
    }

    const bookingId = await runTransaction(dbInstance, async (transaction) => {
        const teeTimeDoc = await transaction.get(teeTimeDocRef);

        if (!teeTimeDoc.exists()) throw new Error("Tee time not found. It may have been booked by someone else.");
        
        const teeTimeData = teeTimeDoc.data() as TeeTime;
        
        // Check if tee time has enough available spots
        const currentAvailableSpots = teeTimeData.availableSpots ?? (teeTimeData.maxPlayers ?? 4);
        const requestedPlayers = bookingData.players;
        
        if (teeTimeData.status === 'blocked') {
            throw new Error("This tee time is blocked and not available for booking.");
        }
        
        if (teeTimeData.status === 'booked' && currentAvailableSpots === 0) {
            throw new Error("This tee time is fully booked.");
        }
        
        if (requestedPlayers > currentAvailableSpots) {
            throw new Error(`Only ${currentAvailableSpots} spots available for this tee time.`);
        }

        // Only get user profile for registered users
        if (!isGuestBooking) {
            const userDocRef = doc(dbInstance, 'users', bookingData.userId);
            const userDoc = await transaction.get(userDocRef);
            if (!userDoc.exists()) throw new Error("User does not exist!");
            userProfile = userDoc.data() as UserProfile;
        }
        
        let finalPrice = bookingData.totalPrice;
        
        if (bookingData.couponCode) {
            const couponRef = doc(dbInstance, 'coupons', bookingData.couponCode);
            const couponSnap = await transaction.get(couponRef);
            if (!couponSnap.exists()) throw new Error("Coupon is not valid.");
            
            const coupon = couponSnap.data() as Coupon;
            if (coupon.expiresAt && isBefore(new Date(coupon.expiresAt), new Date())) {
                throw new Error("This coupon has expired.");
            }
            // Usage limit validation
            const currentUses = coupon.timesUsed ?? 0;
            if (coupon.usageLimit && currentUses >= coupon.usageLimit) {
                throw new Error("This coupon has reached its usage limit.");
            }

            transaction.update(couponRef, { timesUsed: increment(1) });
        }
        
        transaction.set(bookingDocRef, { 
            ...bookingData, 
            confirmationNumber,
            totalPrice: finalPrice, 
            createdAt: new Date().toISOString() 
        });
        
        // Update tee time with partial booking logic
        const newBookedPlayers = (teeTimeData.bookedPlayers ?? 0) + requestedPlayers;
        const newAvailableSpots = (teeTimeData.maxPlayers ?? 4) - newBookedPlayers;
        const newBookingIds = [...(teeTimeData.bookingIds ?? []), bookingDocRef.id];
        
        let newStatus: 'available' | 'partial' | 'booked' = 'available';
        if (newAvailableSpots === 0) {
            newStatus = 'booked'; // Completamente reservado
        } else if (newBookedPlayers > 0) {
            newStatus = 'partial'; // Parcialmente reservado
        }
        
        transaction.update(teeTimeDocRef, { 
            status: newStatus,
            bookedPlayers: newBookedPlayers,
            availableSpots: newAvailableSpots,
            bookingIds: newBookingIds
        });

        // Only update user profile for registered users
        if (!isGuestBooking && userProfile) {
            const newAchievements: AchievementId[] = [...userProfile.achievements];
            if (!userProfile.achievements.includes('firstBooking')) newAchievements.push('firstBooking');
            
            const userDocRef = doc(dbInstance, 'users', bookingData.userId);
            transaction.update(userDocRef, {
                xp: increment(150),
                achievements: newAchievements,
            });
        }
        
        return bookingDocRef.id;
    });

    // Send confirmation email after transaction is successful
    const emailToUse = (userProfile as UserProfile | undefined)?.email || bookingData.userEmail;
    if (bookingId && emailToUse) {
        try {
            const response = await fetch('/api/send-booking-receipt', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    recipientEmail: emailToUse,
                    bookingDetails: {
                        confirmationNumber: confirmationNumber,
                        playerName: bookingData.userName,
                        courseName: bookingData.courseName,
                        courseLocation: (bookingData as any).courseLocation,
                        date: bookingData.date,
                        time: bookingData.time,
                        players: bookingData.players,
                        holes: (bookingData as any).holes,
                        totalPrice: bookingData.totalPrice,
                        // Include pricing_snapshot if available
                        ...((bookingData as any).pricing_snapshot ? { pricing_snapshot: (bookingData as any).pricing_snapshot } : {})
                    }
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`Email API responded with status: ${response.status}. ${errorData.error || ''}`);
            }
        } catch (emailError) {
            console.error(`Booking ${bookingId} created, but confirmation email failed:`, emailError);
            // Don't throw error to user, as booking was successful. Log for monitoring.
        }
    }

    // Send WhatsApp notification if phone number is available
    const phoneToUse = bookingData.userPhone;
    if (bookingId && phoneToUse) {
        try {
            const response = await fetch('/api/send-whatsapp-notification', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    phoneNumber: phoneToUse,
                    bookingDetails: {
                        courseName: bookingData.courseName,
                        courseLocation: bookingData.courseLocation,
                        date: bookingData.date,
                        time: bookingData.time,
                        players: bookingData.players,
                        holes: bookingData.holes,
                        totalPrice: bookingData.totalPrice,
                        userName: bookingData.userName
                    }
                })
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log('WhatsApp notification URL generated:', result.whatsappUrl);
            }
        } catch (whatsappError) {
            console.error(`Booking ${bookingId} created, but WhatsApp notification failed:`, whatsappError);
            // Don't throw error to user, as booking was successful. Log for monitoring.
        }
    }

    // Send admin alerts if booking is confirmed
    if (bookingId && bookingData.status === 'confirmed') {
        try {
            const { sendAdminBookingAlert } = await import('./admin-alerts-service');
            
            const adminAlertData: any = {
                bookingId: bookingId,
                courseName: bookingData.courseName,
                customerName: bookingData.userName,
                customerEmail: emailToUse,
                customerPhone: phoneToUse,
                date: bookingData.date,
                time: bookingData.time,
                players: bookingData.players,
                totalAmount: bookingData.totalPrice,
                currency: ((bookingData as any).currency || 'USD'),
                paymentMethod: ((bookingData as any).paymentMethod || 'stripe'),
                transactionId: ((bookingData as any).paymentIntentId || (bookingData as any).transactionId),
                bookingUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://teereserve.golf'}/booking/${bookingId}`,
                createdAt: new Date()
            };

            // Enriquecer con últimos 4 dígitos de tarjeta si es Stripe
            try {
                const pm = (bookingData as any).paymentMethod;
                const piId = (bookingData as any).paymentIntentId;
                if (pm === 'stripe' && piId) {
                    const { stripe } = await import('./stripe');
                    const pi = await stripe.paymentIntents.retrieve(piId, { expand: ['payment_method'] });
                    const paymentMethod = pi.payment_method as any;
                    if (paymentMethod && paymentMethod.card) {
                        adminAlertData.cardLast4 = paymentMethod.card.last4;
                        adminAlertData.cardBrand = paymentMethod.card.brand;
                    } else if (pi.payment_method && typeof pi.payment_method === 'string') {
                        const pmObj = await stripe.paymentMethods.retrieve(pi.payment_method);
                        if (pmObj && pmObj.card) {
                            adminAlertData.cardLast4 = pmObj.card.last4;
                            adminAlertData.cardBrand = pmObj.card.brand;
                        }
                    }
                }
            } catch (stripeInfoError) {
                console.warn('Unable to enrich admin alert with card last4:', stripeInfoError);
            }

            await sendAdminBookingAlert(adminAlertData);
            console.log(`Admin alerts sent for confirmed booking: ${bookingId}`);
        } catch (adminAlertError) {
            console.error(`Booking ${bookingId} created, but admin alerts failed:`, adminAlertError);
            // Don't throw error to user, as booking was successful. Log for monitoring.
        }
    }
    
    return bookingId;
}


export async function getBookings(): Promise<Booking[]> {
    if (!db) return [];
    const bookingsCol = collection(db, 'bookings');
    const snapshot = await getDocs(query(bookingsCol, orderBy('createdAt', 'desc')));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
}

export async function getUserBookings(userId: string): Promise<Booking[]> {
    if (!db) return [];
    const bookingsCol = collection(db, 'bookings');
    const q = query(bookingsCol, where('userId', '==', userId), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
}

export async function getBookingById(bookingId: string): Promise<Booking | null> {
    if (!db) throw new Error("Database service is not available.");

    try {
        const bookingDocRef = doc(db, 'bookings', bookingId.trim());
        const docSnap = await getDoc(bookingDocRef);

        if (!docSnap.exists()) {
            return null;
        }

        return { id: docSnap.id, ...docSnap.data() } as Booking;
    } catch (error) {
        console.error('Error fetching booking:', error);
        return null;
    }
}

export async function getGuestBookingDraft(draftId: string): Promise<any | null> {
    if (!db) throw new Error("Database service is not available.");

    try {
        const draftDocRef = doc(db, 'guestBookingDrafts', draftId.trim());
        const docSnap = await getDoc(draftDocRef);

        if (!docSnap.exists()) {
            return null;
        }

        return { id: docSnap.id, ...docSnap.data() };
    } catch (error) {
        console.error('Error fetching guest booking draft:', error);
        return null;
    }
}

export async function getBookingByIdAndLastName(bookingId: string, email: string): Promise<Booking> {
    console.log('🔍 Iniciando búsqueda de reserva:', { bookingId, email });
    
    if (!db) throw new Error("Database service is not available.");
    const dbInstance = db; // Create a non-null reference

    let booking: Booking | null = null;
    const trimmedBookingId = bookingId.trim();
    console.log('📋 ID de reserva procesado:', trimmedBookingId);

    // First, try to find by document ID (for existing bookings)
    if (trimmedBookingId.length >= 10) {
        console.log('🔎 Buscando por ID de documento...');
        try {
            const bookingDocRef = doc(dbInstance, 'bookings', trimmedBookingId);
            const docSnap = await getDoc(bookingDocRef);
            
            if (docSnap.exists()) {
                booking = { id: docSnap.id, ...docSnap.data() } as Booking;
                console.log('✅ Reserva encontrada por ID de documento:', { id: booking.id, userId: booking.userId, isGuest: booking.isGuest });
            } else {
                console.log('❌ No se encontró reserva por ID de documento');
            }
        } catch (error) {
            // If document ID lookup fails, continue to confirmation number search
            console.log('⚠️ Error en búsqueda por ID de documento:', error);
        }
    }

    // If not found by document ID, try to find by confirmation number
    if (!booking) {
        console.log('🔎 Buscando por número de confirmación...');
        const bookingsCol = collection(dbInstance, 'bookings');
        const q = query(bookingsCol, where('confirmationNumber', '==', trimmedBookingId));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
            const doc = querySnapshot.docs[0];
            booking = { id: doc.id, ...doc.data() } as Booking;
            console.log('✅ Reserva encontrada por número de confirmación:', { id: booking.id, userId: booking.userId, isGuest: booking.isGuest });
        } else {
            console.log('❌ No se encontró reserva por número de confirmación');
        }
    }

    if (!booking) {
        console.log('❌ Reserva no encontrada');
        throw new Error("Booking not found. Please check your Booking ID or Confirmation Number.");
    }

    console.log('📊 Datos de la reserva encontrada:', {
        id: booking.id,
        userId: booking.userId,
        isGuest: booking.isGuest,
        hasGuestObject: !!booking.guest,
        userEmail: booking.userEmail,
        guestEmail: booking.guest?.email
    });

    // Verify email based on booking type
    let bookingEmail: string;
    
    if (booking.isGuest && booking.guest?.email) {
        // For guest bookings with guest object, use the email stored in the guest object
        bookingEmail = booking.guest.email;
        console.log('✅ Usando email del objeto guest:', bookingEmail);
    } else if (booking.userId === 'guest') {
        // For legacy guest bookings with userId='guest' but no guest object
        // We need to find the email in the booking data itself
        console.log('🔍 Reserva legacy con userId="guest"');
        if (booking.userEmail) {
            bookingEmail = booking.userEmail;
            console.log('✅ Usando userEmail para reserva legacy:', bookingEmail);
        } else {
            console.log('❌ Reserva legacy sin userEmail disponible');
            throw new Error("Guest booking found but no email information available. Please contact support.");
        }
    } else if (booking.userId && booking.userId !== 'guest') {
        // For registered user bookings, get email from user profile
        console.log('🔍 Buscando perfil de usuario registrado:', booking.userId);
        const userDocRef = doc(dbInstance, 'users', booking.userId);
        const userDoc = await getDoc(userDocRef);
        
        if (!userDoc.exists()) {
            console.log('❌ Perfil de usuario no encontrado para userId:', booking.userId);
            throw new Error("User profile not found for this booking.");
        }
        
        const userProfile = userDoc.data() as UserProfile;
        if (!userProfile.email) {
            console.log('❌ Usuario registrado sin email disponible');
            throw new Error("User profile found but no email available. Please contact support.");
        }
        bookingEmail = userProfile.email;
        console.log('✅ Email obtenido del perfil de usuario:', bookingEmail);
    } else {
        console.log('❌ Datos de reserva inválidos - información de usuario faltante');
        throw new Error("Invalid booking data: missing user information.");
    }
    
    // Check if the email matches the booking record, case-insensitively
    console.log('🔍 Verificando coincidencia de emails:', {
        emailIngresado: email.trim().toLowerCase(),
        emailReserva: bookingEmail.toLowerCase(),
        coincide: bookingEmail.toLowerCase() === email.trim().toLowerCase()
    });
    
    if (bookingEmail.toLowerCase() !== email.trim().toLowerCase()) {
        console.log('❌ Los emails no coinciden');
        throw new Error("Email does not match the booking record.");
    }

    console.log('✅ Búsqueda de reserva exitosa');
    return booking;
}

// *** Review Functions ***

export async function addReview(courseId: string, reviewData: ReviewInput): Promise<string> {
    if (!db) throw new Error("Firestore is not initialized.");
    const reviewsCol = collection(db, 'courses', courseId, 'reviews');
    const docRef = await addDoc(reviewsCol, {
        ...reviewData,
        approved: null, // Pending moderation
        createdAt: new Date().toISOString(),
        courseId,
    });
    return docRef.id;
}

export async function getReviewsForCourse(courseId: string, onlyApproved = true): Promise<Review[]> {
    if (!db) return [];
    try {
        const reviewsCol = collection(db, 'courses', courseId, 'reviews');
        let q = query(reviewsCol, orderBy('createdAt', 'desc'));

        if (onlyApproved) {
            q = query(reviewsCol, where('approved', '==', true), orderBy('createdAt', 'desc'));
        }

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => {
            const data = doc.data();
            const serializedData = serializeTimestamps(data);
            return {
                id: doc.id,
                user: {
                    name: serializedData.userName,
                    avatarUrl: serializedData.userAvatar
                },
                ...serializedData,
                // Ensure rating is always a valid number
                rating: typeof serializedData.rating === 'number' && !isNaN(serializedData.rating) ? serializedData.rating : 0,
                likesCount: serializedData.likesCount || 0,
                commentsCount: serializedData.commentsCount || 0
            } as Review
        });
    } catch (error) {
        console.error(`Error fetching reviews for course ${courseId}:`, error);
        return [];
    }
}

export async function getAllReviews(): Promise<Review[]> {
    if (!db) return [];
    const allReviews: Review[] = [];

    try {
        const coursesSnapshot = await getDocs(collection(db, 'courses'));
        // Add reviews from dynamically added courses
        for (const courseDoc of coursesSnapshot.docs) {
            const courseName = courseDoc.data().name;
            const reviews = await getReviewsForCourse(courseDoc.id, false);
            reviews.forEach(r => allReviews.push({ ...r, courseName }));
        }
    } catch (error) {
        console.error("Error fetching dynamic courses for reviews:", error);
    }

    // Add reviews from static courses, avoiding duplicates if they were somehow added to firestore
    for (const course of initialCourses) {
        const reviews = await getReviewsForCourse(course.id, false);
        reviews.forEach(r => {
            if (!allReviews.some(ar => ar.id === r.id)) {
                allReviews.push({ ...r, courseName: course.name });
            }
        });
    }

    // Sort all reviews globally by creation date
    allReviews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return allReviews;
}


export async function updateReviewStatus(courseId: string, reviewId: string, approved: boolean): Promise<void> {
    if (!db) throw new Error("Firestore is not initialized.");
    const reviewDocRef = doc(db, 'courses', courseId, 'reviews', reviewId);
    await updateDoc(reviewDocRef, { approved: approved });
}

export async function checkIfUserHasPlayed(userId: string, courseId: string): Promise<boolean> {
    if (!userId || !db) return false;

    const bookingsCol = collection(db, 'bookings');
    const q = query(
        bookingsCol, 
        where('userId', '==', userId), 
        where('courseId', '==', courseId),
        where('status', '==', 'completed'),
        limit(1)
    );
    const snapshot = await getDocs(q);
    return !snapshot.empty;
}

// *** User Functions ***
export async function getUsers(): Promise<UserProfile[]> {
    if (!db) return [];
    const usersCol = collection(db, 'users');
    const q = query(usersCol, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as UserProfile);
}

export async function updateUserRole(uid: string, role: UserProfile['role']): Promise<void> {
    if (!db) throw new Error("Firestore is not initialized.");
    const dbInstance = db; // Create a non-null reference
    const userDocRef = doc(dbInstance, 'users', uid);
    await updateDoc(userDocRef, { role });
}

export async function updateUserProfile(uid: string, data: Partial<UserProfile>): Promise<void> {
    if (!db) throw new Error("Firestore is not initialized.");
    const dbInstance = db; // Create a non-null reference
    const userDocRef = doc(dbInstance, 'users', uid);
    await updateDoc(userDocRef, data);
}

// User Profile retrieval
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
    if (!db) throw new Error('Firestore is not initialized.');
    const userDocRef = doc(db, 'users', uid);
    const snap = await getDoc(userDocRef);
    if (!snap.exists()) return null;
    return snap.data() as UserProfile;
}

// Social Posts
export async function getUserPosts(userId: string): Promise<Post[]> {
    if (!db) return [];
    const postsCol = collection(db, 'users', userId, 'posts');
    const q = query(postsCol, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Post));
}

export async function addUserPost(input: PostInput): Promise<string> {
    if (!db) throw new Error('Firestore is not initialized.');
    const postsCol = collection(db, 'users', input.userId, 'posts');
    const docRef = await addDoc(postsCol, {
        ...input,
        createdAt: new Date().toISOString(),
        likes: [],
        comments: [],
        likesCount: 0,
        commentsCount: 0
    });
    return docRef.id;
}

// Post Social Features
export async function likePost(postOwnerId: string, postId: string, userId: string, userName: string): Promise<void> {
    if (!db) throw new Error('Database not initialized');

    const postRef = doc(db, 'users', postOwnerId, 'posts', postId);
    const likesRef = collection(postRef, 'likes');
    const likeRef = doc(likesRef, userId);

    await runTransaction(db, async (transaction) => {
        const likeDoc = await transaction.get(likeRef);

        if (likeDoc.exists()) {
            // Unlike
            transaction.delete(likeRef);
            transaction.update(postRef, { likesCount: increment(-1) });
        } else {
            // Like
            const likeData: ReviewLike = {
                userId,
                userName,
                createdAt: new Date().toISOString()
            };
            transaction.set(likeRef, likeData);
            transaction.update(postRef, { likesCount: increment(1) });
        }
    });
}

export async function addPostComment(postOwnerId: string, postId: string, userId: string, userName: string, userAvatar: string | null, text: string): Promise<ReviewComment> {
    if (!db) throw new Error('Database not initialized');

    const postRef = doc(db, 'users', postOwnerId, 'posts', postId);
    const commentsRef = collection(postRef, 'comments');

    const commentData: Omit<ReviewComment, 'id'> = {
        userId,
        userName,
        userAvatar,
        text,
        createdAt: new Date().toISOString()
    };

    const commentDocRef = await addDoc(commentsRef, commentData);

    await updateDoc(postRef, { commentsCount: increment(1) });

    return { id: commentDocRef.id, ...commentData };
}

export async function getPostLikes(postOwnerId: string, postId: string): Promise<ReviewLike[]> {
    if (!db) throw new Error('Database not initialized');

    const likesRef = collection(db, 'users', postOwnerId, 'posts', postId, 'likes');
    const likesSnapshot = await getDocs(likesRef);
    return likesSnapshot.docs.map(doc => doc.data() as ReviewLike);
}

export async function getPostComments(postOwnerId: string, postId: string): Promise<ReviewComment[]> {
    if (!db) throw new Error('Database not initialized');

    const commentsRef = collection(db, 'users', postOwnerId, 'posts', postId, 'comments');
    const commentsQuery = query(commentsRef, orderBy('createdAt', 'asc'));
    const commentsSnapshot = await getDocs(commentsQuery);

    return commentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ReviewComment));
}

export async function checkUserLikedPost(postOwnerId: string, postId: string, userId: string): Promise<boolean> {
    if (!db) throw new Error('Database not initialized');

    const likeRef = doc(db, 'users', postOwnerId, 'posts', postId, 'likes', userId);
    const likeDoc = await getDoc(likeRef);
    return likeDoc.exists();
}

export async function getGlobalPosts(limitCount: number = 50): Promise<Post[]> {
    if (!db) return [];

    const postsQuery = query(collectionGroup(db, 'posts'), orderBy('createdAt', 'desc'), limit(limitCount));
    const snapshot = await getDocs(postsQuery);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Post));
}


// *** Scorecard Functions ***
export async function addUserScorecard(scorecardData: ScorecardInput): Promise<string> {
    if (!db) throw new Error("Firestore is not initialized.");
    const scorecardsCol = collection(db, 'users', scorecardData.userId, 'scorecards');
    const docRef = await addDoc(scorecardsCol, {
        ...scorecardData,
        createdAt: new Date().toISOString(),
    });
    return docRef.id;
}

export async function getUserScorecards(userId: string): Promise<Scorecard[]> {
    if (!db) return [];
    const scorecardsCol = collection(db, 'users', userId, 'scorecards');
    const q = query(scorecardsCol, orderBy('date', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Scorecard));
}

export async function deleteUserScorecard(userId: string, scorecardId: string): Promise<void> {
    if (!db) throw new Error("Firestore is not initialized.");
    const scorecardDocRef = doc(db, 'users', userId, 'scorecards', scorecardId);
    await deleteDoc(scorecardDocRef);
}

// *** Dashboard Functions ***
export async function getDashboardStats() {
    if (!db) {
        return {
            totalRevenue: 0,
            totalUsers: 0,
            totalBookings: 0,
            recentBookings: [],
            holeStats: { holes9: 0, holes18: 0, holes27: 0 },
            revenueByHoles: { holes9: 0, holes18: 0, holes27: 0 }
        };
    }
    
    try {
        const bookingsCol = collection(db, 'bookings');
        const usersCol = collection(db, 'users');
        
        // Execute queries with reduced limits for better performance
        const [revenueSnapshot, usersCountSnapshot, bookingsCountSnapshot, recentBookingsSnapshot] = await Promise.race([
            Promise.all([
                // Get completed bookings for revenue calculation (full set for accuracy)
                getDocs(query(bookingsCol, where('status', '==', 'completed'))),
                // Accurate users count using Firestore aggregation
                getCountFromServer(query(usersCol)),
                // Accurate bookings count using Firestore aggregation
                getCountFromServer(query(bookingsCol)),
                // Get recent bookings
                getDocs(query(bookingsCol, orderBy('createdAt', 'desc'), limit(5)))
            ]),
            // Add timeout promise
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Dashboard stats query timeout')), 8000)
            )
        ]) as any;
        
        // Calculate revenue and hole statistics from completed bookings
        let totalRevenue = 0;
        const holeStats = { holes9: 0, holes18: 0, holes27: 0 };
        const revenueByHoles = { holes9: 0, holes18: 0, holes27: 0 };
        
        revenueSnapshot.docs.forEach(doc => {
            const booking = doc.data();
            const revenue = booking.totalPrice || 0;
            const holes = booking.holes || 18;
            
            totalRevenue += revenue;
            
            if (holes === 9) {
                holeStats.holes9++;
                revenueByHoles.holes9 += revenue;
            } else if (holes === 27) {
                holeStats.holes27++;
                revenueByHoles.holes27 += revenue;
            } else {
                holeStats.holes18++;
                revenueByHoles.holes18 += revenue;
            }
        });
        
        const recentBookings = recentBookingsSnapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data() 
        } as Booking));
        
        return {
            totalRevenue,
            totalUsers: usersCountSnapshot.data().count,
            totalBookings: bookingsCountSnapshot.data().count,
            recentBookings,
            holeStats,
            revenueByHoles
        };
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        return {
            totalRevenue: 0,
            totalUsers: 0,
            totalBookings: 0,
            recentBookings: [],
            holeStats: { holes9: 0, holes18: 0, holes27: 0 },
            revenueByHoles: { holes9: 0, holes18: 0, holes27: 0 }
        };
    }
}

export async function getRevenueLast7Days(): Promise<{ date: string; revenue: number }[]> {
    const today = startOfDay(new Date());
    const sevenDaysAgo = subDays(today, 7);
    
    const dailyRevenue: { [key: string]: number } = {};
    for (let i = 0; i < 7; i++) {
        const date = format(subDays(today, i), 'MMM d');
        dailyRevenue[date] = 0;
    }

    if (!db) return Object.entries(dailyRevenue).map(([date, revenue]) => ({ date, revenue }));
    
    try {
        const bookingsCol = collection(db, 'bookings');
        const q = query(
            bookingsCol, 
            where('status', '==', 'completed'),
            where('createdAt', '>=' , sevenDaysAgo.toISOString())
        );
        
        const snapshot = await Promise.race([
            getDocs(q),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Revenue query timeout')), 5000)
            )
        ]) as any;

        snapshot.docs.forEach(doc => {
            const booking = doc.data() as Booking;
            const bookingDate = new Date(booking.createdAt);
            if (isAfter(bookingDate, sevenDaysAgo)) {
                const dateStr = format(bookingDate, 'MMM d');
                if (dailyRevenue.hasOwnProperty(dateStr)) {
                    dailyRevenue[dateStr] += booking.totalPrice;
                }
            }
        });
    } catch (error) {
        console.error('Error fetching revenue data:', error);
        // Return default data on error
    }

    return Object.entries(dailyRevenue)
        .map(([date, revenue]) => ({ date, revenue }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

// *** Site Content Functions ***
export const uploadSiteImage = async (file: File, imageName: string): Promise<string> => {
    if (!storage) throw new Error("Firebase Storage is not initialized.");
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '');
    const storageRef = ref(storage, `site-content/${imageName}-${Date.now()}-${cleanFileName}`);
    const snapshot = await uploadBytes(storageRef, file);
    return getDownloadURL(snapshot.ref);
};

// Hero Images Management
export interface HeroImagesContent {
    image1Url: string;
    image2Url: string;
    image3Url: string;
    image4Url: string;
}

export async function getHeroImagesContent(): Promise<HeroImagesContent> {
    const defaults: HeroImagesContent = {
        image1Url: '/hero-1.jpg',
        image2Url: '/hero-2.jpg',
        image3Url: '/hero-3.jpg',
        image4Url: '/hero-4.jpg',
    };
    if (!db) return defaults;
    
    try {
        const docRef = doc(db, 'siteContent', 'heroImages');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return docSnap.data() as HeroImagesContent;
        }
        return defaults;
    } catch (error) {
        console.error("Error fetching hero images content:", error);
        return defaults;
    }
}

export async function updateHeroImagesContent(content: HeroImagesContent): Promise<void> {
    if (!db) throw new Error("Database is not initialized.");
    const docRef = doc(db, 'siteContent', 'heroImages');
    await setDoc(docRef, content, { merge: true });
}

export async function getAboutPageContent(): Promise<AboutPageContent> {
    const defaults: AboutPageContent = {
        heroImageUrl: 'https://placehold.co/1920x800.png',
        missionImageUrl: 'https://placehold.co/600x600.png',
    };
    if (!db) return defaults;
    
    try {
        const docRef = doc(db, 'siteContent', 'aboutPage');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return docSnap.data() as AboutPageContent;
        }
        return defaults;
    } catch (error) {
        console.error("Error fetching about page content:", error);
        return defaults;
    }
}

export async function updateAboutPageContent(content: AboutPageContent): Promise<void> {
    if (!db) throw new Error("Firestore is not initialized.");
    const docRef = doc(db, 'siteContent', 'aboutPage');
    await setDoc(docRef, content, { merge: true });
}

// *** Team Member Functions ***

export async function getTeamMembers(): Promise<TeamMember[]> {
    if (!db) return [];
    try {
        const teamMembersCol = collection(db, 'teamMembers');
        const q = query(teamMembersCol, orderBy('order', 'asc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TeamMember));
    } catch (error) {
        console.error("Error fetching team members:", error);
        return [];
    }
}

export async function uploadTeamMemberAvatar(file: File, memberId?: string): Promise<string> {
    if (!storage) throw new Error("Firebase Storage is not initialized.");
    
    const fileName = memberId ? `${memberId}-${file.name}` : `${Date.now()}-${file.name}`;
    const storageRef = ref(storage, `team-avatars/${fileName}`);
    
    const snapshot = await uploadBytes(storageRef, file);
    return getDownloadURL(snapshot.ref);
}

export async function addOrUpdateTeamMember(memberData: Partial<TeamMember>): Promise<TeamMember> {
    if (!db) throw new Error("Firestore is not initialized.");
    const teamMembersCol = collection(db, 'teamMembers');
    
    if (memberData.id) {
        // Update existing member
        const memberDocRef = doc(db, 'teamMembers', memberData.id);
        await updateDoc(memberDocRef, memberData);
        const updatedDoc = await getDoc(memberDocRef);
        return { id: updatedDoc.id, ...updatedDoc.data() } as TeamMember;
    } else {
        // Add new member
        const docRef = await addDoc(teamMembersCol, memberData);
        const newDoc = await getDoc(docRef);
        return { id: newDoc.id, ...newDoc.data() } as TeamMember;
    }
}

export async function deleteTeamMember(memberId: string): Promise<void> {
    if (!db || !storage) throw new Error("Firebase is not initialized.");
    
    const memberDocRef = doc(db, 'teamMembers', memberId);
    const memberDoc = await getDoc(memberDocRef);
    
    if (memberDoc.exists()) {
        const memberData = memberDoc.data() as TeamMember;
        // Delete avatar from storage if it exists
        if (memberData.avatarUrl) {
            try {
                const avatarRef = ref(storage, memberData.avatarUrl);
                await deleteObject(avatarRef);
            } catch (error: any) {
                // If the file doesn't exist, we can ignore the error
                if (error.code !== 'storage/object-not-found') {
                    console.error("Error deleting team member avatar:", error);
                }
            }
        }
    }
    
    await deleteDoc(memberDocRef);
}

// *** Coupon Functions ***

export async function addCoupon(couponData: CouponInput): Promise<Coupon> {
    if (!db) throw new Error("Firestore is not initialized.");
    const couponRef = doc(db, 'coupons', couponData.code);
    const docSnap = await getDoc(couponRef);

    if (docSnap.exists()) {
        throw new Error(`Coupon code "${couponData.code}" already exists.`);
    }

    const newCoupon: Coupon = {
        ...couponData,
        createdAt: new Date().toISOString(),
        timesUsed: 0,
    };

    await setDoc(couponRef, newCoupon);
    return newCoupon;
}

export async function getCoupons(): Promise<Coupon[]> {
    if (!db) return [];
    const couponsCol = collection(db, 'coupons');
    const q = query(couponsCol, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as Coupon);
}


export async function deleteCoupon(code: string): Promise<void> {
    if (!db) throw new Error("Firestore is not initialized.");
    const couponRef = doc(db, 'coupons', code);
    await deleteDoc(couponRef);
}

export async function validateCoupon(code: string, opts?: { userId?: string; userEmail?: string }): Promise<Coupon> {
    if (!db) throw new Error("Firestore is not initialized.");
    const couponRef = doc(db, 'coupons', code);
    const docSnap = await getDoc(couponRef);

    if (!docSnap.exists()) {
        throw new Error("Coupon code not found.");
    }

    const coupon = docSnap.data() as Coupon;

    if (coupon.expiresAt && isBefore(new Date(coupon.expiresAt), new Date())) {
        throw new Error("This coupon has expired.");
    }

    // Usage limit validation
    const currentUses = coupon.timesUsed ?? 0;
    if (coupon.usageLimit && currentUses >= coupon.usageLimit) {
        throw new Error("This coupon has reached its usage limit.");
    }

    // Enforce first-reservation eligibility for WELCOME during validation when identity is provided
    const isWelcomeCoupon = code.toUpperCase() === 'WELCOME';
    if (isWelcomeCoupon) {
        let hasPriorBooking = false;
        try {
            if (opts?.userId && opts.userId !== 'guest') {
                const userDocRef = doc(db, 'users', opts.userId);
                const userDoc = await getDoc(userDocRef);
                if (userDoc.exists()) {
                    const profile = userDoc.data() as any;
                    if (Array.isArray(profile.achievements) && profile.achievements.includes('firstBooking')) {
                        hasPriorBooking = true;
                    }
                }
                if (!hasPriorBooking) {
                    const priorByUserId = query(collection(db, 'bookings'), where('userId', '==', opts.userId), limit(1));
                    const priorByUserSnap = await getDocs(priorByUserId);
                    if (priorByUserSnap.size > 0) hasPriorBooking = true;
                }
            } else if (opts?.userEmail) {
                const priorByEmail = query(collection(db, 'bookings'), where('userEmail', '==', opts.userEmail), limit(1));
                const priorByEmailSnap = await getDocs(priorByEmail);
                if (priorByEmailSnap.size > 0) hasPriorBooking = true;
            }
        } catch (e) {
            console.warn('Failed to verify WELCOME eligibility during validation:', e);
        }
        if (hasPriorBooking) {
            throw new Error("WELCOME coupon is only valid for your first reservation.");
        }
    }

    return coupon;
}

// =================================================================
// REVIEW SOCIAL FEATURES
// =================================================================

export async function likeReview(courseId: string, reviewId: string, userId: string, userName: string): Promise<void> {
    if (!db) throw new Error('Database not initialized');
    
    const reviewRef = doc(db, 'courses', courseId, 'reviews', reviewId);
    const likesRef = collection(reviewRef, 'likes');
    const likeRef = doc(likesRef, userId);
    
    await runTransaction(db, async (transaction) => {
        const likeDoc = await transaction.get(likeRef);
        
        if (likeDoc.exists()) {
            // Unlike: remove like and decrement count
            transaction.delete(likeRef);
            transaction.update(reviewRef, {
                likesCount: increment(-1)
            });
        } else {
            // Like: add like and increment count
            const likeData: ReviewLike = {
                userId,
                userName,
                createdAt: new Date().toISOString()
            };
            transaction.set(likeRef, likeData);
            transaction.update(reviewRef, {
                likesCount: increment(1)
            });
        }
    });
}

export async function addReviewComment(courseId: string, reviewId: string, userId: string, userName: string, userAvatar: string | null, text: string): Promise<ReviewComment> {
    if (!db) throw new Error('Database not initialized');
    
    const reviewRef = doc(db, 'courses', courseId, 'reviews', reviewId);
    const commentsRef = collection(reviewRef, 'comments');
    
    const commentData: Omit<ReviewComment, 'id'> = {
        userId,
        userName,
        userAvatar,
        text,
        createdAt: new Date().toISOString()
    };
    
    const commentDocRef = await addDoc(commentsRef, commentData);
    
    // Update comments count
    await updateDoc(reviewRef, {
        commentsCount: increment(1)
    });
    
    return {
        id: commentDocRef.id,
        ...commentData
    };
}

export async function getReviewLikes(courseId: string, reviewId: string): Promise<ReviewLike[]> {
    if (!db) throw new Error('Database not initialized');
    
    const likesRef = collection(db, 'courses', courseId, 'reviews', reviewId, 'likes');
    const likesSnapshot = await getDocs(likesRef);
    
    return likesSnapshot.docs.map(doc => doc.data() as ReviewLike);
}

export async function getReviewComments(courseId: string, reviewId: string): Promise<ReviewComment[]> {
    if (!db) throw new Error('Database not initialized');
    
    const commentsRef = collection(db, 'courses', courseId, 'reviews', reviewId, 'comments');
    const commentsQuery = query(commentsRef, orderBy('createdAt', 'asc'));
    const commentsSnapshot = await getDocs(commentsQuery);
    
    return commentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    } as ReviewComment));
}

export async function checkUserLikedReview(courseId: string, reviewId: string, userId: string): Promise<boolean> {
    if (!db) throw new Error('Database not initialized');
    
    const likeRef = doc(db, 'courses', courseId, 'reviews', reviewId, 'likes', userId);
    const likeDoc = await getDoc(likeRef);
    
    return likeDoc.exists();
}

export async function getFilteredReviews(filter: { courseId?: string; experienceType?: string; rating?: number; isVerifiedBooking?: boolean; sortBy: string }): Promise<Review[]> {
    if (!db) throw new Error('Database not initialized');
    
    let reviewsQuery;
    
    if (filter.courseId) {
        // Get reviews for specific course
        const reviewsRef = collection(db, 'courses', filter.courseId, 'reviews');
        reviewsQuery = query(reviewsRef, where('approved', '==', true));
    } else {
        // Get all reviews from all courses
        const allReviews: Review[] = [];
        const coursesSnapshot = await getDocs(collection(db, 'courses'));
        
        for (const courseDoc of coursesSnapshot.docs) {
            const reviewsRef = collection(db, 'courses', courseDoc.id, 'reviews');
            let courseReviewsQuery = query(reviewsRef, where('approved', '==', true));
            
            const reviewsSnapshot = await getDocs(courseReviewsQuery);
            const courseReviews = reviewsSnapshot.docs.map(doc => {
                const data = doc.data();
                const serializedData = serializeTimestamps(data);
                return {
                    id: doc.id,
                    courseId: courseDoc.id,
                    ...serializedData,
                    // Ensure rating is always a valid number
                    rating: typeof serializedData.rating === 'number' && !isNaN(serializedData.rating) ? serializedData.rating : 0,
                    likesCount: serializedData.likesCount || 0,
                    commentsCount: serializedData.commentsCount || 0
                } as Review;
            });
            
            allReviews.push(...courseReviews);
        }
        
        return allReviews.filter(review => {
            if (filter.experienceType && review.experienceType !== filter.experienceType) return false;
            if (filter.rating && review.rating < filter.rating) return false;
            if (filter.isVerifiedBooking !== undefined && review.isVerifiedBooking !== filter.isVerifiedBooking) return false;
            return true;
        }).sort((a, b) => {
            switch (filter.sortBy) {
                case 'newest':
                    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                case 'oldest':
                    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                case 'highest_rated':
                    return b.rating - a.rating;
                case 'most_liked':
                    return (b.likesCount || 0) - (a.likesCount || 0);
                default:
                    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            }
        });
    }
    
    const reviewsSnapshot = await getDocs(reviewsQuery);
    return reviewsSnapshot.docs.map(doc => {
        const data = doc.data();
        const serializedData = serializeTimestamps(data);
        return {
            id: doc.id,
            courseId: filter.courseId!,
            ...serializedData,
            // Ensure rating is always a valid number
            rating: typeof serializedData.rating === 'number' && !isNaN(serializedData.rating) ? serializedData.rating : 0,
            likesCount: serializedData.likesCount || 0,
            commentsCount: serializedData.commentsCount || 0
        } as Review;
    });
 }

// =================================================================
// GAMIFICATION SYSTEM
// =================================================================

const REVIEW_BADGES: ReviewBadge[] = [
    {
        id: 'explorer',
        name: 'Explorador',
        description: 'Ha reseñado 3+ campos diferentes',
        icon: '🏌️',
        requirement: 3,
        type: 'explorer'
    },
    {
        id: 'expert',
        name: 'Experto',
        description: 'Ha publicado 10+ reseñas',
        icon: '⭐',
        requirement: 10,
        type: 'expert'
    },
    {
        id: 'top_reviewer',
        name: 'Top Reviewer',
        description: 'Reseñas con 50+ likes en total',
        icon: '👑',
        requirement: 50,
        type: 'top_reviewer'
    },
    {
        id: 'verified_player',
        name: 'Jugador Verificado',
        description: 'Ha completado 5+ reservas verificadas',
        icon: '✅',
        requirement: 5,
        type: 'verified_player'
    }
];

export async function getUserReviews(userId: string): Promise<Review[]> {
    if (!db) throw new Error('Database not initialized');
    
    const allReviews: Review[] = [];
    const coursesSnapshot = await getDocs(collection(db, 'courses'));
    
    for (const courseDoc of coursesSnapshot.docs) {
        const reviewsRef = collection(db, 'courses', courseDoc.id, 'reviews');
        const userReviewsQuery = query(reviewsRef, where('userId', '==', userId), orderBy('createdAt', 'desc'));
        const reviewsSnapshot = await getDocs(userReviewsQuery);
        
        if (!reviewsSnapshot.empty) {
            reviewsSnapshot.docs.forEach(doc => {
                const data = doc.data();
                const serializedData = serializeTimestamps(data);
                const review = { 
                    id: doc.id, 
                    courseId: courseDoc.id, 
                    courseName: courseDoc.data().name || 'Unknown Course',
                    ...serializedData,
                    // Ensure rating is always a valid number
                    rating: typeof serializedData.rating === 'number' && !isNaN(serializedData.rating) ? serializedData.rating : 0,
                    likesCount: serializedData.likesCount || 0,
                    commentsCount: serializedData.commentsCount || 0
                } as Review;
                allReviews.push(review);
            });
        }
    }
    
    // Sort all reviews by creation date (newest first)
    allReviews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return allReviews;
}

export async function getUserReviewStats(userId: string): Promise<UserReviewStats> {
    if (!db) throw new Error('Database not initialized');
    
    // Get all user reviews across all courses
    const allReviews: Review[] = [];
    const coursesSnapshot = await getDocs(collection(db, 'courses'));
    const coursesReviewed: string[] = [];
    let totalLikes = 0;
    
    for (const courseDoc of coursesSnapshot.docs) {
        const reviewsRef = collection(db, 'courses', courseDoc.id, 'reviews');
        const userReviewsQuery = query(reviewsRef, where('userId', '==', userId));
        const reviewsSnapshot = await getDocs(userReviewsQuery);
        
        if (!reviewsSnapshot.empty) {
            coursesReviewed.push(courseDoc.id);
            
            reviewsSnapshot.docs.forEach(doc => {
                const data = doc.data();
                const serializedData = serializeTimestamps(data);
                const review = { 
                    id: doc.id, 
                    courseId: courseDoc.id, 
                    ...serializedData,
                    // Ensure rating is always a valid number
                    rating: typeof serializedData.rating === 'number' && !isNaN(serializedData.rating) ? serializedData.rating : 0,
                    likesCount: serializedData.likesCount || 0,
                    commentsCount: serializedData.commentsCount || 0
                } as Review;
                allReviews.push(review);
                totalLikes += review.likesCount || 0;
            });
        }
    }
    
    // Calculate earned badges
    const earnedBadges: ReviewBadge[] = [];
    
    // Explorer badge: 3+ different courses
    if (coursesReviewed.length >= 3) {
        earnedBadges.push(REVIEW_BADGES.find(b => b.type === 'explorer')!);
    }
    
    // Expert badge: 10+ reviews
    if (allReviews.length >= 10) {
        earnedBadges.push(REVIEW_BADGES.find(b => b.type === 'expert')!);
    }
    
    // Top Reviewer badge: 50+ total likes
    if (totalLikes >= 50) {
        earnedBadges.push(REVIEW_BADGES.find(b => b.type === 'top_reviewer')!);
    }
    
    // Verified Player badge: Check completed bookings
    const userBookings = await getUserBookings(userId);
    const completedBookings = userBookings.filter(booking => 
        booking.status === 'confirmed' && new Date(booking.date) < new Date()
    );
    
    if (completedBookings.length >= 5) {
        earnedBadges.push(REVIEW_BADGES.find(b => b.type === 'verified_player')!);
    }
    
    return {
        totalReviews: allReviews.length,
        totalLikes,
        coursesReviewed,
        badges: earnedBadges,
        isTopReviewer: totalLikes >= 50
    };
}

export async function getTopReviewers(limit: number = 10): Promise<(UserReviewStats & { userId: string; userName: string; userAvatar?: string })[]> {
    if (!db) throw new Error('Database not initialized');
    
    // Get all users who have written reviews
    const userReviewsMap = new Map<string, { reviews: Review[]; userName: string; userAvatar?: string }>();
    
    const coursesSnapshot = await getDocs(collection(db, 'courses'));
    
    for (const courseDoc of coursesSnapshot.docs) {
        const reviewsRef = collection(db, 'courses', courseDoc.id, 'reviews');
        const reviewsQuery = query(reviewsRef, where('approved', '==', true));
        const reviewsSnapshot = await getDocs(reviewsQuery);
        
        reviewsSnapshot.docs.forEach(doc => {
            const data = doc.data();
            const serializedData = serializeTimestamps(data);
            const review = { 
                id: doc.id, 
                courseId: courseDoc.id, 
                ...serializedData,
                // Ensure rating is always a valid number
                rating: typeof serializedData.rating === 'number' && !isNaN(serializedData.rating) ? serializedData.rating : 0,
                likesCount: serializedData.likesCount || 0,
                commentsCount: serializedData.commentsCount || 0
            } as Review;
            
            if (!userReviewsMap.has(review.userId)) {
                userReviewsMap.set(review.userId, {
                    reviews: [],
                    userName: review.user?.name || 'Usuario',
                    userAvatar: review.user?.avatarUrl
                });
            }
            
            userReviewsMap.get(review.userId)!.reviews.push(review);
        });
    }
    
    // Calculate stats for each user and sort by total likes
    const topReviewers = Array.from(userReviewsMap.entries()).map(([userId, data]) => {
        const totalLikes = data.reviews.reduce((sum, review) => sum + (review.likesCount || 0), 0);
        const coursesReviewed = [...new Set(data.reviews.map(r => r.courseId))];
        
        // Calculate badges
        const earnedBadges: ReviewBadge[] = [];
        
        if (coursesReviewed.length >= 3) {
            earnedBadges.push(REVIEW_BADGES.find(b => b.type === 'explorer')!);
        }
        
        if (data.reviews.length >= 10) {
            earnedBadges.push(REVIEW_BADGES.find(b => b.type === 'expert')!);
        }
        
        if (totalLikes >= 50) {
            earnedBadges.push(REVIEW_BADGES.find(b => b.type === 'top_reviewer')!);
        }
        
        return {
            userId,
            userName: data.userName,
            userAvatar: data.userAvatar,
            totalReviews: data.reviews.length,
            totalLikes,
            coursesReviewed,
            badges: earnedBadges,
            isTopReviewer: totalLikes >= 50
        };
    }).sort((a, b) => b.totalLikes - a.totalLikes).slice(0, limit);
    
    // Add monthly rank
    return topReviewers.map((reviewer, index) => ({
        ...reviewer,
        monthlyRank: index + 1
    }));
}

export async function updateUserBadges(userId: string): Promise<ReviewBadge[]> {
    if (!db) throw new Error('Database not initialized');
    
    const stats = await getUserReviewStats(userId);
    
    // Store user badges in Firestore
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
        reviewStats: stats,
        badges: stats.badges,
        lastBadgeUpdate: new Date().toISOString()
    });
    
    return stats.badges;
}

export function getAllBadges(): ReviewBadge[] {
    return REVIEW_BADGES;
}

// =================================================================
// REVIEW NOTIFICATIONS SYSTEM
// =================================================================

export async function sendReviewInvitationForCompletedBooking(
    bookingId: string,
    locale: 'en' | 'es' = 'en'
): Promise<boolean> {
    if (!db) throw new Error('Database not initialized');
    
    try {
        // Get booking details
        const bookingRef = doc(db, 'bookings', bookingId);
        const bookingSnap = await getDoc(bookingRef);
        
        if (!bookingSnap.exists()) {
            console.error(`Booking ${bookingId} not found`);
            return false;
        }
        
        const booking = bookingSnap.data() as Booking;
        
        // Check if booking is completed (date has passed)
        const bookingDate = new Date(booking.date);
        const now = new Date();
        
        if (bookingDate > now) {
            console.log(`Booking ${bookingId} is not yet completed`);
            return false;
        }
        
        // Check if review invitation already sent
        if (booking.reviewInvitationSent) {
            console.log(`Review invitation already sent for booking ${bookingId}`);
            return false;
        }
        
        // Get user details
        const userRef = doc(db, 'users', booking.userId);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) {
            console.error(`User ${booking.userId} not found`);
            return false;
        }
        
        const user = userSnap.data() as UserProfile;
        
        // Send review invitation email
        const emailResult = await sendReviewInvitationEmail({
            bookingId: booking.id || bookingId,
            userName: booking.userName || user.displayName || 'Golfista',
            userEmail: user.email || '',
            courseName: booking.courseName,
            courseId: booking.courseId,
            date: booking.date,
            locale
        });
        
        if (emailResult.success) {
            // Mark review invitation as sent
            await updateDoc(bookingRef, {
                reviewInvitationSent: true,
                reviewInvitationSentAt: new Date().toISOString()
            });
            
            console.log(`Review invitation sent successfully for booking ${bookingId}`);
            return true;
        } else {
            console.error(`Failed to send review invitation for booking ${bookingId}:`, emailResult.message);
            return false;
        }
    } catch (error) {
        console.error(`Error sending review invitation for booking ${bookingId}:`, error);
        return false;
    }
}

export async function processCompletedBookingsForReviewInvitations(): Promise<void> {
    if (!db) throw new Error('Database not initialized');
    
    try {
        // Get all bookings that are completed but haven't received review invitations
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        const bookingsRef = collection(db, 'bookings');
        const completedBookingsQuery = query(
            bookingsRef,
            where('status', '==', 'confirmed'),
            where('reviewInvitationSent', '!=', true),
            where('date', '<=', yesterday.toISOString().split('T')[0])
        );
        
        const bookingsSnapshot = await getDocs(completedBookingsQuery);
        
        console.log(`Found ${bookingsSnapshot.docs.length} completed bookings to process for review invitations`);
        
        // Process each booking
        for (const bookingDoc of bookingsSnapshot.docs) {
            const booking = { id: bookingDoc.id, ...bookingDoc.data() } as Booking & { id: string };
            
            // Send review invitation with a delay to avoid rate limiting
            await sendReviewInvitationForCompletedBooking(booking.id, 'es'); // Default to Spanish
            
            // Add a small delay between emails
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        console.log('Completed processing review invitations');
    } catch (error) {
        console.error('Error processing completed bookings for review invitations:', error);
    }
}

// Function to manually trigger review invitation for a specific booking
export async function triggerReviewInvitation(
    bookingId: string,
    locale: 'en' | 'es' = 'es'
): Promise<{ success: boolean; message: string }> {
    try {
        const success = await sendReviewInvitationForCompletedBooking(bookingId, locale);
        
        if (success) {
            return {
                success: true,
                message: 'Review invitation sent successfully'
            };
        } else {
            return {
                success: false,
                message: 'Failed to send review invitation'
            };
        }
    } catch (error) {
        return {
            success: false,
            message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
    }
}

// *** CMS Functions ***

export async function getCMSSections(): Promise<CMSSection[]> {
    if (!db) throw new Error("Firestore is not initialized.");
    
    const sectionsRef = collection(db, 'cmsSections');
    const q = query(sectionsRef, orderBy('order', 'asc'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    })) as CMSSection[];
}

export async function getActiveCMSSections(): Promise<CMSSection[]> {
    if (!db) throw new Error("Firestore is not initialized.");
    
    const sectionsRef = collection(db, 'cmsSections');
    const q = query(
        sectionsRef, 
        where('isActive', '==', true),
        orderBy('order', 'asc')
    );
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    })) as CMSSection[];
}

export async function getCMSSection(id: string): Promise<CMSSection | null> {
    if (!db) throw new Error("Firestore is not initialized.");
    
    const docRef = doc(db, 'cmsSections', id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as CMSSection;
    }
    return null;
}

export async function createCMSSection(section: Omit<CMSSection, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    if (!db) throw new Error("Firestore is not initialized.");
    
    const sectionsRef = collection(db, 'cmsSections');
    const now = new Date().toISOString();
    
    const docRef = await addDoc(sectionsRef, {
        ...section,
        createdAt: now,
        updatedAt: now
    });
    
    return docRef.id;
}

export async function updateCMSSection(id: string, updates: Partial<CMSSection>): Promise<void> {
    if (!db) throw new Error("Firestore is not initialized.");
    
    const docRef = doc(db, 'cmsSections', id);
    await updateDoc(docRef, {
        ...updates,
        updatedAt: new Date().toISOString()
    });
}

export async function deleteCMSSection(id: string): Promise<void> {
    if (!db) throw new Error("Firestore is not initialized.");
    
    const docRef = doc(db, 'cmsSections', id);
    await deleteDoc(docRef);
}

export async function reorderCMSSections(sectionIds: string[]): Promise<void> {
    if (!db) throw new Error("Firestore is not initialized.");
    
    const batch = writeBatch(db);
    
    sectionIds.forEach((sectionId, index) => {
        const docRef = doc(db, 'cmsSections', sectionId);
        batch.update(docRef, { 
            order: index,
            updatedAt: new Date().toISOString()
        });
    });
    
    await batch.commit();
}

// Event Tickets Functions
export async function createEventTicket(ticket: Omit<EventTicket, 'id' | 'purchaseDate' | 'ticketCode'>): Promise<string> {
    if (!db) throw new Error("Firestore is not initialized.");
    
    const ticketsRef = collection(db, 'eventTickets');
    const ticketCode = generateTicketCode();
    
    const docRef = await addDoc(ticketsRef, {
        ...ticket,
        purchaseDate: new Date().toISOString(),
        ticketCode
    });
    
    return docRef.id;
}

export async function getEventTickets(eventSectionId: string): Promise<EventTicket[]> {
    if (!db) throw new Error("Firestore is not initialized.");
    
    const ticketsRef = collection(db, 'eventTickets');
    const q = query(
        ticketsRef,
        where('eventSectionId', '==', eventSectionId),
        orderBy('purchaseDate', 'desc')
    );
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    })) as EventTicket[];
}

export async function updateEventTicketStatus(ticketId: string, status: EventTicket['status']): Promise<void> {
    if (!db) throw new Error("Firestore is not initialized.");
    
    const docRef = doc(db, 'eventTickets', ticketId);
    await updateDoc(docRef, { status });
}

// CMS Templates Functions
export async function getCMSTemplates(): Promise<CMSTemplate[]> {
    if (!db) throw new Error("Firestore is not initialized.");
    
    const templatesRef = collection(db, 'cmsTemplates');
    const snapshot = await getDocs(templatesRef);
    
    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    })) as CMSTemplate[];
}

export async function createCMSTemplate(template: Omit<CMSTemplate, 'id'>): Promise<string> {
    if (!db) throw new Error("Firestore is not initialized.");
    
    const templatesRef = collection(db, 'cmsTemplates');
    const docRef = await addDoc(templatesRef, template);
    
    return docRef.id;
}

// Helper function to generate unique ticket codes
function generateTicketCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// *** NUEVO: Conteo de visitas y registro de IPs ***

// Interface para el conteo de visitas
interface VisitLog {
    id?: string;
    timestamp: any; // serverTimestamp
    userAgent?: string;
    referer?: string;
    page: string; // página visitada (ej: 'homepage', 'course-detail', etc.)
    sessionId?: string; // para evitar contar múltiples visitas de la misma sesión
    ipAddress?: string; // IP del visitante (opcional por privacidad)
}

// Interface para métricas de visitas agregadas
interface VisitMetrics {
    id?: string;
    date: string; // formato YYYY-MM-DD
    totalVisits: number;
    uniqueVisits: number; // basado en sessionId
    pageViews: { [page: string]: number };
    lastUpdated: any; // serverTimestamp
}

// Interface para registro de IPs de usuarios
interface UserIPLog {
    id?: string;
    userId?: string | null;
    ipAddress: string;
    timestamp: any; // serverTimestamp
    action: 'login' | 'register' | 'guest_booking' | 'visit'; // tipo de acción que generó el registro
    userAgent?: string;
    location?: string; // ciudad/país si se puede determinar
}

// NUEVO: Función para registrar una visita
export async function logVisit(visitData: Omit<VisitLog, 'timestamp'>): Promise<void> {
    if (!db) {
        console.warn("Firestore not available. Skipping visit logging.");
        return;
    }
    
    try {
        const visitsCol = collection(db, 'visits');
        await addDoc(visitsCol, {
            ...visitData,
            timestamp: serverTimestamp()
        });
        
        // Actualizar métricas diarias
        await updateDailyVisitMetrics(visitData.page, visitData.sessionId);
        
        console.log(`Visit logged for page: ${visitData.page}`);
    } catch (error) {
        console.error("Error logging visit:", error);
        // No relanzar el error para no interrumpir el flujo de la aplicación
    }
}

// NUEVO: Función para actualizar métricas diarias
async function updateDailyVisitMetrics(page: string, sessionId?: string): Promise<void> {
    if (!db) return;
    
    const today = format(new Date(), 'yyyy-MM-dd');
    const metricsRef = doc(db, 'visitMetrics', today);
    
    try {
        await runTransaction(db, async (transaction) => {
            const metricsDoc = await transaction.get(metricsRef);
            
            if (metricsDoc.exists()) {
                const data = metricsDoc.data() as VisitMetrics;
                const currentPageViews = { ...(data.pageViews || {}) } as { [page: string]: number };
                const updatedCount = (currentPageViews[page] || 0) + 1;
                currentPageViews[page] = updatedCount;

                const updates: any = {
                    totalVisits: increment(1),
                    pageViews: currentPageViews,
                    lastUpdated: serverTimestamp()
                };
                
                transaction.update(metricsRef, updates);
            } else {
                // Crear nuevo documento de métricas
                const newMetrics: Omit<VisitMetrics, 'id'> = {
                    date: today,
                    totalVisits: 1,
                    uniqueVisits: sessionId ? 1 : 0,
                    pageViews: { [page]: 1 },
                    lastUpdated: serverTimestamp()
                };
                transaction.set(metricsRef, newMetrics);
            }
        });
    } catch (error) {
        console.error("Error updating daily visit metrics:", error);
    }
}

// NUEVO: Función para registrar IP de usuario
export async function logUserIP(ipData: Omit<UserIPLog, 'timestamp'>): Promise<void> {
    if (!db) {
        console.warn("Firestore not available. Skipping IP logging.");
        return;
    }
    
    try {
        const userIPsCol = collection(db, 'userIPs');
        await addDoc(userIPsCol, {
            ...ipData,
            timestamp: serverTimestamp()
        });
        
        console.log(`IP logged for user: ${ipData.userId}, action: ${ipData.action}`);
    } catch (error) {
        console.error("Error logging user IP:", error);
        // No relanzar el error para no interrumpir el flujo de autenticación
    }
}

// NUEVO: Función para obtener métricas de visitas para el admin
export async function getVisitMetrics(days: number = 7): Promise<VisitMetrics[]> {
    if (!db) {
        console.warn("Firestore not initialized. Returning empty visit metrics.");
        return [] as VisitMetrics[];
    }
    try {
        const metricsRef = collection(db, 'visitMetrics');
        const endDate = new Date();
        const startDate = subDays(endDate, days - 1);
        
        const q = query(
            metricsRef,
            where('date', '>=', format(startDate, 'yyyy-MM-dd')),
            where('date', '<=', format(endDate, 'yyyy-MM-dd')),
            orderBy('date', 'desc')
        );
        
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as VisitMetrics[];
    } catch (error) {
        console.error("Error fetching visit metrics from Firestore:", error);
        return [] as VisitMetrics[];
    }
}

// NUEVO: Obtener métricas por rango de fechas personalizado
export async function getVisitMetricsRange(from: string, to: string): Promise<VisitMetrics[]> {
    if (!db) {
        console.warn("Firestore not initialized. Returning empty visit metrics range.");
        return [] as VisitMetrics[];
    }
    try {
        const metricsRef = collection(db, 'visitMetrics');

        const q = query(
            metricsRef,
            where('date', '>=', from),
            where('date', '<=', to),
            orderBy('date', 'desc')
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as VisitMetrics[];
    } catch (error) {
        console.error("Error fetching visit metrics range from Firestore:", error);
        return [] as VisitMetrics[];
    }
}

// NUEVO: Función para obtener IPs de usuarios para el admin
export async function getUserIPs(limit: number = 50): Promise<UserIPLog[]> {
    if (!db) {
        console.warn("Firestore not initialized. Returning empty user IPs.");
        return [] as UserIPLog[];
    }
    try {
        const userIPsRef = collection(db, 'userIPs');
        const q = query(
            userIPsRef,
            orderBy('timestamp', 'desc'),
            limit(limit)
        );
        
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as UserIPLog[];
    } catch (error) {
        console.error("Error fetching user IPs from Firestore:", error);
        return [] as UserIPLog[];
    }
}

// NUEVO: Función para obtener estadísticas de visitas del día actual
export async function getTodayVisitStats(): Promise<{ totalVisits: number; uniqueVisits: number; topPages: Array<{ page: string; visits: number }> }> {
    if (!db) {
        console.warn("Firestore not initialized. Returning empty today visit stats.");
        return { totalVisits: 0, uniqueVisits: 0, topPages: [] };
    }
    
    const today = format(new Date(), 'yyyy-MM-dd');
    const metricsRef = doc(db, 'visitMetrics', today);
    
    try {
        const metricsDoc = await getDoc(metricsRef);
        
        if (metricsDoc.exists()) {
            const data = metricsDoc.data() as VisitMetrics;
            const topPages = Object.entries(data.pageViews || {})
                .map(([page, visits]) => ({ page, visits }))
                .sort((a, b) => b.visits - a.visits)
                .slice(0, 5);
            
            return {
                totalVisits: data.totalVisits || 0,
                uniqueVisits: data.uniqueVisits || 0,
                topPages
            };
        }
        
        return { totalVisits: 0, uniqueVisits: 0, topPages: [] };
    } catch (error) {
        console.error("Error getting today's visit stats:", error);
        return { totalVisits: 0, uniqueVisits: 0, topPages: [] };
    }
}

// Admin functions for deleting reviews and comments
export async function deleteReview(courseId: string, reviewId: string): Promise<void> {
    if (!db) throw new Error('Database not initialized');
    
    const reviewRef = doc(db, 'courses', courseId, 'reviews', reviewId);
    
    // Use a transaction to ensure data consistency
    await runTransaction(db, async (transaction) => {
        const reviewDoc = await transaction.get(reviewRef);
        
        if (!reviewDoc.exists()) {
            throw new Error('Review not found');
        }
        
        // Delete all subcollections (likes and comments)
        const likesRef = collection(reviewRef, 'likes');
        const commentsRef = collection(reviewRef, 'comments');
        
        // Get all likes and comments to delete them
        const likesSnapshot = await getDocs(likesRef);
        const commentsSnapshot = await getDocs(commentsRef);
        
        // Delete all likes
        likesSnapshot.forEach((likeDoc) => {
            transaction.delete(likeDoc.ref);
        });
        
        // Delete all comments
        commentsSnapshot.forEach((commentDoc) => {
            transaction.delete(commentDoc.ref);
        });
        
        // Finally, delete the review document
        transaction.delete(reviewRef);
    });
}

export async function deleteReviewComment(courseId: string, reviewId: string, commentId: string): Promise<void> {
    if (!db) throw new Error('Database not initialized');
    
    const reviewRef = doc(db, 'courses', courseId, 'reviews', reviewId);
    const commentRef = doc(reviewRef, 'comments', commentId);
    
    // Use a transaction to ensure data consistency
    await runTransaction(db, async (transaction) => {
        const commentDoc = await transaction.get(commentRef);
        
        if (!commentDoc.exists()) {
            throw new Error('Comment not found');
        }
        
        // Delete the comment
        transaction.delete(commentRef);
        
        // Update the comments count on the review
        transaction.update(reviewRef, {
            commentsCount: increment(-1)
        });
    });
}
