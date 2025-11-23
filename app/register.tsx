import { useRouter } from 'expo-router';
import React from 'react';
import { Image, Platform, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions, useColorScheme } from 'react-native';
import { Colors } from '../constants/Colors';

const RegisterScreen = () => {
  const { width } = useWindowDimensions();
  const isWide = width > 700;
  const colorScheme = useColorScheme() ?? 'light';
  const router = useRouter();

  const theme = Colors[colorScheme];

  return (
    <View style={[styles.mainContainer, { backgroundColor: theme.background }]}>
      {/* Logo centrado arriba */}
      <View style={styles.logoContainer}>
        <Image
          source={require('../assets/images/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      {/* Pregunta destacada */}
      <Text style={[styles.question, { color: theme.text }]}>
        ¿BUSCAS EMPLEO O EMPLEADOS?
      </Text>

      {/* Botones grandes */}
      <View style={styles.buttonsContainer}>
        <TouchableOpacity
          style={[styles.optionButton, { backgroundColor: theme.buttonBackground }]}
          onPress={() => router.push('/register-student')}
        >
          <Text style={[styles.optionText, { color: theme.buttonText }]}>
            SOY ESTUDIANTE
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.optionButton, { backgroundColor: theme.buttonBackground }]}
          onPress={() => router.push('/register-employer')}
        >
          <Text style={[styles.optionText, { color: theme.buttonText }]}>
            SOY EMPLEADOR
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  logoContainer: {
    marginBottom: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 300,
    height: 300,
  },
  question: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 48,
    textAlign: 'center',
  },
  buttonsContainer: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  optionButton: {
    width: '100%',
    height: 60,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  optionText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default RegisterScreen;