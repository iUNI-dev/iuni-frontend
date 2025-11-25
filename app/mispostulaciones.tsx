// app/mispostulaciones.tsx
import { useRouter } from 'expo-router';
import {
    collection,
    doc,
    getDoc,
    getDocs,
    orderBy,
    query,
    where
} from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { auth, db } from '../src/firebase/firebase';

type Postulacion = {
  id: string;
  vacanteId: string;
  estudianteId: string;
  empresaId: string;
  fechaPostulacion: any;
  estado: 'pendiente' | 'revisado' | 'entrevista' | 'rechazado' | 'contratado';
  ultimaActualizacion: any;
  mensajeEmpresa?: string;
  notas?: string;
  mensajePersonalizado?: string;
  cvSeleccionado: string;
  activa: boolean;
  
  vacante?: {
    titulo: string;
    empresa: string;
    empresaLogo?: string;
    ubicacion: string;
    tipo: string;
    salario?: string;
    fechaPublicacion: any;
  };
};

const MisPostulacionesScreen = () => {
  const router = useRouter();
  const [postulaciones, setPostulaciones] = useState<Postulacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'todas' | 'pendiente' | 'entrevista' | 'rechazado'>('todas');
  const [mounted, setMounted] = useState(false);

  // 🔥 SOLUCIÓN: Esperar a que el componente esté montado
  useEffect(() => {
    setMounted(true);
    loadPostulacionesReales();
  }, []);

 const loadPostulacionesReales = async () => {
  try {
    const user = auth.currentUser;
    if (!user) {
      router.replace('/login');
      return;
    }

    console.log('🔄 Cargando postulaciones para usuario:', user.uid);

    // 1. Obtener postulaciones del usuario
    const postulacionesQuery = query(
      collection(db, 'postulaciones'),
      where('estudianteId', '==', user.uid),
      where('activa', '==', true),
      orderBy('fechaPostulacion', 'desc')
    );
    
    const postulacionesSnapshot = await getDocs(postulacionesQuery);
    console.log('📄 Postulaciones encontradas:', postulacionesSnapshot.size);

    if (postulacionesSnapshot.empty) {
      console.log('📭 No hay postulaciones para este usuario');
      setPostulaciones([]);
      return;
    }

    // 2. Obtener datos completos de cada postulación
    const postulacionesCompletas: Postulacion[] = [];
    
    for (const docSnap of postulacionesSnapshot.docs) {
      try {
        const postulacionData = docSnap.data();
        console.log('📋 Procesando postulación:', docSnap.id, postulacionData);
        
        let vacanteInfo = null;

        // Obtener datos de la vacante
        if (postulacionData.vacanteId) {
          console.log('🔍 Buscando vacante:', postulacionData.vacanteId);
          const vacanteDoc = await getDoc(doc(db, 'vacantes', postulacionData.vacanteId));
          
          if (vacanteDoc.exists()) {
            const vacanteData = vacanteDoc.data();
            console.log('✅ Vacante encontrada:', vacanteData);
            
            // Obtener datos de la empresa
            let empresaNombre = 'Empresa';
            let empresaLogo = 'https://via.placeholder.com/40';
            
            if (postulacionData.empresaId) {
              const empresaDoc = await getDoc(doc(db, 'empresas', postulacionData.empresaId));
              if (empresaDoc.exists()) {
                const empresaData = empresaDoc.data();
                empresaNombre = empresaData.nombre || vacanteData.empresaNombre || 'Empresa';
                empresaLogo = empresaData.logo || vacanteData.empresaLogo || 'https://via.placeholder.com/40';
              }
            }

            vacanteInfo = {
              titulo: vacanteData.titulo || 'Título no disponible',
              empresa: empresaNombre,
              empresaLogo: empresaLogo,
              ubicacion: vacanteData.ubicacion || 'Ubicación no especificada',
              tipo: vacanteData.tipo || 'Tipo no especificado',
              salario: vacanteData.salarioMin && vacanteData.salarioMax 
                ? `$${vacanteData.salarioMin} - $${vacanteData.salarioMax} ${vacanteData.moneda || 'USD'}`
                : 'Salario no especificado',
              fechaPublicacion: vacanteData.fechaPublicacion,
            };
          } else {
            console.log('❌ Vacante no encontrada con ID:', postulacionData.vacanteId);
          }
        }

        const postulacionCompleta: Postulacion = {
          id: docSnap.id,
          vacanteId: postulacionData.vacanteId,
          estudianteId: postulacionData.estudianteId,
          empresaId: postulacionData.empresaId,
          fechaPostulacion: postulacionData.fechaPostulacion,
          estado: postulacionData.estado || 'pendiente',
          ultimaActualizacion: postulacionData.ultimaActualizacion || postulacionData.fechaPostulacion,
          mensajeEmpresa: postulacionData.mensajeEmpresa,
          mensajePersonalizado: postulacionData.mensajePersonalizado,
          cvSeleccionado: postulacionData.cvSeleccionado,
          activa: postulacionData.activa !== false,
          vacante: vacanteInfo
        };

        postulacionesCompletas.push(postulacionCompleta);
        
      } catch (error) {
        console.error('❌ Error procesando postulación:', docSnap.id, error);
      }
    }

    console.log('✅ Postulaciones cargadas exitosamente:', postulacionesCompletas.length);
    setPostulaciones(postulacionesCompletas);

  } catch (error) {
    console.error('❌ Error cargando postulaciones:', error);
    Alert.alert('Error', 'No se pudieron cargar las postulaciones: ' + error.message);
  } finally {
    setLoading(false);
  }
};

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return '#ffc107';
      case 'revisado':
        return '#17a2b8';
      case 'entrevista':
        return '#28a745';
      case 'rechazado':
        return '#dc3545';
      case 'contratado':
        return '#007bff';
      default:
        return '#6c757d';
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

  const formatTime = (timestamp: any) => {
    if (!timestamp) return 'Fecha no disponible';
    
    const fecha = timestamp.toDate();
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
    if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} sem`;
    
    return fecha.toLocaleDateString('es-ES');
  };

  const getPostulantesText = () => {
    // Simulamos por ahora
    return `2 postulantes`;
  };

  // 🔥 SOLUCIÓN: Solo navegar si está montado
  const handlePostulacionPress = (postulacion: Postulacion) => {
    if (mounted) {
      router.push(`/detalles-postulacion?id=${postulacion.id}`);
    }
  };

  const handleVacantePress = (vacanteId: string) => {
    if (mounted) {
      router.push(`/job-details?id=${vacanteId}`);
    }
  };

  const filteredPostulaciones = postulaciones.filter(postulacion => 
    activeFilter === 'todas' ? true : postulacion.estado === activeFilter
  );

  const stats = {
    total: postulaciones.length,
    pendientes: postulaciones.filter(p => p.estado === 'pendiente').length,
    entrevistas: postulaciones.filter(p => p.estado === 'entrevista').length,
    rechazados: postulaciones.filter(p => p.estado === 'rechazado').length,
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPostulacionesReales();
    setRefreshing(false);
  };

  // 🔥 SOLUCIÓN: Mostrar loading hasta que esté montado
  if (loading || !mounted) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#d90429" />
        <Text style={styles.loadingText}>Cargando postulaciones...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mis Postulaciones</Text>
        <Text style={styles.headerSubtitle}>
          {stats.total} postulación{stats.total !== 1 ? 'es' : ''} en total
        </Text>
      </View>

      {/* Estadísticas rápidas */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, styles.statPending]}>{stats.pendientes}</Text>
          <Text style={styles.statLabel}>Pendientes</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, styles.statInterview]}>{stats.entrevistas}</Text>
          <Text style={styles.statLabel}>Entrevistas</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, styles.statRejected]}>{stats.rechazados}</Text>
          <Text style={styles.statLabel}>Rechazados</Text>
        </View>
      </View>

      {/* Filtros */}
      <ScrollView horizontal style={styles.filterScroll} showsHorizontalScrollIndicator={false}>
        <View style={styles.filterContainer}>
          {[
            { key: 'todas' as const, label: 'Todas' },
            { key: 'pendiente' as const, label: 'Pendientes' },
            { key: 'entrevista' as const, label: 'Entrevistas' },
            { key: 'rechazado' as const, label: 'Rechazados' }
          ].map((filter) => (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.filterButton,
                activeFilter === filter.key && styles.filterButtonActive
              ]}
              onPress={() => setActiveFilter(filter.key)}
            >
              <Text style={[
                styles.filterText,
                activeFilter === filter.key && styles.filterTextActive
              ]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Lista de Postulaciones */}
      <ScrollView
        style={styles.postulacionesList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredPostulaciones.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>📋</Text>
            <Text style={styles.emptyStateTitle}>
              {activeFilter === 'todas' 
                ? 'No hay postulaciones' 
                : `No hay postulaciones ${activeFilter}s`
              }
            </Text>
            <Text style={styles.emptyStateText}>
              {activeFilter === 'todas' 
                ? 'Cuando te postules a empleos, aparecerán aquí.'
                : `No tienes postulaciones con estado "${activeFilter}"`
              }
            </Text>
            <TouchableOpacity 
              style={styles.browseJobsButton}
              onPress={() => mounted && router.push('/home')}
            >
              <Text style={styles.browseJobsText}>Buscar Empleos</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredPostulaciones.map((postulacion) => (
            <View key={postulacion.id} style={styles.postulacionCard}>
              {/* Header de la postulación */}
              <View style={styles.postulacionHeader}>
                <TouchableOpacity 
                  style={styles.vacanteInfo}
                  onPress={() => handleVacantePress(postulacion.vacanteId)}
                >
                  <Image
                    source={{ uri: postulacion.vacante?.empresaLogo || 'https://via.placeholder.com/40' }}
                    style={styles.empresaLogo}
                  />
                  <View style={styles.vacanteDetails}>
                    <Text style={styles.vacanteTitle}>
                      {postulacion.vacante?.titulo || 'Vacante no disponible'}
                    </Text>
                    <Text style={styles.empresaName}>
                      {postulacion.vacante?.empresa || 'Empresa no disponible'}
                    </Text>
                  </View>
                </TouchableOpacity>
                
                <View style={styles.estadoContainer}>
                  <View 
                    style={[
                      styles.estadoBadge,
                      { backgroundColor: getEstadoColor(postulacion.estado) }
                    ]}
                  >
                    <Text style={styles.estadoText}>
                      {getEstadoText(postulacion.estado)}
                    </Text>
                  </View>
                  <Text style={styles.postulantesText}>
                    {getPostulantesText()}
                  </Text>
                </View>
              </View>

              {/* Detalles de la vacante */}
              {postulacion.vacante && (
                <View style={styles.vacanteMeta}>
                  <Text style={styles.vacanteMetaItem}>📍 {postulacion.vacante.ubicacion}</Text>
                  <Text style={styles.vacanteMetaItem}>⏱️ {postulacion.vacante.tipo}</Text>
                  {postulacion.vacante.salario && (
                    <Text style={styles.vacanteMetaItem}>💰 {postulacion.vacante.salario}</Text>
                  )}
                </View>
              )}

              {/* Información de la postulación */}
              <View style={styles.postulacionInfo}>
                <View style={styles.postulacionMeta}>
                  <Text style={styles.postulacionDate}>
                    📅 Postulaste {formatTime(postulacion.fechaPostulacion)}
                  </Text>
                  <Text style={styles.actualizacionDate}>
                    🔄 {formatTime(postulacion.ultimaActualizacion)}
                  </Text>
                </View>

                {postulacion.mensajeEmpresa && (
                  <View style={styles.mensajeContainer}>
                    <Text style={styles.mensajeLabel}>Mensaje de la empresa:</Text>
                    <Text style={styles.mensajeText}>{postulacion.mensajeEmpresa}</Text>
                  </View>
                )}

                {postulacion.mensajePersonalizado && (
                  <View style={styles.mensajeContainer}>
                    <Text style={styles.mensajeLabel}>Tu mensaje:</Text>
                    <Text style={styles.mensajeText}>{postulacion.mensajePersonalizado}</Text>
                  </View>
                )}

                {/* Acciones */}
                <View style={styles.actionsContainer}>
                  <TouchableOpacity 
                    style={styles.detallesButton}
                    onPress={() => handlePostulacionPress(postulacion)}
                  >
                    <Text style={styles.detallesButtonText}>Ver detalles</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.vacanteButton}
                    onPress={() => handleVacantePress(postulacion.vacanteId)}
                  >
                    <Text style={styles.vacanteButtonText}>Ver vacante</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
};

// Los estilos se mantienen igual...
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
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#6c757d',
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212529',
  },
  statPending: {
    color: '#ffc107',
  },
  statInterview: {
    color: '#28a745',
  },
  statRejected: {
    color: '#dc3545',
  },
  statLabel: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 4,
  },
  filterScroll: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  filterButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
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
  postulacionesList: {
    flex: 1,
    padding: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateIcon: {
    fontSize: 64,
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
    marginBottom: 24,
  },
  browseJobsButton: {
    backgroundColor: '#d90429',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  browseJobsText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  postulacionCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  postulacionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  vacanteInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  empresaLogo: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: 12,
  },
  vacanteDetails: {
    flex: 1,
  },
  vacanteTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 2,
  },
  empresaName: {
    fontSize: 14,
    color: '#6c757d',
  },
  estadoContainer: {
    alignItems: 'flex-end',
  },
  estadoBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  estadoText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  postulantesText: {
    fontSize: 10,
    color: '#6c757d',
  },
  vacanteMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  vacanteMetaItem: {
    fontSize: 12,
    color: '#495057',
    marginRight: 16,
    marginBottom: 4,
  },
  postulacionInfo: {
    borderTopWidth: 1,
    borderTopColor: '#f1f3f4',
    paddingTop: 12,
  },
  postulacionMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  postulacionDate: {
    fontSize: 12,
    color: '#495057',
  },
  actualizacionDate: {
    fontSize: 12,
    color: '#6c757d',
  },
  mensajeContainer: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#007bff',
  },
  mensajeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007bff',
    marginBottom: 4,
  },
  mensajeText: {
    fontSize: 12,
    color: '#495057',
    lineHeight: 16,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  detallesButton: {
    flex: 1,
    backgroundColor: '#007bff',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  detallesButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  vacanteButton: {
    flex: 1,
    backgroundColor: '#6c757d',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  vacanteButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default MisPostulacionesScreen;