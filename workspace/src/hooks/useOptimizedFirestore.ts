"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs, 
  onSnapshot, 
  QueryConstraint,
  DocumentData,
  Query
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface UseOptimizedFirestoreOptions {
  enableCache?: boolean;
  cacheTime?: number; // en milisegundos
  enableRealtime?: boolean;
  debounceMs?: number;
}

interface CacheEntry {
  data: any[];
  timestamp: number;
}

// Cache global para consultas
const queryCache = new Map<string, CacheEntry>();

// Función para generar clave de cache
function generateCacheKey(collectionName: string, constraints: QueryConstraint[]): string {
  const constraintStrings = constraints.map(constraint => {
    // Convertir constraints a string para la clave
    return constraint.toString();
  });
  return `${collectionName}_${constraintStrings.join('_')}`;
}

export function useOptimizedFirestore<T = DocumentData>(
  collectionName: string,
  constraints: QueryConstraint[] = [],
  options: UseOptimizedFirestoreOptions = {}
) {
  const {
    enableCache = true,
    cacheTime = 5 * 60 * 1000, // 5 minutos por defecto
    enableRealtime = false,
    debounceMs = 300
  } = options;

  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const cacheKey = generateCacheKey(collectionName, constraints);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Verificar cache si está habilitado
      if (enableCache) {
        const cached = queryCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < cacheTime) {
          setData(cached.data);
          setLoading(false);
          return;
        }
      }

      // Construir query
      if (!db) {
        throw new Error('Firestore database not initialized');
      }
      const collectionRef = collection(db, collectionName);
      const q = constraints.length > 0 
        ? query(collectionRef, ...constraints)
        : collectionRef;

      if (enableRealtime) {
        // Configurar listener en tiempo real
        console.log(`🔥 Firestore: Connecting listener for ${collectionName}`);
        const unsubscribe = onSnapshot(
          q,
          (snapshot) => {
            console.log(`🔥 Firestore: Received update for ${collectionName}, docs: ${snapshot.docs.length}`);
            const docs = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            })) as T[];
            
            setData(docs);
            setLoading(false);
            
            // Actualizar cache
            if (enableCache) {
              queryCache.set(cacheKey, {
                data: docs,
                timestamp: Date.now()
              });
            }
          },
          (err) => {
            console.error(`🔥 Firestore: Error in listener for ${collectionName}:`, err);
            setError(err as Error);
            setLoading(false);
          }
        );
        
        unsubscribeRef.current = unsubscribe;
      } else {
        // Consulta única
        const snapshot = await getDocs(q);
        const docs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as T[];
        
        setData(docs);
        setLoading(false);
        
        // Actualizar cache
        if (enableCache) {
          queryCache.set(cacheKey, {
            data: docs,
            timestamp: Date.now()
          });
        }
      }
    } catch (err) {
      setError(err as Error);
      setLoading(false);
    }
  }, [collectionName, constraints, enableCache, cacheTime, enableRealtime, cacheKey]);

  const debouncedFetchData = useCallback(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    debounceTimeoutRef.current = setTimeout(() => {
      fetchData();
    }, debounceMs);
  }, [fetchData, debounceMs]);

  const refetch = useCallback(() => {
    // Limpiar cache para esta consulta
    if (enableCache) {
      queryCache.delete(cacheKey);
    }
    fetchData();
  }, [fetchData, enableCache, cacheKey]);

  const clearCache = useCallback(() => {
    queryCache.clear();
  }, []);

  useEffect(() => {
    debouncedFetchData();

    return () => {
      // Limpiar timeout
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      
      // Limpiar listener de tiempo real
      if (unsubscribeRef.current) {
        console.log(`🔥 Firestore: Unsubscribing listener for ${collectionName}`);
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [debouncedFetchData, collectionName]);

  return {
    data,
    loading,
    error,
    refetch,
    clearCache
  };
}

// Hook especializado para cursos de golf
export function useOptimizedCourses(filters?: {
  location?: string;
  maxPrice?: number;
  minRating?: number;
}) {
  const constraints: QueryConstraint[] = [];
  
  if (filters?.location) {
    constraints.push(where('location', '==', filters.location));
  }
  
  if (filters?.maxPrice) {
    constraints.push(where('basePrice', '<=', filters.maxPrice));
  }
  
  if (filters?.minRating) {
    constraints.push(where('rating', '>=', filters.minRating));
  }
  
  constraints.push(orderBy('rating', 'desc'));
  constraints.push(limit(20));

  return useOptimizedFirestore('courses', constraints, {
    enableCache: true,
    cacheTime: 10 * 60 * 1000, // 10 minutos para cursos
    enableRealtime: false
  });
}

// Hook especializado para reservas del usuario
export function useOptimizedUserBookings(userId: string) {
  const constraints: QueryConstraint[] = [
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(50)
  ];

  return useOptimizedFirestore('bookings', constraints, {
    enableCache: true,
    cacheTime: 2 * 60 * 1000, // 2 minutos para reservas
    enableRealtime: true // Tiempo real para reservas del usuario
  });
}

// Hook especializado para reseñas
export function useOptimizedReviews(courseId?: string) {
  const constraints: QueryConstraint[] = [];
  
  if (courseId) {
    constraints.push(where('courseId', '==', courseId));
  }
  
  constraints.push(orderBy('createdAt', 'desc'));
  constraints.push(limit(10));

  return useOptimizedFirestore('reviews', constraints, {
    enableCache: true,
    cacheTime: 5 * 60 * 1000, // 5 minutos para reseñas
    enableRealtime: false
  });
}