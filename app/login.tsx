import { useRouter } from 'expo-router';
import React, { useState, useEffect, useRef } from 'react';
import { Image, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions, useColorScheme, ActivityIndicator, Alert } from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../src/firebase/firebase';
import { Colors } from '../constants/Colors';
import { useAuth } from '../src/contexts/AuthContext';

WebBrowser.maybeCompleteAuthSession();

declare global {
  interface Window {
    google: any;
  }
}

const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const googleDivRef = useRef<any>(null);
  const { width } = useWindowDimensions();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const { user } = useAuth();

  // Responsive sizes
  const isWide = width > 700;
  const isWeb = Platform.OS === 'web';
  const formWidth = isWide ? 420 : '90%';
  const imageSize = isWide ? 380 : 160;

  // Redirect URI para Google Auth
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

  // Redirigir si ya está autenticado
  useEffect(() => {
    if (user) {
      checkUserTypeAndRedirect(user.uid);
    }
  }, [user]);

  // Verificar tipo de usuario y redirigir
  const checkUserTypeAndRedirect = async (userId: string) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const userType = userData.userType;
        const perfilCompletado = userData.registrationComplete || userData.perfilCompletado;

        if (userType === 'employer') {
          if (perfilCompletado) {
            router.replace('/employer-dashboard');
          } else {
            router.replace('/employer-profile');
          }
        } else if (userType === 'student') {
          if (perfilCompletado) {
            router.replace('/(tabs)');
          } else {
            router.replace('/student-profile');
          }
        } else {
          // Usuario sin tipo definido, redirigir a selección
          router.replace('/register');
        }
      } else {
        // Usuario nuevo, redirigir a selección
        router.replace('/register');
      }
    } catch (error) {
      console.error('Error verificando tipo de usuario:', error);
    }
  };

  // Manejar login con Google
  const handleGoogleUser = async (firebaseUser: any) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      
      if (!userDoc.exists()) {
        await setDoc(
          doc(db, 'users', firebaseUser.uid),
          {
            email: firebaseUser.email,
            displayName: firebaseUser.displayName || '',
            provider: 'google',
            lastLogin: serverTimestamp(),
          },
          { merge: true }
        );
      } else {
        await setDoc(
          doc(db, 'users', firebaseUser.uid),
          {
            lastLogin: serverTimestamp(),
          },
          { merge: true }
        );
      }

      await checkUserTypeAndRedirect(firebaseUser.uid);
    } catch (err: any) {
      console.error('Error guardando usuario de Google:', err);
      Alert.alert('Error', 'Error al guardar información del usuario');
    }
  };

  // Google Auth en Web
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

  // Google Auth en móvil
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

  // Login con email/password
  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Actualizar lastLogin
      await setDoc(
        doc(db, 'users', user.uid),
        { lastLogin: serverTimestamp() },
        { merge: true }
      );

      await checkUserTypeAndRedirect(user.uid);
    } catch (error: any) {
      console.error('Error en login:', error);
      if (error.code === 'auth/user-not-found') {
        Alert.alert('Error', 'Usuario no encontrado');
      } else if (error.code === 'auth/wrong-password') {
        Alert.alert('Error', 'Contraseña incorrecta');
      } else if (error.code === 'auth/invalid-email') {
        Alert.alert('Error', 'Correo inválido');
      } else {
        Alert.alert('Error', error.message || 'Error al iniciar sesión');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.mainContainer, { backgroundColor: theme.background, flexDirection: isWide ? 'row' : 'column' }]}>
      {/* Left side: Image solo en web */}
      {isWeb && (
        <View style={[styles.imageContainer, { alignItems: 'center', justifyContent: 'center', paddingVertical: isWide ? 0 : 24 }]}>
          <Image
            source={require('../assets/images/login-image.png')}
            style={[styles.image, { width: imageSize, height: imageSize }]}
            resizeMode="cover"
          />
        </View>
      )}

      {/* Right side: Login */}
      <View style={[styles.loginContainer, { backgroundColor: theme.background }]}>
        {/* Logo arriba */}
        <View style={styles.logoContainer}>
          <Image
            source={require('../assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* Login form */}
        <View style={[styles.formContainer, { width: formWidth, maxWidth: isWide ? 420 : 340, backgroundColor: theme.background }]}>
          <Text style={[styles.title, { color: theme.text }]}>iUNI - Bolsa de Empleo</Text>

          {/* Google Auth Button */}
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

          <Text style={[styles.orText, { color: theme.text }]}>o</Text>

          <TextInput
            style={[styles.input, { borderColor: theme.text, color: theme.text }]}
            placeholder="Correo electrónico"
            placeholderTextColor="#888"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <TextInput
            style={[styles.input, { borderColor: theme.text, color: theme.text }]}
            placeholder="Contraseña"
            placeholderTextColor="#888"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity 
            style={[styles.button, { backgroundColor: theme.buttonBackground }, loading && styles.buttonDisabled]} 
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={[styles.buttonText, { color: theme.buttonText }]}>Iniciar Sesión</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/register')}>
            <Text style={[styles.link, { color: theme.text }]}>¿No tienes cuenta? Regístrate aquí</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
  },
  imageContainer: {
    flex: 1,
    minHeight: 180,
  },
  image: {
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  loginContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  logoContainer: {
    marginBottom: 24,
    alignItems: 'center',
    width: '100%',
  },
  logo: {
    width: 300,
    height: 300,
  },
  formContainer: {
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 6,
    maxWidth: 340,
    minWidth: 220,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  googleButtonContainer: {
    position: 'relative',
    marginBottom: 12,
    width: '100%',
    alignItems: 'center',
  },
  googleButton: {
    height: 44,
    width: '100%',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
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
    marginBottom: 12,
    textAlign: 'center',
  },
  input: {
    height: 44,
    width: '100%',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
    backgroundColor: 'transparent',
  },
  button: {
    height: 44,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginBottom: 10,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  link: {
    textAlign: 'center',
    fontSize: 14,
    marginTop: 8,
    textDecorationLine: 'underline',
  },
});

export default LoginScreen;