# Guía para Renovar la API Key de Firebase

## Problema
La API key de Firebase ha expirado y necesita ser renovada.

## Solución: Obtener Nueva API Key

### Paso 1: Acceder a Firebase Console
1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Inicia sesión con tu cuenta de Google

### Paso 2: Seleccionar tu Proyecto
1. En la lista de proyectos, selecciona el proyecto **iuni-8173c** (o el que estés usando)

### Paso 3: Obtener la Configuración
1. Haz clic en el ícono de **⚙️ (Configuración)** en la parte superior izquierda
2. Selecciona **Configuración del proyecto**

### Paso 4: Copiar la API Key
1. En la pestaña **General**, desplázate hacia abajo
2. Busca la sección **Tus apps**
3. Si ya tienes una app web configurada, haz clic en ella
4. Si no tienes una app web, haz clic en **Agregar app** y selecciona **Web** (</>)
5. En la configuración de la app web, encontrarás:
   - **apiKey**: Este es el valor que necesitas copiar

### Paso 5: Actualizar el Código
1. Abre el archivo `src/firebase/firebase.js`
2. Reemplaza la línea 7 con tu nueva API key:
   ```javascript
   apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'TU_NUEVA_API_KEY_AQUI',
   ```

### Paso 6: Reiniciar el Servidor
1. Detén el servidor de desarrollo (Ctrl+C)
2. Inicia nuevamente con `npm start` o `npx expo start --web`

## Configuración Alternativa con Variables de Entorno (Recomendado)

Para mayor seguridad, puedes usar variables de entorno:

1. Crea un archivo `.env` en la raíz del proyecto:
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=tu_nueva_api_key_aqui
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=iuni-8173c.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=iuni-8173c
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=iuni-8173c.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=86494611395
   NEXT_PUBLIC_FIREBASE_APP_ID=1:86494611395:web:356f1b5a999f5961c15f76
   ```

2. El archivo `.env` ya está en `.gitignore`, así que no se subirá al repositorio

3. Reinicia el servidor para que tome las nuevas variables

## Verificar que Funciona

Después de actualizar la API key, intenta registrar un nuevo usuario. El error debería desaparecer.

## Nota de Seguridad

⚠️ **Importante**: La API key de Firebase para aplicaciones web es pública por diseño, pero siempre es buena práctica:
- No compartir la API key públicamente si no es necesario
- Usar reglas de seguridad de Firebase para proteger tus datos
- Restringir dominios permitidos en la configuración de Firebase Console

