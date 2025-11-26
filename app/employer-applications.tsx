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
// Paleta de colores personalizada
const customColors = {
  light: {
    background: '#FFFFFF',
    text: '#000000',
    buttonBackground: '#000000',
    buttonText: '#FFFFFF',
  },
  dark: {
    background: '#1D1C1C',
    text: '#FFFFFF',
    buttonBackground: '#DE0606',
    buttonText: '#FFFFFF',
  },
};
import { useAuth } from '../src/contexts/AuthContext';

const EmployerApplications = () => {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = customColors[colorScheme];
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

  const handleUpdateEstado = async (aplicacionId: string, nuevoEstado: string, mensaje?: string) => {
    setLoading(true);
    try {
      const updateData: any = {
        estado: nuevoEstado,
        ultimaActualizacion: serverTimestamp(),
      };
      
      if (mensaje) {
        updateData.mensajeEmpresa = mensaje;
      }

      await updateDoc(doc(db, 'postulaciones', aplicacionId), updateData);
      
      const estadoTexto = getEstadoText(nuevoEstado);
      Alert.alert('Éxito', `Aplicación marcada como ${estadoTexto.toLowerCase()}`);
      loadAplicaciones();
    } catch (error: any) {
      console.error('Error actualizando estado:', error);
      Alert.alert('Error', 'No se pudo actualizar el estado de la aplicación');
    } finally {
      setLoading(false);
    }
  };

  const handleAprobar = (aplicacionId: string, estudianteNombre: string) => {
    Alert.prompt(
      'Aprobar candidato',
      `¿Deseas aprobar a ${estudianteNombre}? Puedes agregar un mensaje opcional:`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Aprobar',
          onPress: (mensaje) => handleUpdateEstado(aplicacionId, 'entrevista', mensaje || 'Tu postulación ha sido aprobada. Te contactaremos pronto para coordinar una entrevista.')
        }
      ],
      'plain-text',
      'Felicidades, hemos revisado tu perfil y nos gustaría conocerte mejor...'
    );
  };

  const handleRechazar = (aplicacionId: string, estudianteNombre: string) => {
    Alert.prompt(
      'Rechazar candidato',
      `¿Deseas rechazar a ${estudianteNombre}? Puedes agregar un mensaje explicativo:`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Rechazar',
          style: 'destructive',
          onPress: (mensaje) => handleUpdateEstado(aplicacionId, 'rechazado', mensaje || 'Gracias por tu interés. En esta ocasión hemos decidido continuar con otros candidatos.')
        }
      ],
      'plain-text',
      'Gracias por postularte. Aunque tu perfil es interesante...'
    );
  };

  const handleMarcarRevisado = (aplicacionId: string) => {
    handleUpdateEstado(aplicacionId, 'revisado', 'Hemos recibido tu postulación y la estamos revisando.');
  };

  const handleContratar = (aplicacionId: string, estudianteNombre: string) => {
    Alert.prompt(
      'Contratar candidato',
      `¿Deseas contratar a ${estudianteNombre}? Agrega los detalles del contrato:`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Contratar',
          onPress: (mensaje) => handleUpdateEstado(aplicacionId, 'contratado', mensaje || '¡Felicidades! Has sido seleccionado para el puesto. Te contactaremos para finalizar los detalles.')
        }
      ],
      'plain-text',
      '¡Bienvenido al equipo! Por favor contacta con nosotros para...'
    );
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

  const getEstadisticas = () => {
    const pendientes = aplicaciones.filter(app => app.estado === 'pendiente').length;
    const revisados = aplicaciones.filter(app => app.estado === 'revisado').length;
    const entrevistas = aplicaciones.filter(app => app.estado === 'entrevista').length;
    const contratados = aplicaciones.filter(app => app.estado === 'contratado').length;
    const rechazados = aplicaciones.filter(app => app.estado === 'rechazado').length;
    
    return { pendientes, revisados, entrevistas, contratados, rechazados };
  };

  const stats = getEstadisticas();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.text }]}>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Aplicaciones Recibidas</Text>
          
          {/* Estadísticas */}
          {aplicaciones.length > 0 && (
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: '#FFA500' }]}>{stats.pendientes}</Text>
                <Text style={[styles.statLabel, { color: theme.text }]}>Pendientes</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: '#4169E1' }]}>{stats.revisados}</Text>
                <Text style={[styles.statLabel, { color: theme.text }]}>Revisados</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: '#9370DB' }]}>{stats.entrevistas}</Text>
                <Text style={[styles.statLabel, { color: theme.text }]}>Entrevistas</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: '#32CD32' }]}>{stats.contratados}</Text>
                <Text style={[styles.statLabel, { color: theme.text }]}>Contratados</Text>
              </View>
            </View>
          )}
        </View>
        
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
          <ActivityIndicator size="large" color={theme.buttonBackground} />
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

                {/* Mostrar mensaje personalizado del estudiante si existe */}
                {aplicacion.mensajePersonalizado && (
                  <View style={[styles.mensajeContainer, { backgroundColor: theme.text + '10' }]}>
                    <Text style={[styles.mensajeLabel, { color: theme.text }]}>Mensaje del candidato:</Text>
                    <Text style={[styles.mensajeTexto, { color: theme.text }]}>
                      "{aplicacion.mensajePersonalizado}"
                    </Text>
                  </View>
                )}

                {/* Mostrar mensaje de la empresa si existe */}
                {aplicacion.mensajeEmpresa && (
                  <View style={[styles.mensajeContainer, { backgroundColor: theme.buttonBackground + '10' }]}>
                    <Text style={[styles.mensajeLabel, { color: theme.text }]}>Tu respuesta:</Text>
                    <Text style={[styles.mensajeTexto, { color: theme.text }]}>
                      "{aplicacion.mensajeEmpresa}"
                    </Text>
                  </View>
                )}

                {/* Botones de acción según el estado */}
                <View style={styles.actionsContainer}>
                  {aplicacion.estado === 'pendiente' && (
                    <>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.approveButton, { backgroundColor: '#32CD32' }]}
                        onPress={() => handleAprobar(aplicacion.id, aplicacion.estudiante?.displayName || 'el candidato')}
                      >
                        <Text style={styles.actionButtonText}>✓ Aprobar</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        style={[styles.actionButton, styles.reviewButton, { backgroundColor: '#4169E1' }]}
                        onPress={() => handleMarcarRevisado(aplicacion.id)}
                      >
                        <Text style={styles.actionButtonText}>👁 Marcar como revisado</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        style={[styles.actionButton, styles.rejectButton, { backgroundColor: '#DC143C' }]}
                        onPress={() => handleRechazar(aplicacion.id, aplicacion.estudiante?.displayName || 'el candidato')}
                      >
                        <Text style={styles.actionButtonText}>✗ Rechazar</Text>
                      </TouchableOpacity>
                    </>
                  )}

                  {aplicacion.estado === 'revisado' && (
                    <>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.approveButton, { backgroundColor: '#32CD32' }]}
                        onPress={() => handleAprobar(aplicacion.id, aplicacion.estudiante?.displayName || 'el candidato')}
                      >
                        <Text style={styles.actionButtonText}>✓ Aprobar para entrevista</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        style={[styles.actionButton, styles.rejectButton, { backgroundColor: '#DC143C' }]}
                        onPress={() => handleRechazar(aplicacion.id, aplicacion.estudiante?.displayName || 'el candidato')}
                      >
                        <Text style={styles.actionButtonText}>✗ Rechazar</Text>
                      </TouchableOpacity>
                    </>
                  )}

                  {aplicacion.estado === 'entrevista' && (
                    <>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.hireButton, { backgroundColor: '#FFD700' }]}
                        onPress={() => handleContratar(aplicacion.id, aplicacion.estudiante?.displayName || 'el candidato')}
                      >
                        <Text style={[styles.actionButtonText, { color: '#000' }]}>🎉 Contratar</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        style={[styles.actionButton, styles.rejectButton, { backgroundColor: '#DC143C' }]}
                        onPress={() => handleRechazar(aplicacion.id, aplicacion.estudiante?.displayName || 'el candidato')}
                      >
                        <Text style={styles.actionButtonText}>✗ Rechazar</Text>
                      </TouchableOpacity>
                    </>
                  )}

                  {/* Botón de eliminar siempre disponible */}
                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton, { backgroundColor: theme.buttonBackground }]}
                    onPress={() => handleDeleteAplicacion(aplicacion.id)}
                  >
                    <Text style={[styles.actionButtonText, { color: theme.buttonText }]}>🗑 Eliminar</Text>
                  </TouchableOpacity>
                </View>
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
    alignItems: 'flex-start',
    flexWrap: 'wrap',
  },
  headerContent: {
    flex: 1,
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statItem: {
    alignItems: 'center',
    minWidth: 60,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    marginTop: 2,
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
  mensajeContainer: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#4169E1',
  },
  mensajeLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  mensajeTexto: {
    fontSize: 14,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  actionsContainer: {
    marginTop: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 100,
    alignItems: 'center',
    flex: 1,
    maxWidth: '48%',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  approveButton: {
    // backgroundColor se aplica dinámicamente
  },
  reviewButton: {
    // backgroundColor se aplica dinámicamente
  },
  rejectButton: {
    // backgroundColor se aplica dinámicamente
  },
  hireButton: {
    // backgroundColor se aplica dinámicamente
  },
  deleteButton: {
    // backgroundColor se aplica dinámicamente
  },
});

export default EmployerApplications;

