import * as Google from 'expo-auth-session/providers/google';
import { makeRedirectUri } from 'expo-auth-session';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithCredential,
  signInWithEmailAndPassword
} from 'firebase/auth';
import {
  addDoc,
  collection,
  doc,
  serverTimestamp,
  setDoc,
  getDoc
} from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { auth, db } from '../src/firebase/firebase';

WebBrowser.maybeCompleteAuthSession();

const RegisterStudents = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const googleDivRef = useRef<any>(null);
  const router = useRouter();

  // Redirect URI (usa proxy en Expo Go)
  const redirectUri = makeRedirectUri({ useProxy: true });

  // Configuración de Google Auth: incluir scopes y redirectUri/responseType
  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: '496117929623-7eoumvlftom3mcg3q945rmd6arbue1k2.apps.googleusercontent.com',
    androidClientId: '496117929623-j0049lr9u9smvv233aos6781gbg8vm1r.apps.googleusercontent.com',
    iosClientId: '496117929623-7eoumvlftom3mcg3q945rmd6arbue1k2.apps.googleusercontent.com',
    redirectUri,
    scopes: ['profile', 'email'],
    responseType: 'id_token',
  });

  // Validar formato de correo
  const isValidEmail = (email: string) => /\S+@\S+\.\S+/.test(email);

  // Guarda/actualiza usuario en Firestore
  const handleGoogleUser = async (user: any) => {
    try {
      // Verificar si el usuario ya existe en Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));

      if (!userDoc.exists()) {
        await setDoc(
          doc(db, 'users', user.uid),
          {
            email: user.email,
            displayName: user.displayName || '',
            photoURL: user.photoURL || '',
            provider: 'google',
            createdAt: serverTimestamp(),
            lastLogin: serverTimestamp(),
          },
          { merge: true }
        );
        console.log('Nuevo usuario de Google guardado en Firestore');
      } else {
        await setDoc(
          doc(db, 'users', user.uid),
          {
            lastLogin: serverTimestamp(),
          },
          { merge: true }
        );
      }

      Alert.alert('¡Bienvenido!', `Hola ${user.displayName || user.email}`);
      // router.push('/home');
    } catch (err: any) {
      console.error('Error guardando usuario de Google:', err);
      Alert.alert('Error', 'Error al guardar información del usuario');
    }
  };

  // ------------------ 🔹 LOGIN CON GOOGLE EN WEB ------------------
  useEffect(() => {
    if (Platform.OS === 'web') {
      const initializeGoogleAuth = () => {
        if (window.google && googleDivRef.current) {
          window.google.accounts.id.initialize({
            client_id: '496117929623-7eoumvlftom3mcg3q945rmd6arbue1k2.apps.googleusercontent.com',
            callback: async (response: any) => {
              setGoogleLoading(true);
              try {
                const idToken = response?.credential;
                if (!idToken) throw new Error('No idToken from Google web callback');
                const credential = GoogleAuthProvider.credential(idToken);
                const userCred = await signInWithCredential(auth, credential);
                await handleGoogleUser(userCred.user);
              } catch (err: any) {
                console.error('Google web sign-in error', err);
                Alert.alert('Error', err.message || 'Error al autenticar con Google');
              } finally {
                setGoogleLoading(false);
              }
            },
          });

          // render button into the div
          window.google.accounts.id.renderButton(googleDivRef.current, {
            theme: 'filled_red',
            size: 'large',
            text: 'continue_with',
            shape: 'pill',
          });
        }
      };

      if (!document.getElementById('google-client-script')) {
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.id = 'google-client-script';
        script.onload = initializeGoogleAuth;
        document.body.appendChild(script);
      } else {
        initializeGoogleAuth();
      }
    }
  }, []);

  // ------------------ 🔹 LOGIN CON GOOGLE EN MÓVIL ------------------
  useEffect(() => {
    if (response?.type === 'success') {
      (async () => {
        setGoogleLoading(true);
        try {
          const { authentication } = response;
          const idToken = authentication?.idToken;
          const accessToken = authentication?.accessToken;

          if (!idToken && !accessToken) {
            throw new Error('No se recibieron tokens de Google');
          }

          // Crea credencial y autentica en Firebase
          const credential = GoogleAuthProvider.credential(idToken ?? null, accessToken ?? null);
          const userCred = await signInWithCredential(auth, credential);

          // Guarda/actualiza en Firestore
          await handleGoogleUser(userCred.user);
        } catch (err: any) {
          console.error('Google mobile sign-in error', err);
          Alert.alert('Error', err.message || 'Error al autenticar con Google');
        } finally {
          setGoogleLoading(false);
        }
      })();
    }
  }, [response]);

  // ------------------ 🔹 REGISTRO CON CORREO INSTITUCIONAL ------------------
  const handleEmailRegister = async () => {
    if (!isValidEmail(email)) {
      Alert.alert('Correo inválido', 'Por favor ingresa un correo válido.');
      return;
    }

    setLoading(true);
    try {
      // Primero intentar iniciar sesión por si ya existe
      try {
        await signInWithEmailAndPassword(auth, email, 'temp_password');
        Alert.alert('¡Bienvenido de nuevo!', 'Serás redirigido a tu cuenta.');
        return;
      } catch (signInError: any) {
        if (signInError.code !== 'auth/user-not-found') {
          throw signInError;
        }
      }

      // Crear nuevo usuario con password temporal
      const tempPassword = Math.random().toString(36).slice(-8) + 'A1!';
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        tempPassword
      );
      const user = userCredential.user;

      // Guardar datos en Firestore
      await setDoc(doc(db, 'users', user.uid), {
        email: user.email,
        provider: 'email',
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
      });

      // Generar código de verificación
      const code = Math.floor(1000 + Math.random() * 9000).toString();
      await addDoc(collection(db, 'email_verifications'), {
        email,
        code,
        createdAt: serverTimestamp(),
        used: false,
      });

      Alert.alert('Registro exitoso', 'Tu cuenta fue creada correctamente.');
      router.push(`/register-details?email=${encodeURIComponent(email)}`);
      
    } catch (err: any) {
      console.error('Error completo:', err);
      if (err.code === 'auth/email-already-in-use') {
        Alert.alert('Ya registrado', 'Este correo ya está registrado. Intenta iniciar sesión.');
      } else if (err.code === 'auth/weak-password') {
        Alert.alert('Error', 'La contraseña es demasiado débil.');
      } else if (err.code === 'auth/invalid-email') {
        Alert.alert('Correo inválido', 'El formato del correo no es válido.');
      } else {
        Alert.alert('Error', err.message || 'No se pudo crear el usuario.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ------------------ UI ------------------
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
        <View style={styles.googleButtonContainer}>
          <View ref={googleDivRef} style={styles.googleButtonWeb as any} />
          {googleLoading && <ActivityIndicator style={styles.googleLoader} />}
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.googleButton, googleLoading && styles.buttonDisabled]}
          // Para Expo Go usa el proxy: useProxy: true
          onPress={() => promptAsync({ useProxy: true })}
          disabled={googleLoading || !request}
        >
          {googleLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.googleButtonText}>Ingresar con Google</Text>
          )}
        </TouchableOpacity>
      )}

      <Text style={styles.orText}>o ingresa con correo electrónico</Text>

      <TextInput
        style={styles.input}
        placeholder="Correo electrónico"
        placeholderTextColor="#888"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
      />

      <TouchableOpacity
        style={[styles.emailButton, loading && styles.buttonDisabled]}
        onPress={handleEmailRegister}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.emailButtonText}>Continuar</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

export default RegisterStudents;

// ------------------ Estilos ------------------
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
  googleButtonContainer: {
    position: 'relative',
    marginBottom: 18,
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  googleLoader: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -10,
    marginTop: -10,
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
  buttonDisabled: {
    opacity: 0.6,
  },
});