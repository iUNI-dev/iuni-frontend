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

      if (isGoogleUser) {
        // 🔹 USUARIO GOOGLE (ya está autenticado)
        const currentUser = auth.currentUser;
        if (!currentUser) {
          throw new Error('No hay usuario autenticado con Google');
        }
        userId = currentUser.uid;
        userEmail = currentUser.email || form.email;
        
        // Actualizar displayName en Auth
        await updateProfile(currentUser, {
          displayName: `${form.nombres.trim()} ${form.apellidos.trim()}`
        });

      } else {
        // 🔹 USUARIO EMAIL (crear cuenta nueva)
        console.log('🔹 Creando usuario con email/contraseña...');
        const userCredential = await createUserWithEmailAndPassword(
          auth, 
          form.email.toLowerCase(), 
          form.password
        );
        const user = userCredential.user;
        userId = user.uid;
        userEmail = user.email || form.email;

        // Actualizar displayName en Auth
        await updateProfile(user, {
          displayName: `${form.nombres.trim()} ${form.apellidos.trim()}`
        });
      }

      console.log('🔹 Guardando datos en Firestore para:', userId);

      let cvUrl = null;
      if (cvFile) {
        cvUrl = await uploadCvToStorage(userId);
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
        registrationStep: 1, // 🔹 Paso 1 completado
        registrationComplete: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
      };

      await setDoc(doc(db, 'users', userId), payload, { merge: true });

      console.log('✅ Datos iniciales guardados, redirigiendo a student-profile...');
      
      // 🔹 REDIRECCIÓN A STUDENT-PROFILE
      router.replace(`/student-profile?email=${encodeURIComponent(userEmail)}`);
      
    } catch (err: any) {
      console.error('❌ Error guardando datos:', err);
      
      if (err.code === 'auth/email-already-in-use') {
        Alert.alert('Email en uso', 'Este email ya está registrado. Intenta iniciar sesión.');
      } else if (err.code === 'auth/weak-password') {
        Alert.alert('Contraseña débil', 'La contraseña debe tener al menos 6 caracteres.');
      } else if (err.code === 'auth/invalid-email') {
        Alert.alert('Email inválido', 'El formato del email no es correcto.');
      } else {
        Alert.alert('Error', err.message || 'No se pudo completar el registro.');
      }
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