// app/search-results.tsx
import { useLocalSearchParams, useRouter } from 'expo-router';
import { collection, getDocs, query } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    useColorScheme
} from 'react-native';
import { db } from '../src/firebase/firebase';

type Job = {
  id: string;
  titulo: string;
  empresa: string;
  ubicacion: string;
  tipo: string;
  salario: string;
  fecha: string;
  logo: string;
  descripcion?: string;
};

const SearchResultsScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = colorScheme === 'dark' 
    ? { background: '#1a1a1a', text: '#ffffff', card: '#2a2a2a' }
    : { background: '#ffffff', text: '#1a1a1a', card: '#f8f9fa' };

  const [jobs, setJobs] = useState<Job[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('Todos');

  // Obtener parámetros de búsqueda de la URL
  const initialQuery = params.query ? String(params.query) : '';
  const initialLocation = params.location ? String(params.location) : '';

  const filters = ['Todos', 'Tiempo completo', 'Medio tiempo', 'Prácticas', 'Remoto'];

  useEffect(() => {
    // Establecer valores iniciales de búsqueda
    setSearchQuery(initialQuery);
    setLocationFilter(initialLocation);
    
    // Cargar trabajos
    loadAllJobs();
  }, []);

  useEffect(() => {
    // Aplicar filtros cuando cambian los datos o los filtros
    filterJobs();
  }, [jobs, searchQuery, locationFilter, selectedFilter]);

  const loadAllJobs = async () => {
    try {
      setLoading(true);

      // Cargar todas las vacantes desde Firebase
      const vacantesQuery = query(collection(db, 'vacantes'));
      const querySnapshot = await getDocs(vacantesQuery);
      const jobsData: Job[] = [];
      
      for (const docSnap of querySnapshot.docs) {
        const vacanteData = docSnap.data();
        
        // Filtrar solo vacantes activas
        if (vacanteData.activa !== true) {
          continue;
        }

        // Formatear salario
        let salarioTexto = 'Salario a convenir';
        if (vacanteData.salarioMin && vacanteData.salarioMax) {
          salarioTexto = `$${vacanteData.salarioMin} - $${vacanteData.salarioMax} ${vacanteData.moneda || 'USD'}`;
        } else if (vacanteData.salarioMin) {
          salarioTexto = `Desde $${vacanteData.salarioMin} ${vacanteData.moneda || 'USD'}`;
        }

        // Formatear fecha
        let fechaTexto = 'Fecha no disponible';
        if (vacanteData.fechaPublicacion) {
          const fecha = vacanteData.fechaPublicacion.toDate 
            ? vacanteData.fechaPublicacion.toDate() 
            : new Date(vacanteData.fechaPublicacion);
          const ahora = new Date();
          const diferencia = ahora.getTime() - fecha.getTime();
          const horas = Math.floor(diferencia / (1000 * 60 * 60));
          const dias = Math.floor(horas / 24);
          
          if (dias > 0) {
            fechaTexto = `Hace ${dias} dia${dias > 1 ? 's' : ''}`;
          } else if (horas > 0) {
            fechaTexto = `Hace ${horas} hora${horas > 1 ? 's' : ''}`;
          } else {
            fechaTexto = 'Hace menos de 1 hora';
          }
        }

        const job: Job = {
          id: docSnap.id,
          titulo: vacanteData.titulo || 'Título no disponible',
          empresa: vacanteData.empresaNombre || 'Empresa',
          ubicacion: vacanteData.ubicacion || 'Ubicación no especificada',
          tipo: vacanteData.tipo || 'Tiempo completo',
          salario: salarioTexto,
          fecha: fechaTexto,
          logo: 'https://via.placeholder.com/40',
          descripcion: vacanteData.descripcion || ''
        };

        jobsData.push(job);
      }

      // Ordenar por fecha de publicación (más recientes primero)
      jobsData.sort((a, b) => {
        // Si no hay fecha, poner al final
        if (!a.fecha || a.fecha === 'Fecha no disponible') return 1;
        if (!b.fecha || b.fecha === 'Fecha no disponible') return -1;

        // Ordenar por fecha más reciente primero
        return b.fecha.localeCompare(a.fecha);
      });

      setJobs(jobsData);
    } catch (error) {
      console.error('Error cargando empleos:', error);
      Alert.alert('Error', 'No se pudieron cargar los empleos. Intenta de nuevo más tarde.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterJobs = () => {
    let filtered = jobs;

    // Filtrar por búsqueda de texto
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(job =>
        job.titulo.toLowerCase().includes(query) ||
        job.empresa.toLowerCase().includes(query) ||
        job.descripcion?.toLowerCase().includes(query) ||
        job.tipo.toLowerCase().includes(query)
      );
    }

    // Filtrar por ubicación
    if (locationFilter.trim()) {
      const location = locationFilter.toLowerCase();
      filtered = filtered.filter(job => 
        job.ubicacion.toLowerCase().includes(location)
      );
    }

    // Filtrar por tipo
    if (selectedFilter !== 'Todos') {
      filtered = filtered.filter(job => job.tipo === selectedFilter);
    }

    setFilteredJobs(filtered);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadAllJobs();
  };

  const handleJobPress = (jobId: string) => {
    router.push(`/job-details?id=${jobId}`);
  };

  const handleSearch = () => {
    filterJobs();
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setLocationFilter('');
    setSelectedFilter('Todos');
  };

  const renderJobItem = ({ item }: { item: Job }) => (
    <TouchableOpacity
      style={[styles.jobCard, { backgroundColor: theme.card, borderColor: '#e0e0e0' }]}
      onPress={() => handleJobPress(item.id)}
    >
      <View style={styles.jobHeader}>
        <Image source={{ uri: item.logo }} style={styles.companyLogo} />
        <View style={styles.jobInfo}>
          <Text style={[styles.jobTitle, { color: theme.text }]}>{item.titulo}</Text>
          <Text style={[styles.companyName, { color: theme.text + '80' }]}>{item.empresa}</Text>
        </View>
      </View>

      <View style={styles.jobDetails}>
        <Text style={[styles.jobDetail, { color: theme.text + '70' }]}>📍 {item.ubicacion}</Text>
        <Text style={[styles.jobDetail, { color: theme.text + '70' }]}>🕒 {item.tipo}</Text>
        <Text style={[styles.jobDetail, { color: theme.text + '70' }]}>💰 {item.salario}</Text>
      </View>

      {item.descripcion && (
        <Text 
          style={[styles.jobDescription, { color: theme.text + '80' }]}
          numberOfLines={2}
        >
          {item.descripcion}
        </Text>
      )}
      
      <View style={styles.jobFooter}>
        <Text style={[styles.jobDate, { color: theme.text + '60' }]}>{item.fecha}</Text>
        <TouchableOpacity style={styles.applyButton}>
          <Text style={styles.applyButtonText}>Postularme</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderFilterButton = (filter: string) => (
    <TouchableOpacity
      key={filter}
      style={[
        styles.filterButton,
        selectedFilter === filter && styles.filterButtonActive
      ]}
      onPress={() => setSelectedFilter(filter)}
    >
      <Text style={[
        styles.filterText,
        selectedFilter === filter && styles.filterTextActive
      ]}>
        {filter}
      </Text>
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color="#d90429" />
        <Text style={[styles.loadingText, { color: theme.text }]}>Cargando empleos...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl 
          refreshing={refreshing} 
          onRefresh={onRefresh}
          colors={['#d90429']}
          tintColor="#d90429"
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Header con Logo */}
      <View style={styles.logoHeader}>
        <Image
          source={require('../assets/images/logo-texto.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      {/* Barra de búsqueda principal */}
      <View style={[styles.searchBar, { backgroundColor: theme.card }]}>
        <View style={styles.searchInputContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Buscar empleos..."
            placeholderTextColor={theme.text + '60'}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            onSubmitEditing={handleSearch}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        
        <TouchableOpacity 
          style={[styles.searchActionButton, { backgroundColor: '#d90429' }]}
          onPress={handleSearch}
        >
          <Text style={styles.searchActionText}>Buscar</Text>
        </TouchableOpacity>
      </View>

      {/* Filtros rápidos */}
      <View style={styles.filtersSection}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Filtrar por:</Text>
        
        {/* Ubicación */}
        <View style={styles.filterRow}>
          <Text style={[styles.filterLabel, { color: theme.text }]}>📍 Ubicación:</Text>
          <TextInput
            style={[styles.filterInput, { backgroundColor: theme.card, color: theme.text }]}
            placeholder="Ej: Madrid, Remoto..."
            placeholderTextColor={theme.text + '60'}
            value={locationFilter}
            onChangeText={setLocationFilter}
          />
        </View>

        {/* Tipo de empleo */}
        <View style={styles.filterRow}>
          <Text style={[styles.filterLabel, { color: theme.text }]}>🕒 Tipo:</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersList}
          >
            {filters.map((filter) => renderFilterButton(filter))}
          </ScrollView>
        </View>

        {/* Botones de acción */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#d90429' }]}
            onPress={handleSearch}
          >
            <Text style={styles.actionButtonText}>Aplicar Filtros</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.text + '15', borderWidth: 1, borderColor: '#d90429' }]}
            onPress={handleClearFilters}
          >
            <Text style={[styles.actionButtonText, { color: '#d90429' }]}>Limpiar</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Contador de resultados */}
      <View style={[styles.resultsHeader, { backgroundColor: '#d90429' }]}>
        <Text style={styles.resultsCount}>
          {filteredJobs.length} empleo{filteredJobs.length !== 1 ? 's' : ''} encontrado{filteredJobs.length !== 1 ? 's' : ''}
        </Text>
        {(searchQuery || locationFilter || selectedFilter !== 'Todos') && (
          <Text style={styles.resultsFilters}>
            {searchQuery && `"${searchQuery}"`} 
            {locationFilter && ` • ${locationFilter}`}
            {selectedFilter !== 'Todos' && ` • ${selectedFilter}`}
          </Text>
        )}
      </View>

      {/* Lista de empleos */}
      <View style={styles.jobsContainer}>
        {filteredJobs.length === 0 ? (
          <View style={[styles.emptyContainer, { backgroundColor: theme.card }]}>
            <Text style={[styles.emptyIcon, { color: theme.text + '40' }]}>🔍</Text>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              No se encontraron empleos
            </Text>
            <Text style={[styles.emptyText, { color: theme.text + '60' }]}>
              {searchQuery || locationFilter || selectedFilter !== 'Todos'
                ? 'Prueba con otros términos de búsqueda o ajusta los filtros.'
                : 'No hay empleos disponibles en este momento.'}
            </Text>
            <TouchableOpacity
              style={[styles.emptyButton, { backgroundColor: '#d90429' }]}
              onPress={handleClearFilters}
            >
              <Text style={styles.emptyButtonText}>Ver todos los empleos</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredJobs.map((job) => (
            <TouchableOpacity
              key={job.id}
              style={[styles.jobCard, { backgroundColor: theme.card, borderColor: '#e0e0e0' }]}
              onPress={() => handleJobPress(job.id)}
            >
              <View style={styles.jobHeader}>
                <Image source={{ uri: job.logo }} style={styles.companyLogo} />
                <View style={styles.jobInfo}>
                  <Text style={[styles.jobTitle, { color: theme.text }]}>{job.titulo}</Text>
                  <Text style={[styles.companyName, { color: theme.text + '80' }]}>{job.empresa}</Text>
                </View>
              </View>

              <View style={styles.jobDetails}>
                <Text style={[styles.jobDetail, { color: theme.text + '70' }]}>📍 {job.ubicacion}</Text>
                <Text style={[styles.jobDetail, { color: theme.text + '70' }]}>🕒 {job.tipo}</Text>
                <Text style={[styles.jobDetail, { color: theme.text + '70' }]}>💰 {job.salario}</Text>
              </View>

              {job.descripcion && (
                <Text 
                  style={[styles.jobDescription, { color: theme.text + '80' }]}
                  numberOfLines={2}
                >
                  {job.descripcion}
                </Text>
              )}
              
              <View style={styles.jobFooter}>
                <Text style={[styles.jobDate, { color: theme.text + '60' }]}>{job.fecha}</Text>
                <TouchableOpacity style={styles.applyButton}>
                  <Text style={styles.applyButtonText}>Postularme</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 30,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: '600',
  },
  // Logo Header
  logoHeader: {
    paddingTop: 10,
    paddingBottom: 1,
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderBottomWidth: 2,
    borderBottomColor: '#d90429',
  },
  logo: {
    width: 400,
    height: 300,
  },
  // Barra de búsqueda
  searchBar: {
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 50,
  },
  searchIcon: {
    fontSize: 18,
    color: '#d90429',
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    height: '100%',
  },
  clearButton: {
    padding: 5,
  },
  clearIcon: {
    fontSize: 16,
    color: '#666',
  },
  searchActionButton: {
    paddingHorizontal: 20,
    height: 50,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 80,
  },
  searchActionText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Filtros
  filtersSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  filterRow: {
    marginBottom: 15,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  filterInput: {
    height: 45,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  filtersList: {
    flexDirection: 'row',
    paddingRight: 20,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  filterButtonActive: {
    backgroundColor: '#d90429',
    borderColor: '#d90429',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  filterTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  // Botones de acción
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  actionButton: {
    flex: 1,
    height: 45,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  // Resultados header
  resultsHeader: {
    padding: 15,
    paddingVertical: 12,
  },
  resultsCount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
  },
  resultsFilters: {
    fontSize: 14,
    color: '#ffffff',
    opacity: 0.9,
    textAlign: 'center',
    marginTop: 5,
  },
  // Contenedor de trabajos
  jobsContainer: {
    padding: 15,
  },
  jobCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 15,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  jobHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  companyLogo: {
    width: 45,
    height: 45,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: '#f0f0f0',
  },
  jobInfo: {
    flex: 1,
  },
  jobTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  companyName: {
    fontSize: 15,
    fontWeight: '500',
  },
  jobDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
    gap: 12,
  },
  jobDetail: {
    fontSize: 13,
    fontWeight: '500',
  },
  jobDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  jobFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
  },
  jobDate: {
    fontSize: 12,
    fontWeight: '500',
  },
  applyButton: {
    backgroundColor: '#d90429',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  applyButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  // Estado vacío
  emptyContainer: {
    borderRadius: 12,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  emptyButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default SearchResultsScreen;