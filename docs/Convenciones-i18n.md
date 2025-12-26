# Convenciones de i18n

- Locales soportados: `es`, `en` (ver `src/i18n-config.ts`).
- Segmento de idioma: todas las rutas públicas viven bajo `src/app/[lang]`.
- Obtención de idioma:
  - `useParams()` cuando la página está bajo `[lang]`.
  - `usePathname()` en componentes que derivan `lang` del path.
- Fechas/formatos:
  - Utilizar `dateLocales` y utilidades de `src/lib/date-utils`.
- Reglas:
  - Todas las redirecciones internas deben preservar el segmento `/[lang]`.
  - Evitar strings hardcodeados; usar diccionarios (`getDictionary`) cuando aplique.

