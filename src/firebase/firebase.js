import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// 🔑 IMPORTANTE: Si ves error "api-key-expired", renueva la API key aquí:
// 1. Ve a: https://console.firebase.google.com/
// 2. Selecciona tu proyecto > Configuración > General
// 3. En "Tus apps" busca la app web y copia el apiKey
// 4. Reemplaza el valor después de || en la línea apiKey
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyC1x48wCmoCAjumE4wJ2_KADXfTrfrY3bU', // ✅ API Key actualizada
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'iuni-8173c.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'iuni-8173c',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'iuni-8173c.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '86494611395',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:86494611395:web:356f1b5a999f5961c15f76',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || 'G-7PBYH6XK6J',
};

// Previene inicializaciones múltiples en dev/hot-reload
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
