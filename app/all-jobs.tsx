// app/all-jobs.tsx
import { useRouter } from 'expo-router';
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import { Colors } from '../constants/Colors';
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

const AllJobsScreen = () => {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('Todos');

  const filters = ['Todos', 'Tiempo completo', 'Medio tiempo', 'Prácticas', 'Remoto'];

  useEffect(() => {
    loadAllJobs();
  }, []);

  useEffect(() => {
    filterJobs();
  }, [jobs, searchQuery, selectedFilter]);

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
          const fecha = vacanteData.fechaPublicacion.toDate ? vacanteData.fechaPublicacion.toDate() : new Date(vacanteData.fechaPublicacion);
          const ahora = new Date();
          const diferencia = ahora.getTime() - fecha.getTime();
          const horas = Math.floor(diferencia / (1000 * 60 * 60));
          const dias = Math.floor(horas / 24);
          
          if (dias > 0) {
            fechaTexto = `Hace ${dias} día${dias > 1 ? 's' : ''}`;
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
        return a.fecha.localeCompare(b.fecha);
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
    
    // Filtrar por búsqueda
    if (searchQuery.trim()) {
      filtered = filtered.filter(job =>
        job.titulo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.empresa.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.ubicacion.toLowerCase().includes(searchQuery.toLowerCase())
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

  const renderJobItem = ({ item }: { item: Job }) => (
    <TouchableOpacity
      style={[styles.jobCard, { backgroundColor: theme.background, borderColor: theme.text + '20' }]}
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
        <Text style={[styles.jobDetail, { color: theme.text + '60' }]}>📍 {item.ubicacion}</Text>
        <Text style={[styles.jobDetail, { color: theme.text + '60' }]}>⏱️ {item.tipo}</Text>
        <Text style={[styles.jobDetail, { color: theme.text + '60' }]}>💰 {item.salario}</Text>
      </View>
      
      {item.descripcion && (
        <Text style={[styles.jobDescription, { color: theme.text + '70' }]} numberOfLines={2}>
          {item.descripcion}
        </Text>
      )}
      
      <Text style={[styles.jobDate, { color: theme.text + '50' }]}>{item.fecha}</Text>
    </TouchableOpacity>
  );

  const renderFilterButton = (filter: string) => (
    <TouchableOpacity
      key={filter}
      style={[
        styles.filterButton,
        selectedFilter === filter && { backgroundColor: '#007AFF' }
      ]}
      onPress={() => setSelectedFilter(filter)}
    >
      <Text
        style={[
          styles.filterText,
          selectedFilter === filter && { color: '#fff' }
        ]}
      >
        {filter}
      </Text>
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={[styles.loadingText, { color: theme.text }]}>Cargando empleos...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.background, borderBottomColor: theme.text + '20' }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={[styles.backButtonText, { color: '#007AFF' }]}>← Atrás</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Todos los empleos</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Barra de búsqueda */}
      <View style={[styles.searchContainer, { backgroundColor: theme.background }]}>
        <TextInput
          style={[styles.searchInput, { backgroundColor: theme.text + '10', color: theme.text }]}
          placeholder="Buscar empleos..."
          placeholderTextColor={theme.text + '60'}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Filtros */}
      <View style={styles.filtersContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={filters}
          renderItem={({ item }) => renderFilterButton(item)}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.filtersContent}
        />
      </View>

      {/* Lista de empleos */}
      <FlatList
        data={filteredJobs}
        renderItem={renderJobItem}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.jobsList}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: theme.text + '60' }]}>
              {searchQuery || selectedFilter !== 'Todos' 
                ? 'No se encontraron empleos con los filtros aplicados'
                : 'No hay empleos disponibles en este momento'
              }
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 5,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  placeholder: {
    width: 50,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  searchInput: {
    height: 45,
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 16,
  },
  filtersContainer: {
    paddingVertical: 10,
  },
  filtersContent: {
    paddingHorizontal: 20,
  },
  filterButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 10,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  jobsList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  jobCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
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
    marginBottom: 4,
  },
  companyName: {
    fontSize: 14,
  },
  jobDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  jobDetail: {
    fontSize: 12,
    marginRight: 15,
    marginBottom: 4,
  },
  jobDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  jobDate: {
    fontSize: 12,
    textAlign: 'right',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});

export default AllJobsScreen;
