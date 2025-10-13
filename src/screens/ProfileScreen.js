import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const ProfileScreen = ({ navigation }) => {
  const handleLogout = () => {
    Alert.alert(
      "Cerrar sesión",
      "¿Estás seguro de que quieres cerrar sesión?",
      [
        {
          text: "Cancelar",
          style: "cancel"
        },
        { 
          text: "Sí, cerrar sesión", 
          onPress: () => navigation.reset({
            index: 0,
            routes: [{ name: 'Login' }],
          })
        }
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          <Icon name="person" size={60} color="#fff" />
        </View>
        <Text style={styles.userName}>Juan Pérez</Text>
        <Text style={styles.userEmail}>juan.perez@example.com</Text>
        <Text style={styles.userType}>Estudiante - Ingeniería de Software</Text>
      </View>

      <View style={styles.menuContainer}>
        <TouchableOpacity 
          style={styles.menuItem}
          onPress={() => navigation.navigate('EditProfile')}
        >
          <Icon name="person-outline" size={24} color="#007bff" />
          <Text style={styles.menuText}>Mi Perfil</Text>
          <Icon name="chevron-right" size={24} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <Icon name="description" size={24} color="#007bff" />
          <Text style={styles.menuText}>Mi CV</Text>
          <Icon name="chevron-right" size={24} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <Icon name="work-outline" size={24} color="#007bff" />
          <Text style={styles.menuText}>Mis Postulaciones</Text>
          <Icon name="chevron-right" size={24} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <Icon name="favorite-outline" size={24} color="#007bff" />
          <Text style={styles.menuText}>Empleos Guardados</Text>
          <Icon name="chevron-right" size={24} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <Icon name="notifications-none" size={24} color="#007bff" />
          <Text style={styles.menuText}>Notificaciones</Text>
          <Icon name="chevron-right" size={24} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <Icon name="settings" size={24} color="#007bff" />
          <Text style={styles.menuText}>Configuración</Text>
          <Icon name="chevron-right" size={24} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
          <Icon name="exit-to-app" size={24} color="#dc3545" />
          <Text style={[styles.menuText, { color: '#dc3545' }]}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  profileHeader: {
    backgroundColor: '#fff',
    padding: 20,
    alignItems: 'center',
    marginBottom: 10,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#007bff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  userEmail: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  userType: {
    fontSize: 14,
    color: '#007bff',
  },
  menuContainer: {
    backgroundColor: '#fff',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    marginLeft: 15,
    color: '#333',
  },
});

export default ProfileScreen;