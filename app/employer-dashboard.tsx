import { useRouter } from 'expo-router';
import { addDoc, collection, doc, getDoc, getDocs, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import { Colors } from '../constants/Colors';
import { useAuth } from '../src/contexts/AuthContext';
import { db } from '../src/firebase/firebase';

const EmployerDashboard = () => {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [vacantes, setVacantes] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingVacante, setEditingVacante] = useState<any>(null);
  const [empresaNombre, setEmpresaNombre] = useState('');

  // Campos del formulario
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [ubicacion, setUbicacion] = useState('');
  const [tipo, setTipo] = useState('Tiempo completo');
  const [salarioMin, setSalarioMin] = useState('');
  const [salarioMax, setSalarioMax] = useState('');
  const [moneda, setMoneda] = useState('USD');

  useEffect(() => {
    if (user) {
      loadEmpresaNombre();
      loadVacantes();
    }
  }, [user]);

  const loadEmpresaNombre = async () => {
    if (!user) return;
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setEmpresaNombre(data.nombreEmpresa || 'Mi Empresa');
      }
    } catch (error) {
      console.error('Error cargando nombre de empresa:', error);
    }
  };

  const loadVacantes = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const q = query(collection(db, 'vacantes'), where('empresaId', '==', user.uid), where('activa', '==', true));
      const querySnapshot = await getDocs(q);
      const vacantesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setVacantes(vacantesData);
    } catch (error) {
      console.error('Error cargando vacantes:', error);
      Alert.alert('Error', 'No se pudieron cargar las vacantes');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadVacantes();
  };

  const openModal = (vacante?: any) => {
    if (vacante) {
      setEditingVacante(vacante);
      setTitulo(vacante.titulo || '');
      setDescripcion(vacante.descripcion || '');
      setUbicacion(vacante.ubicacion || '');
      setTipo(vacante.tipo || 'Tiempo completo');
      setSalarioMin(vacante.salarioMin?.toString() || '');
      setSalarioMax(vacante.salarioMax?.toString() || '');
      setMoneda(vacante.moneda || 'USD');
    } else {
      setEditingVacante(null);
      resetForm();
    }
    setModalVisible(true);
  };

  const resetForm = () => {
    setTitulo('');
    setDescripcion('');
    setUbicacion('');
    setTipo('Tiempo completo');
    setSalarioMin('');
    setSalarioMax('');
    setMoneda('USD');
  };

  const handleSaveVacante = async () => {
    if (!titulo.trim() || !descripcion.trim() || !ubicacion.trim()) {
      Alert.alert('Error', 'Por favor completa todos los campos requeridos');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'No hay usuario autenticado');
      return;
    }

    setLoading(true);
    try {
      const vacanteData = {
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        empresaNombre: empresaNombre,
        empresaId: user.uid,
        ubicacion: ubicacion.trim(),
        tipo,
        salarioMin: parseFloat(salarioMin) || 0,
        salarioMax: parseFloat(salarioMax) || 0,
        moneda,
        fechaPublicacion: editingVacante ? editingVacante.fechaPublicacion : serverTimestamp(),
        fechaActualizacion: serverTimestamp(),
        activa: true,
      };

      if (editingVacante) {
        await updateDoc(doc(db, 'vacantes', editingVacante.id), vacanteData);
        Alert.alert('Éxito', 'Vacante actualizada correctamente');
      } else {
        await addDoc(collection(db, 'vacantes'), vacanteData);
        Alert.alert('Éxito', 'Vacante creada correctamente');
      }

      setModalVisible(false);
      resetForm();
      loadVacantes();
    } catch (error: any) {
      console.error('Error guardando vacante:', error);
      Alert.alert('Error', error.message || 'No se pudo guardar la vacante');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVacante = (vacanteId: string) => {
    Alert.alert(
      'Confirmar eliminación',
      '¿Estás seguro de que deseas eliminar esta vacante?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await updateDoc(doc(db, 'vacantes', vacanteId), {
                activa: false,
                fechaActualizacion: serverTimestamp(),
              });
              Alert.alert('Éxito', 'Vacante eliminada correctamente');
              loadVacantes();
            } catch (error: any) {
              console.error('Error eliminando vacante:', error);
              Alert.alert('Error', 'No se pudo eliminar la vacante');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
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
        <Text style={[styles.headerTitle, { color: theme.text }]}>Dashboard de Empleador</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={[styles.headerButton, { backgroundColor: theme.buttonBackground }]}
            onPress={() => router.push('/employer-applications')}
          >
            <Text style={[styles.headerButtonText, { color: theme.buttonText }]}>
              Ver Aplicaciones
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerButton, { backgroundColor: theme.buttonBackground }]}
            onPress={() => router.push('/employer-profile')}
          >
            <Text style={[styles.headerButtonText, { color: theme.buttonText }]}>
              Perfil
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

      {/* Botón crear vacante */}
      <View style={styles.createButtonContainer}>
        <TouchableOpacity
          style={[styles.createButton, { backgroundColor: theme.buttonBackground }]}
          onPress={() => openModal()}
        >
          <Text style={[styles.createButtonText, { color: theme.buttonText }]}>
            + Crear Nueva Vacante
          </Text>
        </TouchableOpacity>
      </View>

      {/* Lista de vacantes */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.text} />
        </View>
      ) : (
        <ScrollView
          style={styles.vacantesList}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {vacantes.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: theme.text }]}>
                No hay vacantes publicadas. Crea una nueva vacante para comenzar.
              </Text>
            </View>
          ) : (
            vacantes.map((vacante) => (
              <View
                key={vacante.id}
                style={[styles.vacanteCard, { backgroundColor: theme.background, borderColor: theme.text }]}
              >
                <View style={styles.vacanteHeader}>
                  <Text style={[styles.vacanteTitle, { color: theme.text }]}>
                    {vacante.titulo}
                  </Text>
                  <View style={styles.vacanteActions}>
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: theme.buttonBackground }]}
                      onPress={() => openModal(vacante)}
                    >
                      <Text style={[styles.actionButtonText, { color: theme.buttonText }]}>
                        Editar
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.deleteButton, { backgroundColor: '#DE0606' }]}
                      onPress={() => handleDeleteVacante(vacante.id)}
                    >
                      <Text style={[styles.actionButtonText, { color: '#FFFFFF' }]}>
                        Eliminar
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <Text style={[styles.vacanteDescription, { color: theme.text }]}>
                  {vacante.descripcion}
                </Text>
                <View style={styles.vacanteDetails}>
                  <Text style={[styles.vacanteDetail, { color: theme.text }]}>
                    📍 {vacante.ubicacion}
                  </Text>
                  <Text style={[styles.vacanteDetail, { color: theme.text }]}>
                    ⏰ {vacante.tipo}
                  </Text>
                  <Text style={[styles.vacanteDetail, { color: theme.text }]}>
                    💰 {vacante.salarioMin} - {vacante.salarioMax} {vacante.moneda}
                  </Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* Modal para crear/editar vacante */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              {editingVacante ? 'Editar Vacante' : 'Nueva Vacante'}
            </Text>

            <ScrollView style={styles.modalForm}>
              <Text style={[styles.label, { color: theme.text }]}>Título *</Text>
              <TextInput
                style={[styles.input, { borderColor: theme.text, color: theme.text }]}
                value={titulo}
                onChangeText={setTitulo}
                placeholder="Título del empleo"
                placeholderTextColor="#888"
              />

              <Text style={[styles.label, { color: theme.text }]}>Descripción *</Text>
              <TextInput
                style={[styles.textArea, { borderColor: theme.text, color: theme.text }]}
                value={descripcion}
                onChangeText={setDescripcion}
                placeholder="Descripción del empleo"
                placeholderTextColor="#888"
                multiline
                numberOfLines={4}
              />

              <Text style={[styles.label, { color: theme.text }]}>Ubicación *</Text>
              <TextInput
                style={[styles.input, { borderColor: theme.text, color: theme.text }]}
                value={ubicacion}
                onChangeText={setUbicacion}
                placeholder="Ubicación"
                placeholderTextColor="#888"
              />

              <Text style={[styles.label, { color: theme.text }]}>Tipo</Text>
              <View style={styles.radioGroup}>
                <TouchableOpacity
                  style={[styles.radioOption, tipo === 'Tiempo completo' && { backgroundColor: theme.buttonBackground }]}
                  onPress={() => setTipo('Tiempo completo')}
                >
                  <Text style={[styles.radioText, { color: tipo === 'Tiempo completo' ? theme.buttonText : theme.text }]}>
                    Tiempo completo
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.radioOption, tipo === 'Medio tiempo' && { backgroundColor: theme.buttonBackground }]}
                  onPress={() => setTipo('Medio tiempo')}
                >
                  <Text style={[styles.radioText, { color: tipo === 'Medio tiempo' ? theme.buttonText : theme.text }]}>
                    Medio tiempo
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.label, { color: theme.text }]}>Salario Mínimo</Text>
              <TextInput
                style={[styles.input, { borderColor: theme.text, color: theme.text }]}
                value={salarioMin}
                onChangeText={setSalarioMin}
                placeholder="0"
                keyboardType="numeric"
                placeholderTextColor="#888"
              />

              <Text style={[styles.label, { color: theme.text }]}>Salario Máximo</Text>
              <TextInput
                style={[styles.input, { borderColor: theme.text, color: theme.text }]}
                value={salarioMax}
                onChangeText={setSalarioMax}
                placeholder="0"
                keyboardType="numeric"
                placeholderTextColor="#888"
              />

              <Text style={[styles.label, { color: theme.text }]}>Moneda</Text>
              <TextInput
                style={[styles.input, { borderColor: theme.text, color: theme.text }]}
                value={moneda}
                onChangeText={setMoneda}
                placeholder="USD"
                placeholderTextColor="#888"
              />
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: '#888' }]}
                onPress={() => {
                  setModalVisible(false);
                  resetForm();
                }}
              >
                <Text style={styles.modalButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: theme.buttonBackground }, loading && styles.buttonDisabled]}
                onPress={handleSaveVacante}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={[styles.modalButtonText, { color: theme.buttonText }]}>
                    {editingVacante ? 'Actualizar' : 'Crear'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  createButtonContainer: {
    padding: 16,
  },
  createButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  vacantesList: {
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
  vacanteCard: {
    padding: 16,
    marginBottom: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  vacanteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  vacanteTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 8,
  },
  vacanteActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  deleteButton: {
    backgroundColor: '#DE0606',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  vacanteDescription: {
    fontSize: 14,
    marginBottom: 12,
  },
  vacanteDetails: {
    gap: 4,
  },
  vacanteDetail: {
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  modalForm: {
    maxHeight: 400,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
    backgroundColor: 'transparent',
  },
  textArea: {
    minHeight: 100,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 8,
    textAlignVertical: 'top',
    backgroundColor: 'transparent',
  },
  radioGroup: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  radioOption: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  radioText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 16,
  },
  modalButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});

export default EmployerDashboard;

