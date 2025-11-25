# 🔑 Instrucciones para Obtener la API Key de Firebase (Web)

## Ubicación actual
Estás viendo la configuración de la **app Android**. Necesitas la configuración de la **app Web**.

## Pasos para encontrar/crear la App Web:

### Opción 1: Si ya existe la app web

1. **En la misma pantalla donde estás** (Configuración del proyecto > General)
2. **Desplázate hacia arriba** hasta la sección **"Tus apps"**
3. **Busca una entrada que diga:**
   - "App web" o 
   - "Web" o
   - "iUNI" (App web) o
   - "iuni" (App web)
4. **Haz clic en esa app web**
5. **Verás un bloque de código** con la configuración:
   ```javascript
   const firebaseConfig = {
     apiKey: "AIzaSy...",  ← ESTA ES LA QUE NECESITAS
     authDomain: "...",
     ...
   };
   ```
6. **Copia el valor de `apiKey`** (empieza con `AIzaSy...`)

### Opción 2: Si NO existe la app web (crear una nueva)

1. **En la sección "Tus apps"** (mismo lugar donde ves Android)
2. **Haz clic en el botón "Agregar app"** o el ícono **"</>"** (Web)
3. **Registra la app:**
   - **Apodo de la app:** `iUNI Web` (o cualquier nombre)
   - **Marca la casilla:** "Configurar también Firebase Hosting" (opcional)
   - **Clic en "Registrar app"**
4. **Copia el código de configuración** que aparece:
   - Busca la línea `apiKey: "..."` 
   - Copia el valor entre las comillas

## Actualizar el código

1. **Abre el archivo:** `src/firebase/firebase.js`
2. **En la línea 12**, reemplaza la API key actual:

```javascript
apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'TU_NUEVA_API_KEY_AQUI',
```

3. **Reemplaza** `'TU_NUEVA_API_KEY_AQUI'` con el valor que copiaste de Firebase Console

## Ejemplo visual

Cuando encuentres la app web, deberías ver algo así:

```
Apps web
┌─────────────────────────────┐
│ iUNI                        │
│ App web                     │
│ iuni                        │
└─────────────────────────────┘
```

Haz clic en esa tarjeta para ver la configuración completa.

## Después de actualizar

1. **Guarda el archivo** `src/firebase/firebase.js`
2. **Reinicia el servidor** (Ctrl+C y luego `npm start` o `npx expo start --web`)
3. **Prueba el registro** nuevamente

## ⚠️ Nota importante

La API key que necesitas es específica para la **app Web**, no para Android. 
Asegúrate de copiar la API key de la app web, no la de Android.

