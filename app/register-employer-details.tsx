import { useRouter, useLocalSearchParams } from 'expo-router';
import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { auth, db, storage } from '../src/firebase/firebase';
import { Colors } from '../constants/Colors';

const RegisterEmployerDetails = () => {
  const params = useLocalSearchParams();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const user = auth.currentUser;

  const [loading, setLoading] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  
  // Campos del formulario
  const [nombreRepresentante, setNombreRepresentante] = useState('');
  const [telefonos, setTelefonos] = useState('');
  const [correoAcceso, setCorreoAcceso] = useState(params.email as string || '');
  const [password, setPassword] = useState('');
  const [nombreEmpresa, setNombreEmpresa] = useState('');
  const [horarios, setHorarios] = useState('');
  const [ciudadCodigoPostal, setCiudadCodigoPostal] = useState('');
  const [pais, setPais] = useState('El Salvador');
  const [dui, setDui] = useState('');
  const [numeroTrabajadores, setNumeroTrabajadores] = useState('');
  const [sector, setSector] = useState('');
  const [registroFiscalUrl, setRegistroFiscalUrl] = useState('');
  const [numeroVacantesAnuales, setNumeroVacantesAnuales] = useState('');
  const [captchaValue, setCaptchaValue] = useState('');
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [captchaQuestion, setCaptchaQuestion] = useState('');

  // Opciones para dropdowns
  const paises = ['El Salvador', 'Guatemala', 'Honduras', 'Nicaragua', 'Costa Rica', 'Panamá'];
  const numeroTrabajadoresOptions = ['1-10', '11-50', '51-100', '101-500', '500+'];
  const numeroVacantesOptions = ['1-5', '6-10', '11-20', '21-50', '50+'];
  const sectores = [
    'Tecnología',
    'Salud',
    'Educación',
    'Finanzas',
    'Retail',
    'Manufactura',
    'Servicios',
    'Construcción',
    'Turismo',
    'Otro'
  ];

  // Generar captcha al cargar
  useEffect(() => {
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    setCaptchaAnswer((num1 + num2).toString());
    setCaptchaQuestion(`${num1} + ${num2} = ?`);
    setCaptchaValue('');
  }, []);

  // Cargar datos si el usuario ya existe
  useEffect(() => {
    const loadUserData = async () => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setNombreRepresentante(data.nombreRepresentante || '');
            setTelefonos(data.telefono || '');
            setCorreoAcceso(data.email || user.email || '');
            setNombreEmpresa(data.nombreEmpresa || '');
            setHorarios(data.horarios || '');
            setCiudadCodigoPostal(data.ciudadCodigoPostal || '');
            setPais(data.pais || 'El Salvador');
            setDui(data.dui || '');
            setNumeroTrabajadores(data.numeroTrabajadores || '');
            setSector(data.sector || '');
            setRegistroFiscalUrl(data.registroFiscalUrl || '');
            setNumeroVacantesAnuales(data.numeroVacantesAnuales || '');
          }
        } catch (error) {
          console.error('Error cargando datos:', error);
        }
      }
    };
    loadUserData();
  }, [user]);

  // Subir archivo a Firebase Storage
  const handleFileUpload = async () => {
    try {
      setUploadingFile(true);
      let result;

      if (Platform.OS === 'web') {
        result = await DocumentPicker.getDocumentAsync({
          type: 'application/pdf',
          copyToCacheDirectory: false,
        });
      } else {
        result = await DocumentPicker.getDocumentAsync({
          type: 'application/pdf',
        });
      }

      if (result.canceled) {
        setUploadingFile(false);
        return;
      }

      const file = result.assets[0];
      if (!file) return;

      // Crear referencia en Storage
      const fileRef = ref(storage, `registros-fiscales/${user?.uid}/${Date.now()}_${file.name}`);
      
      // Convertir a blob para web o usar URI para móvil
      let fileBlob: Blob;
      if (Platform.OS === 'web' && file.uri) {
        const response = await fetch(file.uri);
        fileBlob = await response.blob();
      } else {
        // Para móvil, necesitarías usar expo-file-system
        Alert.alert('Error', 'Subida de archivos en móvil requiere configuración adicional');
        setUploadingFile(false);
        return;
      }

      // Subir archivo
      await uploadBytes(fileRef, fileBlob);
      const downloadURL = await getDownloadURL(fileRef);
      setRegistroFiscalUrl(downloadURL);
      Alert.alert('Éxito', 'Archivo subido correctamente');
    } catch (error: any) {
      console.error('Error subiendo archivo:', error);
      Alert.alert('Error', 'No se pudo subir el archivo');
    } finally {
      setUploadingFile(false);
    }
  };

  // Validar y guardar formulario
  const handleSubmit = async () => {
    // Validaciones
    if (!nombreRepresentante.trim()) {
      Alert.alert('Error', 'El nombre del representante es requerido');
      return;
    }
    if (!telefonos.trim()) {
      Alert.alert('Error', 'El teléfono es requerido');
      return;
    }
    if (!correoAcceso.trim()) {
      Alert.alert('Error', 'El correo de acceso es requerido');
      return;
    }
    if (!nombreEmpresa.trim()) {
      Alert.alert('Error', 'El nombre de la empresa es requerido');
      return;
    }
    if (!sector) {
      Alert.alert('Error', 'El sector empresarial es requerido');
      return;
    }
    if (!captchaValue || captchaValue !== captchaAnswer) {
      Alert.alert('Error', 'El captcha es incorrecto');
      return;
    }

    setLoading(true);
    try {
      if (!user) {
        Alert.alert('Error', 'No hay usuario autenticado');
        return;
      }

      const userData = {
        email: correoAcceso,
        displayName: nombreRepresentante,
        userType: 'employer',
        nombreEmpresa,
        nombreRepresentante,
        nombreContacto: nombreRepresentante,
        telefono: telefonos,
        sector,
        horarios,
        ciudadCodigoPostal,
        pais,
        dui,
        numeroTrabajadores,
        numeroVacantesAnuales,
        registroFiscalUrl,
        registrationStep: 2,
        registrationComplete: false,
        updatedAt: serverTimestamp(),
      };

      // Si es registro con email, guardar password
      if (password && !user.providerData.find(p => p.providerId === 'google.com')) {
        userData.provider = 'email';
      } else {
        userData.provider = 'google';
      }

      // Guardar en users
      await setDoc(doc(db, 'users', user.uid), userData, { merge: true });

      // Guardar en employers
      await setDoc(
        doc(db, 'employers', user.uid),
        {
          userId: user.uid,
          email: correoAcceso,
          nombreEmpresa,
          nombreContacto: nombreRepresentante,
          telefono: telefonos,
          sector,
          ubicacion: ciudadCodigoPostal,
          codigoPostal: ciudadCodigoPostal,
          perfilCompletado: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      Alert.alert('Éxito', 'Información guardada correctamente');
      router.push('/employer-profile');
    } catch (error: any) {
      console.error('Error guardando datos:', error);
      Alert.alert('Error', error.message || 'No se pudo guardar la información');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.contentContainer}
    >
      <Image
        source={require('../assets/images/logo-texto.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={[styles.title, { color: theme.text }]}>
        Completa tu información
      </Text>

      <View style={styles.formContainer}>
        {/* Columna izquierda */}
        <View style={styles.column}>
          <Text style={[styles.label, { color: theme.text }]}>Nombre del representante *</Text>
          <TextInput
            style={[styles.input, { borderColor: theme.text, color: theme.text }]}
            value={nombreRepresentante}
            onChangeText={setNombreRepresentante}
            placeholder="Nombre completo"
            placeholderTextColor="#888"
          />

          <Text style={[styles.label, { color: theme.text }]}>Teléfonos de contacto *</Text>
          <TextInput
            style={[styles.input, { borderColor: theme.text, color: theme.text }]}
            value={telefonos}
            onChangeText={setTelefonos}
            placeholder="Teléfono"
            keyboardType="phone-pad"
            placeholderTextColor="#888"
          />

          <Text style={[styles.label, { color: theme.text }]}>Correo de acceso *</Text>
          <TextInput
            style={[styles.input, { borderColor: theme.text, color: theme.text }]}
            value={correoAcceso}
            onChangeText={setCorreoAcceso}
            placeholder="correo@ejemplo.com"
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor="#888"
          />

          {!user?.providerData.find(p => p.providerId === 'google.com') && (
            <>
              <Text style={[styles.label, { color: theme.text }]}>Contraseña *</Text>
              <TextInput
                style={[styles.input, { borderColor: theme.text, color: theme.text }]}
                value={password}
                onChangeText={setPassword}
                placeholder="Contraseña"
                secureTextEntry
                placeholderTextColor="#888"
              />
            </>
          )}

          <Text style={[styles.label, { color: theme.text }]}>Nombre de la empresa *</Text>
          <TextInput
            style={[styles.input, { borderColor: theme.text, color: theme.text }]}
            value={nombreEmpresa}
            onChangeText={setNombreEmpresa}
            placeholder="Nombre de la empresa"
            placeholderTextColor="#888"
          />

          <Text style={[styles.label, { color: theme.text }]}>Horarios de la empresa</Text>
          <TextInput
            style={[styles.input, { borderColor: theme.text, color: theme.text }]}
            value={horarios}
            onChangeText={setHorarios}
            placeholder="Ej: Lunes a Viernes 8:00 AM - 5:00 PM"
            placeholderTextColor="#888"
          />
        </View>

        {/* Columna derecha */}
        <View style={styles.column}>
          <Text style={[styles.label, { color: theme.text }]}>Ciudad o código postal</Text>
          <TextInput
            style={[styles.input, { borderColor: theme.text, color: theme.text }]}
            value={ciudadCodigoPostal}
            onChangeText={setCiudadCodigoPostal}
            placeholder="Ciudad o código postal"
            placeholderTextColor="#888"
          />

          <Text style={[styles.label, { color: theme.text }]}>País *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerScroll}>
            {paises.map((p) => (
              <TouchableOpacity
                key={p}
                style={[
                  styles.pickerChip,
                  pais === p && { backgroundColor: theme.buttonBackground },
                  { borderColor: theme.text },
                ]}
                onPress={() => setPais(p)}
              >
                <Text
                  style={[
                    styles.pickerChipText,
                    { color: pais === p ? theme.buttonText : theme.text },
                  ]}
                >
                  {p}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={[styles.label, { color: theme.text }]}>DUI del representante</Text>
          <TextInput
            style={[styles.input, { borderColor: theme.text, color: theme.text }]}
            value={dui}
            onChangeText={setDui}
            placeholder="00000000-0"
            placeholderTextColor="#888"
          />

          <Text style={[styles.label, { color: theme.text }]}>Número de trabajadores</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerScroll}>
            <TouchableOpacity
              style={[
                styles.pickerChip,
                numeroTrabajadores === '' && { backgroundColor: theme.buttonBackground },
                { borderColor: theme.text },
              ]}
              onPress={() => setNumeroTrabajadores('')}
            >
              <Text
                style={[
                  styles.pickerChipText,
                  { color: numeroTrabajadores === '' ? theme.buttonText : theme.text },
                ]}
              >
                Seleccione...
              </Text>
            </TouchableOpacity>
            {numeroTrabajadoresOptions.map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[
                  styles.pickerChip,
                  numeroTrabajadores === opt && { backgroundColor: theme.buttonBackground },
                  { borderColor: theme.text },
                ]}
                onPress={() => setNumeroTrabajadores(opt)}
              >
                <Text
                  style={[
                    styles.pickerChipText,
                    { color: numeroTrabajadores === opt ? theme.buttonText : theme.text },
                  ]}
                >
                  {opt}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={[styles.label, { color: theme.text }]}>Sector empresarial *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerScroll}>
            <TouchableOpacity
              style={[
                styles.pickerChip,
                sector === '' && { backgroundColor: theme.buttonBackground },
                { borderColor: theme.text },
              ]}
              onPress={() => setSector('')}
            >
              <Text
                style={[
                  styles.pickerChipText,
                  { color: sector === '' ? theme.buttonText : theme.text },
                ]}
              >
                Seleccione...
              </Text>
            </TouchableOpacity>
            {sectores.map((s) => (
              <TouchableOpacity
                key={s}
                style={[
                  styles.pickerChip,
                  sector === s && { backgroundColor: theme.buttonBackground },
                  { borderColor: theme.text },
                ]}
                onPress={() => setSector(s)}
              >
                <Text
                  style={[
                    styles.pickerChipText,
                    { color: sector === s ? theme.buttonText : theme.text },
                  ]}
                >
                  {s}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={[styles.label, { color: theme.text }]}>Adjuntar registro fiscal</Text>
          <TouchableOpacity
            style={[styles.uploadButton, { borderColor: theme.text }]}
            onPress={handleFileUpload}
            disabled={uploadingFile}
          >
            {uploadingFile ? (
              <ActivityIndicator color={theme.text} />
            ) : (
              <Text style={[styles.uploadButtonText, { color: theme.text }]}>
                {registroFiscalUrl ? 'Archivo subido ✓' : 'Seleccionar archivo PDF'}
              </Text>
            )}
          </TouchableOpacity>

          <Text style={[styles.label, { color: theme.text }]}>Número de vacantes anuales aproximadas</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerScroll}>
            <TouchableOpacity
              style={[
                styles.pickerChip,
                numeroVacantesAnuales === '' && { backgroundColor: theme.buttonBackground },
                { borderColor: theme.text },
              ]}
              onPress={() => setNumeroVacantesAnuales('')}
            >
              <Text
                style={[
                  styles.pickerChipText,
                  { color: numeroVacantesAnuales === '' ? theme.buttonText : theme.text },
                ]}
              >
                Seleccione...
              </Text>
            </TouchableOpacity>
            {numeroVacantesOptions.map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[
                  styles.pickerChip,
                  numeroVacantesAnuales === opt && { backgroundColor: theme.buttonBackground },
                  { borderColor: theme.text },
                ]}
                onPress={() => setNumeroVacantesAnuales(opt)}
              >
                <Text
                  style={[
                    styles.pickerChipText,
                    { color: numeroVacantesAnuales === opt ? theme.buttonText : theme.text },
                  ]}
                >
                  {opt}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>

      {/* Captcha */}
      <View style={styles.captchaContainer}>
        <Text style={[styles.captchaLabel, { color: theme.text }]}>
          Captcha: {captchaQuestion || 'Cargando...'}
        </Text>
        <TextInput
          style={[styles.captchaInput, { borderColor: theme.text, color: theme.text }]}
          value={captchaValue}
          onChangeText={setCaptchaValue}
          placeholder="Respuesta"
          keyboardType="numeric"
          placeholderTextColor="#888"
        />
      </View>

      {/* Botón de enviar */}
      <TouchableOpacity
        style={[styles.submitButton, { backgroundColor: theme.buttonBackground }, loading && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={[styles.submitButtonText, { color: theme.buttonText }]}>
            Crear cuenta
          </Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
    paddingBottom: 48,
  },
  logo: {
    width: 300,
    height: 100,
    alignSelf: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 32,
  },
  formContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  column: {
    width: '48%',
    minWidth: 280,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
    backgroundColor: 'transparent',
  },
  pickerScroll: {
    marginBottom: 8,
  },
  pickerChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 8,
  },
  pickerChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  uploadButton: {
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  uploadButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  captchaContainer: {
    marginVertical: 24,
    alignItems: 'center',
  },
  captchaLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  captchaInput: {
    width: 120,
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    textAlign: 'center',
    backgroundColor: 'transparent',
  },
  submitButton: {
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});

export default RegisterEmployerDetails;

