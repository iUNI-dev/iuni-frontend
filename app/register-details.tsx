import React, { useState } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  Button,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { auth, db, storage } from '../src/firebase/firebase';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

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
  const params = useLocalSearchParams() as { email?: string };
  const emailParam = params?.email ? String(params.email) : '';

  const [form, setForm] = useState<FormState>({
    nombres: '',
    apellidos: '',
    email: emailParam || '',
    password: '',
    puestoDeseado: '',
    departamento: '',
  });

  const [captchaOk, setCaptchaOk] = useState(false); // placeholder
  const [loading, setLoading] = useState(false);
  const [cvFile, setCvFile] = useState<{ uri: string; name: string } | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

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
    if (!form.nombres.trim() || !form.apellidos.trim() || !form.email.trim() || !form.password.trim()) {
      Alert.alert('Campos requeridos', 'Completa nombre, apellido, email y contraseña.');
      return;
    }
    if (!captchaOk) {
      Alert.alert('Validación', 'Por favor confirma que no eres un robot (captcha).');
      return;
    }

    setLoading(true);
    try {
      // usar uid si el usuario está autenticado, sino usar email lowercase
      const currentUid = auth.currentUser?.uid;
      const docId = currentUid || form.email.toLowerCase();

      let cvUrl = null;
      if (cvFile) {
        cvUrl = await uploadCvToStorage(docId);
      }

      const payload = {
        nombres: form.nombres,
        apellidos: form.apellidos,
        email: form.email.toLowerCase(),
        puestoDeseado: form.puestoDeseado || null,
        departamento: form.departamento || null,
        cvUrl: cvUrl || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        telefono: null,
        fechaNacimiento: null,
        documentoIdentidad: null,
        pais: null,
        ciudad: null,
        carrera: null,
        descripcion: null,
        disponibilidadViajar: null,
        idiomas: null,
      };

      await setDoc(doc(db, 'users', docId), payload, { merge: true });

      Alert.alert('Guardado', 'Tus datos iniciales fueron guardados. Ahora completa la información adicional.');
      // redirigir a siguiente pantalla de detalles (puede ser la misma /register-details-info o recargar esta)
      router.push(`/register-details-info?email=${encodeURIComponent(form.email)}`);
    } catch (err: any) {
      console.error('save profile error', err);
      Alert.alert('Error', err.message || 'No se pudo guardar la información.');
    } finally {
      setLoading(false);
      setUploadProgress(null);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Image source={require('../assets/images/logo-texto.png')} style={styles.logo} resizeMode="contain" />
      <Text style={styles.title}>Registro - Datos iniciales</Text>

      <TextInput style={styles.input} placeholder="Nombres" value={form.nombres} onChangeText={(t) => handleChange('nombres', t)} />
      <TextInput style={styles.input} placeholder="Apellidos" value={form.apellidos} onChangeText={(t) => handleChange('apellidos', t)} />
      <TextInput style={styles.input} placeholder="Email" value={form.email} onChangeText={(t) => handleChange('email', t)} keyboardType="email-address" autoCapitalize="none" />
      <TextInput style={styles.input} placeholder="Contraseña" value={form.password} onChangeText={(t) => handleChange('password', t)} secureTextEntry />

      <TextInput style={styles.input} placeholder="Puesto de trabajo deseado" value={form.puestoDeseado} onChangeText={(t) => handleChange('puestoDeseado', t)} />
      <TextInput style={styles.input} placeholder="Departamento" value={form.departamento} onChangeText={(t) => handleChange('departamento', t)} />

      <View style={styles.row}>
        <Text>No soy un robot</Text>
        <Switch value={captchaOk} onValueChange={setCaptchaOk} />
      </View>

      <View style={{ width: '100%', maxWidth: 320, marginTop: 8 }}>
        <Button title={cvFile ? `CV: ${cvFile.name}` : 'Subir Currículum (CV)'} onPress={pickCv} />
        {uploadProgress !== null && <Text style={{ marginTop: 8 }}>Progreso: {uploadProgress}%</Text>}
      </View>

      <TouchableOpacity style={styles.saveButton} onPress={handleSubmit} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Siguiente</Text>}
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
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#d90429',
    marginBottom: 12,
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
  saveButtonText: { color: '#fff', fontWeight: '700' },
});