import * as Google from 'expo-auth-session/providers/google';
import { makeRedirectUri } from 'expo-auth-session';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithCredential,
} from 'firebase/auth';
import {
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
  useColorScheme,
} from 'react-native';
import { auth, db } from '../src/firebase/firebase';
import { Colors } from '../constants/Colors';

WebBrowser.maybeCompleteAuthSession();

declare global {
  interface Window {
    google: any;
  }
}

const RegisterEmployer = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const googleDivRef = useRef<any>(null);
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  // Redirect URI (usa proxy en Expo Go)
  const redirectUri = makeRedirectUri({ useProxy: true });

  // Configuración de Google Auth
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

  // Guarda/actualiza usuario empleador en Firestore
  const handleGoogleUser = async (user: any) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));

      if (!userDoc.exists()) {
        await setDoc(
          doc(db, 'users', user.uid),
          {
            email: user.email,
            displayName: user.displayName || '',
            userType: 'employer',
            provider: 'google',
            registrationStep: 1,
            registrationComplete: false,
            createdAt: serverTimestamp(),
            lastLogin: serverTimestamp(),
          },
          { merge: true }
        );
        console.log('Nuevo empleador de Google guardado en Firestore');
      } else {
        await setDoc(
          doc(db, 'users', user.uid),
          {
            lastLogin: serverTimestamp(),
          },
          { merge: true }
        );
      }

      // Redirigir a formulario de detalles
      router.push('/register-employer-details');
    } catch (err: any) {
      console.error('Error guardando empleador de Google:', err);
      Alert.alert('Error', 'Error al guardar información del empleador');
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

          const credential = GoogleAuthProvider.credential(idToken ?? null, accessToken ?? null);
          const userCred = await signInWithCredential(auth, credential);
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

  // ------------------ 🔹 REGISTRO CON CORREO ------------------
  const handleEmailRegister = async () => {
    if (!isValidEmail(email)) {
      Alert.alert('Correo inválido', 'Por favor ingresa un correo válido.');
      return;
    }

    setLoading(true);
    try {
      // Crear usuario directamente - Firebase manejará si el email ya existe
      // El usuario podrá cambiar la contraseña en el siguiente paso
      const tempPassword = Math.random().toString(36).slice(-8) + 'A1!';
      console.log('Creando usuario con email:', email);
      
      const userCredential = await createUserWithEmailAndPassword(auth, email, tempPassword);
      const user = userCredential.user;
      console.log('Usuario creado:', user.uid);

      // Guardar datos iniciales en Firestore
      await setDoc(doc(db, 'users', user.uid), {
        email: user.email,
        userType: 'employer',
        provider: 'email',
        registrationStep: 1,
        registrationComplete: false,
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
      });
      console.log('Usuario guardado en Firestore');

      // Redirigir a formulario de detalles
      console.log('Redirigiendo a register-employer-details');
      router.push(`/register-employer-details?email=${encodeURIComponent(email)}`);
      
    } catch (err: any) {
      console.error('Error en registro:', err);
      if (err.code === 'auth/email-already-in-use') {
        Alert.alert('Cuenta existente', 'Este correo ya está registrado. Intenta iniciar sesión con tu contraseña o usa "Ingresar con Google".');
      } else if (err.code === 'auth/invalid-email') {
        Alert.alert('Correo inválido', 'El formato del correo no es válido.');
      } else if (err.code === 'auth/api-key-expired' || err.message?.includes('api-key-expired')) {
        Alert.alert(
          'API Key Expirada',
          'La API key de Firebase ha expirado. Por favor:\n\n1. Ve a Firebase Console (console.firebase.google.com)\n2. Selecciona tu proyecto\n3. Configuración del proyecto > General\n4. Copia la nueva API key\n5. Actualiza src/firebase/firebase.js',
          [{ text: 'Entendido' }]
        );
      } else if (err.code === 'auth/weak-password') {
        Alert.alert('Error', 'La contraseña es demasiado débil.');
      } else {
        Alert.alert('Error', err.message || 'No se pudo crear la cuenta. Por favor intenta nuevamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ------------------ UI ------------------
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Image
        source={require('../assets/images/logo-texto.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={[styles.subtitle, { color: theme.text }]}>
        Registro para empleadores. Encuentra el talento que necesitas.
      </Text>

      {Platform.OS === 'web' ? (
        <View style={styles.googleButtonContainer}>
          <View ref={googleDivRef} style={styles.googleButtonWeb as any} />
          {googleLoading && <ActivityIndicator style={styles.googleLoader} />}
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.googleButton, { backgroundColor: theme.buttonBackground }, googleLoading && styles.buttonDisabled]}
          onPress={() => promptAsync({ useProxy: true })}
          disabled={googleLoading || !request}
        >
          {googleLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={[styles.googleButtonText, { color: theme.buttonText }]}>
              Ingresar con Google
            </Text>
          )}
        </TouchableOpacity>
      )}

      <Text style={[styles.orText, { color: theme.text }]}>o ingresa con correo electrónico</Text>

      <TextInput
        style={[styles.input, { borderColor: theme.text, color: theme.text }]}
        placeholder="Correo electrónico"
        placeholderTextColor="#888"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
      />

      <TouchableOpacity
        style={[styles.emailButton, { backgroundColor: theme.buttonBackground }, loading && styles.buttonDisabled]}
        onPress={handleEmailRegister}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={[styles.emailButtonText, { color: theme.buttonText }]}>
            Continuar
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

export default RegisterEmployer;

// ------------------ Estilos ------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    fontSize: 16,
    fontWeight: 'bold',
  },
  orText: {
    fontSize: 14,
    marginBottom: 18,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    maxWidth: 320,
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 14,
    backgroundColor: 'transparent',
  },
  emailButton: {
    width: '100%',
    maxWidth: 320,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  emailButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
