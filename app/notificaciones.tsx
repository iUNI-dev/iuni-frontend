// app/notificaciones.tsx
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { auth } from '../src/firebase/firebase';

type Notification = {
  id: string;
  tipo: 'postulacion' | 'vista_perfil' | 'nueva_vacante' | 'mensaje' | 'sistema';
  titulo: string;
  mensaje: string;
  empresa?: string;
  vacante?: string;
  fecha: any;
  leida: boolean;
  accion?: string;
  datos?: any;
};

const NotificacionesScreen = () => {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'todas' | 'no-leidas'>('todas');

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        router.replace('/login');
        return;
      }

      // Simular datos de notificaciones (luego conectaremos con Firestore)
      const mockNotifications: Notification[] = [
        {
          id: '1',
          tipo: 'postulacion',
          titulo: 'Postulación vista',
          mensaje: 'Tech Solutions SA ha visto tu postulación para Desarrollador Frontend',
          empresa: 'Tech Solutions SA',
          vacante: 'Desarrollador Frontend',
          fecha: new Date(Date.now() - 2 * 60 * 60 * 1000), // Hace 2 horas
          leida: false,
          accion: 'ver_postulacion',
          datos: { postulacionId: '123' }
        },
        {
          id: '2',
          tipo: 'nueva_vacante',
          titulo: 'Nueva vacante coincidente',
          mensaje: 'Se ha publicado una nueva vacante que coincide con tu perfil: Diseñador UX/UI',
          empresa: 'Creative Studio',
          vacante: 'Diseñador UX/UI',
          fecha: new Date(Date.now() - 4 * 60 * 60 * 1000), // Hace 4 horas
          leida: true,
          accion: 'ver_vacante',
          datos: { vacanteId: '456' }
        },
        {
          id: '3',
          tipo: 'vista_perfil',
          titulo: 'Tu perfil fue visto',
          mensaje: 'Data Insights ha visitado tu perfil',
          empresa: 'Data Insights',
          fecha: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // Hace 1 día
          leida: false,
          accion: 'ver_empresa',
          datos: { empresaId: '789' }
        },
        {
          id: '4',
          tipo: 'mensaje',
          titulo: 'Nuevo mensaje',
          mensaje: 'Tienes un nuevo mensaje de Recursos Humanos de Innovate Corp',
          empresa: 'Innovate Corp',
          fecha: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // Hace 2 días
          leida: true,
          accion: 'ver_mensajes',
          datos: { conversacionId: '101' }
        },
        {
          id: '5',
          tipo: 'sistema',
          titulo: 'Bienvenido a iUNI',
          mensaje: 'Completa tu perfil para aumentar tus oportunidades de empleo',
          fecha: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // Hace 3 días
          leida: true,
          accion: 'completar_perfil',
          datos: {}
        }
      ];

      setNotifications(mockNotifications);
    } catch (error) {
      console.error('Error cargando notificaciones:', error);
      Alert.alert('Error', 'No se pudieron cargar las notificaciones');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      // Actualizar en Firestore
      // await updateDoc(doc(db, 'notifications', notificationId), {
      //   leida: true,
      //   fechaLectura: serverTimestamp()
      // });

      // Actualizar estado local
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId ? { ...notif, leida: true } : notif
        )
      );
    } catch (error) {
      console.error('Error marcando como leída:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(notif => !notif.leida);
      
      // Actualizar en Firestore
      // const batch = writeBatch(db);
      // unreadNotifications.forEach(notif => {
      //   const notifRef = doc(db, 'notifications', notif.id);
      //   batch.update(notifRef, {
      //     leida: true,
      //     fechaLectura: serverTimestamp()
      //   });
      // });
      // await batch.commit();

      // Actualizar estado local
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, leida: true }))
      );

      Alert.alert('Éxito', 'Todas las notificaciones marcadas como leídas');
    } catch (error) {
      console.error('Error marcando todas como leídas:', error);
      Alert.alert('Error', 'No se pudieron marcar todas como leídas');
    }
  };

  const handleNotificationPress = (notification: Notification) => {
    // Marcar como leída si no lo está
    if (!notification.leida) {
      markAsRead(notification.id);
    }

    // Navegar según la acción
    switch (notification.accion) {
      case 'ver_postulacion':
        router.push(`/mispostulaciones`);
        break;
      case 'ver_vacante':
        router.push(`/job-details?id=${notification.datos.vacanteId}`);
        break;
      case 'ver_empresa':
        router.push(`/empresa-detalles?id=${notification.datos.empresaId}`);
        break;
      case 'ver_mensajes':
        router.push('/mensajes');
        break;
      case 'completar_perfil':
        router.push('/student-profile');
        break;
      default:
        // No hacer nada para otras notificaciones
        break;
    }
  };

  const getNotificationIcon = (tipo: string) => {
    switch (tipo) {
      case 'postulacion':
        return '📋';
      case 'vista_perfil':
        return '👁️';
      case 'nueva_vacante':
        return '💼';
      case 'mensaje':
        return '💬';
      case 'sistema':
        return 'ℹ️';
      default:
        return '🔔';
    }
  };

  const getNotificationColor = (tipo: string) => {
    switch (tipo) {
      case 'postulacion':
        return '#007bff';
      case 'vista_perfil':
        return '#28a745';
      case 'nueva_vacante':
        return '#ffc107';
      case 'mensaje':
        return '#17a2b8';
      case 'sistema':
        return '#6c757d';
      default:
        return '#d90429';
    }
  };

  const formatTime = (fecha: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - fecha.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours} h`;
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `Hace ${diffDays} días`;
    
    return fecha.toLocaleDateString('es-ES');
  };

  const filteredNotifications = notifications.filter(notif => 
    activeFilter === 'todas' ? true : !notif.leida
  );

  const unreadCount = notifications.filter(notif => !notif.leida).length;

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#d90429" />
        <Text style={styles.loadingText}>Cargando notificaciones...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notificaciones</Text>
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unreadCount}</Text>
          </View>
        )}
      </View>

      {/* Filtros */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[
            styles.filterButton,
            activeFilter === 'todas' && styles.filterButtonActive
          ]}
          onPress={() => setActiveFilter('todas')}
        >
          <Text style={[
            styles.filterText,
            activeFilter === 'todas' && styles.filterTextActive
          ]}>
            Todas
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.filterButton,
            activeFilter === 'no-leidas' && styles.filterButtonActive
          ]}
          onPress={() => setActiveFilter('no-leidas')}
        >
          <Text style={[
            styles.filterText,
            activeFilter === 'no-leidas' && styles.filterTextActive
          ]}>
            No leídas
          </Text>
          {unreadCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Botón Marcar todas como leídas */}
      {unreadCount > 0 && (
        <TouchableOpacity style={styles.markAllButton} onPress={markAllAsRead}>
          <Text style={styles.markAllText}>Marcar todas como leídas</Text>
        </TouchableOpacity>
      )}

      {/* Lista de Notificaciones */}
      <ScrollView
        style={styles.notificationsList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredNotifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>🔔</Text>
            <Text style={styles.emptyStateTitle}>
              {activeFilter === 'no-leidas' ? 'No hay notificaciones no leídas' : 'No hay notificaciones'}
            </Text>
            <Text style={styles.emptyStateText}>
              {activeFilter === 'no-leidas' 
                ? 'Cuando recibas nuevas notificaciones, aparecerán aquí.'
                : 'Las notificaciones sobre tus postulaciones y actividad aparecerán aquí.'
              }
            </Text>
          </View>
        ) : (
          filteredNotifications.map((notification) => (
            <TouchableOpacity
              key={notification.id}
              style={[
                styles.notificationCard,
                !notification.leida && styles.notificationUnread
              ]}
              onPress={() => handleNotificationPress(notification)}
            >
              <View style={styles.notificationHeader}>
                <View style={[
                  styles.iconContainer,
                  { backgroundColor: getNotificationColor(notification.tipo) }
                ]}>
                  <Text style={styles.icon}>{getNotificationIcon(notification.tipo)}</Text>
                </View>
                
                <View style={styles.notificationContent}>
                  <Text style={styles.notificationTitle}>{notification.titulo}</Text>
                  <Text style={styles.notificationMessage}>{notification.mensaje}</Text>
                  
                  {notification.empresa && (
                    <View style={styles.companyBadge}>
                      <Text style={styles.companyText}>{notification.empresa}</Text>
                    </View>
                  )}
                  
                  <Text style={styles.notificationTime}>
                    {formatTime(notification.fecha)}
                  </Text>
                </View>
                
                {!notification.leida && (
                  <View style={styles.unreadDot} />
                )}
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212529',
    marginRight: 10,
  },
  badge: {
    backgroundColor: '#d90429',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 24,
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  filterButtonActive: {
    backgroundColor: '#d90429',
    borderColor: '#d90429',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
  },
  filterTextActive: {
    color: '#fff',
  },
  filterBadge: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
  },
  filterBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#d90429',
  },
  markAllButton: {
    backgroundColor: '#e7f3ff',
    marginHorizontal: 20,
    marginTop: 10,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#b3d9ff',
  },
  markAllText: {
    color: '#0066cc',
    fontSize: 14,
    fontWeight: '600',
  },
  notificationsList: {
    flex: 1,
    padding: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 16,
    opacity: 0.5,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6c757d',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    lineHeight: 20,
  },
  notificationCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  notificationUnread: {
    borderLeftWidth: 4,
    borderLeftColor: '#d90429',
    backgroundColor: '#f8f9ff',
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  icon: {
    fontSize: 18,
    color: '#fff',
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#495057',
    lineHeight: 20,
    marginBottom: 8,
  },
  companyBadge: {
    backgroundColor: '#e7f3ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  companyText: {
    fontSize: 12,
    color: '#0066cc',
    fontWeight: '500',
  },
  notificationTime: {
    fontSize: 12,
    color: '#6c757d',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#d90429',
    marginLeft: 8,
    marginTop: 4,
  },
});

export default NotificacionesScreen;