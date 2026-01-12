import { useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../src/firebase/firebase';
import { Colors } from '../constants/Colors';
import { useAuth } from '../src/contexts/AuthContext';

const EmployerProfile = () => {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Campos del formulario
  const [nombreEmpresa, setNombreEmpresa] = useState('');
  const [nombreContacto, setNombreContacto] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [sector, setSector] = useState('');
  const [ubicacion, setUbicacion] = useState('');
  const [codigoPostal, setCodigoPostal] = useState('');
  const [sitioWeb, setSitioWeb] = useState('');
  const [descripcion, setDescripcion] = useState('');

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

  useEffect(() => {
    if (user) {
      loadProfileData();
    }
  }, [user]);

  const loadProfileData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Cargar desde users
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setNombreEmpresa(data.nombreEmpresa || '');
        setNombreContacto(data.nombreContacto || data.nombreRepresentante || '');
        setEmail(data.email || user.email || '');
        setTelefono(data.telefono || '');
        setSector(data.sector || '');
        setUbicacion(data.ubicacion || data.ciudadCodigoPostal || '');
        setCodigoPostal(data.codigoPostal || data.ciudadCodigoPostal || '');
        setSitioWeb(data.sitioWeb || '');
        setDescripcion(data.descripcion || '');
      }

      // Cargar desde employers
      const employerDoc = await getDoc(doc(db, 'employers', user.uid));
      if (employerDoc.exists()) {
        const data = employerDoc.data();
        setNombreEmpresa(data.nombreEmpresa || nombreEmpresa);
        setNombreContacto(data.nombreContacto || nombreContacto);
        setEmail(data.email || email);
        setTelefono(data.telefono || telefono);
        setSector(data.sector || sector);
        setUbicacion(data.ubicacion || ubicacion);
        setCodigoPostal(data.codigoPostal || codigoPostal);
        setSitioWeb(data.sitioWeb || sitioWeb);
        setDescripcion(data.descripcion || descripcion);
      }
    } catch (error) {
      console.error('Error cargando perfil:', error);
      Alert.alert('Error', 'No se pudo cargar el perfil');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!nombreEmpresa.trim() || !nombreContacto.trim() || !telefono.trim()) {
      Alert.alert('Error', 'Por favor completa los campos requeridos');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'No hay usuario autenticado');
      return;
    }

    setSaving(true);
    try {
      // Guardar en users
      await setDoc(
        doc(db, 'users', user.uid),
        {
          nombreEmpresa: nombreEmpresa.trim(),
          nombreContacto: nombreContacto.trim(),
          telefono: telefono.trim(),
          sector: sector.trim(),
          ubicacion: ubicacion.trim(),
          codigoPostal: codigoPostal.trim(),
          ciudadCodigoPostal: codigoPostal.trim(),
          sitioWeb: sitioWeb.trim(),
          descripcion: descripcion.trim(),
          perfilCompletado: true,
          registrationComplete: true,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      // Guardar en employers
      await setDoc(
        doc(db, 'employers', user.uid),
        {
          userId: user.uid,
          email: email || user.email,
          nombreEmpresa: nombreEmpresa.trim(),
          nombreContacto: nombreContacto.trim(),
          telefono: telefono.trim(),
          sector: sector.trim(),
          ubicacion: ubicacion.trim(),
          codigoPostal: codigoPostal.trim(),
          sitioWeb: sitioWeb.trim(),
          descripcion: descripcion.trim(),
          perfilCompletado: true,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      Alert.alert('Éxito', 'Perfil actualizado correctamente');
      router.push('/employer-dashboard');
    } catch (error: any) {
      console.error('Error guardando perfil:', error);
      Alert.alert('Error', error.message || 'No se pudo guardar el perfil');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Cerrar sesión',
      '¿Estás seguro de que deseas cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar sesión',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              router.replace('/login');
            } catch (error) {
              Alert.alert('Error', 'No se pudo cerrar sesión');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.text} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.text }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Perfil de Empleador</Text>
        <TouchableOpacity
          style={[styles.logoutButton, { backgroundColor: theme.buttonBackground }]}
          onPress={handleLogout}
        >
          <Text style={[styles.logoutButtonText, { color: theme.buttonText }]}>
            Cerrar Sesión
          </Text>
        </TouchableOpacity>
      </View>

      {/* Formulario */}
      <View style={styles.form}>
        <Text style={[styles.label, { color: theme.text }]}>Nombre de la empresa *</Text>
        <TextInput
          style={[styles.input, { borderColor: theme.text, color: theme.text }]}
          value={nombreEmpresa}
          onChangeText={setNombreEmpresa}
          placeholder="Nombre de la empresa"
          placeholderTextColor="#888"
        />

        <Text style={[styles.label, { color: theme.text }]}>Nombre del contacto *</Text>
        <TextInput
          style={[styles.input, { borderColor: theme.text, color: theme.text }]}
          value={nombreContacto}
          onChangeText={setNombreContacto}
          placeholder="Nombre del contacto"
          placeholderTextColor="#888"
        />

        <Text style={[styles.label, { color: theme.text }]}>Email</Text>
        <TextInput
          style={[styles.input, styles.inputDisabled, { borderColor: theme.text, color: theme.text }]}
          value={email}
          editable={false}
          placeholder="Email (solo lectura)"
          placeholderTextColor="#888"
        />

        <Text style={[styles.label, { color: theme.text }]}>Teléfono *</Text>
        <TextInput
          style={[styles.input, { borderColor: theme.text, color: theme.text }]}
          value={telefono}
          onChangeText={setTelefono}
          placeholder="Teléfono"
          keyboardType="phone-pad"
          placeholderTextColor="#888"
        />

        <Text style={[styles.label, { color: theme.text }]}>Sector de la empresa</Text>
        <View style={[styles.pickerContainer, { borderColor: theme.text }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {sectores.map((s) => (
              <TouchableOpacity
                key={s}
                style={[
                  styles.sectorChip,
                  sector === s && { backgroundColor: theme.buttonBackground },
                  { borderColor: theme.text },
                ]}
                onPress={() => setSector(s)}
              >
                <Text
                  style={[
                    styles.sectorChipText,
                    { color: sector === s ? theme.buttonText : theme.text },
                  ]}
                >
                  {s}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <Text style={[styles.label, { color: theme.text }]}>Ubicación</Text>
        <TextInput
          style={[styles.input, { borderColor: theme.text, color: theme.text }]}
          value={ubicacion}
          onChangeText={setUbicacion}
          placeholder="Ubicación"
          placeholderTextColor="#888"
        />

        <Text style={[styles.label, { color: theme.text }]}>Código postal</Text>
        <TextInput
          style={[styles.input, { borderColor: theme.text, color: theme.text }]}
          value={codigoPostal}
          onChangeText={setCodigoPostal}
          placeholder="Código postal"
          keyboardType="numeric"
          placeholderTextColor="#888"
        />

        <Text style={[styles.label, { color: theme.text }]}>Sitio web</Text>
        <TextInput
          style={[styles.input, { borderColor: theme.text, color: theme.text }]}
          value={sitioWeb}
          onChangeText={setSitioWeb}
          placeholder="https://www.ejemplo.com"
          keyboardType="url"
          autoCapitalize="none"
          placeholderTextColor="#888"
        />

        <Text style={[styles.label, { color: theme.text }]}>Descripción de la empresa</Text>
        <TextInput
          style={[styles.textArea, { borderColor: theme.text, color: theme.text }]}
          value={descripcion}
          onChangeText={setDescripcion}
          placeholder="Describe tu empresa..."
          placeholderTextColor="#888"
          multiline
          numberOfLines={6}
        />

        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: theme.buttonBackground }, saving && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={[styles.saveButtonText, { color: theme.buttonText }]}>
              Guardar Cambios
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.backButton, { borderColor: theme.text }]}
          onPress={() => router.push('/employer-dashboard')}
        >
          <Text style={[styles.backButtonText, { color: theme.text }]}>
            Volver al Dashboard
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    marginBottom: 24,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  logoutButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  logoutButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  form: {
    gap: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
    backgroundColor: 'transparent',
  },
  inputDisabled: {
    opacity: 0.6,
  },
  textArea: {
    minHeight: 120,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 8,
    textAlignVertical: 'top',
    backgroundColor: 'transparent',
  },
  pickerContainer: {
    marginBottom: 8,
  },
  sectorChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  sectorChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  backButton: {
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    marginTop: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});

export default EmployerProfile;

