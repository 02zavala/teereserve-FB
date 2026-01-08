// src/lib/date-utils.ts
import { es, enUS } from 'date-fns/locale';
import { format } from 'date-fns';
import type { Locale } from '@/i18n-config';

export const dateLocales: Record<Locale, typeof enUS> = {
  en: enUS,
  es: es,
};

/**
 * Convierte una fecha en formato string (YYYY-MM-DD) a un objeto Date local
 * evitando problemas de zona horaria que pueden cambiar el día.
 * 
 * @param dateString - Fecha en formato YYYY-MM-DD
 * @returns Date object en zona horaria local
 */
export function parseLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Formatea una fecha de reserva manteniendo la fecha local correcta
 * 
 * @param dateString - Fecha en formato YYYY-MM-DD
 * @param formatString - Formato de salida (ej: "PPP")
 * @param locale - Locale para el formateo ('es' | 'en')
 * @returns Fecha formateada
 */
export function formatBookingDate(dateString: string, formatString: string = "PPP", locale: Locale = 'es'): string {
  try {
    const localDate = parseLocalDate(dateString);
    return format(localDate, formatString, { locale: dateLocales[locale] });
  } catch (error) {
    console.error("Error formatting booking date:", dateString, error);
    return "Invalid Date";
  }
}

/**
 * Devuelve la fecha por defecto para reservas. Si la hora actual es
 * igual o posterior a las 16:00 (hora local), devuelve el siguiente día.
 * En caso contrario, devuelve hoy.
 *
 * @param cutoffHour - Hora de corte en formato 24h (por defecto 16)
 * @returns Date con la fecha seleccionada por defecto
 */
export function getDefaultBookingDate(cutoffHour: number = 16): Date {
  const now = new Date();
  const currentHour = now.getHours();

  // Normalizamos a medianoche local para evitar problemas de horas
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (currentHour >= cutoffHour) {
    // Siguiente día a medianoche local
    return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  }

  return today;
}
