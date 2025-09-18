"use client";

import { useEffect, useState } from 'react';
import { SecurityUtils } from '@/lib/security';

// Hook para manejar CSRF tokens
export function useCSRF() {
  const [csrfToken, setCSRFToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Obtener CSRF token del cookie o generar uno nuevo
    const getCSRFToken = async () => {
      try {
        // Intentar obtener token existente
        const response = await fetch('/api/csrf-token', {
          method: 'GET',
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          setCSRFToken(data.token);
        } else {
          // Generar token local como fallback
          const newToken = SecurityUtils.generateCSRFToken();
          setCSRFToken(newToken);
        }
      } catch (error) {
        console.error('Error obteniendo CSRF token:', error);
        // Generar token local como fallback
        const newToken = SecurityUtils.generateCSRFToken();
        setCSRFToken(newToken);
      } finally {
        setIsLoading(false);
      }
    };

    getCSRFToken();
  }, []);

  // Función para hacer requests seguros con CSRF token
  const secureRequest = async (url: string, options: RequestInit = {}) => {
    if (!csrfToken) {
      throw new Error('CSRF token no disponible');
    }

    const headers = {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
      ...options.headers
    };

    return fetch(url, {
      ...options,
      headers,
      credentials: 'include'
    });
  };

  // Función para obtener headers seguros
  const getSecureHeaders = (): Record<string, string> => {
    if (!csrfToken) {
      return {};
    }

    return {
      'X-CSRF-Token': csrfToken
    };
  };

  return {
    csrfToken,
    isLoading,
    secureRequest,
    getSecureHeaders
  };
}

// Hook para formularios seguros
export function useSecureForm() {
  const { csrfToken, getSecureHeaders } = useCSRF();

  // Función para enviar formularios de forma segura
  const submitForm = async (url: string, formData: FormData | object, method: 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'POST') => {
    if (!csrfToken) {
      throw new Error('CSRF token no disponible');
    }

    const secureHeaders = getSecureHeaders();
    const headers: Record<string, string> = {
      ...secureHeaders
    };

    let body: string | FormData;
    
    if (formData instanceof FormData) {
      // Para FormData, no establecer Content-Type (el browser lo hace automáticamente)
      body = formData;
    } else {
      // Para objetos JSON
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(formData);
    }

    const response = await fetch(url, {
      method,
      headers,
      body,
      credentials: 'include'
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Error desconocido' }));
      throw new Error(errorData.message || `Error ${response.status}`);
    }

    return response.json();
  };

  return {
    submitForm,
    csrfToken,
    getSecureHeaders
  };
}

// Hook para validación de archivos
export function useFileValidation() {
  const validateFile = (file: File) => {
    return SecurityUtils.validateImageFile(file);
  };

  const validateFiles = (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const results = fileArray.map(file => ({
      file,
      validation: validateFile(file)
    }));

    const validFiles = results.filter(r => r.validation.valid).map(r => r.file);
    const invalidFiles = results.filter(r => !r.validation.valid);

    return {
      validFiles,
      invalidFiles,
      allValid: invalidFiles.length === 0,
      errors: invalidFiles.map(r => `${r.file.name}: ${r.validation.error}`)
    };
  };

  return {
    validateFile,
    validateFiles
  };
}

// Hook para rate limiting del lado del cliente
export function useRateLimit(maxRequests: number = 10, windowMs: number = 60000) {
  const [requests, setRequests] = useState<number[]>([]);

  const checkRateLimit = (): boolean => {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Filtrar requests dentro de la ventana
    const validRequests = requests.filter(time => time > windowStart);
    
    if (validRequests.length >= maxRequests) {
      return false; // Rate limit excedido
    }
    
    // Agregar nueva request
    setRequests([...validRequests, now]);
    return true;
  };

  const getRemainingRequests = (): number => {
    const now = Date.now();
    const windowStart = now - windowMs;
    const validRequests = requests.filter(time => time > windowStart);
    return Math.max(0, maxRequests - validRequests.length);
  };

  const getResetTime = (): number => {
    if (requests.length === 0) return 0;
    const oldestRequest = Math.min(...requests);
    return oldestRequest + windowMs;
  };

  return {
    checkRateLimit,
    getRemainingRequests,
    getResetTime,
    isLimited: getRemainingRequests() === 0
  };
}

// Hook para detectar contenido malicioso
export function useContentValidation() {
  const validateContent = (content: string): { isValid: boolean; error?: string } => {
    if (SecurityUtils.detectMaliciousContent(content)) {
      return {
        isValid: false,
        error: 'Contenido no permitido detectado'
      };
    }

    return { isValid: true };
  };

  const sanitizeContent = (content: string): string => {
    return SecurityUtils.sanitizeHtml(content);
  };

  return {
    validateContent,
    sanitizeContent
  };
}