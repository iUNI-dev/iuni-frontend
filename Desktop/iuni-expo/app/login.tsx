import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Image, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';

const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { width } = useWindowDimensions();
  const router = useRouter();

  // Responsive sizes
  const isWide = width > 700;
  const isWeb = Platform.OS === 'web';
  const formWidth = isWide ? 420 : '90%';
  const imageSize = isWide ? 380 : 160; // Más grande en web

  const handleLogin = () => {
    console.log('Email:', email, 'Password:', password);
  };

  return (
    <View style={[styles.mainContainer, { flexDirection: isWide ? 'row' : 'column' }]}>
      {/* Left side: Image solo en web */}
      {isWeb && (
        <View style={[styles.imageContainer, { alignItems: 'center', justifyContent: 'center', paddingVertical: isWide ? 0 : 24 }]}>
          <Image
            source={require('../assets/images/login-image.png')}
            style={[styles.image, { width: imageSize, height: imageSize }]}
            resizeMode="cover"
          />
        </View>
      )}

      {/* Right side: Login */}
      <View style={styles.loginContainer}>
        {/* Logo arriba */}
        <View style={styles.logoContainer}>
          <Image
            source={require('../assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* Login form */}
        <View style={[styles.formContainer, { width: formWidth, maxWidth: isWide ? 420 : 340 }]}>
          <Text style={styles.title}>iUNI - Bolsa de Empleo</Text>

          <TextInput
            style={styles.input}
            placeholder="Correo electrónico"
            placeholderTextColor="#888"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <TextInput
            style={styles.input}
            placeholder="Contraseña"
            placeholderTextColor="#888"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity style={styles.button} onPress={handleLogin}>
            <Text style={styles.buttonText}>Iniciar Sesión</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/register')}>
            <Text style={styles.link}>¿No tienes cuenta? Regístrate aquí</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  imageContainer: {
    flex: 1,
    backgroundColor: '#fff',
    minHeight: 180,
  },
  image: {
    borderRadius: 24,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  loginContainer: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  logoContainer: {
    marginBottom: 24,
    alignItems: 'center',
    width: '100%',
  },
  logo: {
    width: 300,
    height: 300,
  },
  formContainer: {
    padding: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 6,
    maxWidth: 340, // Este valor se sobreescribe arriba
    minWidth: 220,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#d90429',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    height: 44,
    width: '100%',
    borderColor: '#000',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
    backgroundColor: '#fff',
    color: '#000',
  },
  button: {
    height: 44,
    width: '100%',
    backgroundColor: '#d90429',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginBottom: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  link: {
    color: '#d90429',
    textAlign: 'center',
    fontSize: 14,
    marginTop: 8,
  },
});

export default LoginScreen;