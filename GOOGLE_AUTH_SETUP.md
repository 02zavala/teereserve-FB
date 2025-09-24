# Guía de Configuración de Google Authentication

## Problema Actual
Google Auth no funciona al crear cuentas. Esto suele deberse a configuración incorrecta en Firebase Console o Google Cloud Console.

## Pasos para Solucionar

### 1. Firebase Console - Configuración de Authentication

1. **Ve a Firebase Console**: https://console.firebase.google.com/
2. **Selecciona tu proyecto**: `teereserve-golf`
3. **Ve a Authentication** → **Sign-in method**
4. **Configura Google Provider**:
   - Haz clic en "Google"
   - Asegúrate de que esté **HABILITADO** ✅
   - Verifica las credenciales:
     - **Web client ID**: `7459999729-85s7bcf8ckknckn0mhdhcgf1ejrp91oq.apps.googleusercontent.com`
     - **Web client secret**: `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`
   - **Email del proyecto**: Debe estar configurado
   - Haz clic en **Guardar**

### 2. Firebase Console - Dominios Autorizados

1. En Firebase Console → **Authentication** → **Settings**
2. Ve a la sección **Authorized domains**
3. Asegúrate de que estén agregados:
   - ✅ `localhost` (para desarrollo)
   - ✅ `teereserve.golf` (para producción)
   - ✅ `teereserve-golf.firebaseapp.com` (dominio de Firebase)

### 3. Google Cloud Console - OAuth Configuration

1. **Ve a Google Cloud Console**: https://console.cloud.google.com/
2. **Selecciona tu proyecto**: `teereserve-golf`
3. **Ve a APIs & Services** → **Credentials**
4. **Encuentra tu OAuth 2.0 Client ID** (debería ser el que termina en `...oq.apps.googleusercontent.com`)
5. **Haz clic para editarlo**
6. **Configura Authorized JavaScript origins**:
   ```
   http://localhost:3000
   https://localhost:3000
   https://teereserve.golf
   https://teereserve-golf.firebaseapp.com
   ```
7. **Configura Authorized redirect URIs**:
   ```
   http://localhost:3000/__/auth/handler
   https://localhost:3000/__/auth/handler
   https://teereserve.golf/__/auth/handler
   https://teereserve-golf.firebaseapp.com/__/auth/handler
   ```

### 4. Verificación de Variables de Entorno

Tu archivo `.env.local` ya tiene las variables correctas:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyAGbLMGcxSRumk--pywW6PvytcTwRn4j1E
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=teereserve-golf.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=teereserve-golf
GOOGLE_CLIENT_ID=7459999729-85s7bcf8ckknckn0mhdhcgf1ejrp91oq.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
```

### 5. Prueba la Configuración

1. **Reinicia el servidor de desarrollo**:
   ```bash
   npm run dev
   ```

2. **Ve a la página de debug**: http://localhost:3000/debug

3. **Haz clic en "Verificar Configuración"** para ver si Firebase está correctamente inicializado

4. **Prueba "Probar Popup"** para ver si Google Auth funciona con popup

5. **Si el popup funciona**, entonces el problema está en el redirect. Prueba "Probar Redirect"

### 6. Errores Comunes y Soluciones

#### Error: "popup_blocked_by_user"
- **Solución**: Permite popups en tu navegador para localhost:3000

#### Error: "redirect_uri_mismatch"
- **Solución**: Verifica que las URIs de redirect estén correctamente configuradas en Google Cloud Console

#### Error: "invalid_client"
- **Solución**: Verifica que el Client ID y Client Secret sean correctos en Firebase Console

#### Error: "access_denied"
- **Solución**: El usuario canceló el proceso o hay un problema con los permisos

### 7. Verificación Final

Después de hacer estos cambios:

1. **Espera 5-10 minutos** para que los cambios se propaguen
2. **Limpia la caché del navegador** (Ctrl+Shift+R)
3. **Prueba el registro con Google** en: http://localhost:3000/es/signup
4. **Revisa la consola del navegador** para ver errores específicos

## Contacto para Soporte

Si sigues teniendo problemas después de seguir estos pasos, proporciona:
1. Capturas de pantalla de la configuración en Firebase Console
2. Capturas de pantalla de la configuración en Google Cloud Console
3. Errores específicos de la consola del navegador
4. Resultado de la página de debug