// ...existing code...
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity } from 'react-native';
import { db } from '../src/firebase/firebase';

type FormData = {
  nombres: string;
  apellidos: string;
  edad: string;
  fechaNacimiento: string;
  carrera: string;
  pais: string;
  ciudad: string;
  transporte: string;
  descripcion: string;
  experiencia: string;
  lenguajes: string;
  telefono: string;
  habilidadesBlandas: string;
  habilidadesTecnicas: string;
  disponibilidadViajar: string;
};

const RegisterDetails = () => {
  const router = useRouter();
  const params = useLocalSearchParams() as { email?: string };
  const emailParam = params?.email ? String(params.email) : undefined; // aseguramos string

  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    nombres: '',
    apellidos: '',
    edad: '',
    fechaNacimiento: '',
    carrera: '',
    pais: '',
    ciudad: '',
    transporte: '',
    descripcion: '',
    experiencia: '',
    lenguajes: '',
    telefono: '',
    habilidadesBlandas: '',
    habilidadesTecnicas: '',
    disponibilidadViajar: '',
  });

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!emailParam) {
      Alert.alert('Error', 'No se encontró el correo del usuario.');
      return;
    }

    // Validación mínima: nombres y apellidos
    if (!formData.nombres.trim() || !formData.apellidos.trim()) {
      Alert.alert('Error', 'Por favor ingresa tus nombres y apellidos.');
      return;
    }

    setLoading(true);
    try {
      // Usar email en minúsculas como id (opcional: puedes usar uid si lo tienes)
      const docId = emailParam.toLowerCase();

      await setDoc(doc(db, 'users', docId), {
        email: emailParam,
        ...formData,
        createdAt: serverTimestamp(),
      }, { merge: true });

      Alert.alert('Datos guardados', 'Tu información fue registrada correctamente.');
      router.push('/login'); // Redirige a la pantalla de inicio de sesión
    } catch (err: any) {
      console.error('Error al guardar datos:', err);
      Alert.alert('Error', err?.message || 'No se pudo guardar la información.');
    } finally {
      setLoading(false);
    }
  };

  const fields: { key: keyof FormData; label: string }[] = [
    { key: 'nombres', label: 'Nombres' },
    { key: 'apellidos', label: 'Apellidos' },
    { key: 'edad', label: 'Edad' },
    { key: 'fechaNacimiento', label: 'Fecha de nacimiento (DD/MM/AAAA)' },
    { key: 'carrera', label: 'Carrera' },
    { key: 'pais', label: 'País' },
    { key: 'ciudad', label: 'Ciudad' },
    { key: 'transporte', label: 'Transporte' },
    { key: 'descripcion', label: 'Descripción' },
    { key: 'experiencia', label: 'Experiencia' },
    { key: 'lenguajes', label: 'Lenguajes' },
    { key: 'telefono', label: 'Teléfono' },
    { key: 'habilidadesBlandas', label: 'Habilidades blandas' },
    { key: 'habilidadesTecnicas', label: 'Habilidades técnicas' },
    { key: 'disponibilidadViajar', label: 'Disponibilidad para viajar' },
  ];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Completa tu información</Text>

      {fields.map(({ key, label }) => (
        <TextInput
          key={key}
          style={[styles.input, (key === 'descripcion' || key === 'experiencia') && { height: 100, textAlignVertical: 'top' }]}
          placeholder={label}
          placeholderTextColor="#888"
          value={formData[key]}
          onChangeText={(text) => handleChange(key, text)}
          multiline={key === 'descripcion' || key === 'experiencia'}
        />
      ))}

      <TouchableOpacity
        style={styles.saveButton}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveButtonText}>Guardar y continuar</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

export default RegisterDetails;

// ------------------ Estilos ------------------
const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 30,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#d90429',
    marginBottom: 24,
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
    marginBottom: 14,
    backgroundColor: '#fff',
    color: '#000',
  },
  saveButton: {
    width: '100%',
    maxWidth: 320,
    height: 48,
    backgroundColor: '#000',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});