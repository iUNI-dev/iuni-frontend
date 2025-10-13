import { useRouter } from 'expo-router';
import React from 'react';
import { Image, Platform, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';

const RegisterScreen = () => {
  const { width } = useWindowDimensions();
  const isWide = width > 700;
  const isWeb = Platform.OS === 'web';
  const router = useRouter();

  return (
    <View style={[styles.mainContainer, { flexDirection: isWide ? 'row' : 'column' }]}>
      {/* Left side: Question and buttons */}
      <View style={styles.leftContainer}>
        <Text style={styles.question}>¿Buscas empleo o empleados?</Text>
        <TouchableOpacity
          style={styles.optionButton}
          onPress={() => router.push('/register-student')}
        >
          <Text style={styles.optionText}>Soy estudiante</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.optionButton}
          onPress={() => router.push('/register-employer')}
        >
          <Text style={styles.optionText}>Soy empleador</Text>
        </TouchableOpacity>
      </View>

      {/* Right side: Logo */}
      <View style={styles.rightContainer}>
        <Image
          source={require('../assets/images/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  leftContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#fff',
  },
  question: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#080002ff',
    marginBottom: 40,
    textAlign: 'center',
  },
  optionButton: {
    width: 220,
    height: 54,
    backgroundColor: '#d90429',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 6,
  },
  optionText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  rightContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#fff',
  },
  logo: {
    width: 500,
    height: 500,
  },
});

export default RegisterScreen;