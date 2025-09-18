"use client";

import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { handleError, AppError, ValidationError, AuthError } from '@/lib/error-handling';
import { FirebaseError } from 'firebase/app';

export interface ErrorHandlerOptions {
  defaultMessage?: string;
  showToast?: boolean;
  logError?: boolean;
  onError?: (error: unknown) => void;
}

export interface UseErrorHandlerReturn {
  handleError: (error: unknown, options?: ErrorHandlerOptions) => void;
  handleAsyncError: <T>(
    asyncFn: () => Promise<T>,
    options?: ErrorHandlerOptions
  ) => Promise<T | null>;
  wrapAsyncFunction: <T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    options?: ErrorHandlerOptions
  ) => (...args: T) => Promise<R | null>;
}

/**
 * Hook personalizado para manejo robusto de errores en componentes de administración
 */
export function useErrorHandler(): UseErrorHandlerReturn {
  const { toast } = useToast();

  const handleErrorCallback = useCallback(
    (error: unknown, options: ErrorHandlerOptions = {}) => {
      const {
        defaultMessage = 'An unexpected error occurred',
        showToast = true,
        logError = true,
        onError,
      } = options;

      // Log del error para debugging
      if (logError) {
        console.error('Error handled by useErrorHandler:', error);
        
        // Log adicional para errores específicos
        if (error instanceof AppError) {
          console.error('AppError metadata:', error.metadata);
        } else if (error instanceof FirebaseError) {
          console.error('Firebase error code:', error.code);
        }
      }

      // Mostrar toast si está habilitado
      if (showToast) {
        handleError(error, {
          toast: (toastOptions) => toast(toastOptions),
          defaultMessage,
        });
      }

      // Callback personalizado
      if (onError) {
        onError(error);
      }
    },
    [toast]
  );

  const handleAsyncError = useCallback(
    async <T>(
      asyncFn: () => Promise<T>,
      options: ErrorHandlerOptions = {}
    ): Promise<T | null> => {
      try {
        return await asyncFn();
      } catch (error) {
        handleErrorCallback(error, options);
        return null;
      }
    },
    [handleErrorCallback]
  );

  const wrapAsyncFunction = useCallback(
    <T extends any[], R>(
      fn: (...args: T) => Promise<R>,
      options: ErrorHandlerOptions = {}
    ) => {
      return async (...args: T): Promise<R | null> => {
        try {
          return await fn(...args);
        } catch (error) {
          handleErrorCallback(error, options);
          return null;
        }
      };
    },
    [handleErrorCallback]
  );

  return {
    handleError: handleErrorCallback,
    handleAsyncError,
    wrapAsyncFunction,
  };
}

/**
 * Hook para validación de formularios con manejo de errores
 */
export function useFormErrorHandler() {
  const { handleError } = useErrorHandler();

  const validateField = useCallback(
    (value: any, fieldName: string, validators: Array<(value: any) => string | null>) => {
      for (const validator of validators) {
        const error = validator(value);
        if (error) {
          throw new ValidationError(`Validation failed for ${fieldName}`, {
            [fieldName]: error,
          });
        }
      }
      return true;
    },
    []
  );

  const validateForm = useCallback(
    (formData: Record<string, any>, validationRules: Record<string, Array<(value: any) => string | null>>) => {
      const errors: Record<string, string> = {};
      
      for (const [fieldName, validators] of Object.entries(validationRules)) {
        try {
          validateField(formData[fieldName], fieldName, validators);
        } catch (error) {
          if (error instanceof ValidationError && error.details) {
            Object.assign(errors, error.details);
          }
        }
      }
      
      if (Object.keys(errors).length > 0) {
        throw new ValidationError('Form validation failed', errors);
      }
      
      return true;
    },
    [validateField]
  );

  return {
    handleError,
    validateField,
    validateForm,
  };
}

/**
 * Validadores comunes para formularios
 */
export const commonValidators = {
  required: (value: any) => {
    if (value === null || value === undefined || value === '') {
      return 'This field is required';
    }
    return null;
  },
  
  email: (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (value && !emailRegex.test(value)) {
      return 'Please enter a valid email address';
    }
    return null;
  },
  
  isValidEmail: (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  },
  
  minLength: (min: number) => (value: string) => {
    if (value && value.length < min) {
      return `Must be at least ${min} characters long`;
    }
    return null;
  },
  
  maxLength: (max: number) => (value: string) => {
    if (value && value.length > max) {
      return `Must be no more than ${max} characters long`;
    }
    return null;
  },
  
  positiveNumber: (value: number) => {
    if (value !== undefined && value !== null && value <= 0) {
      return 'Must be a positive number';
    }
    return null;
  },
  
  phoneNumber: (value: string) => {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    if (value && !phoneRegex.test(value.replace(/[\s\-\(\)]/g, ''))) {
      return 'Please enter a valid phone number';
    }
    return null;
  },
  
  isValidName: (value: string) => {
    // Permite letras, números, espacios, guiones, apostrofes y puntos
    const nameRegex = /^[a-zA-Z0-9\s\-\'\.À-ſ]+$/;
    if (!value || value.trim().length === 0) {
      return false;
    }
    // Verificar que no tenga solo espacios o caracteres especiales
    if (!/[a-zA-Z0-9\u00C0-\u017F]/.test(value)) {
      return false;
    }
    return nameRegex.test(value.trim());
  },

  isValidCouponCode: (value: string) => {
    if (!value || typeof value !== 'string') return false;
    // Coupon code should be 3-20 characters, alphanumeric with optional hyphens
    const couponRegex = /^[A-Z0-9-]{3,20}$/i;
    return couponRegex.test(value.trim());
  }
};