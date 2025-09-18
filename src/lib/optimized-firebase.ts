"use client";

import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter,
  DocumentSnapshot,
  QueryConstraint
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { firebaseCache, createCacheKey } from '@/lib/cache';
import type { GolfCourse, Booking, Review } from '@/types';

// Configuración de paginación
interface PaginationOptions {
  pageSize?: number;
  lastDoc?: DocumentSnapshot;
}

// Opciones de consulta optimizada
interface OptimizedQueryOptions {
  useCache?: boolean;
  cacheTTL?: number;
  enablePagination?: boolean;
  pageSize?: number;
}

// Clase para manejar consultas optimizadas a Firebase
export class OptimizedFirebaseService {
  private static instance: OptimizedFirebaseService;
  
  static getInstance(): OptimizedFirebaseService {
    if (!OptimizedFirebaseService.instance) {
      OptimizedFirebaseService.instance = new OptimizedFirebaseService();
    }
    return OptimizedFirebaseService.instance;
  }

  // Obtener todos los cursos con cache
  async getCourses(options: OptimizedQueryOptions = {}): Promise<GolfCourse[]> {
    const { useCache = true, cacheTTL = 10 * 60 * 1000 } = options;
    
    if (useCache) {
      const cached = firebaseCache.getCourses();
      if (cached) {
        return cached;
      }
    }

    try {
      if (!db) {
        throw new Error('Firebase not initialized');
      }
      const coursesRef = collection(db, 'courses');
      const q = query(coursesRef, orderBy('name'));
      const snapshot = await getDocs(q);
      
      const courses = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as GolfCourse[];

      if (useCache) {
        firebaseCache.setCourses(courses, cacheTTL);
      }

      return courses;
    } catch (error) {
      console.error('Error fetching courses:', error);
      throw error;
    }
  }

  // Obtener un curso específico con cache
  async getCourse(courseId: string, options: OptimizedQueryOptions = {}): Promise<GolfCourse | null> {
    const { useCache = true, cacheTTL = 15 * 60 * 1000 } = options;
    
    if (useCache) {
      const cached = firebaseCache.getCourse(courseId);
      if (cached) {
        return cached;
      }
    }

    try {
      if (!db) {
        throw new Error('Firebase not initialized');
      }
      const courseRef = doc(db, 'courses', courseId);
      const snapshot = await getDoc(courseRef);
      
      if (!snapshot.exists()) {
        return null;
      }

      const course = {
        id: snapshot.id,
        ...snapshot.data()
      } as GolfCourse;

      if (useCache) {
        firebaseCache.setCourse(courseId, course, cacheTTL);
      }

      return course;
    } catch (error) {
      console.error('Error fetching course:', error);
      throw error;
    }
  }

  // Búsqueda optimizada de cursos
  async searchCourses(
    searchTerm: string, 
    filters: {
      location?: string;
      priceRange?: { min: number; max: number };
      rating?: number;
    } = {},
    options: OptimizedQueryOptions = {}
  ): Promise<GolfCourse[]> {
    const { useCache = true, cacheTTL = 5 * 60 * 1000 } = options;
    
    // Crear clave de cache basada en parámetros de búsqueda
    const cacheKey = createCacheKey('search', { searchTerm, filters });
    
    if (useCache && firebaseCache.getCourse(cacheKey)) {
      return firebaseCache.getCourse(cacheKey);
    }

    try {
      if (!db) {
        throw new Error('Firebase not initialized');
      }
      const coursesRef = collection(db, 'courses');
      const constraints: QueryConstraint[] = [];

      // Aplicar filtros
      if (filters.location) {
        constraints.push(where('location', '>=', filters.location));
        constraints.push(where('location', '<=', filters.location + '\uf8ff'));
      }

      if (filters.priceRange) {
        constraints.push(where('basePrice', '>=', filters.priceRange.min));
        constraints.push(where('basePrice', '<=', filters.priceRange.max));
      }

      constraints.push(orderBy('name'));
      
      if (options.pageSize) {
        constraints.push(limit(options.pageSize));
      }

      const q = query(coursesRef, ...constraints);
      const snapshot = await getDocs(q);
      
      let courses = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as GolfCourse[];

      // Filtrar por término de búsqueda (cliente)
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        courses = courses.filter(course => 
          course.name.toLowerCase().includes(term) ||
          course.location.toLowerCase().includes(term) ||
          course.description?.toLowerCase().includes(term)
        );
      }

      // Filtrar por rating (cliente)
      if (filters.rating) {
        courses = courses.filter(course => {
          const avgRating = course.reviews.length > 0
            ? course.reviews.reduce((acc, r) => acc + r.rating, 0) / course.reviews.length
            : 0;
          return avgRating >= filters.rating!;
        });
      }

      if (useCache) {
        firebaseCache.setCourse(cacheKey, courses, cacheTTL);
      }

      return courses;
    } catch (error) {
      console.error('Error searching courses:', error);
      throw error;
    }
  }

  // Obtener reservas del usuario con cache
  async getUserBookings(userId: string, options: OptimizedQueryOptions = {}): Promise<Booking[]> {
    const { useCache = true, cacheTTL = 5 * 60 * 1000 } = options;
    
    if (useCache) {
      const cached = firebaseCache.getUserBookings(userId);
      if (cached) {
        return cached;
      }
    }

    try {
      if (!db) {
        throw new Error('Firebase not initialized');
      }
      const bookingsRef = collection(db, 'bookings');
      const q = query(
        bookingsRef,
        where('userId', '==', userId),
        orderBy('date', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const bookings = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Booking[];

      if (useCache) {
        firebaseCache.setUserBookings(userId, bookings, cacheTTL);
      }

      return bookings;
    } catch (error) {
      console.error('Error fetching user bookings:', error);
      throw error;
    }
  }

  // Obtener reseñas de un curso con cache
  async getCourseReviews(courseId: string, options: OptimizedQueryOptions = {}): Promise<Review[]> {
    const { useCache = true, cacheTTL = 10 * 60 * 1000 } = options;
    
    if (useCache) {
      const cached = firebaseCache.getReviews(courseId);
      if (cached) {
        return cached;
      }
    }

    try {
      if (!db) {
        throw new Error('Firebase not initialized');
      }
      const reviewsRef = collection(db, 'reviews');
      const q = query(
        reviewsRef,
        where('courseId', '==', courseId),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const reviews = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Review[];

      if (useCache) {
        firebaseCache.setReviews(courseId, reviews, cacheTTL);
      }

      return reviews;
    } catch (error) {
      console.error('Error fetching course reviews:', error);
      throw error;
    }
  }

  // Obtener cursos con paginación
  async getCoursesWithPagination(
    pagination: PaginationOptions = {},
    options: OptimizedQueryOptions = {}
  ): Promise<{ courses: GolfCourse[]; lastDoc: DocumentSnapshot | null; hasMore: boolean }> {
    const { pageSize = 10 } = pagination;
    
    try {
      if (!db) {
        throw new Error('Firebase not initialized');
      }
      const coursesRef = collection(db, 'courses');
      const constraints: QueryConstraint[] = [orderBy('name'), limit(pageSize + 1)];
      
      if (pagination.lastDoc) {
        constraints.push(startAfter(pagination.lastDoc));
      }

      const q = query(coursesRef, ...constraints);
      const snapshot = await getDocs(q);
      
      const docs = snapshot.docs;
      const hasMore = docs.length > pageSize;
      const courses = docs.slice(0, pageSize).map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as GolfCourse[];
      
      const lastDoc = hasMore ? docs[pageSize - 1] : null;

      return { courses, lastDoc, hasMore };
    } catch (error) {
      console.error('Error fetching paginated courses:', error);
      throw error;
    }
  }

  // Invalidar cache específico
  invalidateCache(type: 'course' | 'courses' | 'user' | 'reviews', id?: string) {
    switch (type) {
      case 'course':
        if (id) firebaseCache.invalidateCourse(id);
        break;
      case 'courses':
        firebaseCache.clear();
        break;
      case 'user':
        if (id) firebaseCache.invalidateUserData(id);
        break;
      case 'reviews':
        if (id) firebaseCache.getReviews(id);
        break;
    }
  }
}

// Instancia global del servicio
export const optimizedFirebaseService = OptimizedFirebaseService.getInstance();

// Funciones de conveniencia
export const getCourses = (options?: OptimizedQueryOptions) => 
  optimizedFirebaseService.getCourses(options);

export const getCourse = (courseId: string, options?: OptimizedQueryOptions) => 
  optimizedFirebaseService.getCourse(courseId, options);

export const searchCourses = (
  searchTerm: string, 
  filters?: Parameters<typeof optimizedFirebaseService.searchCourses>[1],
  options?: OptimizedQueryOptions
) => optimizedFirebaseService.searchCourses(searchTerm, filters, options);

export const getUserBookings = (userId: string, options?: OptimizedQueryOptions) => 
  optimizedFirebaseService.getUserBookings(userId, options);

export const getCourseReviews = (courseId: string, options?: OptimizedQueryOptions) => 
  optimizedFirebaseService.getCourseReviews(courseId, options);