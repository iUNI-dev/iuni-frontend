// ...existing code...
import * as Google from 'expo-auth-session/providers/google';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Image, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

// Firebase
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { addDoc, collection, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '../src/firebase/firebase';

declare global {
  interface Window {
    google: any;
  }
}

WebBrowser.maybeCompleteAuthSession();

const RegisterStudentScreen = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const googleDivRef = useRef(null);
  const router = useRouter();

  // Expo Auth Session para Android/iOS
  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: '496117929623-iq56rq8c0ipog1rgjc6hb48fg7tpv8pr.apps.googleusercontent.com',
    androidClientId: '496117929623-j0049lr9u9smvv233aos6781gbg8vm1r.apps.googleusercontent.com',
    webClientId: '496117929623-7eoumvlftom3mcg3q945rmd6arbue1k2.apps.googleusercontent.com',
  });
 

  useEffect(() => {
    if (Platform.OS === 'web') {
      if (!document.getElementById('google-client-script')) {
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.id = 'google-client-script';
        document.body.appendChild(script);
        script.onload = renderGoogleButton;
      } else {
        renderGoogleButton();
      }
    }
    function renderGoogleButton() {
      if (window.google && googleDivRef.current) {
        window.google.accounts.id.initialize({
          client_id: '496117929623-7eoumvlftom3mcg3q945rmd6arbue1k2.apps.googleusercontent.com',
          callback: async (response: any) => {
            try {
              const idToken = response?.credential;
              if (!idToken) {
                console.log('No idToken from Google web callback');
                return;
              }
              // Sign in with Firebase using the Google ID token
              const credential = GoogleAuthProvider.credential(idToken);
              const userCred = await signInWithCredential(auth, credential);
              const user = userCred.user;
              // Guardar/actualizar documento del usuario en Firestore
              await setDoc(doc(db, 'users', user.uid), {
                email: user.email,
                displayName: user.displayName || null,
                provider: 'google',
                createdAt: serverTimestamp(),
              }, { merge: true });
              console.log('Usuario Google autenticado:', user.uid);
              // navegar o mostrar pantalla siguiente
              // router.push('/home');
            } catch (err: any) {
              console.error('Google web sign-in error', err);
              Alert.alert('Error', err.message || 'Error al autenticar con Google');
            }
          },
        });
        window.google.accounts.id.renderButton(googleDivRef.current, {
          theme: 'filled_red',
          size: 'large',
          text: 'continue_with',
          shape: 'pill',
        });
      }
    }
  }, []);

  useEffect(() => {
    // Mobile / Expo response handling
    (async () => {
      if (response?.type === 'success') {
        try {
          const { authentication } = response;
          const idToken = authentication?.idToken;
          const accessToken = authentication?.accessToken;
          if (!idToken && !accessToken) {
            Alert.alert('Error', 'No se recibió token de Google');
            return;
          }
          const credential = GoogleAuthProvider.credential(idToken ?? null, accessToken ?? null);
          const userCred = await signInWithCredential(auth, credential);
          const user = userCred.user;
          await setDoc(doc(db, 'users', user.uid), {
            email: user.email,
            displayName: user.displayName || null,
            provider: 'google',
            createdAt: serverTimestamp(),
          }, { merge: true });
          console.log('Usuario Google autenticado (mobile):', user.uid);
          // router.push('/home');
        } catch (err: any) {
          console.error('Google mobile sign-in error', err);
          Alert.alert('Error', err.message || 'Error al autenticar con Google');
        }
      }
    })();
  }, [response]);

  const isValidEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleEmailLogin = async () => {
    if (!isValidEmail(email)) {
      Alert.alert('Correo inválido', 'Por favor ingresa un correo válido.');
      return;
    }
    setLoading(true);
    try {
      const code = Math.floor(1000 + Math.random() * 9000).toString();
      // Guardar verificación en Firestore
      await addDoc(collection(db, 'email_verifications'), {
        email,
        code,
        createdAt: serverTimestamp(),
        used: false,
      });
      setLoading(false);
      router.push({
        pathname: '/verify-code',
        params: { email, code }
      });
    } catch (err: any) {
      setLoading(false);
      console.error('Error guardando verificación', err);
      Alert.alert('Error', err.message || 'No se pudo guardar la verificación');
    }
  };

  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/images/logo-texto.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={styles.subtitle}>
        Ingresa y encuentra cientos de empleos para estudiantes.
      </Text>

      {Platform.OS === 'web' ? (
        <View ref={googleDivRef} style={styles.googleButtonWeb} />
      ) : (
        <TouchableOpacity
          style={styles.googleButton}
          onPress={() => promptAsync()}
          disabled={!request}
        >
          <Text style={styles.googleButtonText}>Ingresar con Google</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.orText}>o puedes.</Text>

      <Text style={styles.emailLabel}>Ingresar con correo electrónico</Text>
      <TextInput
        style={styles.input}
        placeholder="Correo electrónico"
        placeholderTextColor="#888"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <TouchableOpacity style={styles.emailButton} onPress={handleEmailLogin} disabled={loading}>
        <Text style={styles.emailButtonText}>{loading ? 'Enviando...' : 'Continuar'}</Text>
      </TouchableOpacity>
    </View>
  );
};

// ...existing styles...
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logo: {
    width: 600,
    height: 200,
    marginBottom: 28,
  },
  subtitle: {
    fontSize: 18,
    color: '#d90429',
    textAlign: 'center',
    marginBottom: 32,
    fontWeight: 'bold',
  },
  googleButton: {
    width: '100%',
    maxWidth: 320,
    height: 48,
    backgroundColor: '#d90429',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  googleButtonWeb: {
    width: 320,
    height: 48,
    marginBottom: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  googleButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  orText: {
    fontSize: 14,
    color: '#000',
    marginBottom: 18,
    textAlign: 'center',
  },
  emailLabel: {
    fontSize: 16,
    color: '#d90429',
    marginBottom: 10,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  input: {
    width: '100%',
    maxWidth: 320,
    height: 44,
    borderColor: '#000',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 14,
    backgroundColor: '#fff',
    color: '#000',
  },
  emailButton: {
    width: '100%',
    maxWidth: 320,
    height: 44,
    backgroundColor: '#000',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  emailButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default RegisterStudentScreen;