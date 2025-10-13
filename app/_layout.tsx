import { Stack } from 'expo-router';
import { AuthProvider } from '../src/contexts/AuthContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ title: 'Iniciar Sesión' }} />
        <Stack.Screen name="register" options={{ title: 'Registrarse' }} />
        <Stack.Screen name="student-profile" options={{ title: 'Perfil Estudiante' }} />
      </Stack>
    </AuthProvider>
  );
}