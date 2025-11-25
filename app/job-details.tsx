// app/job-details.tsx
import { useLocalSearchParams, useRouter } from 'expo-router';
import { addDoc, collection, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
// Paleta de colores personalizada
const customColors = {
  light: {
    background: '#FFFFFF',
    text: '#000000',
    buttonBackground: '#000000',
    buttonText: '#FFFFFF',
  },
  dark: {
    background: '#1D1C1C',
    text: '#FFFFFF',
    buttonBackground: '#DE0606',
    buttonText: '#FFFFFF',
  },
};
import { auth, db } from '../src/firebase/firebase';

type JobDetails = {
  id: string;
  titulo: string;
  descripcion: string;
  empresaNombre: string;
  empresaId: string;
  ubicacion: string;
  tipo: string;
  salarioMin: number;
  salarioMax: number;
  moneda: string;
  fechaPublicacion: any;
  fechaActualizacion: any;
  activa: boolean;
  // Campos adicionales que pueden existir
  requisitos?: string[];
  responsabilidades?: string[];
  beneficios?: string[];
  habilidadesRequeridas?: string[];
  nivelExperiencia?: string;
  categoria?: string;
};

const JobDetailsScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = customColors[colorScheme];
  
  const [job, setJob] = useState<JobDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [mensajePersonalizado, setMensajePersonalizado] = useState('');

  const jobId = params.id as string;

  useEffect(() => {
    if (jobId) {
      loadJobDetails();
    }
  }, [jobId]);

  const loadJobDetails = async () => {
    try {
      setLoading(true);
      const jobDoc = await getDoc(doc(db, 'vacantes', jobId));
      
      if (jobDoc.exists()) {
        const jobData = jobDoc.data() as JobDetails;
        setJob({ ...jobData, id: jobDoc.id });
      } else {
        Alert.alert('Error', 'No se encontró la información del empleo');
        router.back();
      }
    } catch (error) {
      console.error('Error cargando detalles del empleo:', error);
      Alert.alert('Error', 'No se pudo cargar la información del empleo');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert('Error', 'Debes iniciar sesión para postularte');
      return;
    }

    if (!job) return;

    setApplying(true);
    try {
      // Crear la postulación
      await addDoc(collection(db, 'postulaciones'), {
        estudianteId: user.uid,
        empresaId: job.empresaId,
        vacanteId: jobId,
        mensajePersonalizado: mensajePersonalizado.trim() || null,
        estado: 'pendiente',
        fechaPostulacion: serverTimestamp(),
        ultimaActualizacion: serverTimestamp(),
        activa: true,
      });

      Alert.alert(
        '¡Postulación enviada!',
        'Tu postulación ha sido enviada exitosamente. La empresa revisará tu perfil y se pondrá en contacto contigo.',
        [
          { text: 'Ver mis postulaciones', onPress: () => router.push('/mispostulaciones') },
          { text: 'Cerrar', style: 'cancel' }
        ]
      );
      
      setShowApplicationForm(false);
      setMensajePersonalizado('');
    } catch (error) {
      console.error('Error enviando postulación:', error);
      Alert.alert('Error', 'No se pudo enviar la postulación. Intenta de nuevo.');
    } finally {
      setApplying(false);
    }
  };

  const formatSalary = (job: JobDetails) => {
    if (job.salarioMin && job.salarioMax) {
      return `$${job.salarioMin} - $${job.salarioMax} ${job.moneda || 'USD'}`;
    } else if (job.salarioMin) {
      return `Desde $${job.salarioMin} ${job.moneda || 'USD'}`;
    }
    return 'Salario a convenir';
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Fecha no disponible';
    
    const fecha = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const ahora = new Date();
    const diferencia = ahora.getTime() - fecha.getTime();
    const dias = Math.floor(diferencia / (1000 * 60 * 60 * 24));
    
    if (dias === 0) return 'Hoy';
    if (dias === 1) return 'Ayer';
    if (dias < 7) return `Hace ${dias} días`;
    if (dias < 30) return `Hace ${Math.floor(dias / 7)} semanas`;
    return fecha.toLocaleDateString();
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.buttonBackground} />
        <Text style={[styles.loadingText, { color: theme.text }]}>Cargando detalles...</Text>
      </View>
    );
  }

  if (!job) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: theme.background }]}>
        <Text style={[styles.errorText, { color: theme.text }]}>No se pudo cargar la información del empleo</Text>
        <TouchableOpacity style={[styles.backButton, { backgroundColor: theme.buttonBackground }]} onPress={() => router.back()}>
          <Text style={[styles.backButtonText, { color: theme.buttonText }]}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.background, borderBottomColor: theme.text + '20' }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBackButton}>
          <Text style={[styles.headerBackText, { color: theme.buttonBackground }]}>← Atrás</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Detalles del empleo</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Información principal */}
        <View style={[styles.mainCard, { backgroundColor: theme.background, borderColor: theme.text + '20' }]}>
          <View style={styles.jobHeader}>
            <Image 
              source={{ uri: 'https://via.placeholder.com/60' }} 
              style={styles.companyLogo} 
            />
            <View style={styles.jobMainInfo}>
              <Text style={[styles.jobTitle, { color: theme.text }]}>{job.titulo}</Text>
              <Text style={[styles.companyName, { color: theme.text + '80' }]}>{job.empresaNombre}</Text>
              <Text style={[styles.publishDate, { color: theme.text + '60' }]}>
                Publicado {formatDate(job.fechaPublicacion)}
              </Text>
            </View>
          </View>

          <View style={styles.jobMeta}>
            <View style={styles.metaItem}>
              <Text style={styles.metaIcon}>📍</Text>
              <Text style={[styles.metaText, { color: theme.text }]}>{job.ubicacion}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaIcon}>⏱️</Text>
              <Text style={[styles.metaText, { color: theme.text }]}>{job.tipo}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaIcon}>💰</Text>
              <Text style={[styles.metaText, { color: theme.text }]}>{formatSalary(job)}</Text>
            </View>
            {job.nivelExperiencia && (
              <View style={styles.metaItem}>
                <Text style={styles.metaIcon}>🎓</Text>
                <Text style={[styles.metaText, { color: theme.text }]}>{job.nivelExperiencia}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Descripción */}
        <View style={[styles.section, { backgroundColor: theme.background, borderColor: theme.text + '20' }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Descripción del puesto</Text>
          <Text style={[styles.sectionContent, { color: theme.text + '80' }]}>{job.descripcion}</Text>
        </View>

        {/* Responsabilidades */}
        {job.responsabilidades && job.responsabilidades.length > 0 && (
          <View style={[styles.section, { backgroundColor: theme.background, borderColor: theme.text + '20' }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Responsabilidades</Text>
            {job.responsabilidades.map((resp, index) => (
              <Text key={index} style={[styles.listItem, { color: theme.text + '80' }]}>
                • {resp.replace(/"/g, '')}
              </Text>
            ))}
          </View>
        )}

        {/* Requisitos */}
        {job.requisitos && job.requisitos.length > 0 && (
          <View style={[styles.section, { backgroundColor: theme.background, borderColor: theme.text + '20' }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Requisitos</Text>
            {job.requisitos.map((req, index) => (
              <Text key={index} style={[styles.listItem, { color: theme.text + '80' }]}>
                • {req.replace(/"/g, '')}
              </Text>
            ))}
          </View>
        )}

        {/* Habilidades requeridas */}
        {job.habilidadesRequeridas && job.habilidadesRequeridas.length > 0 && (
          <View style={[styles.section, { backgroundColor: theme.background, borderColor: theme.text + '20' }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Habilidades requeridas</Text>
            <View style={styles.skillsContainer}>
              {job.habilidadesRequeridas.map((skill, index) => (
                <View key={index} style={[styles.skillTag, { backgroundColor: theme.buttonBackground }]}>
                  <Text style={[styles.skillText, { color: theme.buttonText }]}>{skill.replace(/"/g, '')}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Beneficios */}
        {job.beneficios && job.beneficios.length > 0 && (
          <View style={[styles.section, { backgroundColor: theme.background, borderColor: theme.text + '20' }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Beneficios</Text>
            {job.beneficios.map((benefit, index) => (
              <Text key={index} style={[styles.listItem, { color: theme.text + '80' }]}>
                • {benefit.replace(/"/g, '')}
              </Text>
            ))}
          </View>
        )}

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Botón de postularse */}
      <View style={[styles.applyContainer, { backgroundColor: theme.background, borderTopColor: theme.text + '20' }]}>
        <TouchableOpacity 
          style={[styles.applyButton, { backgroundColor: theme.buttonBackground }]}
          onPress={() => setShowApplicationForm(true)}
        >
          <Text style={[styles.applyButtonText, { color: theme.buttonText }]}>Postularme a este empleo</Text>
        </TouchableOpacity>
      </View>

      {/* Modal de postulación */}
      {showApplicationForm && (
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Postularte a: {job.titulo}</Text>
            
            <Text style={[styles.modalLabel, { color: theme.text }]}>
              Mensaje personalizado (opcional):
            </Text>
            <TextInput
              style={[styles.messageInput, { backgroundColor: theme.text + '10', color: theme.text }]}
              placeholder="Cuéntanos por qué eres el candidato ideal..."
              placeholderTextColor={theme.text + '60'}
              multiline
              numberOfLines={4}
              value={mensajePersonalizado}
              onChangeText={setMensajePersonalizado}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowApplicationForm(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.confirmButton, { backgroundColor: theme.buttonBackground }]}
                onPress={handleApply}
                disabled={applying}
              >
                {applying ? (
                  <ActivityIndicator size="small" color={theme.buttonText} />
                ) : (
                  <Text style={[styles.confirmButtonText, { color: theme.buttonText }]}>Enviar postulación</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
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
  headerBackButton: {
    padding: 5,
  },
  headerBackText: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  placeholder: {
    width: 50,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  mainCard: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  jobHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  companyLogo: {
    width: 60,
    height: 60,
    borderRadius: 12,
    marginRight: 16,
  },
  jobMainInfo: {
    flex: 1,
  },
  jobTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  companyName: {
    fontSize: 16,
    marginBottom: 4,
  },
  publishDate: {
    fontSize: 14,
  },
  jobMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
    marginBottom: 8,
  },
  metaIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  metaText: {
    fontSize: 14,
  },
  section: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  sectionContent: {
    fontSize: 16,
    lineHeight: 24,
  },
  listItem: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 8,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  skillTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  skillText: {
    fontSize: 14,
    fontWeight: '500',
  },
  bottomSpacing: {
    height: 100,
  },
  applyContainer: {
    padding: 20,
    borderTopWidth: 1,
  },
  applyButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  backButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalLabel: {
    fontSize: 16,
    marginBottom: 8,
  },
  messageInput: {
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlignVertical: 'top',
    marginBottom: 20,
    minHeight: 100,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    // backgroundColor se aplica dinámicamente
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default JobDetailsScreen;
