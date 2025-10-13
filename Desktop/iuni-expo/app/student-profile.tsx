import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity } from 'react-native';

const StudentProfileScreen = ({ navigation }: any) => {
  const [age, setAge] = useState('');
  const [career, setCareer] = useState('');
  const [year, setYear] = useState('');
  const [university, setUniversity] = useState('');
  const [experience, setExperience] = useState('');
  const [projects, setProjects] = useState('');

  const handleSave = () => {
    console.log('Perfil guardado:', { age, career, year, university, experience, projects });
    navigation.navigate('InterestSurvey');
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Completa tu perfil de Estudiante</Text>
      <TextInput style={styles.input} placeholder="Edad" value={age} onChangeText={setAge} keyboardType="numeric" />
      <TextInput style={styles.input} placeholder="Carrera" value={career} onChangeText={setCareer} />
      <TextInput style={styles.input} placeholder="Año de carrera" value={year} onChangeText={setYear} />
      <TextInput style={styles.input} placeholder="Universidad" value={university} onChangeText={setUniversity} />
      <TextInput style={[styles.input, styles.textArea]} placeholder="Experiencia laboral (si posee)" value={experience} onChangeText={setExperience} multiline numberOfLines={4} />
      <TextInput style={[styles.input, styles.textArea]} placeholder="Proyectos realizados" value={projects} onChangeText={setProjects} multiline numberOfLines={4} />
      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>Subir CV (PDF)</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={handleSave}>
        <Text style={styles.buttonText}>Guardar y Continuar</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, backgroundColor: '#f5f5f5' },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 30 },
  input: { height: 50, borderColor: '#ccc', borderWidth: 1, borderRadius: 5, paddingHorizontal: 15, marginBottom: 15, backgroundColor: '#fff' },
  textArea: { height: 100, textAlignVertical: 'top', paddingTop: 15 },
  button: { height: 50, backgroundColor: '#6c757d', justifyContent: 'center', alignItems: 'center', borderRadius: 5, marginBottom: 15 },
  primaryButton: { backgroundColor: '#007bff' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});

export default StudentProfileScreen;
