import * as Google from 'expo-auth-session/providers/google';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
WebBrowser.maybeCompleteAuthSession();

import {
  fetchSignInMethodsForEmail,
  GoogleAuthProvider,
  signInWithCredential
} from 'firebase/auth';
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc
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

const RegisterStudents = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [originError, setOriginError] = useState(false);
  const googleDivRef = useRef<any>(null);
  const router = useRouter();

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: '433398025212-puf36khpbp6utjvimmdnpchg1q1t98g6.apps.googleusercontent.com',
    androidClientId: '433398025212-l0a6mffd13nl8aft395ma6c4untalmn6.apps.googleusercontent.com',
    iosClientId: '433398025212-puf36khpbp6utjvimmdnpchg1q1t98g6.apps.googleusercontent.com',
    scopes: ['openid', 'profile', 'email'],
    redirectUri: 'https://auth.expo.io/@ivan_lopez2025/iuni-expo'
  });

  // 🔹 FUNCIÓN PARA USUARIOS DE GOOGLE
  const handleGoogleUser = async (user: any) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));

      if (!userDoc.exists()) {
        // NUEVO USUARIO: Guardar datos básicos de Google
        await setDoc(
          doc(db, 'users', user.uid),
          {
            email: user.email,
            displayName: user.displayName || '',
            photoURL: user.photoURL || '',
            provider: 'google',
            userType: 'student',
            registrationStep: 1, // Irá a register-details después
            registrationComplete: false,
            createdAt: serverTimestamp(),
            lastLogin: serverTimestamp(),
          },
          { merge: true }
        );

        console.log('🔹 NUEVO USUARIO GOOGLE - Redirigiendo a register-details...');
        router.replace(`/register-details?email=${encodeURIComponent(user.email || '')}&provider=google`);
        
      } else {
        // USUARIO EXISTENTE: Verificar estado del registro
        await setDoc(
          doc(db, 'users', user.uid),
          { lastLogin: serverTimestamp() },
          { merge: true }
        );

        const userData = userDoc.data();
        
        // Verificar si tiene perfil completo
        const studentDoc = await getDoc(doc(db, 'students', user.uid));
        if (studentDoc.exists() && studentDoc.data().perfilCompletado) {
          router.replace('/home');
        } else if (userData.registrationStep === 1) {
          router.replace(`/register-details?email=${encodeURIComponent(user.email || '')}&provider=google`);
        } else {
          router.replace(`/student-profile?email=${encodeURIComponent(user.email || '')}`);
        }
      }

    } catch (err: any) {
      console.error('❌ Error guardando usuario de Google:', err);
      Alert.alert('Error', 'Error al guardar información del usuario');
    }
  };

  // ------------------ 🔹 LOGIN CON GOOGLE EN WEB ------------------
  useEffect(() => {
    if (Platform.OS === 'web' && googleDivRef.current) {
      const initializeGoogleAuth = () => {
        if (window.google && googleDivRef.current) {
          try {
            window.google.accounts.id.initialize({
              client_id: '433398025212-puf36khpbp6utjvimmdnpchg1q1t98g6.apps.googleusercontent.com',
              callback: async (response: any) => {
                setGoogleLoading(true);
                try {
                  const idToken = response?.credential;
                  if (!idToken) throw new Error('No idToken from Google web callback');
                  
                  const credential = GoogleAuthProvider.credential(idToken);
                  const userCred = await signInWithCredential(auth, credential);
                  
                  await handleGoogleUser(userCred.user);
                  
                } catch (err: any) {
                  console.error('❌ Google web sign-in error', err);
                  Alert.alert('Error', err.message || 'Error al autenticar con Google');
                } finally {
                  setGoogleLoading(false);
                }
              },
              ux_mode: 'popup',
            });

            window.google.accounts.id.renderButton(googleDivRef.current, {
              theme: 'filled_red',
              size: 'large',
              text: 'continue_with',
              shape: 'pill',
              width: 320,
            });

            setOriginError(false);
          } catch (error) {
            console.error('❌ Error initializing Google Auth:', error);
            setOriginError(true);
          }
        }
      };

      if (!document.getElementById('google-client-script')) {
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.id = 'google-client-script';
        script.onload = initializeGoogleAuth;
        script.onerror = () => {
          console.error('❌ Failed to load Google script');
          setOriginError(true);
        };
        document.body.appendChild(script);
      } else {
        initializeGoogleAuth();
      }
    }
  }, []);

  // ------------------ 🔹 LOGIN CON GOOGLE EN MÓVIL ------------------
  useEffect(() => {
    if (response?.type === 'success') {
      console.log('🔍 Google Auth Success - Processing...');
      
      (async () => {
        setGoogleLoading(true);
        try {
          const { id_token } = response.params;
          
          if (!id_token) {
            throw new Error('No se recibió id_token de Google');
          }

          console.log('🔍 Google ID Token received');
          const credential = GoogleAuthProvider.credential(id_token);
          const userCred = await signInWithCredential(auth, credential);
          
          console.log('🔍 Firebase auth successful, user:', userCred.user.email);
          await handleGoogleUser(userCred.user);
          
        } catch (err: any) {
          console.error('❌ Google sign-in error', err);
          Alert.alert('Error', err.message || 'Error al autenticar con Google');
        } finally {
          setGoogleLoading(false);
        }
      })();
    } else if (response?.type === 'error') {
      console.error('❌ Google Auth Error:', response.error);
      Alert.alert('Error', 'No se pudo completar la autenticación con Google');
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
      const methods = await fetchSignInMethodsForEmail(auth, email);

      if (methods && methods.length > 0) {
        if (methods.includes('password')) {
          Alert.alert('Cuenta existente', 'Este correo ya tiene una cuenta. Intenta iniciar sesión con tu contraseña.');
          return;
        }
        if (methods.includes('google.com')) {
          Alert.alert('Cuenta con Google', 'Este correo está registrado con Google. Usa "Ingresar con Google" para entrar.');
          return;
        }
        Alert.alert('Cuenta existente', `Este correo ya está registrado con: ${methods.join(', ')}`);
        return;
      }

      // Si el email está disponible, redirigir a register-details
      console.log('🔹 EMAIL DISPONIBLE - Redirigiendo a register-details...');
      router.push(`/register-details?email=${encodeURIComponent(email)}&provider=email`);
      
    } catch (err: any) {
      console.error('❌ Error verificando email:', err);
      Alert.alert('Error', 'No se pudo verificar el correo electrónico');
    } finally {
      setLoading(false);
    }
  };

  const isValidEmail = (email: string) => /\S+@\S+\.\S+/.test(email);

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

      {originError && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            Error de configuración: Verifica los orígenes autorizados en Google Cloud Console
          </Text>
        </View>
      )}

      {/* BOTÓN DE GOOGLE */}
      {Platform.OS === 'web' ? (
        <View style={styles.googleButtonContainer}>
          <View ref={googleDivRef} style={styles.googleButtonWeb as any} />
          {googleLoading && <ActivityIndicator style={styles.googleLoader} />}
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.googleButton, googleLoading && styles.buttonDisabled]}
          onPress={() => promptAsync()}
          disabled={googleLoading || !request}
        >
          {googleLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.googleButtonText}>Ingresar con Google</Text>
          )}
        </TouchableOpacity>
      )}

      <Text style={styles.orText}>o regístrate con correo electrónico</Text>

      {/* FORMULARIO DE EMAIL */}
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

      <TouchableOpacity onPress={() => router.push('/login')}>
        <Text style={styles.link}>¿Ya tienes cuenta? Inicia sesión</Text>
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
    width: 300,
    height: 100,
    marginBottom: 28,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
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
    color: '#666',
    marginBottom: 18,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    maxWidth: 320,
    height: 50,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
    backgroundColor: '#fff',
    color: '#000',
  },
  emailButton: {
    width: '100%',
    maxWidth: 320,
    height: 50,
    backgroundColor: '#d90429',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 16,
  },
  emailButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderColor: '#f44336',
    borderWidth: 1,
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  link: {
    color: '#d90429',
    textAlign: 'center',
    fontSize: 14,
  },
});