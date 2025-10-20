import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Rellena con los valores de tu proyecto Firebase
const firebaseConfig = {
  apiKey: 'AIzaSyBN71lSiP7zdQmAcGXP3rTpA5ClW20IaUs',
  authDomain: 'iuni-backend.firebaseapp.com',
  projectId: 'iuni-backend',
  storageBucket: 'iuni-backend.firebasestorage.app',
  messagingSenderId: '389029036547',
  appId: '1:389029036547:web:7825a48cbc4ac674d78436',
  measurementId: 'G-SXXEV87EL4',
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;