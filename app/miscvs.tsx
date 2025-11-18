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
import React, { useEffect, useState } from 'react';
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
  fechaNacimiento: string;
  documentoIdentidad: string;
  pais: string;
  ciudad: string;
  
  // Información académica
  carrera: string;
  universidad: string;
  añoCarrera: string;
  promedio: string;
  fechaGrado: string;
  
  // Experiencia profesional
  experiencia: Array<{
    id: string;
    puesto: string;
    empresa: string;
    fechaInicio: string;
    fechaFin: string;
    descripcion: string;
    actual: boolean;
  }>;
  
  // Habilidades
  habilidades: string[];
  
  // Idiomas
  idiomas: Array<{
    idioma: string;
    nivel: 'básico' | 'intermedio' | 'avanzado' | 'nativo';
  }>;
  
  // Proyectos
  proyectos: Array<{
    id: string;
    nombre: string;
    descripcion: string;
    tecnologias: string[];
    enlace: string;
  }>;
  
  // Certificaciones
  certificaciones: Array<{
    id: string;
    nombre: string;
    institucion: string;
    fecha: string;
    duracion: string;
  }>;
  
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
  const [activeSection, setActiveSection] = useState('personal');
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
          fechaNacimiento: data.fechaNacimiento || '',
          documentoIdentidad: data.documentoIdentidad || '',
          pais: data.pais || '',
          ciudad: data.ciudad || '',
          
          // Información académica
          carrera: data.carrera || '',
          universidad: data.universidad || '',
          añoCarrera: data.añoCarrera || '',
          promedio: data.promedio || '',
          fechaGrado: data.fechaGrado || '',
          
          // Experiencia profesional
          experiencia: data.experiencia || [],
          
          // Habilidades
          habilidades: data.habilidades || [],
          
          // Idiomas
          idiomas: data.idiomas || [],
          
          // Proyectos
          proyectos: data.proyectos || [],
          
          // Certificaciones
          certificaciones: data.certificaciones || [],
          
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

  const addIdioma = () => {
    openEditModal('nuevoIdioma', '');
  };

  const addExperiencia = () => {
    setEditModalVisible(true);
    setCurrentEditField('nuevaExperiencia');
    setEditValue('');
  };

  const renderPersonalInfo = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Información Personal</Text>
      
      <View style={styles.infoRow}>
        <Text style={styles.label}>Nombres</Text>
        <TouchableOpacity onPress={() => openEditModal('nombres', cvData?.nombres || '')}>
          <Text style={styles.value}>{cvData?.nombres || 'No especificado'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.label}>Apellidos</Text>
        <TouchableOpacity onPress={() => openEditModal('apellidos', cvData?.apellidos || '')}>
          <Text style={styles.value}>{cvData?.apellidos || 'No especificado'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.label}>Email</Text>
        <Text style={styles.value}>{cvData?.email}</Text>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.label}>Teléfono</Text>
        <TouchableOpacity onPress={() => openEditModal('telefono', cvData?.telefono || '')}>
          <Text style={styles.value}>{cvData?.telefono || 'No especificado'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.label}>País</Text>
        <TouchableOpacity onPress={() => openEditModal('pais', cvData?.pais || '')}>
          <Text style={styles.value}>{cvData?.pais || 'No especificado'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.label}>Ciudad</Text>
        <TouchableOpacity onPress={() => openEditModal('ciudad', cvData?.ciudad || '')}>
          <Text style={styles.value}>{cvData?.ciudad || 'No especificado'}</Text>
        </TouchableOpacity>
      </View>

      {/* Foto de perfil */}
      <View style={styles.photoSection}>
        <Text style={styles.label}>Foto de Perfil</Text>
        <TouchableOpacity style={styles.photoContainer} onPress={uploadProfilePhoto}>
          <Image
            source={{ uri: cvData?.fotoPerfil || 'https://via.placeholder.com/100' }}
            style={styles.photo}
          />
          <Text style={styles.photoText}>Cambiar foto</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderAcademicInfo = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Información Académica</Text>
      
      <View style={styles.infoRow}>
        <Text style={styles.label}>Carrera</Text>
        <TouchableOpacity onPress={() => openEditModal('carrera', cvData?.carrera || '')}>
          <Text style={styles.value}>{cvData?.carrera || 'No especificado'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.label}>Universidad</Text>
        <TouchableOpacity onPress={() => openEditModal('universidad', cvData?.universidad || '')}>
          <Text style={styles.value}>{cvData?.universidad || 'No especificado'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.label}>Año de Carrera</Text>
        <TouchableOpacity onPress={() => openEditModal('añoCarrera', cvData?.añoCarrera || '')}>
          <Text style={styles.value}>{cvData?.añoCarrera || 'No especificado'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.label}>Promedio</Text>
        <TouchableOpacity onPress={() => openEditModal('promedio', cvData?.promedio || '')}>
          <Text style={styles.value}>{cvData?.promedio || 'No especificado'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderHabilidades = () => (
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
  );

  const renderCVFile = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Currículum Vitae</Text>
      
      {cvData?.cvUrl ? (
        <View style={styles.cvContainer}>
          <Text style={styles.cvSuccess}>✅ CV subido correctamente</Text>
          <TouchableOpacity 
            style={styles.downloadButton}
            onPress={() => {
              // Aquí podrías abrir el PDF o descargarlo
              Alert.alert('CV', 'Funcionalidad de descarga en desarrollo');
            }}
          >
            <Text style={styles.downloadButtonText}>Ver CV</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.uploadButton}
            onPress={uploadCVFile}
            disabled={uploading}
          >
            <Text style={styles.uploadButtonText}>
              {uploading ? 'Subiendo...' : 'Actualizar CV'}
            </Text>
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
  );

  const renderConfiguracion = () => (
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
          thumbColor={cvData?.perfilPublico ? '#d90429' : '#f4f3f4'}
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
          thumbColor={cvData?.disponibleParaTrabajar ? '#d90429' : '#f4f3f4'}
        />
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#d90429" />
        <Text style={styles.loadingText}>Cargando tu CV...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mi CV</Text>
        <Text style={styles.headerSubtitle}>Gestiona tu información profesional</Text>
      </View>

      {/* Navegación entre secciones */}
      <ScrollView horizontal style={styles.navScroll} showsHorizontalScrollIndicator={false}>
        <View style={styles.navContainer}>
          {['personal', 'academico', 'habilidades', 'cv', 'configuracion'].map((section) => (
            <TouchableOpacity
              key={section}
              style={[
                styles.navButton,
                activeSection === section && styles.navButtonActive
              ]}
              onPress={() => setActiveSection(section)}
            >
              <Text style={[
                styles.navText,
                activeSection === section && styles.navTextActive
              ]}>
                {section === 'personal' && 'Personal'}
                {section === 'academico' && 'Académico'}
                {section === 'habilidades' && 'Habilidades'}
                {section === 'cv' && 'CV'}
                {section === 'configuracion' && 'Config'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Contenido de la sección activa */}
      <ScrollView style={styles.content}>
        {activeSection === 'personal' && renderPersonalInfo()}
        {activeSection === 'academico' && renderAcademicInfo()}
        {activeSection === 'habilidades' && renderHabilidades()}
        {activeSection === 'cv' && renderCVFile()}
        {activeSection === 'configuracion' && renderConfiguracion()}
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
  navScroll: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  navContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  navButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: '#f8f9fa',
  },
  navButtonActive: {
    backgroundColor: '#d90429',
  },
  navText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
  },
  navTextActive: {
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
    flex: 1,
  },
  value: {
    fontSize: 14,
    color: '#212529',
    flex: 2,
    textAlign: 'right',
  },
  photoSection: {
    marginTop: 16,
  },
  photoContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  photo: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#e9ecef',
  },
  photoText: {
    marginTop: 8,
    color: '#d90429',
    fontWeight: '600',
  },
  addButton: {
    backgroundColor: '#d90429',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  skillTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e7f3ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  skillText: {
    color: '#0066cc',
    fontSize: 12,
    marginRight: 6,
  },
  removeText: {
    color: '#0066cc',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyText: {
    color: '#6c757d',
    fontStyle: 'italic',
    textAlign: 'center',
    width: '100%',
    padding: 20,
  },
  cvContainer: {
    alignItems: 'center',
  },
  cvSuccess: {
    color: '#28a745',
    fontWeight: '600',
    marginBottom: 12,
  },
  uploadCvButton: {
    backgroundColor: '#d90429',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  uploadCvButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  downloadButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
    marginBottom: 8,
  },
  downloadButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  uploadButton: {
    backgroundColor: '#6c757d',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  configRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
  },
  configText: {
    flex: 1,
    marginRight: 16,
  },
  configLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 4,
  },
  configDescription: {
    fontSize: 12,
    color: '#6c757d',
    lineHeight: 16,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#212529',
    textTransform: 'capitalize',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
    minWidth: 80,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#6c757d',
  },
  cancelButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#d90429',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});

export default MiscvsScreen;