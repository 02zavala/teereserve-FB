"use client";

import { useState, useCallback, useRef, useEffect } from 'react';

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

export interface AsyncActions<T> {
  execute: (...args: any[]) => Promise<T | void>;
  reset: () => void;
  setData: (data: T) => void;
  setError: (error: Error) => void;
}

export interface UseAsyncOptions {
  immediate?: boolean;
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
  retryCount?: number;
  retryDelay?: number;
}

// Hook principal para manejar estado asíncrono
export function useAsync<T>(
  asyncFunction: (...args: any[]) => Promise<T>,
  options: UseAsyncOptions = {}
): AsyncState<T> & AsyncActions<T> {
  const {
    immediate = false,
    onSuccess,
    onError,
    retryCount = 0,
    retryDelay = 1000
  } = options;

  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: false,
    error: null
  });

  const mountedRef = useRef(true);
  const retryCountRef = useRef(0);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const execute = useCallback(async (...args: any[]) => {
    if (!mountedRef.current) return;

    setState(prev => ({ ...prev, loading: true, error: null }));
    retryCountRef.current = 0;

    const attemptExecution = async (): Promise<T | void> => {
      try {
        const result = await asyncFunction(...args);
        
        if (mountedRef.current) {
          setState({ data: result, loading: false, error: null });
          onSuccess?.(result);
        }
        
        return result;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        
        if (retryCountRef.current < retryCount) {
          retryCountRef.current++;
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          return attemptExecution();
        }
        
        if (mountedRef.current) {
          setState({ data: null, loading: false, error: err });
          onError?.(err);
        }
        
        throw err;
      }
    };

    return attemptExecution();
  }, [asyncFunction, onSuccess, onError, retryCount, retryDelay]);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
    retryCountRef.current = 0;
  }, []);

  const setData = useCallback((data: T) => {
    setState(prev => ({ ...prev, data, error: null }));
  }, []);

  const setError = useCallback((error: Error) => {
    setState(prev => ({ ...prev, error, loading: false }));
  }, []);

  // Ejecutar inmediatamente si se especifica
  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [immediate]);

  return {
    ...state,
    execute,
    reset,
    setData,
    setError
  };
}

// Hook especializado para operaciones CRUD
export function useCRUD<T>({
  create,
  read,
  update,
  delete: deleteFunc
}: {
  create?: (...args: any[]) => Promise<T>;
  read?: (...args: any[]) => Promise<T>;
  update?: (...args: any[]) => Promise<T>;
  delete?: (...args: any[]) => Promise<void>;
}) {
  const createState = useAsync(create || (() => Promise.reject(new Error('Create not implemented'))));
  const readState = useAsync(read || (() => Promise.reject(new Error('Read not implemented'))));
  const updateState = useAsync(update || (() => Promise.reject(new Error('Update not implemented'))));
  const deleteState = useAsync(deleteFunc || (() => Promise.reject(new Error('Delete not implemented'))));

  const isLoading = createState.loading || readState.loading || updateState.loading || deleteState.loading;
  const hasError = createState.error || readState.error || updateState.error || deleteState.error;

  return {
    create: createState,
    read: readState,
    update: updateState,
    delete: deleteState,
    isLoading,
    hasError,
    resetAll: () => {
      createState.reset();
      readState.reset();
      updateState.reset();
      deleteState.reset();
    }
  };
}

// Hook para manejar múltiples operaciones asíncronas
export function useAsyncQueue() {
  const [queue, setQueue] = useState<Array<{
    id: string;
    promise: Promise<any>;
    status: 'pending' | 'fulfilled' | 'rejected';
    result?: any;
    error?: Error;
  }>>([]);

  const addToQueue = useCallback(<T>(id: string, promise: Promise<T>) => {
    setQueue(prev => [...prev, { id, promise, status: 'pending' }]);

    promise
      .then(result => {
        setQueue(prev => prev.map(item => 
          item.id === id 
            ? { ...item, status: 'fulfilled' as const, result }
            : item
        ));
      })
      .catch(error => {
        setQueue(prev => prev.map(item => 
          item.id === id 
            ? { ...item, status: 'rejected' as const, error }
            : item
        ));
      });

    return promise;
  }, []);

  const removeFromQueue = useCallback((id: string) => {
    setQueue(prev => prev.filter(item => item.id !== id));
  }, []);

  const clearQueue = useCallback(() => {
    setQueue([]);
  }, []);

  const pendingCount = queue.filter(item => item.status === 'pending').length;
  const completedCount = queue.filter(item => item.status === 'fulfilled').length;
  const errorCount = queue.filter(item => item.status === 'rejected').length;

  return {
    queue,
    addToQueue,
    removeFromQueue,
    clearQueue,
    pendingCount,
    completedCount,
    errorCount,
    isProcessing: pendingCount > 0
  };
}

// Hook para debounce de operaciones asíncronas
export function useDebouncedAsync<T>(
  asyncFunction: (...args: any[]) => Promise<T>,
  delay: number = 300,
  options: UseAsyncOptions = {}
) {
  const timeoutRef = useRef<NodeJS.Timeout>();
  const asyncState = useAsync(asyncFunction, options);

  const debouncedExecute = useCallback((...args: any[]) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      asyncState.execute(...args);
    }, delay);
  }, [asyncState.execute, delay]);

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    ...asyncState,
    execute: debouncedExecute,
    cancel
  };
}