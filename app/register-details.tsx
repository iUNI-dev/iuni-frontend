import * as DocumentPicker from 'expo-document-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
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

    if (!isGoogleUser && !form.password.trim()) {
      Alert.alert('Campo requerido', 'La contraseña es obligatoria.');
      return;
    }

    if (!captchaOk) {
      Alert.alert('Validación', 'Por favor confirma que no eres un robot (captcha).');
      return;
    }

    setLoading(true);
    try {
      const currentUser = auth.currentUser;
      const docId = currentUser?.uid || form.email.toLowerCase();

      console.log('Guardando datos iniciales para:', docId);

      let cvUrl = null;
      if (cvFile) {
        cvUrl = await uploadCvToStorage(docId);
      }

      // 🔹 PAYLOAD CON DATOS INICIALES
      const payload = {
        // Información personal básica
        nombres: form.nombres.trim(),
        apellidos: form.apellidos.trim(),
        email: form.email.toLowerCase(),
        
        // Información profesional
        puestoDeseado: form.puestoDeseado.trim() || null,
        departamento: form.departamento.trim() || null,
        cvUrl: cvUrl || null,
        
        // Metadatos
        provider: isGoogleUser ? 'google' : 'email',
        registrationStep: 1, // 🔹 Paso 1 completado
        registrationComplete: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        
        // Campos que se completarán en student-profile
        edad: null,
        carrera: null,
        añoCarrera: null,
        universidad: null,
        experiencia: null,
        proyectos: null,
        telefono: null,
        fechaNacimiento: null,
        documentoIdentidad: null,
        pais: null,
        ciudad: null,
        descripcion: null,
        disponibilidadViajar: null,
        idiomas: null,
      };

      await setDoc(doc(db, 'users', docId), payload, { merge: true });

      console.log('✅ Datos iniciales guardados, redirigiendo a student-profile...');
      
      // 🔹 REDIRECCIÓN DIRECTA A STUDENT-PROFILE
      router.push(`/student-profile?email=${encodeURIComponent(form.email)}`);
      
    } catch (err: any) {
      console.error('❌ Error guardando datos:', err);
      Alert.alert('Error', err.message || 'No se pudo guardar la información.');
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
        {isGoogleUser ? 'Paso 1: Información Básica' : 'Registro - Datos iniciales'}
      </Text>

      <TextInput 
        style={styles.input} 
        placeholder="Nombres *" 
        value={form.nombres} 
        onChangeText={(t) => handleChange('nombres', t)} 
      />
      
      <TextInput 
        style={styles.input} 
        placeholder="Apellidos *" 
        value={form.apellidos} 
        onChangeText={(t) => handleChange('apellidos', t)} 
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
      
      {!isGoogleUser && (
        <TextInput 
          style={styles.input} 
          placeholder="Contraseña *" 
          value={form.password} 
          onChangeText={(t) => handleChange('password', t)} 
          secureTextEntry 
        />
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
            Siguiente → Perfil de Estudiante
          </Text>
        )}
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
    height: 44,
    borderColor: '#000',
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
    height: 48,
    backgroundColor: '#000',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 18,
  },
  saveButtonText: { 
    color: '#fff', 
    fontWeight: '700',
    fontSize: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});