import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity
} from 'react-native';
import { auth, db } from '../src/firebase/firebase';

type ProfileState = {
  edad: string;
  carrera: string;
  añoCarrera: string;
  universidad: string;
  experiencia: string;
  proyectos: string;
  telefono: string;
  pais: string;
  ciudad: string;
  descripcion: string;
};

const StudentProfileScreen: React.FC = () => {
  const router = useRouter();
  const params = useLocalSearchParams() as { email?: string };
  const emailParam = params?.email ? String(params.email) : '';

  const [form, setForm] = useState<ProfileState>({
    edad: '',
    carrera: '',
    añoCarrera: '',
    universidad: '',
    experiencia: '',
    proyectos: '',
    telefono: '',
    pais: '',
    ciudad: '',
    descripcion: '',
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (key: keyof ProfileState, value: string) => {
    setForm((s) => ({ ...s, [key]: value }));
  };

  // 🔹 FUNCIÓN MEJORADA PARA SEPARAR NOMBRES Y APELLIDOS
  const splitFullName = (fullName: string | null) => {
    if (!fullName) return { nombres: '', apellidos: '' };
    
    const nameParts = fullName.trim().split(' ');
    
    // Si tiene 2 partes: primera = nombre, segunda = apellido
    if (nameParts.length === 2) {
      return {
        nombres: nameParts[0],
        apellidos: nameParts[1]
      };
    }
    // Si tiene 3 partes: primera = nombre, resto = apellidos
    else if (nameParts.length === 3) {
      return {
        nombres: nameParts[0],
        apellidos: `${nameParts[1]} ${nameParts[2]}`
      };
    }
    // Si tiene 4 o más partes: primeras 2 = nombres, resto = apellidos
    else if (nameParts.length >= 4) {
      return {
        nombres: `${nameParts[0]} ${nameParts[1]}`,
        apellidos: nameParts.slice(2).join(' ')
      };
    }
    // Si solo tiene 1 parte, es el nombre
    else {
      return {
        nombres: nameParts[0],
        apellidos: ''
      };
    }
  };

  const handleSave = async () => {
    // Validaciones básicas
    if (!form.edad.trim() || !form.carrera.trim() || !form.universidad.trim()) {
      Alert.alert('Campos requeridos', 'Completa al menos edad, carrera y universidad.');
      return;
    }

    setLoading(true);
    try {
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        Alert.alert('Error', 'Usuario no autenticado. Por favor, inicia sesión nuevamente.');
        return;
      }

      const userId = currentUser.uid;
      console.log('🔹 GUARDANDO EN COLLECTION: students');
      console.log('🔹 User ID:', userId);

      // 🔹 SEPARAR CORRECTAMENTE NOMBRES Y APELLIDOS
      const nameParts = splitFullName(currentUser.displayName);
      console.log('🔹 NOMBRE COMPLETO:', currentUser.displayName);
      console.log('🔹 NOMBRES SEPARADOS:', nameParts);

      // 🔹 PRIMERO: Actualizar el documento en 'users' para marcar registro completo
      const userUpdate = {
        registrationComplete: true,
        registrationStep: 2,
        updatedAt: serverTimestamp(),
        userType: 'student'
      };

      await updateDoc(doc(db, 'users', userId), userUpdate);
      console.log('✅ users actualizado - registrationComplete: true');

      // 🔹 SEGUNDO: Crear documento en la colección 'students'
      const studentData = {
        // Información personal (CORREGIDO)
        userId: userId,
        email: currentUser.email,
        nombres: nameParts.nombres, // 🔹 SOLO EL PRIMER NOMBRE
        apellidos: nameParts.apellidos, // 🔹 SOLO LOS APELLIDOS
        
        // Información académica
        edad: parseInt(form.edad.trim()) || 0,
        carrera: form.carrera.trim(),
        añoCarrera: form.añoCarrera.trim() || '',
        universidad: form.universidad.trim(),
        
        // Experiencia y proyectos
        experiencia: form.experiencia.trim() || '',
        proyectos: form.proyectos.trim() || '',
        
        // Información de contacto adicional
        telefono: form.telefono.trim() || '',
        pais: form.pais.trim() || '',
        ciudad: form.ciudad.trim() || '',
        descripcion: form.descripcion.trim() || '',
        
        // Metadatos
        perfilCompletado: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        
        // Información de autenticación (referencia)
        provider: 'google',
        photoURL: currentUser.photoURL || '',
      };

      console.log('🔹 DATOS PARA STUDENTS:', studentData);

      // 🔹 GUARDAR EN LA COLECCIÓN 'students'
      await setDoc(doc(db, 'students', userId), studentData, { merge: true });
      console.log('✅ DOCUMENTO CREADO EN: students/' + userId);

      // 🔹 VERIFICAR QUE SE GUARDÓ
      const studentDoc = await getDoc(doc(db, 'students', userId));
      if (studentDoc.exists()) {
        const savedData = studentDoc.data();
        console.log('✅ VERIFICACIÓN: Documento en students existe');
        console.log('📊 NOMBRES GUARDADOS:', savedData.nombres);
        console.log('📊 APELLIDOS GUARDADOS:', savedData.apellidos);
      } else {
        console.log('❌ VERIFICACIÓN: Documento en students NO existe');
      }

      console.log('🔹 REDIRIGIENDO A /home...');
      
      // Redirigir después de una breve pausa
      setTimeout(() => {
        router.replace('/home');
      }, 1000);

    } catch (err: any) {
      console.error('❌ ERROR COMPLETO:', err);
      console.error('❌ Código de error:', err.code);
      console.error('❌ Mensaje de error:', err.message);
      
      Alert.alert('Error', `No se pudo guardar el perfil: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Image 
        source={require('../assets/images/logo-texto.png')} 
        style={styles.logo} 
        resizeMode="contain" 
      />
      
      <Text style={styles.title}>Paso 2: Perfil de Estudiante</Text>
      <Text style={styles.subtitle}>Completa tu información académica y profesional</Text>

      {/* Información Personal */}
      <Text style={styles.sectionTitle}>Información Personal</Text>
      <TextInput 
        style={styles.input} 
        placeholder="Edad *" 
        value={form.edad} 
        onChangeText={(t) => handleChange('edad', t)} 
        keyboardType="numeric" 
      />
      <TextInput 
        style={styles.input} 
        placeholder="Teléfono" 
        value={form.telefono} 
        onChangeText={(t) => handleChange('telefono', t)} 
        keyboardType="phone-pad" 
      />
      <TextInput 
        style={styles.input} 
        placeholder="País" 
        value={form.pais} 
        onChangeText={(t) => handleChange('pais', t)} 
      />
      <TextInput 
        style={styles.input} 
        placeholder="Ciudad" 
        value={form.ciudad} 
        onChangeText={(t) => handleChange('ciudad', t)} 
      />

      {/* Información Académica */}
      <Text style={styles.sectionTitle}>Información Académica</Text>
      <TextInput 
        style={styles.input} 
        placeholder="Carrera *" 
        value={form.carrera} 
        onChangeText={(t) => handleChange('carrera', t)} 
      />
      <TextInput 
        style={styles.input} 
        placeholder="Año de carrera" 
        value={form.añoCarrera} 
        onChangeText={(t) => handleChange('añoCarrera', t)} 
      />
      <TextInput 
        style={styles.input} 
        placeholder="Universidad *" 
        value={form.universidad} 
        onChangeText={(t) => handleChange('universidad', t)} 
      />

      {/* Experiencia y Proyectos */}
      <Text style={styles.sectionTitle}>Experiencia y Proyectos</Text>
      <TextInput 
        style={[styles.input, styles.textArea]} 
        placeholder="Experiencia laboral (si posee)" 
        value={form.experiencia} 
        onChangeText={(t) => handleChange('experiencia', t)} 
        multiline 
        numberOfLines={4} 
      />
      <TextInput 
        style={[styles.input, styles.textArea]} 
        placeholder="Proyectos realizados" 
        value={form.proyectos} 
        onChangeText={(t) => handleChange('proyectos', t)} 
        multiline 
        numberOfLines={4} 
      />

      {/* Descripción Personal */}
      <Text style={styles.sectionTitle}>Sobre ti</Text>
      <TextInput 
        style={[styles.input, styles.textArea]} 
        placeholder="Breve descripción sobre ti, tus intereses y objetivos..." 
        value={form.descripcion} 
        onChangeText={(t) => handleChange('descripcion', t)} 
        multiline 
        numberOfLines={4} 
      />

      <TouchableOpacity 
        style={[styles.saveButton, loading && styles.buttonDisabled]} 
        onPress={handleSave} 
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveButtonText}>
            Completar Registro
          </Text>
        )}
      </TouchableOpacity>

      <Text style={styles.footerText}>
        * Campos obligatorios
      </Text>
    </ScrollView>
  );
};

export default StudentProfileScreen;

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 30,
  },
  logo: {
    width: 250,
    height: 80,
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#d90429',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    marginTop: 16,
    alignSelf: 'flex-start',
    width: '100%',
    maxWidth: 320,
  },
  input: {
    width: '100%',
    maxWidth: 320,
    height: 50,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#fff',
    color: '#000',
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  saveButton: {
    width: '100%',
    maxWidth: 320,
    height: 50,
    backgroundColor: '#d90429',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  saveButtonText: { 
    color: '#fff', 
    fontWeight: '700',
    fontSize: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  footerText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
});