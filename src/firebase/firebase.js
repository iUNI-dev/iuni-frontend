import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyBCdqpKuVAita7PrpHuO_H2WwoWuvUS6kY',
  authDomain: 'iuni-8173c.firebaseapp.com',
  projectId: 'iuni-8173c',
  storageBucket: 'iuni-8173c.firebasestorage.app',
  messagingSenderId: '86494611395',
  appId: '1:86494611395:web:356f1b5a999f5961c15f76',
  measurementId: 'G-7PBYH6XK6J',
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export default app;
