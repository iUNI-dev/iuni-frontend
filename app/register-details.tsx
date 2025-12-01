import * as DocumentPicker from 'expo-document-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Button,
  Image,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { auth, db, storage } from '../src/firebase/firebase';

type FormState = {
  nombres: string;
  apellidos: string;
  email: string;
  password: string;
  confirmPassword: string;
  puestoDeseado: string;
  departamento: string;
};

const RegisterDetails: React.FC = () => {
  const router = useRouter();
  const params = useLocalSearchParams() as { email?: string; provider?: string };
  const emailParam = params?.email ? String(params.email) : '';
  const provider = params?.provider ? String(params.provider) : 'email';

  const [form, setForm] = useState<FormState>({
    nombres: '',
    apellidos: '',
    email: emailParam || '',
    password: '',
    confirmPassword: '',
    puestoDeseado: '',
    departamento: '',
  });

  const [captchaOk, setCaptchaOk] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cvFile, setCvFile] = useState<{ uri: string; name: string } | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isGoogleUser, setIsGoogleUser] = useState(false);

  // 🔹 DETECTAR SI ES USUARIO DE GOOGLE
  useEffect(() => {
    if (provider === 'google') {
      setIsGoogleUser(true);
      console.log('Usuario de Google detectado, email:', emailParam);
      
      // Si es Google, cargar datos del usuario autenticado
      const currentUser = auth.currentUser;
      if (currentUser && currentUser.displayName) {
        const nameParts = currentUser.displayName.split(' ');
        setForm(prev => ({
          ...prev,
          nombres: nameParts[0] || '',
          apellidos: nameParts.slice(1).join(' ') || '',
          email: currentUser.email || emailParam,
        }));
      }
    }
  }, [provider, emailParam]);

  const handleChange = (key: keyof FormState, value: string) => {
    setForm((s) => ({ ...s, [key]: value }));
  };

  const pickCv = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (res.type === 'success') {
        setCvFile({ uri: res.uri, name: res.name || `cv-${Date.now()}` });
      }
    } catch (err) {
      console.error('DocumentPicker error', err);
      Alert.alert('Error', 'No se pudo seleccionar el archivo.');
    }
  };

  const uploadCvToStorage = async (docId: string) => {
    if (!cvFile) return null;
    const response = await fetch(cvFile.uri);
    const blob = await response.blob();
    const filename = `${docId}_cv_${Date.now()}_${cvFile.name}`;
    const storageRef = ref(storage, `cvs/${filename}`);
    return new Promise<string>((resolve, reject) => {
      const uploadTask = uploadBytesResumable(storageRef, blob);
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const prog = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(Math.round(prog));
        },
        (error) => {
          console.error('Upload error', error);
          reject(error);
        },
        async () => {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(url);
        }
      );
    });
  };

const handleSubmit = async () => {
  // 🔹 VALIDACIONES MEJORADAS
  if (!form.nombres.trim() || !form.apellidos.trim() || !form.email.trim()) {
    Alert.alert('Campos requeridos', 'Completa nombre, apellido y email.');
    return;
  }

  // 🔹 VALIDACIÓN DE EMAIL
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(form.email.trim())) {
    Alert.alert('Email inválido', 'Por favor ingresa un email válido (ejemplo: usuario@gmail.com)');
    return;
  }

  if (!isGoogleUser) {
    if (!form.password.trim()) {
      Alert.alert('Campo requerido', 'La contraseña es obligatoria.');
      return;
    }
    if (form.password.length < 6) {
      Alert.alert('Contraseña débil', 'La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      Alert.alert('Contraseñas no coinciden', 'Las contraseñas deben ser iguales.');
      return;
    }
  }

  if (!captchaOk) {
    Alert.alert('Validación', 'Por favor confirma que no eres un robot (captcha).');
    return;
  }

  setLoading(true);
  try {
    let userId: string;
    let userEmail: string;
    let userCreated = false;

    if (isGoogleUser) {
      // 🔹 USUARIO GOOGLE
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('No hay usuario autenticado con Google. Por favor inicia sesión con Google primero.');
      }
      userId = currentUser.uid;
      userEmail = currentUser.email || form.email;
      
      // Verificar que el usuario de Google existe
      console.log('✅ Usuario Google autenticado:', userId);
      
      // Actualizar displayName
      await updateProfile(currentUser, {
        displayName: `${form.nombres.trim()} ${form.apellidos.trim()}`
      });

    } else {
      // 🔹 USUARIO EMAIL - CREAR CUENTA NUEVA
      console.log('🔹 Creando usuario con email/contraseña...');
      
      // IMPORTANTE: Normalizar email
      const normalizedEmail = form.email.trim().toLowerCase();
      
      // Verificar si ya existe ANTES de crear
      try {
        const methods = await fetchSignInMethodsForEmail(auth, normalizedEmail);
        if (methods.length > 0) {
          if (methods.includes('password')) {
            Alert.alert('Cuenta existente', 'Este email ya está registrado. Intenta iniciar sesión.');
            return;
          } else if (methods.includes('google.com')) {
            Alert.alert('Cuenta Google', 'Este email ya está registrado con Google. Usa "Ingresar con Google".');
            return;
          }
        }
      } catch (methodsError) {
        console.log('⚠️ No se pudo verificar métodos, continuando...');
      }

      try {
        const userCredential = await createUserWithEmailAndPassword(
          auth, 
          normalizedEmail, 
          form.password
        );
        
        const user = userCredential.user;
        userId = user.uid;
        userEmail = user.email || normalizedEmail;
        userCreated = true;
        
        console.log('✅ Usuario creado en Firebase Auth:', userId);
        
        // Actualizar displayName
        await updateProfile(user, {
          displayName: `${form.nombres.trim()} ${form.apellidos.trim()}`
        });
        
      } catch (createError: any) {
        console.error('❌ Error creando usuario en Firebase Auth:', createError);
        
        // MANEJO DETALLADO DE ERRORES
        switch (createError.code) {
          case 'auth/email-already-in-use':
            Alert.alert('Email en uso', 'Este email ya está registrado. Intenta iniciar sesión.');
            return;
          case 'auth/weak-password':
            Alert.alert('Contraseña débil', 'La contraseña debe tener al menos 6 caracteres.');
            return;
          case 'auth/invalid-email':
            Alert.alert('Email inválido', 'El formato del email no es correcto.');
            return;
          case 'auth/operation-not-allowed':
            Alert.alert('Operación no permitida', 'El registro con email/contraseña no está habilitado en Firebase.');
            return;
          case 'auth/network-request-failed':
            Alert.alert('Error de red', 'No se pudo conectar con el servidor. Verifica tu conexión.');
            return;
          default:
            Alert.alert('Error de registro', createError.message || 'No se pudo crear la cuenta.');
            return;
        }
      }
    }

    // 🔹 VERIFICAR QUE TENEMOS UN USER ID VÁLIDO
    if (!userId) {
      throw new Error('No se pudo obtener un ID de usuario válido.');
    }

    console.log('🔹 Guardando datos en Firestore para:', userId);

    let cvUrl = null;
    if (cvFile) {
      try {
        cvUrl = await uploadCvToStorage(userId);
      } catch (uploadError) {
        console.error('Error subiendo CV:', uploadError);
        // Continuar sin CV
      }
    }

    // 🔹 PAYLOAD CON DATOS INICIALES
    const payload = {
      // Información personal básica
      nombres: form.nombres.trim(),
      apellidos: form.apellidos.trim(),
      email: userEmail.toLowerCase(),
      displayName: `${form.nombres.trim()} ${form.apellidos.trim()}`,
      
      // Información profesional
      puestoDeseado: form.puestoDeseado.trim() || null,
      departamento: form.departamento.trim() || null,
      cvUrl: cvUrl || null,
      
      // Metadatos
      provider: isGoogleUser ? 'google' : 'email',
      userType: 'student',
      registrationStep: 1,
      registrationComplete: false,
      perfilCompletado: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastLogin: serverTimestamp(),
    };

    // Guardar en users
    await setDoc(doc(db, 'users', userId), payload, { merge: true });
    
    // También guardar en students para consistencia
    await setDoc(doc(db, 'students', userId), {
      ...payload,
      userId: userId,
    }, { merge: true });

    console.log('✅ Datos guardados en Firestore para usuario:', userId);
    
    // 🔹 VERIFICACIÓN FINAL
    if (!isGoogleUser && userCreated) {
      // Para usuarios email, verificar que pueden hacer login inmediatamente
      try {
        // Cerrar sesión y volver a iniciar para verificar
        await auth.signOut();
        const testLogin = await signInWithEmailAndPassword(auth, userEmail, form.password);
        console.log('✅ Verificación de login exitosa:', testLogin.user.uid);
      } catch (testError) {
        console.warn('⚠️ Verificación de login falló:', testError);
        // No bloquear, solo log
      }
    }
    
    // 🔹 REDIRECCIÓN A STUDENT-PROFILE
    console.log('🔄 Redirigiendo a student-profile...');
    router.replace(`/student-profile?email=${encodeURIComponent(userEmail)}&userId=${userId}`);
    
  } catch (err: any) {
    console.error('❌ Error general en registro:', err);
    Alert.alert('Error', err.message || 'No se pudo completar el registro.');
  } finally {
    setLoading(false);
    setUploadProgress(null);
  }
};

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Image source={require('../assets/images/logo-texto.png')} style={styles.logo} resizeMode="contain" />
      
      {isGoogleUser && (
        <View style={styles.googleBadge}>
          <Text style={styles.googleBadgeText}>Registro con Google</Text>
        </View>
      )}
      
      <Text style={styles.title}>
        {isGoogleUser ? 'Paso 1: Información Básica' : 'Completa tu registro'}
      </Text>

      <TextInput 
        style={styles.input} 
        placeholder="Nombres *" 
        value={form.nombres} 
        onChangeText={(t) => handleChange('nombres', t)} 
        autoCapitalize="words"
      />
      
      <TextInput 
        style={styles.input} 
        placeholder="Apellidos *" 
        value={form.apellidos} 
        onChangeText={(t) => handleChange('apellidos', t)} 
        autoCapitalize="words"
      />
      
      <TextInput 
        style={styles.input} 
        placeholder="Email *" 
        value={form.email} 
        onChangeText={(t) => handleChange('email', t)} 
        keyboardType="email-address" 
        autoCapitalize="none"
        editable={!isGoogleUser}
      />
      
      {/* MOSTRAR CAMPOS DE CONTRASEÑA SOLO PARA EMAIL */}
      {!isGoogleUser && (
        <>
          <TextInput 
            style={styles.input} 
            placeholder="Contraseña * (mínimo 6 caracteres)" 
            value={form.password} 
            onChangeText={(t) => handleChange('password', t)} 
            secureTextEntry 
          />
          <TextInput 
            style={styles.input} 
            placeholder="Confirmar Contraseña *" 
            value={form.confirmPassword} 
            onChangeText={(t) => handleChange('confirmPassword', t)} 
            secureTextEntry 
          />
        </>
      )}

      <TextInput 
        style={styles.input} 
        placeholder="Puesto de trabajo deseado" 
        value={form.puestoDeseado} 
        onChangeText={(t) => handleChange('puestoDeseado', t)} 
      />
      
      <TextInput 
        style={styles.input} 
        placeholder="Departamento" 
        value={form.departamento} 
        onChangeText={(t) => handleChange('departamento', t)} 
      />

      <View style={styles.row}>
        <Text>No soy un robot *</Text>
        <Switch value={captchaOk} onValueChange={setCaptchaOk} />
      </View>

      <View style={{ width: '100%', maxWidth: 320, marginTop: 8 }}>
        <Button 
          title={cvFile ? `CV: ${cvFile.name}` : 'Subir Currículum (CV)'} 
          onPress={pickCv} 
        />
        {uploadProgress !== null && (
          <Text style={{ marginTop: 8, textAlign: 'center' }}>
            Progreso: {uploadProgress}%
          </Text>
        )}
      </View>

      <TouchableOpacity 
        style={[styles.saveButton, loading && styles.buttonDisabled]} 
        onPress={handleSubmit} 
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveButtonText}>
            {isGoogleUser ? 'Siguiente → Perfil de Estudiante' : 'Crear Cuenta y Continuar'}
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.back()}>
        <Text style={styles.link}>Atrás</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

export default RegisterDetails;

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 30,
  },
  logo: {
    width: 300,
    height: 100,
    marginBottom: 12,
  },
  googleBadge: {
    backgroundColor: '#4285F4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 8,
  },
  googleBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#d90429',
    marginBottom: 12,
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
    marginBottom: 12,
    backgroundColor: '#fff',
    color: '#000',
  },
  row: {
    width: '100%',
    maxWidth: 320,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  saveButton: {
    width: '100%',
    maxWidth: 320,
    height: 50,
    backgroundColor: '#d90429',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 12,
  },
  saveButtonText: { 
    color: '#fff', 
    fontWeight: '700',
    fontSize: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  link: {
    color: '#d90429',
    textAlign: 'center',
    fontSize: 14,
  },
});