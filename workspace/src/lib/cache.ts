"use client";

// Sistema de cache en memoria para optimizar consultas
class MemoryCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private maxSize = 100; // Máximo número de entradas

  set(key: string, data: any, ttlMs: number = 5 * 60 * 1000) { // 5 minutos por defecto
    // Si el cache está lleno, eliminar la entrada más antigua
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs
    });
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Verificar si ha expirado
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    // Verificar si ha expirado
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  // Limpiar entradas expiradas
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

// Instancia global del cache
export const memoryCache = new MemoryCache();

// Función helper para crear claves de cache
export function createCacheKey(prefix: string, params: Record<string, any>): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}:${JSON.stringify(params[key])}`)
    .join('|');
  
  return `${prefix}:${sortedParams}`;
}

// Decorator para funciones con cache automático
export function withCache<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: {
    keyPrefix: string;
    ttl?: number;
    keyGenerator?: (...args: Parameters<T>) => string;
  }
): T {
  return (async (...args: Parameters<T>) => {
    const cacheKey = options.keyGenerator 
      ? `${options.keyPrefix}:${options.keyGenerator(...args)}`
      : createCacheKey(options.keyPrefix, { args });
    
    // Intentar obtener del cache
    const cached = memoryCache.get(cacheKey);
    if (cached !== null) {
      return cached;
    }
    
    // Ejecutar función y cachear resultado
    try {
      const result = await fn(...args);
      memoryCache.set(cacheKey, result, options.ttl);
      return result;
    } catch (error) {
      // No cachear errores
      throw error;
    }
  }) as T;
}

// Cache específico para datos de Firebase
export class FirebaseCache {
  private static instance: FirebaseCache;
  private cache = new MemoryCache();
  
  static getInstance(): FirebaseCache {
    if (!FirebaseCache.instance) {
      FirebaseCache.instance = new FirebaseCache();
    }
    return FirebaseCache.instance;
  }

  // Cache para cursos
  setCourses(courses: any[], ttl = 10 * 60 * 1000) { // 10 minutos
    this.cache.set('courses:all', courses, ttl);
  }

  getCourses(): any[] | null {
    return this.cache.get('courses:all');
  }

  setCourse(courseId: string, course: any, ttl = 15 * 60 * 1000) { // 15 minutos
    this.cache.set(`course:${courseId}`, course, ttl);
  }

  getCourse(courseId: string): any | null {
    return this.cache.get(`course:${courseId}`);
  }

  // Cache para reservas del usuario
  setUserBookings(userId: string, bookings: any[], ttl = 5 * 60 * 1000) { // 5 minutos
    this.cache.set(`bookings:${userId}`, bookings, ttl);
  }

  getUserBookings(userId: string): any[] | null {
    return this.cache.get(`bookings:${userId}`);
  }

  // Cache para reseñas
  setReviews(courseId: string, reviews: any[], ttl = 10 * 60 * 1000) {
    this.cache.set(`reviews:${courseId}`, reviews, ttl);
  }

  getReviews(courseId: string): any[] | null {
    return this.cache.get(`reviews:${courseId}`);
  }

  // Invalidar cache relacionado
  invalidateCourse(courseId: string) {
    this.cache.delete(`course:${courseId}`);
    this.cache.delete(`reviews:${courseId}`);
    this.cache.delete('courses:all'); // También invalidar la lista completa
  }

  invalidateUserData(userId: string) {
    this.cache.delete(`bookings:${userId}`);
  }

  clear() {
    this.cache.clear();
  }
}

// Instancia global del cache de Firebase
export const firebaseCache = FirebaseCache.getInstance();

// Limpiar cache automáticamente cada 30 minutos
if (typeof window !== 'undefined') {
  setInterval(() => {
    memoryCache.cleanup();
    firebaseCache.clear();
  }, 30 * 60 * 1000);
}

// Tipos para TypeScript
export interface CacheOptions {
  ttl?: number;
  key?: string;
}

export interface CachedFunction<T extends (...args: any[]) => any> {
  (...args: Parameters<T>): ReturnType<T>;
  clearCache: () => void;
}