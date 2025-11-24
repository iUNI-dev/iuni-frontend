import { Stack } from 'expo-router';
import { AuthProvider } from '../src/contexts/AuthContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ title: 'Iniciar Sesión' }} />
        <Stack.Screen name="register" options={{ title: 'Registrarse' }} />
        <Stack.Screen name="register-student" options={{ title: 'Registro Estudiante' }} />
        <Stack.Screen name="register-employer" options={{ title: 'Registro Empleador' }} />
        <Stack.Screen name="register-employer-details" options={{ title: 'Detalles de Registro' }} />
        <Stack.Screen name="student-profile" options={{ title: 'Perfil Estudiante' }} />
        <Stack.Screen name="employer-profile" options={{ title: 'Perfil Empleador' }} />
        <Stack.Screen name="employer-dashboard" options={{ title: 'Dashboard Empleador' }} />
        <Stack.Screen name="employer-applications" options={{ title: 'Aplicaciones' }} />
          
      </Stack>
    </AuthProvider>
  );
}