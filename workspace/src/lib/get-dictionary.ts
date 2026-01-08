
// We can't use server-only here as this is imported by client components too.
// The data is static, so this is safe.
import type { Locale } from '../i18n-config'

// We enumerate all dictionaries here for better linting and typescript support
// We do not want to import '@' here since it is relative to the file where it is imported from
const dictionaries = {
  en: () => import('./dictionaries/en.json').then((module) => module.default),
  es: () => import('./dictionaries/es.json').then((module) => module.default),
}

// Cache for loaded dictionaries to avoid repeated imports
const dictionaryCache = new Map<Locale, any>()

export const getDictionary = async (locale: Locale) => {
  if (dictionaryCache.has(locale)) {
    return dictionaryCache.get(locale)
  }
  
  // Validate locale and provide fallback
  if (!locale || typeof locale !== 'string') {
    console.warn('Invalid locale provided:', locale, 'defaulting to en')
    locale = 'en' as Locale
  }
  
  if (!dictionaries[locale]) {
    console.warn('Dictionary not found for locale:', locale, 'defaulting to en')
    locale = 'en' as Locale
  }
  
  const dictionary = await dictionaries[locale]()
  dictionaryCache.set(locale, dictionary)
  return dictionary
}

// Optimized function to get specific dictionary sections
export const getDictionarySection = async <T extends keyof any>(locale: Locale, section: T) => {
  const dictionary = await getDictionary(locale)
  return dictionary[section] as any
}
