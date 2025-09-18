import { z } from 'zod';

// Función básica de sanitización sin dependencias externas
const basicSanitize = (input: string): string => {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

// Mock DOMPurify para compatibilidad
const DOMPurify = {
  sanitize: basicSanitize
};

// Esquemas de validación con Zod
export const userSchema = z.object({
  email: z.string().email('Email inválido').min(1, 'Email requerido'),
  name: z.string().min(2, 'Nombre debe tener al menos 2 caracteres').max(100, 'Nombre muy largo'),
  phone: z.string().optional(),
  avatar: z.string().url().optional(),
  role: z.enum(['user', 'admin']).default('user'),
  preferences: z.object({
    notifications: z.boolean().default(true),
    language: z.enum(['es', 'en']).default('es'),
    theme: z.enum(['light', 'dark', 'system']).default('system')
  }).optional()
});

export const bookingSchema = z.object({
  courseId: z.string().min(1, 'ID del curso requerido'),
  date: z.date({ invalid_type_error: 'Fecha inválida' }),
  time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido'),
  players: z.number().int().min(1, 'Mínimo 1 jugador').max(4, 'Máximo 4 jugadores'),
  totalPrice: z.number().min(0, 'Precio no puede ser negativo'),
  paymentMethodId: z.string().optional(),
  specialRequests: z.string().max(500, 'Solicitudes especiales muy largas').optional(),
  guestInfo: z.array(z.object({
    name: z.string().min(1, 'Nombre requerido'),
    email: z.string().email('Email inválido').optional(),
    handicap: z.number().min(0).max(54).optional()
  })).optional()
});

export const reviewSchema = z.object({
  courseId: z.string().min(1, 'ID del curso requerido'),
  rating: z.number().int().min(1, 'Rating mínimo 1').max(5, 'Rating máximo 5'),
  comment: z.string().min(10, 'Comentario muy corto').max(1000, 'Comentario muy largo'),
  aspects: z.object({
    course: z.number().int().min(1).max(5),
    service: z.number().int().min(1).max(5),
    facilities: z.number().int().min(1).max(5),
    value: z.number().int().min(1).max(5)
  }).optional(),
  photos: z.array(z.string().url()).max(5, 'Máximo 5 fotos').optional()
});

export const courseSchema = z.object({
  name: z.string().min(2, 'Nombre muy corto').max(100, 'Nombre muy largo'),
  description: z.string().min(50, 'Descripción muy corta').max(2000, 'Descripción muy larga'),
  location: z.string().min(5, 'Ubicación muy corta').max(200, 'Ubicación muy larga'),
  address: z.string().min(10, 'Dirección muy corta').max(300, 'Dirección muy larga'),
  phone: z.string().regex(/^[+]?[0-9\s\-\(\)]+$/, 'Teléfono inválido'),
  email: z.string().email('Email inválido'),
  website: z.string().url('URL inválida').optional(),
  basePrice: z.number().min(0, 'Precio no puede ser negativo'),
  holes: z.number().int().min(9).max(18, 'Número de hoyos inválido'),
  par: z.number().int().min(27).max(72, 'Par inválido'),
  length: z.number().min(1000).max(8000, 'Longitud inválida'),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  amenities: z.array(z.string()).max(20, 'Demasiadas amenidades'),
  imageUrls: z.array(z.string().url()).min(1, 'Al menos una imagen requerida').max(10, 'Máximo 10 imágenes'),
  coordinates: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180)
  })
});

// Funciones de sanitización
export class SecurityUtils {
  // Sanitizar HTML para prevenir XSS
  static sanitizeHtml(dirty: string): string {
    return DOMPurify.sanitize(dirty);
  }

  // Sanitizar texto plano
  static sanitizeText(text: string): string {
    return text
      .trim()
      .replace(/[<>"'&]/g, (match) => {
        const entities: Record<string, string> = {
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#x27;',
          '&': '&amp;'
        };
        return entities[match] || match;
      });
  }

  // Validar y sanitizar email
  static sanitizeEmail(email: string): string {
    return email.toLowerCase().trim();
  }

  // Validar y sanitizar URL
  static sanitizeUrl(url: string): string | null {
    try {
      const parsed = new URL(url);
      // Solo permitir HTTP y HTTPS
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return null;
      }
      return parsed.toString();
    } catch {
      return null;
    }
  }

  // Validar número de teléfono
  static sanitizePhone(phone: string): string {
    return phone.replace(/[^+0-9\s\-\(\)]/g, '').trim();
  }

  // Generar token CSRF
  static generateCSRFToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  // Validar token CSRF
  static validateCSRFToken(token: string, expectedToken: string): boolean {
    if (token.length !== expectedToken.length) {
      return false;
    }
    
    let result = 0;
    for (let i = 0; i < token.length; i++) {
      result |= token.charCodeAt(i) ^ expectedToken.charCodeAt(i);
    }
    return result === 0;
  }

  // Validar archivo de imagen
  static validateImageFile(file: File): { valid: boolean; error?: string } {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
    const maxSize = 5 * 1024 * 1024; // 5MB
    
    if (!allowedTypes.includes(file.type)) {
      return { valid: false, error: 'Tipo de archivo no permitido' };
    }
    
    if (file.size > maxSize) {
      return { valid: false, error: 'Archivo muy grande (máximo 5MB)' };
    }
    
    return { valid: true };
  }

  // Detectar contenido malicioso en texto
  static detectMaliciousContent(text: string): boolean {
    const maliciousPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe[^>]*>.*?<\/iframe>/gi,
      /<object[^>]*>.*?<\/object>/gi,
      /<embed[^>]*>.*?<\/embed>/gi,
      /data:text\/html/gi
    ];
    
    return maliciousPatterns.some(pattern => pattern.test(text));
  }

  // Rate limiting simple (cliente)
  static createRateLimiter(maxRequests: number, windowMs: number) {
    const requests = new Map<string, number[]>();
    
    return (identifier: string): boolean => {
      const now = Date.now();
      const windowStart = now - windowMs;
      
      if (!requests.has(identifier)) {
        requests.set(identifier, []);
      }
      
      const userRequests = requests.get(identifier)!;
      
      // Limpiar requests antiguos
      const validRequests = userRequests.filter(time => time > windowStart);
      
      if (validRequests.length >= maxRequests) {
        return false; // Rate limit excedido
      }
      
      validRequests.push(now);
      requests.set(identifier, validRequests);
      
      return true;
    };
  }
}

// Hook para validación de formularios
export function useSecureForm<T>(schema: z.ZodSchema<T>) {
  const validate = (data: unknown): { success: boolean; data?: T; errors?: z.ZodError } => {
    try {
      const result = schema.parse(data);
      return { success: true, data: result };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { success: false, errors: error };
      }
      throw error;
    }
  };

  const sanitizeAndValidate = (data: any): { success: boolean; data?: T; errors?: z.ZodError } => {
    // Sanitizar strings en el objeto
    const sanitized = sanitizeObject(data);
    return validate(sanitized);
  };

  return { validate, sanitizeAndValidate };
}

// Función auxiliar para sanitizar objetos recursivamente
function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') {
    return SecurityUtils.sanitizeText(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  
  if (obj && typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
  }
  
  return obj;
}

// Constantes de seguridad
export const SECURITY_CONSTANTS = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'],
  MAX_COMMENT_LENGTH: 1000,
  MAX_NAME_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 2000,
  RATE_LIMIT: {
    REQUESTS_PER_MINUTE: 60,
    REQUESTS_PER_HOUR: 1000
  }
} as const;

// Tipos exportados
export type UserData = z.infer<typeof userSchema>;
export type BookingData = z.infer<typeof bookingSchema>;
export type ReviewData = z.infer<typeof reviewSchema>;
export type CourseData = z.infer<typeof courseSchema>;