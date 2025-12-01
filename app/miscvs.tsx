// app/miscvs.tsx
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import {
  doc,
  getDoc,
  serverTimestamp,
  updateDoc
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { auth, db, storage } from '../src/firebase/firebase';

type CVData = {
  // Información personal
  nombres: string;
  apellidos: string;
  email: string;
  telefono: string;
  pais: string;
  ciudad: string;
  
  // Información académica
  carrera: string;
  universidad: string;
  añoCarrera: string;
  promedio: string;
  
  // Habilidades
  habilidades: string[];
  
  // Archivos
  cvUrl: string;
  fotoPerfil: string;
  
  // Configuración
  perfilPublico: boolean;
  disponibleParaTrabajar: boolean;
};

const MiscvsScreen = () => {
  const router = useRouter();
  const [cvData, setCvData] = useState<CVData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [currentEditField, setCurrentEditField] = useState('');
  const [editValue, setEditValue] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadCVData();
  }, []);

  const loadCVData = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        router.replace('/login');
        return;
      }

      const studentDoc = await getDoc(doc(db, 'students', user.uid));
      
      if (studentDoc.exists()) {
        const data = studentDoc.data();
        setCvData({
          // Información personal
          nombres: data.nombres || '',
          apellidos: data.apellidos || '',
          email: data.email || user.email || '',
          telefono: data.telefono || '',
          pais: data.pais || '',
          ciudad: data.ciudad || '',
          
          // Información académica
          carrera: data.carrera || '',
          universidad: data.universidad || '',
          añoCarrera: data.añoCarrera || '',
          promedio: data.promedio || '',
          
          // Habilidades
          habilidades: Array.isArray(data.habilidades) ? data.habilidades : [],
          
          // Archivos
          cvUrl: data.cvUrl || '',
          fotoPerfil: data.fotoPerfil || user.photoURL || '',
          
          // Configuración
          perfilPublico: data.perfilPublico !== false,
          disponibleParaTrabajar: data.disponibleParaTrabajar !== false,
        });
      }
    } catch (error) {
      console.error('Error cargando datos del CV:', error);
      Alert.alert('Error', 'No se pudieron cargar los datos del CV');
    } finally {
      setLoading(false);
    }
  };

  const updateCVField = async (field: string, value: any) => {
    try {
      const user = auth.currentUser;
      if (!user || !cvData) return;

      setSaving(true);
      
      await updateDoc(doc(db, 'students', user.uid), {
        [field]: value,
        updatedAt: serverTimestamp()
      });

      setCvData(prev => prev ? { ...prev, [field]: value } : null);
      setEditModalVisible(false);
      
      Alert.alert('Éxito', 'Datos actualizados correctamente');
    } catch (error) {
      console.error('Error actualizando CV:', error);
      Alert.alert('Error', 'No se pudo actualizar la información');
    } finally {
      setSaving(false);
    }
  };

  const uploadCVFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (result.type === 'success') {
        setUploading(true);
        const user = auth.currentUser;
        if (!user) return;

        // Subir archivo a Firebase Storage
        const response = await fetch(result.uri);
        const blob = await response.blob();
        const filename = `cv_${user.uid}_${Date.now()}.pdf`;
        const storageRef = ref(storage, `cvs/${filename}`);
        
        await uploadBytes(storageRef, blob);
        const downloadURL = await getDownloadURL(storageRef);

        // Actualizar en Firestore
        await updateDoc(doc(db, 'students', user.uid), {
          cvUrl: downloadURL,
          updatedAt: serverTimestamp()
        });

        setCvData(prev => prev ? { ...prev, cvUrl: downloadURL } : null);
        Alert.alert('Éxito', 'CV subido correctamente');
      }
    } catch (error) {
      console.error('Error subiendo CV:', error);
      Alert.alert('Error', 'No se pudo subir el CV');
    } finally {
      setUploading(false);
    }
  };

  const uploadProfilePhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        setUploading(true);
        const user = auth.currentUser;
        if (!user) return;

        // Subir imagen a Firebase Storage
        const response = await fetch(result.assets[0].uri);
        const blob = await response.blob();
        const filename = `profile_${user.uid}_${Date.now()}.jpg`;
        const storageRef = ref(storage, `profiles/${filename}`);
        
        await uploadBytes(storageRef, blob);
        const downloadURL = await getDownloadURL(storageRef);

        // Actualizar en Firestore
        await updateDoc(doc(db, 'students', user.uid), {
          fotoPerfil: downloadURL,
          updatedAt: serverTimestamp()
        });

        setCvData(prev => prev ? { ...prev, fotoPerfil: downloadURL } : null);
        Alert.alert('Éxito', 'Foto de perfil actualizada');
      }
    } catch (error) {
      console.error('Error subiendo foto:', error);
      Alert.alert('Error', 'No se pudo actualizar la foto');
    } finally {
      setUploading(false);
    }
  };

  const openEditModal = (field: string, value: string) => {
    setCurrentEditField(field);
    setEditValue(value);
    setEditModalVisible(true);
  };

  const addHabilidad = () => {
    openEditModal('nuevaHabilidad', '');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#d00" />
        <Text style={styles.loadingText}>Cargando tu CV...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {/* Logo arriba del texto */}
        <View style={styles.logoContainer}>
          <Image
            source={require('../assets/images/logo.png')}
            style={styles.headerLogo}
            resizeMode="contain"
          />
        </View>
        
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Mi CV</Text>
          <Text style={styles.headerSubtitle}>Información profesional completa</Text>
        </View>
        
        {/* Foto de perfil en el header */}
        <TouchableOpacity 
          style={styles.headerPhotoContainer} 
          onPress={uploadProfilePhoto}
          disabled={uploading}
        >
          <Image
            source={{ uri: cvData?.fotoPerfil || 'https://via.placeholder.com/100' }}
            style={styles.headerPhoto}
          />
          <View style={styles.photoEditBadge}>
            <Text style={styles.photoEditBadgeText}>Editar</Text>
          </View>
          {uploading && (
            <View style={styles.uploadingOverlay}>
              <ActivityIndicator size="small" color="#fff" />
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Contenido principal - ScrollView único con todas las secciones */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Sección de Información Personal */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información Personal</Text>
          
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Nombres</Text>
            <TouchableOpacity 
              style={styles.fieldValueContainer}
              onPress={() => openEditModal('nombres', cvData?.nombres || '')}
            >
              <Text style={styles.fieldValue}>{cvData?.nombres || 'No especificado'}</Text>
              <Text style={styles.editIcon}>✎</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Apellidos</Text>
            <TouchableOpacity 
              style={styles.fieldValueContainer}
              onPress={() => openEditModal('apellidos', cvData?.apellidos || '')}
            >
              <Text style={styles.fieldValue}>{cvData?.apellidos || 'No especificado'}</Text>
              <Text style={styles.editIcon}>✎</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Email</Text>
            <View style={styles.fieldValueContainer}>
              <Text style={styles.fieldValue}>{cvData?.email}</Text>
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Teléfono</Text>
            <TouchableOpacity 
              style={styles.fieldValueContainer}
              onPress={() => openEditModal('telefono', cvData?.telefono || '')}
            >
              <Text style={styles.fieldValue}>{cvData?.telefono || 'No especificado'}</Text>
              <Text style={styles.editIcon}>✎</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>País</Text>
            <TouchableOpacity 
              style={styles.fieldValueContainer}
              onPress={() => openEditModal('pais', cvData?.pais || '')}
            >
              <Text style={styles.fieldValue}>{cvData?.pais || 'No especificado'}</Text>
              <Text style={styles.editIcon}>✎</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Ciudad</Text>
            <TouchableOpacity 
              style={styles.fieldValueContainer}
              onPress={() => openEditModal('ciudad', cvData?.ciudad || '')}
            >
              <Text style={styles.fieldValue}>{cvData?.ciudad || 'No especificado'}</Text>
              <Text style={styles.editIcon}>✎</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Sección de Información Académica */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información Académica</Text>
          
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Carrera</Text>
            <TouchableOpacity 
              style={styles.fieldValueContainer}
              onPress={() => openEditModal('carrera', cvData?.carrera || '')}
            >
              <Text style={styles.fieldValue}>{cvData?.carrera || 'No especificado'}</Text>
              <Text style={styles.editIcon}>✎</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Universidad</Text>
            <TouchableOpacity 
              style={styles.fieldValueContainer}
              onPress={() => openEditModal('universidad', cvData?.universidad || '')}
            >
              <Text style={styles.fieldValue}>{cvData?.universidad || 'No especificado'}</Text>
              <Text style={styles.editIcon}>✎</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Año de Carrera</Text>
            <TouchableOpacity 
              style={styles.fieldValueContainer}
              onPress={() => openEditModal('añoCarrera', cvData?.añoCarrera || '')}
            >
              <Text style={styles.fieldValue}>{cvData?.añoCarrera || 'No especificado'}</Text>
              <Text style={styles.editIcon}>✎</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Promedio</Text>
            <TouchableOpacity 
              style={styles.fieldValueContainer}
              onPress={() => openEditModal('promedio', cvData?.promedio || '')}
            >
              <Text style={styles.fieldValue}>{cvData?.promedio || 'No especificado'}</Text>
              <Text style={styles.editIcon}>✎</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Sección de Habilidades */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Habilidades</Text>
            <TouchableOpacity style={styles.addButton} onPress={addHabilidad}>
              <Text style={styles.addButtonText}>+ Agregar</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.skillsContainer}>
            {cvData?.habilidades.map((habilidad, index) => (
              <View key={index} style={styles.skillTag}>
                <Text style={styles.skillText}>{habilidad}</Text>
                <TouchableOpacity 
                  onPress={() => {
                    const nuevasHabilidades = cvData.habilidades.filter((_, i) => i !== index);
                    updateCVField('habilidades', nuevasHabilidades);
                  }}
                >
                  <Text style={styles.removeText}>×</Text>
                </TouchableOpacity>
              </View>
            ))}
            
            {(!cvData?.habilidades || cvData.habilidades.length === 0) && (
              <Text style={styles.emptyText}>No hay habilidades agregadas</Text>
            )}
          </View>
        </View>

        {/* Sección de CV */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Currículum Vitae</Text>
          
          {cvData?.cvUrl ? (
            <View style={styles.cvContainer}>
              <Text style={styles.cvSuccess}>✅ CV subido correctamente</Text>
              <TouchableOpacity 
                style={styles.downloadButton}
                onPress={() => {
                  Alert.alert('CV', 'Funcionalidad de descarga en desarrollo');
                }}
              >
                <Text style={styles.downloadButtonText}>Ver CV</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity 
              style={styles.uploadCvButton}
              onPress={uploadCVFile}
              disabled={uploading}
            >
              <Text style={styles.uploadCvButtonText}>
                {uploading ? 'Subiendo...' : '📄 Subir CV (PDF)'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Sección de Configuración */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Configuración</Text>
          
          <View style={styles.configRow}>
            <View style={styles.configText}>
              <Text style={styles.configLabel}>Perfil Público</Text>
              <Text style={styles.configDescription}>
                Las empresas pueden ver tu perfil y contactarte
              </Text>
            </View>
            <Switch
              value={cvData?.perfilPublico || false}
              onValueChange={(value) => updateCVField('perfilPublico', value)}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={cvData?.perfilPublico ? '#d00' : '#f4f3f4'}
            />
          </View>

          <View style={styles.configRow}>
            <View style={styles.configText}>
              <Text style={styles.configLabel}>Disponible para trabajar</Text>
              <Text style={styles.configDescription}>
                Mostrar que estás buscando empleo activamente
              </Text>
            </View>
            <Switch
              value={cvData?.disponibleParaTrabajar || false}
              onValueChange={(value) => updateCVField('disponibleParaTrabajar', value)}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={cvData?.disponibleParaTrabajar ? '#d00' : '#f4f3f4'}
            />
          </View>
        </View>

        {/* Espacio al final */}
        <View style={styles.footerSpace} />
      </ScrollView>

      {/* Modal para editar campos */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Editar {currentEditField}
            </Text>
            
            <TextInput
              style={styles.modalInput}
              value={editValue}
              onChangeText={setEditValue}
              placeholder={`Ingrese ${currentEditField}`}
              multiline={currentEditField.includes('descripcion')}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.saveButton]}
                onPress={() => {
                  if (currentEditField === 'nuevaHabilidad' && editValue.trim()) {
                    const nuevasHabilidades = [...(cvData?.habilidades || []), editValue.trim()];
                    updateCVField('habilidades', nuevasHabilidades);
                  } else {
                    updateCVField(currentEditField, editValue);
                  }
                }}
                disabled={saving}
              >
                <Text style={styles.saveButtonText}>
                  {saving ? 'Guardando...' : 'Guardar'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// ESTILOS ACTUALIZADOS - Diseño vertical continuo
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666',
    fontWeight: '400',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 24,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  logoContainer: {
    position: 'absolute',
    top: 60,
    left: 24,
    right: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLogo: {
    width: 100,
    height: 200,
  },
  headerContent: {
    flex: 1,
    marginTop: 150, // Espacio para el logo
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '300',
    color: '#1a1a1a',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#8c8c8c',
    marginTop: 6,
    fontWeight: '400',
    textAlign: 'center',
  },
  headerPhotoContainer: {
    position: 'absolute',
    top: 60,
    right: 24,
    width: 72,
    alignItems: 'center',
  },
  headerPhoto: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: '#f0f0f0',
  },
  photoEditBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#d00',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  photoEditBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#ffffff',
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 36,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: 24,
  },
  section: {
    backgroundColor: '#ffffff',
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 20,
  },
  fieldGroup: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4d4d4d',
    marginBottom: 8,
  },
  fieldValueContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fafafa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  fieldValue: {
    fontSize: 16,
    color: '#1a1a1a',
    fontWeight: '400',
    flex: 1,
  },
  editIcon: {
    fontSize: 16,
    color: '#8c8c8c',
    marginLeft: 12,
  },
  addButton: {
    backgroundColor: '#d00',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: '#d00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  skillTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  skillText: {
    color: '#4d4d4d',
    fontSize: 13,
    marginRight: 8,
    fontWeight: '400',
  },
  removeText: {
    color: '#8c8c8c',
    fontSize: 16,
    fontWeight: '300',
  },
  emptyText: {
    color: '#8c8c8c',
    fontStyle: 'italic',
    textAlign: 'center',
    width: '100%',
    padding: 32,
    fontSize: 15,
  },
  cvContainer: {
    alignItems: 'flex-start',
  },
  cvSuccess: {
    color: '#28a745',
    fontWeight: '500',
    marginBottom: 16,
    fontSize: 15,
  },
  uploadCvButton: {
    backgroundColor: '#ffffff',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#f0f0f0',
    borderStyle: 'dashed',
    width: '100%',
  },
  uploadCvButtonText: {
    color: '#8c8c8c',
    fontSize: 15,
    fontWeight: '500',
  },
  downloadButton: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    marginBottom: 12,
  },
  downloadButtonText: {
    color: '#1a1a1a',
    fontSize: 14,
    fontWeight: '500',
  },
  configRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f8f8',
  },
  configText: {
    flex: 1,
    marginRight: 20,
  },
  configLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
    marginBottom: 6,
  },
  configDescription: {
    fontSize: 13,
    color: '#8c8c8c',
    lineHeight: 18,
    fontWeight: '400',
  },
  footerSpace: {
    height: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '500',
    marginBottom: 20,
    color: '#1a1a1a',
    textTransform: 'capitalize',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#f0f0f0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 24,
    minHeight: 120,
    textAlignVertical: 'top',
    backgroundColor: '#fafafa',
    color: '#1a1a1a',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    minWidth: 90,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f8f8f8',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  cancelButtonText: {
    color: '#8c8c8c',
    fontWeight: '500',
    fontSize: 15,
  },
  saveButton: {
    backgroundColor: '#d00',
    shadowColor: '#d00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  saveButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 15,
  },
});

export default MiscvsScreen;