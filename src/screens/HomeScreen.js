import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView, 
  FlatList,
  Image
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const HomeScreen = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [recentJobs, setRecentJobs] = useState([]);

  // Datos de ejemplo - luego reemplazar con datos reales
  useEffect(() => {
    setRecentJobs([
      {
        id: '1',
        title: 'Desarrollador Frontend',
        company: 'Tech Solutions Inc.',
        location: 'Remoto',
        type: 'Medio tiempo',
        salary: '$800 - $1200',
        posted: 'Hace 2 días',
        logo: 'https://placehold.it/50x50'
      },
      {
        id: '2',
        title: 'Soporte Técnico',
        company: 'IT Support Co.',
        location: 'Lima, Perú',
        type: 'Tiempo completo',
        salary: '$600 - $900',
        posted: 'Hace 1 día',
        logo: 'https://placehold.it/50x50'
      },
      {
        id: '3',
        title: 'Diseñador UX/UI',
        company: 'Creative Designs',
        location: 'Remoto',
        type: 'Freelance',
        salary: 'Por proyecto',
        posted: 'Hace 3 días',
        logo: 'https://placehold.it/50x50'
      },
    ]);
  }, []);

  const renderJobItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.jobCard}
      onPress={() => navigation.navigate('JobDetail', { job: item })}
    >
      <View style={styles.jobHeader}>
        <Image source={{ uri: item.logo }} style={styles.companyLogo} />
        <View style={styles.jobInfo}>
          <Text style={styles.jobTitle}>{item.title}</Text>
          <Text style={styles.companyName}>{item.company}</Text>
        </View>
      </View>
      <View style={styles.jobDetails}>
        <View style={styles.detailItem}>
          <Icon name="location-on" size={16} color="#666" />
          <Text style={styles.detailText}>{item.location}</Text>
        </View>
        <View style={styles.detailItem}>
          <Icon name="schedule" size={16} color="#666" />
          <Text style={styles.detailText}>{item.type}</Text>
        </View>
        <View style={styles.detailItem}>
          <Icon name="attach-money" size={16} color="#666" />
          <Text style={styles.detailText}>{item.salary}</Text>
        </View>
      </View>
      <Text style={styles.postedDate}>{item.posted}</Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.welcomeText}>¡Encuentra tu empleo ideal!</Text>
      
      {/* Barra de búsqueda */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="¿Qué empleo buscas?"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <TouchableOpacity style={styles.searchButton}>
          <Icon name="search" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Filtros rápidos */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filtersContainer}
      >
        <TouchableOpacity style={[styles.filterButton, styles.activeFilter]}>
          <Text style={[styles.filterText, styles.activeFilterText]}>Todos</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterButton}>
          <Text style={styles.filterText}>Remoto</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterButton}>
          <Text style={styles.filterText}>Medio tiempo</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterButton}>
          <Text style={styles.filterText}>Prácticas</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Empleos recientes */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Empleos recientes</Text>
          <TouchableOpacity>
            <Text style={styles.seeAllText}>Ver todos</Text>
          </TouchableOpacity>
        </View>
        
        <FlatList
          data={recentJobs}
          renderItem={renderJobItem}
          keyExtractor={item => item.id}
          scrollEnabled={false}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 15,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  searchContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  searchInput: {
    flex: 1,
    height: 50,
    backgroundColor: '#fff',
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRightWidth: 0,
  },
  searchButton: {
    width: 50,
    height: 50,
    backgroundColor: '#007bff',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  filtersContainer: {
    marginBottom: 20,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  activeFilter: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  filterText: {
    color: '#666',
  },
  activeFilterText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  seeAllText: {
    color: '#007bff',
  },
  jobCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  jobHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  companyLogo: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 15,
  },
  jobInfo: {
    flex: 1,
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  companyName: {
    fontSize: 14,
    color: '#666',
  },
  jobDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  postedDate: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
  },
});

export default HomeScreen;