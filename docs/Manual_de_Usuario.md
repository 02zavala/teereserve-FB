# Manual de Usuario – TeeReserve

Introducción
TeeReserve es una aplicación para explorar campos de golf, consultar disponibilidad y precios, reservar tee times y administrar contenido y precios desde un panel de administración.

Requisitos previos
- Navegador moderno (Chrome, Edge, Safari o Firefox)
- Conexión a internet
- Cuenta de usuario con rol adecuado para acceder al panel de administración

Acceso y navegación
- Sitio público (ES): http://localhost:3001/es/
- Menú principal: Cursos, Mapa, Iniciar sesión
- Idioma: la app soporta rutas por idioma (p. ej., /es)

Uso como visitante/cliente
1) Explorar cursos
   - Desde la portada o el listado de cursos, navega a la página de cada campo.
   - En el mapa (/es/mapa) puedes localizar campos y abrir su ficha.
2) Página del curso
   - Verás imágenes del campo, descripción, ubicación y precios base.
   - Selecciona fecha y horario disponibles para tu reserva.
3) Reservar y pagar
   - Añade tu selección al carrito y continúa al checkout.
   - Ingresa los datos de pago; se aceptan tarjetas (Visa, Mastercard, Amex). 
   - Confirma la reserva. Recibirás confirmación en pantalla y/o por correo.

Gestión de cuenta
- Inicia sesión desde el menú. Si tienes rol admin/superadmin, verás el acceso al panel.

Panel de administración
Acceso
- URL: http://localhost:3001/es/admin/
- Requiere sesión con rol admin o superadmin.

Cursos y precios
- Gestión de precios por curso: http://localhost:3001/es/admin/courses
- Editar curso específico: http://localhost:3001/es/admin/courses/edit/<id-del-curso>

Quick Pricing (precios rápidos)
- Abre el curso y entra en la pestaña de Quick Pricing.
- Campo “Precio Base (USD)”: establece el precio base.
- Aplica el Quick Pricing para actualizar reglas predefinidas.
- Pulsa Guardar para persistir los cambios.
Consejo: verifica en la UI que el precio base se refleje y, si es necesario, revisa la consola/red para confirmar el guardado.

Precios por temporada, bandas y reglas
- Temporadas: define periodos con ajustes de precio.
- Bandas (time bands): configura franjas horarias con variaciones.
- Reglas: aplica condiciones específicas (p. ej., fines de semana, festivos).
- Tras editar, guarda para persistir en el servidor.

Contenido del sitio
- Admin de contenido: http://localhost:3001/es/admin/content
- Hero (portada): sube/gestiona las imágenes principales (hero-1.jpg a hero-4.jpg).
  Recomendaciones: imágenes 16:9, ideal 1920×1000 (o 1920×800); se usan a pantalla completa.
- About (Acerca de): administra textos y dos imágenes principales (hero y misión).

Buenas prácticas para imágenes del hero
- Las imágenes se renderizan a pantalla completa con ajuste “cover”.
- Si no se ven o sale un aviso sobre altura, asegúrate de que el contenedor del carrusel tenga altura (h-full) y posición relativa.
- Utiliza archivos optimizados para web (JPG de alta calidad y peso moderado).

Solución de problemas
- “Service Unavailable”: reinicia el servidor de desarrollo.
  Comando sugerido: npm run dev -- --port 3001
- Errores de conectividad con Google/Firebase: verifica tu conexión y sesión; sin autenticación, guardar cambios puede fallar.
- Limpia caché del navegador si notas comportamientos extraños en imágenes o estilos.
- Revisa la consola del navegador para mensajes detallados.

Preguntas frecuentes (FAQ)
- ¿Necesito cuenta para reservar? Puedes explorar sin cuenta, pero para ciertos flujos y administración, es necesario iniciar sesión.
- ¿Cómo cambio el idioma? Navega usando la ruta con el código de idioma (p. ej., /es).
- ¿Cuándo se reflejan los cambios del admin? Normalmente son inmediatos; algunas páginas pueden revalidarse en segundos.

Soporte
- Si necesitas ayuda, comparte la ruta exacta y el mensaje de error que ves en consola para una asistencia más rápida.