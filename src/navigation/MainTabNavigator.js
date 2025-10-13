import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Importar pantallas (las crearemos después)
import HomeScreen from '../screens/HomeScreen';
import RecommendedJobsScreen from '../screens/RecommendedJobsScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import JobDetailScreen from '../screens/JobDetailScreen';

const Tab = createBottomTabNavigator();
const HomeStack = createStackNavigator();
const RecommendedStack = createStackNavigator();

// Stack para la pantalla de Inicio
function HomeStackScreen() {
  return (
    <HomeStack.Navigator>
      <HomeStack.Screen 
        name="Home" 
        component={HomeScreen}
        options={{ headerShown: false }}
      />
      <HomeStack.Screen 
        name="JobDetail" 
        component={JobDetailScreen}
        options={{ title: 'Detalle del Empleo' }}
      />
    </HomeStack.Navigator>
  );
}

// Stack para empleos recomendados
function RecommendedStackScreen() {
  return (
    <RecommendedStack.Navigator>
      <RecommendedStack.Screen 
        name="Recommended" 
        component={RecommendedJobsScreen}
        options={{ headerShown: false }}
      />
      <RecommendedStack.Screen 
        name="JobDetail" 
        component={JobDetailScreen}
        options={{ title: 'Detalle del Empleo' }}
      />
    </RecommendedStack.Navigator>
  );
}

// Navegador principal con tabs
const MainTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Inicio') {
            iconName = focused ? 'home' : 'home';
          } else if (route.name === 'Recomendados') {
            iconName = focused ? 'star' : 'star-outline';
          } else if (route.name === 'Notificaciones') {
            iconName = focused ? 'notifications' : 'notifications-none';
          } else if (route.name === 'Perfil') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007bff',
        tabBarInactiveTintColor: 'gray',
      })}
    >
      <Tab.Screen name="Inicio" component={HomeStackScreen} />
      <Tab.Screen name="Recomendados" component={RecommendedStackScreen} />
      <Tab.Screen name="Notificaciones" component={NotificationsScreen} />
      <Tab.Screen name="Perfil" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

export default MainTabNavigator;