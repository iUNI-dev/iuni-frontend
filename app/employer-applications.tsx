import { useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import { collection, query, where, getDocs, getDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../src/firebase/firebase';
import { Colors } from '../constants/Colors';
import { useAuth } from '../src/contexts/AuthContext';

const EmployerApplications = () => {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [aplicaciones, setAplicaciones] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      loadAplicaciones();
    }
  }, [user]);

  const loadAplicaciones = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Obtener todas las aplicaciones de esta empresa
      const q = query(
        collection(db, 'postulaciones'),
        where('empresaId', '==', user.uid),
        where('activa', '==', true)
      );
      const querySnapshot = await getDocs(q);
      
      const aplicacionesData = await Promise.all(
        querySnapshot.docs.map(async (docSnapshot) => {
          const data = docSnapshot.data();
          
          // Obtener información del estudiante
          let estudianteInfo = {};
          if (data.estudianteId) {
            try {
              const estudianteDoc = await getDoc(doc(db, 'users', data.estudianteId));
              if (estudianteDoc.exists()) {
                estudianteInfo = estudianteDoc.data();
              }
            } catch (error) {
              console.error('Error cargando estudiante:', error);
            }
          }

          // Obtener información de la vacante
          let vacanteInfo = {};
          if (data.vacanteId) {
            try {
              const vacanteDoc = await getDoc(doc(db, 'vacantes', data.vacanteId));
              if (vacanteDoc.exists()) {
                vacanteInfo = vacanteDoc.data();
              }
            } catch (error) {
              console.error('Error cargando vacante:', error);
            }
          }

          return {
            id: docSnapshot.id,
            ...data,
            estudiante: estudianteInfo,
            vacante: vacanteInfo,
          };
        })
      );

      setAplicaciones(aplicacionesData);
    } catch (error) {
      console.error('Error cargando aplicaciones:', error);
      Alert.alert('Error', 'No se pudieron cargar las aplicaciones');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadAplicaciones();
  };

  const handleDeleteAplicacion = (aplicacionId: string) => {
    Alert.alert(
      'Confirmar eliminación',
      '¿Estás seguro de que deseas eliminar esta aplicación?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await updateDoc(doc(db, 'postulaciones', aplicacionId), {
                activa: false,
                fechaActualizacion: serverTimestamp(),
              });
              Alert.alert('Éxito', 'Aplicación eliminada correctamente');
              loadAplicaciones();
            } catch (error: any) {
              console.error('Error eliminando aplicación:', error);
              Alert.alert('Error', 'No se pudo eliminar la aplicación');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return '#FFA500';
      case 'revisado':
        return '#4169E1';
      case 'entrevista':
        return '#9370DB';
      case 'rechazado':
        return '#DC143C';
      case 'contratado':
        return '#32CD32';
      default:
        return '#888';
    }
  };

  const getEstadoText = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return 'Pendiente';
      case 'revisado':
        return 'Revisado';
      case 'entrevista':
        return 'Entrevista';
      case 'rechazado':
        return 'Rechazado';
      case 'contratado':
        return 'Contratado';
      default:
        return estado;
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Fecha no disponible';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleLogout = () => {
    Alert.alert(
      'Cerrar sesión',
      '¿Estás seguro de que deseas cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar sesión',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              router.replace('/login');
            } catch (error) {
              Alert.alert('Error', 'No se pudo cerrar sesión');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.text }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Aplicaciones Recibidas</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={[styles.headerButton, { backgroundColor: theme.buttonBackground }]}
            onPress={() => router.push('/employer-dashboard')}
          >
            <Text style={[styles.headerButtonText, { color: theme.buttonText }]}>
              Dashboard
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerButton, { backgroundColor: theme.buttonBackground }]}
            onPress={handleLogout}
          >
            <Text style={[styles.headerButtonText, { color: theme.buttonText }]}>
              Cerrar Sesión
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Lista de aplicaciones */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.text} />
        </View>
      ) : (
        <ScrollView
          style={styles.aplicacionesList}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {aplicaciones.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: theme.text }]}>
                No hay aplicaciones recibidas aún.
              </Text>
            </View>
          ) : (
            aplicaciones.map((aplicacion) => (
              <View
                key={aplicacion.id}
                style={[styles.aplicacionCard, { backgroundColor: theme.background, borderColor: theme.text }]}
              >
                <View style={styles.aplicacionHeader}>
                  <View style={styles.aplicacionInfo}>
                    <Text style={[styles.estudianteName, { color: theme.text }]}>
                      {aplicacion.estudiante?.displayName || aplicacion.estudiante?.email || 'Estudiante'}
                    </Text>
                    <Text style={[styles.estudianteEmail, { color: theme.text }]}>
                      {aplicacion.estudiante?.email || 'Email no disponible'}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.estadoBadge,
                      { backgroundColor: getEstadoColor(aplicacion.estado || 'pendiente') },
                    ]}
                  >
                    <Text style={styles.estadoText}>
                      {getEstadoText(aplicacion.estado || 'pendiente')}
                    </Text>
                  </View>
                </View>

                <View style={styles.aplicacionDetails}>
                  <Text style={[styles.detailLabel, { color: theme.text }]}>Vacante:</Text>
                  <Text style={[styles.detailValue, { color: theme.text }]}>
                    {aplicacion.vacante?.titulo || 'Vacante no disponible'}
                  </Text>
                </View>

                <View style={styles.aplicacionDetails}>
                  <Text style={[styles.detailLabel, { color: theme.text }]}>Carrera:</Text>
                  <Text style={[styles.detailValue, { color: theme.text }]}>
                    {aplicacion.estudiante?.carrera || 'No especificada'}
                  </Text>
                </View>

                <View style={styles.aplicacionDetails}>
                  <Text style={[styles.detailLabel, { color: theme.text }]}>Universidad:</Text>
                  <Text style={[styles.detailValue, { color: theme.text }]}>
                    {aplicacion.estudiante?.universidad || 'No especificada'}
                  </Text>
                </View>

                <View style={styles.aplicacionDetails}>
                  <Text style={[styles.detailLabel, { color: theme.text }]}>Fecha de postulación:</Text>
                  <Text style={[styles.detailValue, { color: theme.text }]}>
                    {formatDate(aplicacion.fechaPostulacion)}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.deleteButton, { backgroundColor: '#DE0606' }]}
                  onPress={() => handleDeleteAplicacion(aplicacion.id)}
                >
                  <Text style={styles.deleteButtonText}>Eliminar Aplicación</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  headerButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  headerButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aplicacionesList: {
    flex: 1,
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
  aplicacionCard: {
    padding: 16,
    marginBottom: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  aplicacionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  aplicacionInfo: {
    flex: 1,
    marginRight: 8,
  },
  estudianteName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  estudianteEmail: {
    fontSize: 14,
    opacity: 0.7,
  },
  estadoBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  estadoText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  aplicacionDetails: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
    minWidth: 140,
  },
  detailValue: {
    fontSize: 14,
    flex: 1,
  },
  deleteButton: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default EmployerApplications;

