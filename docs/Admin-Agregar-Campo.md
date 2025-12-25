# Agregar nuevos campos de golf (Admin)

UI
- Ruta: `src/app/[lang]/admin/courses/new/page.tsx`.
- Formulario: `src/app/[lang]/admin/courses/new/CourseFormClient.tsx` y `src/components/admin/CourseForm.tsx`.

Proceso
- Completar datos básicos, reglas, imágenes y especificaciones (9/18/27 hoyos).
- Al guardar, se llama `addCourse/updateCourse` (`src/lib/data.ts`) y se revalida contenido público vía `/api/admin/courses/revalidate`.

Validaciones
- Zod valida horas de operación, par/yards y slug.
- Slug normalizado en minúsculas; evitar duplicados.

## Fallback de precios en desarrollo

- Cuando Firebase Admin no está inicializado en local (clave privada inválida o faltante), el endpoint `/api/pricing/min-price` usa `initialCourses` como fuente de datos para calcular el precio mínimo.
- Si un curso no existe en `initialCourses`, el endpoint devuelve `minPrice`/`priceFromUSD` como `null` en lugar de lanzar un error.
- En producción, el endpoint utiliza Firestore Admin y los datos reales de pricing; si por alguna razón Admin no está disponible, se intenta un fallback con Firestore cliente y finalmente con `initialCourses`.
- Este fallback no afecta al funnel ni a Stripe/PayPal: solo permite que la home muestre “Desde $XX” en modo desarrollo sin depender del Admin SDK.
- Comportamiento intencional para habilitar desarrollo local fluido cuando el entorno no dispone de credenciales de Admin.
