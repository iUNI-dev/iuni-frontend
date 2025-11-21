import * as Google from 'expo-auth-session/providers/google';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import {
  GoogleAuthProvider,
  fetchSignInMethodsForEmail,
  sendPasswordResetEmail,
  signInWithCredential,
  signInWithEmailAndPassword
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
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
  useWindowDimensions
} from 'react-native';
import { auth, db } from '../src/firebase/firebase';

WebBrowser.maybeCompleteAuthSession();

const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const { width } = useWindowDimensions();
  const router = useRouter();
  const googleDivRef = useRef<any>(null);

  // Configuración de Google Auth
  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: '433398025212-puf36khpbp6utjvimmdnpchg1q1t98g6.apps.googleusercontent.com',
    androidClientId: '433398025212-l0a6mffd13nl8aft395ma6c4untalmn6.apps.googleusercontent.com',
    iosClientId: '433398025212-puf36khpbp6utjvimmdnpchg1q1t98g6.apps.googleusercontent.com',
    scopes: ['openid', 'profile', 'email'],
    redirectUri: 'https://auth.expo.io/@ivan_lopez2025/iuni-expo'
  });

  // Responsive sizes
  const isWide = width > 700;
  const isWeb = Platform.OS === 'web';
  const formWidth = isWide ? 420 : '90%';
  const imageSize = isWide ? 380 : 160;

  // 🔹 Manejar respuesta de Google
  useEffect(() => {
    if (response?.type === 'success') {
      handleGoogleSignIn(response);
    }
  }, [response]);

  // 🔹 Inicio de sesión con Google
  const handleGoogleSignIn = async (response: any) => {
    setGoogleLoading(true);
    setErrorMessage('');
    try {
      const { id_token } = response.params;
      
      if (!id_token) {
        throw new Error('No se recibió token de Google');
      }

      const credential = GoogleAuthProvider.credential(id_token);
      const userCred = await signInWithCredential(auth, credential);
      const user = userCred.user;

      console.log('✅ Login con Google exitoso:', user.email);

      // Actualizar último login en Firestore
      await updateDoc(doc(db, 'users', user.uid), {
        lastLogin: serverTimestamp(),
      });

      // 🔹 REDIRECCIÓN
      redirectUserAfterLogin(user.uid, user.email);

    } catch (err: any) {
      console.error('❌ Error en login con Google:', err);
      setErrorMessage('No se pudo iniciar sesión con Google');
    } finally {
      setGoogleLoading(false);
    }
  };

  // 🔹 Función para redirigir después del login
  const redirectUserAfterLogin = async (userId: string, userEmail: string | null) => {
    try {
      // Primero verificar en users
      const userDoc = await getDoc(doc(db, 'users', userId));
      
      if (!userDoc.exists()) {
        console.log('🔹 Usuario no encontrado en Firestore');
        router.replace('/register-student');
        return;
      }

      const userData = userDoc.data();
      
      // Verificar si tiene perfil de estudiante
      const studentDoc = await getDoc(doc(db, 'students', userId));
      
      if (studentDoc.exists()) {
        const studentData = studentDoc.data();
        if (studentData.perfilCompletado) {
          console.log('🔹 Perfil completo, redirigiendo a home...');
          router.replace('/home');
        } else {
          console.log('🔹 Perfil incompleto, redirigiendo a student-profile...');
          router.replace(`/student-profile?email=${encodeURIComponent(userEmail || '')}`);
        }
      } else {
        // No tiene perfil de estudiante, verificar registrationStep
        if (userData.registrationStep === 1) {
          console.log('🔹 Paso 1 completado, redirigiendo a register-details...');
          router.replace(`/register-details?email=${encodeURIComponent(userEmail || '')}&provider=${userData.provider || 'email'}`);
        } else {
          console.log('🔹 Registro incompleto, redirigiendo a register-student...');
          router.replace('/register-student');
        }
      }
    } catch (error) {
      console.error('Error verificando perfil:', error);
      // Si hay error, redirigir a home por defecto
      router.replace('/home');
    }
  };

  // 🔹 Inicio de sesión con email/password - CORREGIDA
  // 🔹 Inicio de sesión con email/password - VERSIÓN CORREGIDA
const handleEmailLogin = async () => {
  if (!email.trim() || !password.trim()) {
    setErrorMessage('Por favor ingresa email y contraseña');
    return;
  }

  setLoading(true);
  setErrorMessage('');
  
  try {
    console.log('🔹 Intentando login con:', email);
    
    // PRIMERO verificar si el usuario existe y su método de registro
    let methods: string[] = [];
    try {
      methods = await fetchSignInMethodsForEmail(auth, email);
      console.log('🔹 Métodos de inicio de sesión:', methods);
    } catch (methodsError: any) {
      console.log('🔹 Error en fetchSignInMethodsForEmail:', methodsError);
      // Continuar con el login aunque falle la verificación de métodos
    }
    
    // Si methods está vacío pero sabemos que el usuario existe, intentar login directamente
    if (methods.length === 0) {
      console.log('🔹 Métodos vacíos, pero intentando login directo...');
      // No mostrar error, intentar login directamente
    } else if (methods.includes('google.com')) {
      setErrorMessage('Este email está registrado con Google. Usa "Ingresar con Google"');
      return;
    } else if (!methods.includes('password')) {
      setErrorMessage('Este email no tiene contraseña configurada. Usa "Ingresar con Google" o regístrate de nuevo.');
      return;
    }

    // Intentar inicio de sesión directamente
    console.log('🔹 Iniciando sesión con email/contraseña...');
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    console.log('✅ Login exitoso:', user.email, 'UID:', user.uid);

    // Actualizar último login
    await updateDoc(doc(db, 'users', user.uid), {
      lastLogin: serverTimestamp(),
    });

    // Redirigir
    redirectUserAfterLogin(user.uid, user.email);

  } catch (err: any) {
    console.error('❌ Error completo en login:', err);
    console.error('❌ Código de error:', err.code);
    
    // MANEJO DETALLADO DE ERRORES
    switch (err.code) {
      case 'auth/user-not-found':
        setErrorMessage('No existe una cuenta con este email. Regístrate primero.');
        break;
      case 'auth/wrong-password':
        setErrorMessage('Contraseña incorrecta.');
        break;
      case 'auth/invalid-email':
        setErrorMessage('El formato del email es inválido');
        break;
      case 'auth/invalid-credential':
        // 🔹 ERROR MEJORADO PARA invalid-credential
        if (email === 'mario@gmail.com') {
          setErrorMessage('Credenciales inválidas para mario@gmail.com. Verifica la contraseña o intenta restablecerla.');
        } else {
          setErrorMessage('Credenciales inválidas. Verifica tu email y contraseña.');
        }
        break;
      case 'auth/too-many-requests':
        setErrorMessage('Demasiados intentos fallidos. Intenta más tarde o restablece tu contraseña.');
        break;
      case 'auth/user-disabled':
        setErrorMessage('Esta cuenta ha sido deshabilitada.');
        break;
      default:
        setErrorMessage(`Error al iniciar sesión: ${err.message}`);
    }
  } finally {
    setLoading(false);
  }
};

  // 🔹 Función para resetear contraseña
  const handleResetPassword = async () => {
    if (!email.trim()) {
      setErrorMessage('Ingresa tu email para restablecer contraseña');
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      Alert.alert(
        'Email enviado',
        `Se envió un enlace para restablecer contraseña a ${email}`
      );
    } catch (error: any) {
      setErrorMessage(`Error al enviar email: ${error.message}`);
    }
  };

  // 🔹 Google Button para Web
  useEffect(() => {
    if (Platform.OS === 'web' && googleDivRef.current) {
      const initializeGoogleAuth = () => {
        if (window.google && googleDivRef.current) {
          window.google.accounts.id.initialize({
            client_id: '433398025212-puf36khpbp6utjvimmdnpchg1q1t98g6.apps.googleusercontent.com',
            callback: async (response: any) => {
              setGoogleLoading(true);
              setErrorMessage('');
              try {
                const idToken = response?.credential;
                if (!idToken) throw new Error('No idToken from Google');
                
                const credential = GoogleAuthProvider.credential(idToken);
                const userCred = await signInWithCredential(auth, credential);
                
                // Actualizar último login
                await updateDoc(doc(db, 'users', userCred.user.uid), {
                  lastLogin: serverTimestamp(),
                });

                // 🔹 REDIRECCIÓN
                redirectUserAfterLogin(userCred.user.uid, userCred.user.email);

              } catch (err: any) {
                console.error('Google web sign-in error', err);
                setErrorMessage('Error al autenticar con Google');
              } finally {
                setGoogleLoading(false);
              }
            },
            ux_mode: 'popup',
          });

          window.google.accounts.id.renderButton(googleDivRef.current, {
            theme: 'filled_blue',
            size: 'large',
            text: 'signin_with',
            shape: 'pill',
            width: 320,
          });
        }
      };

      if (!document.getElementById('google-login-script')) {
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.id = 'google-login-script';
        script.onload = initializeGoogleAuth;
        document.body.appendChild(script);
      } else {
        initializeGoogleAuth();
      }
    }
  }, []);

  return (
    <View style={[styles.mainContainer, { flexDirection: isWide ? 'row' : 'column' }]}>
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
      <View style={styles.loginContainer}>
        {/* Logo arriba */}
        <View style={styles.logoContainer}>
          <Image
            source={require('../assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* Login form */}
        <View style={[styles.formContainer, { width: formWidth, maxWidth: isWide ? 420 : 340 }]}>
          <Text style={styles.title}>iUNI - Bolsa de Empleo</Text>

          {/* Mensaje de error */}
          {errorMessage ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {/* Botón de Google */}
          {Platform.OS === 'web' ? (
            <View style={styles.googleButtonContainer}>
              <View ref={googleDivRef} style={styles.googleButtonWeb} />
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

          <Text style={styles.orText}>o ingresa con tu email</Text>

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

          <TextInput
            style={styles.input}
            placeholder="Contraseña"
            placeholderTextColor="#888"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
          />

          <TouchableOpacity 
            style={[styles.button, loading && styles.buttonDisabled]} 
            onPress={handleEmailLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Iniciar Sesión</Text>
            )}
          </TouchableOpacity>

          {/* Enlace para resetear contraseña */}
          <TouchableOpacity onPress={handleResetPassword}>
            <Text style={styles.link}>¿Olvidaste tu contraseña?</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/register-student')}>
            <Text style={styles.link}>¿No tienes cuenta? Regístrate aquí</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  imageContainer: {
    flex: 1,
    backgroundColor: '#fff',
    minHeight: 180,
  },
  image: {
    borderRadius: 24,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  loginContainer: {
    flex: 1,
    backgroundColor: '#fff',
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
    backgroundColor: '#fff',
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
    color: '#d90429',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    height: 50,
    width: '100%',
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
    backgroundColor: '#fff',
    color: '#000',
  },
  button: {
    height: 50,
    width: '100%',
    backgroundColor: '#d90429',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginBottom: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  link: {
    color: '#d90429',
    textAlign: 'center',
    fontSize: 14,
    marginTop: 8,
  },
  googleButton: {
    width: '100%',
    height: 50,
    backgroundColor: '#4285F4',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  googleButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  googleButtonContainer: {
    width: '100%',
    marginBottom: 16,
    position: 'relative',
    alignItems: 'center',
  },
  googleButtonWeb: {
    width: 320,
    height: 50,
  },
  googleLoader: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -10,
    marginTop: -10,
  },
  orText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
    width: '100%',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderColor: '#f44336',
    borderWidth: 1,
    width: '100%',
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 14,
    textAlign: 'center',
  },
});

export default LoginScreen;