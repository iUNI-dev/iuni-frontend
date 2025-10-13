import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import StudentProfileScreen from '../screens/StudentProfileScreen';
import EmployerProfileScreen from '../screens/EmployerProfileScreen';

const Stack = createStackNavigator();

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen 
          name="Login" 
          component={LoginScreen} 
          options={{ title: 'Iniciar Sesión' }}
        />
        <Stack.Screen 
          name="Register" 
          component={RegisterScreen} 
          options={{ title: 'Registro' }}
        />
        <Stack.Screen 
          name="StudentProfile" 
          component={StudentProfileScreen} 
          options={{ title: 'Perfil de Estudiante' }}
        />
        <Stack.Screen 
          name="EmployerProfile" 
          component={EmployerProfileScreen} 
          options={{ title: 'Perfil de Empresa' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;