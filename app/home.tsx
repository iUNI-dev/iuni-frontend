// app/home.tsx
import { useRouter } from 'expo-router';
import { signOut } from 'firebase/auth';
import { collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Image,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { auth, db } from '../src/firebase/firebase';

const { width: screenWidth } = Dimensions.get('window');

// Tipos de datos (se mantienen igual)
type Job = {
  id: string;
  titulo: string;
  empresa: string;
  ubicacion: string;
  tipo: string;
  salario: string;
  fecha: string;
  logo: string;
};

type RecentSearch = {
  id: string;
  query: string;
  fecha: string;
};

const HomeScreen = () => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [location, setLocation] = useState('');
  const [recentJobs, setRecentJobs] = useState<Job[]>([]);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Cargar datos del usuario y empleos
  useEffect(() => {
    loadUserData();
    loadRecentJobs();
    loadRecentSearches();
  }, []);

  const loadUserData = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        // Obtener datos del estudiante
        const studentQuery = query(
          collection(db, 'students'),
          where('userId', '==', user.uid)
        );
        const snapshot = await getDocs(studentQuery);
        
        if (!snapshot.empty) {
          const studentData = snapshot.docs[0].data();
          setUserName(studentData.nombres || 'Estudiante');
        }
      }
    } catch (error) {
      console.error('Error cargando datos del usuario:', error);
    }
  };

  const loadRecentJobs = async () => {
    try {
      // Simular datos de empleos recientes
      const mockJobs: Job[] = [
        {
          id: '1',
          titulo: 'Desarrollador Frontend React',
          empresa: 'Tech Solutions SA',
          ubicacion: 'San Salvador',
          tipo: 'Tiempo completo',
          salario: '$800 - $1200',
          fecha: 'Hace 2 horas',
          logo: 'https://via.placeholder.com/40'
        },
        {
          id: '2',
          titulo: 'Diseñador UX/UI',
          empresa: 'Creative Studio',
          ubicacion: 'Santa Ana',
          tipo: 'Medio tiempo',
          salario: '$600 - $900',
          fecha: 'Hace 4 horas',
          logo: 'https://via.placeholder.com/40'
        },
        {
          id: '3',
          titulo: 'Analista de Datos',
          empresa: 'Data Insights',
          ubicacion: 'San Miguel',
          tipo: 'Tiempo completo',
          salario: '$900 - $1300',
          fecha: 'Hace 1 día',
          logo: 'https://via.placeholder.com/40'
        }
      ];
      setRecentJobs(mockJobs);
    } catch (error) {
      console.error('Error cargando empleos:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRecentSearches = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const searchesQuery = query(
          collection(db, 'recent_searches'),
          where('userId', '==', user.uid),
          orderBy('fecha', 'desc'),
          limit(5)
        );
        const snapshot = await getDocs(searchesQuery);
        const searches = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as RecentSearch[];
        setRecentSearches(searches);
      }
    } catch (error) {
      console.error('Error cargando búsquedas:', error);
    }
  };

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      Alert.alert('Error', 'Por favor ingresa un término de búsqueda');
      return;
    }

    // Guardar búsqueda reciente
    saveRecentSearch(searchQuery);
    
    // Navegar a resultados de búsqueda
    router.push(`/search-results?query=${encodeURIComponent(searchQuery)}&location=${encodeURIComponent(location)}`);
  };

  const saveRecentSearch = async (query: string) => {
    try {
      const user = auth.currentUser;
      if (user) {
        console.log('Guardando búsqueda:', query);
      }
    } catch (error) {
      console.error('Error guardando búsqueda:', error);
    }
  };

  const handleJobPress = (jobId: string) => {
    router.push(`/job-details?id=${jobId}`);
  };

  const handleQuickSearch = (category: string) => {
    setSearchQuery(category);
    handleSearch();
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadRecentJobs(), loadRecentSearches(), loadUserData()]);
    setRefreshing(false);
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.replace('/login');
    } catch (error) {
      console.error('Error cerrando sesión:', error);
      Alert.alert('Error', 'No se pudo cerrar sesión');
    }
  };

  const quickSearchCategories = [
    'Desarrollador Web',
    'Diseñador UX/UI',
    'Analista de Datos',
    'Marketing Digital',
    'Atención al Cliente',
    'Administración'
  ];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#d90429" />
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Banner Section con Header */}
      <View style={styles.bannerSection}>
        {/* Banner de fondo */}
        <Image 
          source={require('../assets/images/bannerstudents.jpg')} 
          style={styles.bannerImage}
          resizeMode="cover"
        />
        
        {/* Overlay oscuro para mejor contraste */}
        <View style={styles.bannerOverlay} />
        
        {/* Header sobre el banner */}
        <View style={styles.header}>
          {/* Logo en esquina izquierda */}
          <Image
            source={require('../assets/images/logo-texto.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          
          <View style={styles.headerRight}>
            {/* Notificaciones */}
            <TouchableOpacity 
              style={styles.iconButton}
              onPress={() => setShowNotifications(!showNotifications)}
            >
              <Text style={styles.icon}>🔔</Text>
            </TouchableOpacity>

            {/* Menú de perfil */}
            <TouchableOpacity 
              style={styles.profileButton}
              onPress={() => setShowProfileMenu(!showProfileMenu)}
            >
              <Image
                source={{ uri: auth.currentUser?.photoURL || 'https://via.placeholder.com/40' }}
                style={styles.profileImage}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Barra de búsqueda sobre el banner */}
        <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
            <View style={styles.searchRow}>
              <View style={styles.searchInputContainer}>
                <Text style={styles.searchLabel}>Lugar</Text>
                <TextInput
                  style={styles.searchInput}
                  placeholder="¿Dónde?"
                  placeholderTextColor="#999"
                  value={location}
                  onChangeText={setLocation}
                />
              </View>
              
              <View style={styles.searchInputContainer}>
                <Text style={styles.searchLabel}>Puesto/Cargo o Categoría</Text>
                <TextInput
                  style={styles.searchInput}
                  placeholder="¿Qué empleo buscas?"
                  placeholderTextColor="#999"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>
              
              <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
                <Text style={styles.searchButtonText}>🔍 Buscar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Texto de bienvenida sobre el banner */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeTitle}>Hola, {userName}</Text>
          <Text style={styles.welcomeSubtitle}>Encuentra tu empleo ideal</Text>
        </View>
      </View>

      {/* Menú de notificaciones */}
      {showNotifications && (
        <View style={styles.dropdownMenu}>
          <Text style={styles.dropdownTitle}>Notificaciones</Text>
          <View style={styles.notificationItem}>
            <Text style={styles.notificationText}>Nueva vacante: Desarrollador Frontend</Text>
            <Text style={styles.notificationTime}>Hace 2h</Text>
          </View>
          <View style={styles.notificationItem}>
            <Text style={styles.notificationText}>Tu postulación fue vista</Text>
            <Text style={styles.notificationTime}>Hace 4h</Text>
          </View>
          <TouchableOpacity 
            style={styles.seeAllButton}
            onPress={() => router.push('/notificaciones')}
          >
            <Text style={styles.seeAllText}>Ver todas</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Menú de perfil */}
      {showProfileMenu && (
        <View style={[styles.dropdownMenu, styles.profileMenu]}>
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => router.push('/miscvs')}
          >
            <Text style={styles.menuText}>📄 Mis CV</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => router.push('/mispostulaciones')}
          >
            <Text style={styles.menuText}>📋 Mis Postulaciones</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => router.push('/favoritos')}
          >
            <Text style={styles.menuText}>❤️ Mis Favoritos</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => router.push('/visualizacionprofile')}
          >
            <Text style={styles.menuText}>👁️ Quién vio mi perfil</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => router.push('/configuracion')}
          >
            <Text style={styles.menuText}>⚙️ Configuración</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.menuItem, styles.signOutButton]}
            onPress={handleSignOut}
          >
            <Text style={styles.signOutText}>🚪 Cerrar Sesión</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Contenido principal debajo del banner */}
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Búsquedas rápidas */}
        <View style={styles.quickSearchSection}>
          <Text style={styles.sectionTitle}>Búsquedas populares</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.quickSearchContainer}>
              {quickSearchCategories.map((category, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.quickSearchButton}
                  onPress={() => handleQuickSearch(category)}
                >
                  <Text style={styles.quickSearchText}>{category}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Búsquedas recientes */}
        {recentSearches.length > 0 && (
          <View style={styles.recentSearchesSection}>
            <Text style={styles.sectionTitle}>Búsquedas recientes</Text>
            <View style={styles.recentSearchesContainer}>
              {recentSearches.map((search) => (
                <TouchableOpacity
                  key={search.id}
                  style={styles.recentSearchItem}
                  onPress={() => setSearchQuery(search.query)}
                >
                  <Text style={styles.recentSearchText}>🔍 {search.query}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Empleos recientes */}
        <View style={styles.jobsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Empleos recientes</Text>
            <TouchableOpacity onPress={() => router.push('/all-jobs')}>
              <Text style={styles.seeAllLink}>Ver todos</Text>
            </TouchableOpacity>
          </View>

          {recentJobs.map((job) => (
            <TouchableOpacity
              key={job.id}
              style={styles.jobCard}
              onPress={() => handleJobPress(job.id)}
            >
              <View style={styles.jobHeader}>
                <Image source={{ uri: job.logo }} style={styles.companyLogo} />
                <View style={styles.jobInfo}>
                  <Text style={styles.jobTitle}>{job.titulo}</Text>
                  <Text style={styles.companyName}>{job.empresa}</Text>
                </View>
              </View>
              <View style={styles.jobDetails}>
                <Text style={styles.jobDetail}>📍 {job.ubicacion}</Text>
                <Text style={styles.jobDetail}>⏱️ {job.tipo}</Text>
                <Text style={styles.jobDetail}>💰 {job.salario}</Text>
              </View>
              <Text style={styles.jobDate}>{job.fecha}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Banner para empleadores */}
        <View style={styles.employerBanner}>
          <Text style={styles.employerTitle}>¿Buscas empleados?</Text>
          <Text style={styles.employerText}>Publica tus vacantes y encuentra el talento ideal</Text>
          <TouchableOpacity 
            style={styles.employerButton}
            onPress={() => router.push('/employer-dashboard')}
          >
            <Text style={styles.employerButtonText}>Ir a panel de empleadores</Text>
          </TouchableOpacity>
        </View>
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
  // Banner Section
  bannerSection: {
    height: 320, // Altura del banner
    position: 'relative',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  bannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)', // Overlay oscuro para mejor contraste
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    zIndex: 10,
  },
  logo: {
    width: 150,
    height: 40,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: 8,
    marginRight: 12,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 16,
  },
  profileButton: {
    padding: 2,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 20,
  },
  profileImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  // Search Section sobre el banner
  searchSection: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    zIndex: 10,
  },
  searchContainer: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  searchInputContainer: {
    flex: 1,
  },
  searchLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#d90429',
    marginBottom: 4,
    marginLeft: 4,
  },
  searchInput: {
    height: 50,
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 14,
    backgroundColor: '#fff',
  },
  searchButton: {
    backgroundColor: '#d90429',
    height: 50,
    width: 120,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  // Welcome Section sobre el banner
  welcomeSection: {
    position: 'absolute',
    top: 120,
    left: 20,
    zIndex: 10,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#fff',
    marginTop: 4,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
  },
  // Dropdown Menus
  dropdownMenu: {
    position: 'absolute',
    top: 100,
    right: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    zIndex: 1000,
    minWidth: 200,
  },
  profileMenu: {
    minWidth: 220,
  },
  dropdownTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#212529',
  },
  notificationItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
  },
  notificationText: {
    fontSize: 14,
    color: '#212529',
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 12,
    color: '#6c757d',
  },
  seeAllButton: {
    marginTop: 8,
    paddingVertical: 8,
  },
  seeAllText: {
    color: '#d90429',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  menuItem: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
  },
  menuText: {
    fontSize: 15,
    color: '#212529',
  },
  signOutButton: {
    borderBottomWidth: 0,
    marginTop: 4,
  },
  signOutText: {
    fontSize: 15,
    color: '#dc3545',
    fontWeight: '600',
  },
  // Contenido principal
  scrollView: {
    flex: 1,
    marginTop: 0,
  },
  quickSearchSection: {
    padding: 20,
    backgroundColor: '#fff',
    marginTop: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 16,
  },
  quickSearchContainer: {
    flexDirection: 'row',
  },
  quickSearchButton: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  quickSearchText: {
    color: '#495057',
    fontSize: 14,
  },
  recentSearchesSection: {
    padding: 20,
    backgroundColor: '#fff',
    marginTop: 8,
  },
  recentSearchesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  recentSearchItem: {
    backgroundColor: '#e7f3ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  recentSearchText: {
    color: '#0066cc',
    fontSize: 12,
  },
  jobsSection: {
    padding: 20,
    backgroundColor: '#fff',
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  seeAllLink: {
    color: '#d90429',
    fontSize: 14,
    fontWeight: '600',
  },
  jobCard: {
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
  jobHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  companyLogo: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: 12,
  },
  jobInfo: {
    flex: 1,
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 4,
  },
  companyName: {
    fontSize: 14,
    color: '#6c757d',
  },
  jobDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  jobDetail: {
    fontSize: 12,
    color: '#495057',
    marginRight: 16,
    marginBottom: 4,
  },
  jobDate: {
    fontSize: 11,
    color: '#6c757d',
    textAlign: 'right',
  },
  employerBanner: {
    margin: 20,
    padding: 20,
    backgroundColor: '#d90429',
    borderRadius: 12,
    alignItems: 'center',
  },
  employerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  employerText: {
    fontSize: 14,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 16,
    opacity: 0.9,
  },
  employerButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  employerButtonText: {
    color: '#d90429',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default HomeScreen;