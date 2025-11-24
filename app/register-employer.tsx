import { makeRedirectUri } from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithCredential,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where
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
  useColorScheme,
  View,
} from 'react-native';
import { Colors } from '../constants/Colors';
import { auth, db } from '../src/firebase/firebase';

WebBrowser.maybeCompleteAuthSession();

declare global {
  interface Window {
    google: any;
  }
}

const RegisterEmployer = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const googleDivRef = useRef<any>(null);
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  // Redirect URI (usa proxy en Expo Go)
  const redirectUri = makeRedirectUri({ useProxy: true });

  // Configuración de Google Auth
  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: '433398025212-puf36khpbp6utjvimmdnpchg1q1t98g6.apps.googleusercontent.com',
    androidClientId: '433398025212-l0a6mffd13nl8aft395ma6c4untalmn6.apps.googleusercontent.com',
    iosClientId: '496117929623-7eoumvlftom3mcg3q945rmd6arbue1k2.apps.googleusercontent.com',
    redirectUri,
    scopes: ['profile', 'email'],
    responseType: 'id_token',
  });

  // Validar formato de correo
  const isValidEmail = (email: string) => /\S+@\S+\.\S+/.test(email);

  // Validar fortaleza de contraseña
  const isStrongPassword = (password: string) => {
    return password.length >= 6;
  };

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

  // ------------------ 🔹 REGISTRO CON CORREO Y CONTRASEÑA ------------------
  const handleEmailRegister = async () => {
    // Validaciones
    if (!isValidEmail(email)) {
      Alert.alert('Correo inválido', 'Por favor ingresa un correo válido.');
      return;
    }

    if (!password) {
      Alert.alert('Contraseña requerida', 'Por favor ingresa una contraseña.');
      return;
    }

    if (!isStrongPassword(password)) {
      Alert.alert('Contraseña débil', 'La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Contraseñas no coinciden', 'Las contraseñas deben ser iguales.');
      return;
    }

    setLoading(true);
    try {
      console.log('🔹 Creando usuario con email:', email);
      
      // Verificar si el email ya existe en Firestore
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', email.toLowerCase().trim()));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const existingUser = querySnapshot.docs[0].data();
        Alert.alert(
          'Cuenta existente', 
          `Este correo ya está registrado como ${existingUser.userType}. 
          \nIntenta iniciar sesión con tu contraseña o usa "Ingresar con Google".`
        );
        setLoading(false);
        return;
      }

      // Crear usuario con la contraseña que el usuario ingresó
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      console.log('✅ Usuario creado en Auth:', user.uid);

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
      
      console.log('✅ Usuario guardado en Firestore');

      // Redirigir a formulario de detalles
      console.log('🔹 Redirigiendo a register-employer-details');
      router.push(`/register-employer-details?email=${encodeURIComponent(email)}`);
      
    } catch (err: any) {
      console.error('❌ Error en registro:', err);
      
      // Manejo específico de errores de Firebase Auth
      if (err.code === 'auth/email-already-in-use') {
        Alert.alert(
          'Correo ya registrado', 
          'Este correo ya tiene una cuenta. Intenta iniciar sesión o restablecer tu contraseña.'
        );
      } else if (err.code === 'auth/invalid-email') {
        Alert.alert('Correo inválido', 'El formato del correo no es válido.');
      } else if (err.code === 'auth/weak-password') {
        Alert.alert('Contraseña débil', 'La contraseña debe tener al menos 6 caracteres.');
      } else if (err.code === 'auth/operation-not-allowed') {
        Alert.alert('Registro deshabilitado', 'El registro con email/contraseña no está habilitado.');
      } else if (err.code === 'auth/network-request-failed') {
        Alert.alert('Error de conexión', 'Verifica tu conexión a internet e intenta nuevamente.');
      } else {
        Alert.alert(
          'Error de registro', 
          err.message || 'No se pudo crear la cuenta. Por favor intenta nuevamente.'
        );
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
      
      <Text style={[styles.title, { color: theme.text }]}>
        Registro para Empleadores
      </Text>
      
      <Text style={[styles.subtitle, { color: theme.text }]}>
        Encuentra el talento que necesitas para tu empresa
      </Text>

      {/* Botón de Google */}
      {Platform.OS === 'web' ? (
        <View style={styles.googleButtonContainer}>
          <View ref={googleDivRef} style={styles.googleButtonWeb as any} />
          {googleLoading && <ActivityIndicator style={styles.googleLoader} />}
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.googleButton, { backgroundColor: '#DB4437' }, googleLoading && styles.buttonDisabled]}
          onPress={() => promptAsync({ useProxy: true })}
          disabled={googleLoading || !request}
        >
          {googleLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Image 
                source={require('../assets/images/google-icon.png')} 
                style={styles.googleIcon}
              />
              <Text style={[styles.googleButtonText, { color: '#fff' }]}>
                Continuar con Google
              </Text>
            </>
          )}
        </TouchableOpacity>
      )}

      <View style={styles.separator}>
        <View style={[styles.separatorLine, { backgroundColor: theme.border }]} />
        <Text style={[styles.separatorText, { color: theme.text }]}>o</Text>
        <View style={[styles.separatorLine, { backgroundColor: theme.border }]} />
      </View>

      {/* Formulario de Email y Contraseña */}
      <Text style={[styles.sectionTitle, { color: theme.text }]}>
        Registrarse con correo electrónico
      </Text>

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

      <View style={styles.passwordContainer}>
        <TextInput
          style={[styles.input, styles.passwordInput, { borderColor: theme.text, color: theme.text }]}
          placeholder="Contraseña (mínimo 6 caracteres)"
          placeholderTextColor="#888"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          autoComplete="new-password"
        />
        <TouchableOpacity 
          style={styles.eyeButton}
          onPress={() => setShowPassword(!showPassword)}
        >
          <Text style={[styles.eyeButtonText, { color: theme.text }]}>
            {showPassword ? '🙈' : '👁️'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.passwordContainer}>
        <TextInput
          style={[styles.input, styles.passwordInput, { borderColor: theme.text, color: theme.text }]}
          placeholder="Confirmar contraseña"
          placeholderTextColor="#888"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry={!showConfirmPassword}
          autoComplete="new-password"
        />
        <TouchableOpacity 
          style={styles.eyeButton}
          onPress={() => setShowConfirmPassword(!showConfirmPassword)}
        >
          <Text style={[styles.eyeButtonText, { color: theme.text }]}>
            {showConfirmPassword ? '🙈' : '👁️'}
          </Text>
        </TouchableOpacity>
      </View>

      {password && confirmPassword && password !== confirmPassword && (
        <Text style={styles.errorText}>Las contraseñas no coinciden</Text>
      )}

      {password && !isStrongPassword(password) && (
        <Text style={styles.warningText}>La contraseña debe tener al menos 6 caracteres</Text>
      )}

      <TouchableOpacity
        style={[
          styles.registerButton, 
          { backgroundColor: theme.buttonBackground }, 
          (loading || !email || !password || !confirmPassword || password !== confirmPassword || !isStrongPassword(password)) && styles.buttonDisabled
        ]}
        onPress={handleEmailRegister}
        disabled={loading || !email || !password || !confirmPassword || password !== confirmPassword || !isStrongPassword(password)}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={[styles.registerButtonText, { color: theme.buttonText }]}>
            Crear Cuenta de Empleador
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.loginLink}
        onPress={() => router.push('/login')}
      >
        <Text style={[styles.loginText, { color: theme.text }]}>
          ¿Ya tienes cuenta? <Text style={styles.loginLinkText}>Inicia sesión aquí</Text>
        </Text>
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
    width: 300,
    height: 100,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    opacity: 0.8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
    width: '100%',
  },
  googleButtonContainer: {
    position: 'relative',
    marginBottom: 20,
    width: '100%',
    alignItems: 'center',
  },
  googleButton: {
    width: '100%',
    maxWidth: 320,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  googleButtonWeb: {
    width: 320,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  googleIcon: {
    width: 20,
    height: 20,
    marginRight: 12,
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
  separator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    width: '100%',
    maxWidth: 320,
  },
  separatorLine: {
    flex: 1,
    height: 1,
  },
  separatorText: {
    marginHorizontal: 16,
    fontSize: 14,
    opacity: 0.7,
  },
  input: {
    width: '100%',
    maxWidth: 320,
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
    backgroundColor: 'transparent',
    fontSize: 16,
  },
  passwordContainer: {
    width: '100%',
    maxWidth: 320,
    position: 'relative',
    marginBottom: 16,
  },
  passwordInput: {
    paddingRight: 50, // Espacio para el botón del ojo
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    top: 12,
    padding: 4,
  },
  eyeButtonText: {
    fontSize: 18,
  },
  registerButton: {
    width: '100%',
    maxWidth: 320,
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  registerButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  errorText: {
    color: '#ff3b30',
    fontSize: 14,
    marginTop: -8,
    marginBottom: 12,
    width: '100%',
    maxWidth: 320,
    textAlign: 'left',
  },
  warningText: {
    color: '#ff9500',
    fontSize: 14,
    marginTop: -8,
    marginBottom: 12,
    width: '100%',
    maxWidth: 320,
    textAlign: 'left',
  },
  loginLink: {
    marginTop: 8,
  },
  loginText: {
    fontSize: 14,
    textAlign: 'center',
  },
  loginLinkText: {
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
});