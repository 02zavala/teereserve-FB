"use client";

import { useEffect, useRef, useCallback } from 'react';

/**
 * Hook personalizado para manejar fetches con AbortController
 * Previene abortos de red al cancelar requests automáticamente en cleanup
 */
export function useFetchWithAbort() {
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup function para abortar requests pendientes
  const cleanup = useCallback(() => {
    if (abortControllerRef.current) {
      console.log('🚫 Aborting pending fetch request');
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  // Función para crear un nuevo fetch con AbortController
  const fetchWithAbort = useCallback(async (
    url: string, 
    options: RequestInit = {}
  ): Promise<Response> => {
    // Limpiar cualquier request anterior
    cleanup();
    
    // Crear nuevo AbortController
    abortControllerRef.current = new AbortController();
    
    // Agregar signal al fetch
    const fetchOptions: RequestInit = {
      ...options,
      signal: abortControllerRef.current.signal
    };

    console.log(`🌐 Starting fetch to: ${url}`);
    
    try {
      const response = await fetch(url, fetchOptions);
      console.log(`✅ Fetch completed: ${url} (${response.status})`);
      return response;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log(`🚫 Fetch aborted: ${url}`);
        throw new Error('Request was cancelled');
      }
      console.error(`❌ Fetch failed: ${url}`, error);
      throw error;
    } finally {
      // Limpiar referencia si el request completó normalmente
      if (abortControllerRef.current) {
        abortControllerRef.current = null;
      }
    }
  }, [cleanup]);

  // Cleanup automático en unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    fetchWithAbort,
    cleanup,
    isRequestPending: () => abortControllerRef.current !== null
  };
}

/**
 * Hook para manejar múltiples fetches concurrentes con AbortController
 */
export function useMultipleFetchWithAbort() {
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());

  const cleanup = useCallback((requestId?: string) => {
    if (requestId) {
      // Limpiar un request específico
      const controller = abortControllersRef.current.get(requestId);
      if (controller) {
        console.log(`🚫 Aborting fetch request: ${requestId}`);
        controller.abort();
        abortControllersRef.current.delete(requestId);
      }
    } else {
      // Limpiar todos los requests
      console.log(`🚫 Aborting ${abortControllersRef.current.size} pending requests`);
      abortControllersRef.current.forEach((controller, id) => {
        controller.abort();
      });
      abortControllersRef.current.clear();
    }
  }, []);

  const fetchWithAbort = useCallback(async (
    requestId: string,
    url: string, 
    options: RequestInit = {}
  ): Promise<Response> => {
    // Limpiar request anterior con el mismo ID
    cleanup(requestId);
    
    // Crear nuevo AbortController
    const controller = new AbortController();
    abortControllersRef.current.set(requestId, controller);
    
    // Agregar signal al fetch
    const fetchOptions: RequestInit = {
      ...options,
      signal: controller.signal
    };

    console.log(`🌐 Starting fetch [${requestId}]: ${url}`);
    
    try {
      const response = await fetch(url, fetchOptions);
      console.log(`✅ Fetch completed [${requestId}]: ${url} (${response.status})`);
      return response;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log(`🚫 Fetch aborted [${requestId}]: ${url}`);
        throw new Error('Request was cancelled');
      }
      console.error(`❌ Fetch failed [${requestId}]: ${url}`, error);
      throw error;
    } finally {
      // Limpiar referencia si el request completó
      abortControllersRef.current.delete(requestId);
    }
  }, [cleanup]);

  // Cleanup automático en unmount
  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  return {
    fetchWithAbort,
    cleanup,
    getPendingRequests: () => Array.from(abortControllersRef.current.keys())
  };
}