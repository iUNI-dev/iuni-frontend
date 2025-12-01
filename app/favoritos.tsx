// app/favoritos.tsx
import { useRouter } from 'expo-router';
import {
  collection,
  deleteDoc,
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

type Favorito = {
  id: string;
  vacanteId: string;
  estudianteId: string;
  fechaAgregado: any;
  
  // Datos de la vacante
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

const FavoritosScreen = () => {
  const router = useRouter();
  const [favoritos, setFavoritos] = useState<Favorito[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    checkUserAndLoadFavoritos();
  }, []);

  const checkUserAndLoadFavoritos = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        console.log('❌ Usuario no autenticado');
        router.replace('/login');
        return;
      }

      console.log('👤 Usuario autenticado:', user.uid);
      await loadFavoritos(user.uid);
    } catch (error) {
      console.error('Error verificando usuario:', error);
    }
  };

  const loadFavoritos = async (userId: string) => {
    try {
      console.log('🔄 Cargando favoritos para usuario:', userId);

      // Consulta para obtener favoritos del usuario
      const favoritosQuery = query(
        collection(db, 'favoritos'),
        where('estudianteId', '==', userId),
        orderBy('fechaAgregado', 'desc')
      );
      
      const favoritosSnapshot = await getDocs(favoritosQuery);
      console.log('❤️ Favoritos encontrados:', favoritosSnapshot.size);

      if (favoritosSnapshot.empty) {
        console.log('📭 No hay favoritos para este usuario');
        setFavoritos([]);
        return;
      }

      // Obtener datos completos de cada favorito
      const favoritosCompletos: Favorito[] = [];
      
      for (const docSnap of favoritosSnapshot.docs) {
        try {
          const favoritoData = docSnap.data();
          console.log('📋 Procesando favorito:', docSnap.id, favoritoData);
          
          let vacanteInfo = null;

          // Obtener datos de la vacante
          if (favoritoData.vacanteId) {
            console.log('🔍 Buscando vacante:', favoritoData.vacanteId);
            const vacanteDoc = await getDoc(doc(db, 'vacantes', favoritoData.vacanteId));
            
            if (vacanteDoc.exists()) {
              const vacanteData = vacanteDoc.data();
              console.log('✅ Vacante encontrada:', vacanteData.titulo);
              
              // Obtener datos de la empresa
              let empresaNombre = 'Empresa';
              let empresaLogo = 'https://via.placeholder.com/40';
              
              if (vacanteData.empresaId) {
                const empresaDoc = await getDoc(doc(db, 'empresas', vacanteData.empresaId));
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
              console.log('❌ Vacante no encontrada con ID:', favoritoData.vacanteId);
            }
          }

          const favoritoCompleto: Favorito = {
            id: docSnap.id,
            vacanteId: favoritoData.vacanteId,
            estudianteId: favoritoData.estudianteId,
            fechaAgregado: favoritoData.fechaAgregado,
            vacante: vacanteInfo
          };

          favoritosCompletos.push(favoritoCompleto);
          
        } catch (error) {
          console.error('❌ Error procesando favorito:', docSnap.id, error);
        }
      }

      console.log('✅ Favoritos cargados exitosamente:', favoritosCompletos.length);
      setFavoritos(favoritosCompletos);

    } catch (error) {
      console.error('❌ Error cargando favoritos:', error);
      Alert.alert('Error', 'No se pudieron cargar los favoritos: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const eliminarFavorito = async (favoritoId: string) => {
    try {
      await deleteDoc(doc(db, 'favoritos', favoritoId));
      
      // Actualizar lista local
      setFavoritos(prev => prev.filter(fav => fav.id !== favoritoId));
      
      Alert.alert('Éxito', 'Vacante eliminada de favoritos');
    } catch (error) {
      console.error('Error eliminando favorito:', error);
      Alert.alert('Error', 'No se pudo eliminar de favoritos');
    }
  };

  const handleVacantePress = (vacanteId: string) => {
    router.push(`/job-details?id=${vacanteId}`);
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return 'Fecha no disponible';
    
    const fecha = timestamp.toDate();
    const now = new Date();
    const diffMs = now.getTime() - fecha.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `Hace ${diffDays} días`;
    if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} sem`;
    
    return fecha.toLocaleDateString('es-ES');
  };

  const onRefresh = async () => {
    setRefreshing(true);
    const user = auth.currentUser;
    if (user) {
      await loadFavoritos(user.uid);
    }
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#d90429" />
        <Text style={styles.loadingText}>Cargando favoritos...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {/* CAMBIO 1: Logo de texto arriba del título */}
        <View style={styles.logoContainer}>
          <Image
            source={require('../assets/images/logo-texto.png')}
            style={styles.headerLogoTexto}
            resizeMode="contain"
          />
        </View>
        
        {/* CAMBIO 2: Contenido del header con margen superior */}
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Mis Favoritos</Text>
          <Text style={styles.headerSubtitle}>
            {favoritos.length} vacante{favoritos.length !== 1 ? 's' : ''} guardada{favoritos.length !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      {/* Lista de Favoritos */}
      <ScrollView
        style={styles.favoritosList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {favoritos.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>❤️</Text>
            <Text style={styles.emptyStateTitle}>No hay favoritos</Text>
            <Text style={styles.emptyStateText}>
              Cuando guardes vacantes que te interesen, aparecerán aquí.
            </Text>
            <TouchableOpacity 
              style={styles.browseJobsButton}
              onPress={() => router.push('/home')}
            >
              <Text style={styles.browseJobsText}>Buscar Empleos</Text>
            </TouchableOpacity>
          </View>
        ) : (
          favoritos.map((favorito) => (
            <View key={favorito.id} style={styles.favoritoCard}>
              {/* Header del favorito */}
              <View style={styles.favoritoHeader}>
                <TouchableOpacity 
                  style={styles.vacanteInfo}
                  onPress={() => handleVacantePress(favorito.vacanteId)}
                >
                  <Image
                    source={{ uri: favorito.vacante?.empresaLogo || 'https://via.placeholder.com/40' }}
                    style={styles.empresaLogo}
                  />
                  <View style={styles.vacanteDetails}>
                    <Text style={styles.vacanteTitle}>
                      {favorito.vacante?.titulo || 'Vacante no disponible'}
                    </Text>
                    <Text style={styles.empresaName}>
                      {favorito.vacante?.empresa || 'Empresa no disponible'}
                    </Text>
                  </View>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.eliminarButton}
                  onPress={() => eliminarFavorito(favorito.id)}
                >
                  <Text style={styles.eliminarText}>🗑️</Text>
                </TouchableOpacity>
              </View>

              {/* Detalles de la vacante */}
              {favorito.vacante && (
                <View style={styles.vacanteMeta}>
                  <Text style={styles.vacanteMetaItem}>📍 {favorito.vacante.ubicacion}</Text>
                  <Text style={styles.vacanteMetaItem}>⏱️ {favorito.vacante.tipo}</Text>
                  {favorito.vacante.salario && (
                    <Text style={styles.vacanteMetaItem}>💰 {favorito.vacante.salario}</Text>
                  )}
                </View>
              )}

              {/* Información del favorito */}
              <View style={styles.favoritoInfo}>
                <Text style={styles.favoritoDate}>
                  ⭐ Guardado {formatTime(favorito.fechaAgregado)}
                </Text>

                {/* Acciones */}
                <View style={styles.actionsContainer}>
                  <TouchableOpacity 
                    style={styles.verButton}
                    onPress={() => handleVacantePress(favorito.vacanteId)}
                  >
                    <Text style={styles.verButtonText}>Ver Vacante</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.postularButton}
                    onPress={() => router.push(`/aplicar-vacante?id=${favorito.vacanteId}`)}
                  >
                    <Text style={styles.postularButtonText}>Postularme</Text>
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

// CAMBIO 3: Estilos actualizados para el logo de texto
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
  // CAMBIO 4: Header modificado para incluir el logo
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    position: 'relative', // Necesario para posicionar el logo absolutamente
  },
  // CAMBIO 5: Contenedor del logo
  logoContainer: {
    position: 'absolute',
    top: 10, // Posición desde la parte superior
    left: 0,
    right: 0,
    alignItems: 'center', // Centra el logo horizontalmente
    marginBottom: 16,
  },
  // CAMBIO 6: Estilo específico para el logo de texto
  headerLogoTexto: {
    width: 150, // Ancho adecuado para logo con texto
    height: 150, // Alto adecuado para logo con texto
  },
  // CAMBIO 7: Contenido del header con margen para el logo
  headerContent: {
    marginTop: 40, // Espacio para que el texto quede debajo del logo
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212529',
    textAlign: 'center', // Centrado para mejor presentación
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#6c757d',
    marginTop: 4,
    textAlign: 'center', // Centrado para mejor presentación
  },
  favoritosList: {
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
  favoritoCard: {
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
  favoritoHeader: {
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
  eliminarButton: {
    padding: 8,
  },
  eliminarText: {
    fontSize: 16,
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
  favoritoInfo: {
    borderTopWidth: 1,
    borderTopColor: '#f1f3f4',
    paddingTop: 12,
  },
  favoritoDate: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 12,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  verButton: {
    flex: 1,
    backgroundColor: '#007bff',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  verButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  postularButton: {
    flex: 1,
    backgroundColor: '#d90429',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  postularButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default FavoritosScreen;