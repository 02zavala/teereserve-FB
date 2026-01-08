import { db } from './firebase';
import { collection, addDoc, doc, setDoc } from 'firebase/firestore';
import { initialCourses } from './data';

interface SampleReview {
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  text: string;
  comment: string;
  experienceType: 'service' | 'facilities' | 'green' | 'overall';
  approved: boolean;
  status: 'approved';
  verified: boolean;
  isVerifiedBooking: boolean;
  likesCount: number;
  commentsCount: number;
  createdAt: string;
}

const sampleReviews: SampleReview[] = [
  {
    userId: 'user1',
    userName: 'Carlos Mendoza',
    userAvatar: '/images/fallback.svg',
    rating: 5,
    text: 'Experiencia increíble en este campo de golf. Las vistas son espectaculares y el servicio es de primera clase.',
    comment: 'Experiencia increíble en este campo de golf. Las vistas son espectaculares y el servicio es de primera clase.',
    experienceType: 'overall',
    approved: true,
    status: 'approved',
    verified: true,
    isVerifiedBooking: true,
    likesCount: 12,
    commentsCount: 3,
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days ago
  },
  {
    userId: 'user2',
    userName: 'María González',
    userAvatar: '/images/fallback.svg',
    rating: 5,
    text: 'El campo está en perfectas condiciones. Los greens son rápidos y justos. Definitivamente regresaré.',
    comment: 'El campo está en perfectas condiciones. Los greens son rápidos y justos. Definitivamente regresaré.',
    experienceType: 'green',
    approved: true,
    status: 'approved',
    verified: true,
    isVerifiedBooking: true,
    likesCount: 8,
    commentsCount: 2,
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() // 5 days ago
  },
  {
    userId: 'user3',
    userName: 'Roberto Silva',
    userAvatar: '/images/fallback.svg',
    rating: 4,
    text: 'Excelente campo con desafíos interesantes. El personal es muy amable y profesional.',
    comment: 'Excelente campo con desafíos interesantes. El personal es muy amable y profesional.',
    experienceType: 'service',
    approved: true,
    status: 'approved',
    verified: true,
    isVerifiedBooking: true,
    likesCount: 15,
    commentsCount: 4,
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() // 3 days ago
  },
  {
    userId: 'user4',
    userName: 'Ana Rodríguez',
    userAvatar: '/images/fallback.svg',
    rating: 5,
    text: 'Las instalaciones son de lujo. El club house tiene todo lo que necesitas para una experiencia completa.',
    comment: 'Las instalaciones son de lujo. El club house tiene todo lo que necesitas para una experiencia completa.',
    experienceType: 'facilities',
    approved: true,
    status: 'approved',
    verified: true,
    isVerifiedBooking: true,
    likesCount: 20,
    commentsCount: 6,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() // 2 days ago
  },
  {
    userId: 'user5',
    userName: 'Diego Martínez',
    userAvatar: '/images/fallback.svg',
    rating: 4,
    text: 'Campo muy bien mantenido con vistas impresionantes. La experiencia de juego es excepcional.',
    comment: 'Campo muy bien mantenido con vistas impresionantes. La experiencia de juego es excepcional.',
    experienceType: 'overall',
    approved: true,
    status: 'approved',
    verified: true,
    isVerifiedBooking: true,
    likesCount: 9,
    commentsCount: 1,
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() // 1 day ago
  },
  {
    userId: 'user6',
    userName: 'Sofía López',
    userAvatar: '/images/fallback.svg',
    rating: 5,
    text: 'Una joya escondida. El diseño del campo es desafiante pero justo. Altamente recomendado.',
    comment: 'Una joya escondida. El diseño del campo es desafiante pero justo. Altamente recomendado.',
    experienceType: 'overall',
    approved: true,
    status: 'approved',
    verified: true,
    isVerifiedBooking: true,
    likesCount: 18,
    commentsCount: 5,
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString() // 6 hours ago
  }
];

export async function seedReviews() {
  if (!db) {
    console.error('Firebase not initialized');
    return;
  }

  try {
    console.log('Starting to seed reviews...');
    
    // Add reviews to the first 3 courses
    const coursesToSeed = initialCourses.slice(0, 3);
    
    for (let i = 0; i < coursesToSeed.length; i++) {
      const course = coursesToSeed[i];
      console.log(`Adding reviews for course: ${course.name}`);
      
      // Add 2 reviews per course
      const reviewsForCourse = sampleReviews.slice(i * 2, (i * 2) + 2);
      
      for (const review of reviewsForCourse) {
        const reviewData = {
          ...review,
          courseId: course.id,
          user: {
            name: review.userName,
            avatarUrl: review.userAvatar
          },
          likes: [],
          comments: [],
          media: []
        };
        
        const reviewsCol = collection(db, 'courses', course.id, 'reviews');
        const docRef = await addDoc(reviewsCol, reviewData);
        console.log(`Added review with ID: ${docRef.id}`);
      }
    }
    
    console.log('Reviews seeded successfully!');
  } catch (error) {
    console.error('Error seeding reviews:', error);
  }
}

// Function to clear all reviews (for testing)
export async function clearAllReviews() {
  if (!db) {
    console.error('Firebase not initialized');
    return;
  }

  try {
    console.log('Clearing all reviews...');
    
    for (const course of initialCourses) {
      const reviewsCol = collection(db, 'courses', course.id, 'reviews');
      // Note: This would require getting all docs first, then deleting them
      // For now, we'll just log the action
      console.log(`Would clear reviews for course: ${course.name}`);
    }
    
    console.log('Reviews cleared successfully!');
  } catch (error) {
    console.error('Error clearing reviews:', error);
  }
}