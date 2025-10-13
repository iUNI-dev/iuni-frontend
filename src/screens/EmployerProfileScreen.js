import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

const EmployerProfileScreen = ({ navigation }) => {
  const [companyName, setCompanyName] = useState('');
  const [location, setLocation] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [sector, setSector] = useState('');

  const handleSave = () => {
    // Lógica para guardar el perfil de empresa
    console.log('Perfil de empresa guardado:', { 
      companyName, location, postalCode, sector 
    });
    // Navegar al dashboard de empresa
    navigation.navigate('EmployerDashboard');
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Perfil de Empresa</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Nombre de la empresa"
        value={companyName}
        onChangeText={setCompanyName}
      />
      
      <TextInput
        style={styles.input}
        placeholder="Ubicación (País)"
        value={location}
        onChangeText={setLocation}
      />
      
      <TextInput
        style={styles.input}
        placeholder="Código postal"
        value={postalCode}
        onChangeText={setPostalCode}
        keyboardType="numeric"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Sector de la empresa"
        value={sector}
        onChangeText={setSector}
      />
      
      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>Subir documentación fiscal</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={handleSave}>
        <Text style={styles.buttonText}>Guardar y Continuar</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
  },
  input: {
    height: 50,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 15,
    marginBottom: 15,
    backgroundColor: '#fff',
  },
  button: {
    height: 50,
    backgroundColor: '#6c757d',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 5,
    marginBottom: 15,
  },
  primaryButton: {
    backgroundColor: '#007bff',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default EmployerProfileScreen;