# Configuración de Alertas Admin: WhatsApp y Email

Este documento explica cómo generar y configurar las variables necesarias para activar las alertas de administrador por WhatsApp y por Email en el proyecto.

## Prerrequisitos
- Tener el archivo `.env.local` en la raíz del proyecto.
- Servidor de desarrollo corriendo en `http://localhost:3002` (o ajustar `NEXT_PUBLIC_BASE_URL`).
- `ADMIN_API_KEY` definido para poder usar los endpoints de pruebas.
- Telegram ya configurado (opcional, pero útil para comparar flujos).

## Variables de entorno requeridas
Agrega estas variables a tu `.env.local`. Sustituye los valores de ejemplo por los reales.

### WhatsApp (WhatsApp Business API)
- `WHATSAPP_ACCESS_TOKEN`: Token del Graph API (WhatsApp Business). Ej: `EAAG...`
- `WHATSAPP_PHONE_NUMBER_ID`: ID del número de WhatsApp Business. Ej: `123456789012345`
- `WHATSAPP_BUSINESS_ACCOUNT_ID` (opcional): ID de la cuenta de negocio. Ej: `9876543210`
- `WHATSAPP_ALERTS_ENABLED=true`: Habilita el servicio de WhatsApp en la app.
- `ADMIN_WHATSAPP_ALERTS_ENABLED=true`: Habilita el canal WhatsApp en el orquestador de alertas admin.
- `ADMIN_WHATSAPP_NUMBER`: Teléfono del admin en formato E.164. Ej: `+521234567890`

### Email (Resend)
- `ADMIN_EMAIL_ALERTS_ENABLED=true`: Habilita el canal Email en el orquestador de alertas admin.
- `ADMIN_EMAIL_ADDRESS`: Correo del admin para recibir alertas. Ej: `info@teereserve.golf`
- `RESEND_API_KEY`: API key de Resend. Ej: `re_ABC123...`
- `RESEND_FROM_EMAIL`: Remitente para los correos. Ej: `noreply@teereserve.golf`
- `RESEND_REPLY_TO`: Dirección de respuesta. Ej: `reservas@teereserve.golf`

### Base URL (enlaces en las alertas)
- `NEXT_PUBLIC_BASE_URL=http://localhost:3002` en desarrollo.
- En producción, usar el dominio real: `https://teereserve.golf`.

## Cómo obtener credenciales de WhatsApp Business
1. Crea una app en Meta for Developers y vincúlala a tu WhatsApp Business Account.
2. En el panel de la app, sección "WhatsApp":
   - Genera un `Access Token` (puede ser de prueba o de sistema; en producción usa tokens de sistema con permisos permanentes).
   - Copia el `Phone Number ID` del número habilitado.
   - (Opcional) Anota el `WhatsApp Business Account ID`.
3. Verifica que el número esté habilitado para enviar mensajes a destinatarios opt-in. Durante pruebas, Meta permite enviar a números verificados.
4. Guarda los valores en `.env.local` como se indica arriba.

## Cómo configurar Resend para Email
1. Crea una cuenta en https://resend.com/ y genera una `API Key`.
2. Verifica el dominio de envío (p. ej. `teereserve.golf`) y configura DNS según las instrucciones de Resend para mejorar entregabilidad.
3. Define:
   - `RESEND_API_KEY` con la key creada.
   - `RESEND_FROM_EMAIL` con una dirección del dominio verificado (ej: `noreply@teereserve.golf`).
   - `RESEND_REPLY_TO` si deseas gestionar respuestas.
4. Ajusta `ADMIN_EMAIL_ADDRESS` al buzón del admin que recibirá las alertas.

## Activar los canales en el orquestador de alertas
El orquestador (`src/lib/admin-alerts-service.ts`) envía por canal según variables:
- WhatsApp: usa `ADMIN_WHATSAPP_ALERTS_ENABLED` y envía a `ADMIN_WHATSAPP_NUMBER` con credenciales `WHATSAPP_*`.
- Email: usa `ADMIN_EMAIL_ALERTS_ENABLED` y envía a `ADMIN_EMAIL_ADDRESS` usando `RESEND_*`.

Asegúrate de que:
- `WHATSAPP_ALERTS_ENABLED=true` y `ADMIN_WHATSAPP_ALERTS_ENABLED=true` para WhatsApp.
- `ADMIN_EMAIL_ALERTS_ENABLED=true` para Email.

## Pruebas de envío
### 1) Endpoint de pruebas de alertas admin
Requiere `ADMIN_API_KEY`.
- `POST /api/test-admin-alerts` con JSON:
  - `{"type":"status"}`: muestra estado/config actual.
  - `{"type":"test"}`: envía una alerta de prueba a los canales activos.
  - `{"type":"booking","bookingData":{...}}`: simula alerta de una reserva.
- Header: `Authorization: Bearer ${ADMIN_API_KEY}`.

Ejemplo con `curl`:
```bash
curl -X POST "http://localhost:3002/api/test-admin-alerts" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-admin-key-123" \
  -d '{"type":"test"}'
```

### 2) Trazar confirmación existente y enviar alerta real
Usa el script:
```bash
node scripts/trace-confirmation.js TRG-XXXXXX
```
- Busca la reserva por número de confirmación y envía la alerta admin con los datos reales.

### 3) Pruebas de email directas (opcional)
Hay scripts auxiliares en `scripts/`:
- `test-email-simple.js`, `test-email.js`, `test-resend-email.js` para validar que Resend envía correos con tus credenciales.

## Reinicio del servidor
Tras modificar `.env.local`, reinicia el servidor de desarrollo para aplicar cambios:
- Detén el proceso (`Ctrl + C`) y vuelve a ejecutar `npm run dev -- -p 3002`.

## Solución de problemas
- Si una alerta no llega:
  - Verifica que el canal esté habilitado (`*_ALERTS_ENABLED=true`).
  - Confirma que los destinos estén definidos (`ADMIN_WHATSAPP_NUMBER`, `ADMIN_EMAIL_ADDRESS`).
  - Revisa el log del endpoint de pruebas y del servidor (errores de Graph API o Resend).
  - Asegúrate de que `NEXT_PUBLIC_BASE_URL` apunte al entorno correcto para los enlaces.
- WhatsApp:
  - Comprueba que el número destino acepte mensajes del negocio (opt-in) y no esté bloqueado.
  - Tokens expirados: regenera el `WHATSAPP_ACCESS_TOKEN` si es temporal.
- Email:
  - Revisa la bandeja de SPAM y la configuración de dominio en Resend.

---
Con estas variables y pasos, podrás activar y verificar las alertas admin por WhatsApp y Email en desarrollo y producción.