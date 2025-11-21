import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// 🔥 USA ESTA CONFIGURACIÓN EXACTA:
const firebaseConfig = {
  apiKey: "AIzaSyC1x48wCmoCAjumE4wJ2_KADXfTrfrY3bU",
  authDomain: "iuni-8173c.firebaseapp.com",
  projectId: "iuni-8173c",
  storageBucket: "iuni-8173c.firebasestorage.app",
  messagingSenderId: "86494611395",
  appId: "1:86494611395:web:356f1b5a999f5961c15f76"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;