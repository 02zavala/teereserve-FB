'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useRef, startTransition } from 'react';

/**
 * Hook para navegación estable que previene abortos RSC
 * Usa startTransition y evita navegaciones duplicadas
 */
export function useStableNavigation() {
  const router = useRouter();
  const pendingNavigationRef = useRef<string | null>(null);
  const navigationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const go = useCallback((href: string, { replace = false } = {}) => {
    if (pendingNavigationRef.current === href) return;

    pendingNavigationRef.current = href;

    if (navigationTimeoutRef.current) clearTimeout(navigationTimeoutRef.current);
    navigationTimeoutRef.current = setTimeout(() => {
      pendingNavigationRef.current = null;
      navigationTimeoutRef.current = null;
    }, 2000);

    startTransition(() => {
      replace ? router.replace(href) : router.push(href);
    });
  }, [router]);

  return { go };
}

/**
 * Hook para manejar navegación con validación previa
 * Útil para formularios y operaciones que requieren confirmación
 */
export function useValidatedNavigation() {
  const { go } = useStableNavigation();
  const pendingOperationRef = useRef<Promise<any> | null>(null);

  const navigateAfterOperation = useCallback(async (
    operation: () => Promise<any>,
    successUrl: string,
    options?: {
      replace?: boolean;
      onError?: (error: any) => void;
      onSuccess?: (result: any) => void;
    }
  ) => {
    const { replace = false, onError, onSuccess } = options || {};
    
    // Evitar operaciones duplicadas
    if (pendingOperationRef.current) {
      console.log('🚫 Operation already in progress, skipping');
      return;
    }

    try {
      console.log('⏳ Starting operation before navigation');
      pendingOperationRef.current = operation();
      
      const result = await pendingOperationRef.current;
      console.log('✅ Operation completed successfully');
      
      if (onSuccess) {
        onSuccess(result);
      }
      
      // Navegar solo después de que la operación termine exitosamente
      go(successUrl, { replace });
      
    } catch (error) {
      console.error('❌ Operation failed:', error);
      
      if (onError) {
        onError(error);
      }
    } finally {
      pendingOperationRef.current = null;
    }
  }, [go]);

  return {
    go,
    navigateAfterOperation,
    isOperationPending: () => pendingOperationRef.current !== null
  };
}

/**
 * Hook para manejar navegación con await de operaciones asíncronas
 * Espera a que terminen las operaciones antes de navegar
 */
export function useAsyncNavigation() {
  const { go } = useStableNavigation();
  const pendingOperationsRef = useRef<Set<string>>(new Set());

  // Registrar una operación pendiente
  const registerOperation = useCallback((operationId: string) => {
    pendingOperationsRef.current.add(operationId);
    console.log(`⏳ Registered operation: ${operationId}`);
  }, []);

  // Completar una operación
  const completeOperation = useCallback((operationId: string) => {
    pendingOperationsRef.current.delete(operationId);
    console.log(`✅ Completed operation: ${operationId}`);
  }, []);

  // Navegar después de completar operaciones
  const navigateAfterOperations = useCallback(async (
    url: string, 
    operations: Promise<any>[] = [],
    replace = false
  ) => {
    try {
      console.log(`⏳ Waiting for ${operations.length} operations before navigation`);
      
      // Esperar a que terminen todas las operaciones
      await Promise.all(operations);
      
      console.log(`✅ All operations completed, navigating to: ${url}`);
      go(url, { replace });
    } catch (error) {
      console.error('❌ Error in operations before navigation:', error);
      // Navegar de todas formas si hay errores
      go(url, { replace });
    }
  }, [go]);

  // Verificar si hay operaciones pendientes
  const hasOperationsPending = useCallback(() => {
    return pendingOperationsRef.current.size > 0;
  }, []);

  return {
    go,
    registerOperation,
    completeOperation,
    navigateAfterOperations,
    hasOperationsPending,
    getPendingOperations: () => Array.from(pendingOperationsRef.current)
  };
}