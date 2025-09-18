import type { Locale } from '../../i18n-config'

// Shared dictionary sections that are used across multiple pages
const sharedDictionaries = {
  en: {
    header: {
      home: "Home",
      findCourse: "Find a Course",
      about: "About Us",
      contact: "Contact",
      recommendations: "AI Recommendations",
      admin: "Admin"
    },
    footer: {
      platformDescription: "The premium golf booking platform in Mexico. Discover the best courses and live unique experiences.",
      platform: "Platform",
      courses: "Courses",
      reservations: "Reservations",
      reviews: "Reviews",
      admin: "Admin",
      support: "Support",
      helpCenter: "Help Center",
      contact: "Contact",
      apiStatus: "API Status",
      contactTitle: "Contact",
      followUs: "Follow Us",
      allRightsReserved: "All rights reserved.",
      privacyPolicy: "Privacy Policy",
      termsOfService: "Terms of Service",
      premiumExperience: "A Premium Golf Experience",
      adminDashboard: "Admin Dashboard"
    },
    themeToggle: {
      light: "Light",
      dark: "Dark",
      system: "System",
      toggle: "Toggle theme"
    },
    languageSwitcher: {
      label: "Change language",
      en: "EN",
      es: "ES"
    }
  },
  es: {
    header: {
      home: "Inicio",
      findCourse: "Buscar Campo",
      about: "Nosotros",
      contact: "Contacto",
      recommendations: "Recomendaciones IA",
      admin: "Admin"
    },
    footer: {
      platformDescription: "La plataforma premium de reservas de golf en México. Descubre los mejores campos y vive experiencias únicas.",
      platform: "Plataforma",
      courses: "Campos",
      reservations: "Reservas",
      reviews: "Reseñas",
      admin: "Admin",
      support: "Soporte",
      helpCenter: "Centro de Ayuda",
      contact: "Contacto",
      apiStatus: "Estado API",
      contactTitle: "Contacto",
      followUs: "Síguenos",
      allRightsReserved: "Todos los derechos reservados.",
      privacyPolicy: "Política de Privacidad",
      termsOfService: "Términos de Servicio",
      premiumExperience: "Una Experiencia Premium de Golf Hecho con ❤️ en México",
      adminDashboard: "Panel de Admin"
    },
    themeToggle: {
      light: "Claro",
      dark: "Oscuro",
      system: "Sistema",
      toggle: "Cambiar tema"
    },
    languageSwitcher: {
      label: "Cambiar idioma",
      en: "EN",
      es: "ES"
    }
  }
}

// Cache for shared dictionaries
const sharedCache = new Map<Locale, any>()

export const getSharedDictionary = async (locale: Locale) => {
  if (sharedCache.has(locale)) {
    return sharedCache.get(locale)
  }
  
  // Validate locale and provide fallback
  if (!locale || typeof locale !== 'string') {
    console.warn('Invalid locale provided:', locale, 'defaulting to en')
    locale = 'en' as Locale
  }
  
  if (!sharedDictionaries[locale]) {
    console.warn('Dictionary not found for locale:', locale, 'defaulting to en')
    locale = 'en' as Locale
  }
  
  const shared = sharedDictionaries[locale]
  sharedCache.set(locale, shared)
  return shared
}

export const getSharedSection = async <T extends keyof typeof sharedDictionaries['en']>(
  locale: Locale, 
  section: T
) => {
  const shared = await getSharedDictionary(locale)
  return shared[section]
}