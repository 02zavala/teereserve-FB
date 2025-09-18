// src/lib/date-utils.ts
import { es, enUS } from 'date-fns/locale';
import type { Locale } from '@/i18n-config';

export const dateLocales: Record<Locale, typeof enUS> = {
  en: enUS,
  es: es,
};
