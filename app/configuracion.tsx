// app/configuracion.tsx
import { useRouter } from 'expo-router';
import {
    EmailAuthProvider,
    reauthenticateWithCredential,
    updatePassword
} from 'firebase/auth';
import {
    doc,
    getDoc,
    serverTimestamp,
    updateDoc
} from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { auth, db } from '../src/firebase/firebase';

type UserSettings = {
  // Información personal (de Firestore)
  nombres: string;
  apellidos: string;
  email: string;
  telefono: string;
  pais: string;
  ciudad: string;
  edad: string;
  
  // Preferencias de notificaciones (nuevos campos)
  notificacionesEmail: boolean;
  notificacionesPush: boolean;
  notificacionesNuevasVacantes: boolean;
  notificacionesEstadoPostulacion: boolean;
  notificacionesVistasPerfil: boolean;
  
  // Preferencias de privacidad
  perfilPublico: boolean;
  mostrarEmail: boolean;
  mostrarTelefono: boolean;
  disponibleParaTrabajar: boolean;
};

const ConfiguracionScreen = () => {
  const router = useRouter();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<'personal' | 'notificaciones' | 'privacidad'>('personal');
  
  // Estados para modales
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'nombres' | 'apellidos' | 'telefono' | 'pais' | 'ciudad' | 'edad' | 'password' | null>(null);
  const [editValue, setEditValue] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    loadUserSettings();
  }, []);

  const loadUserSettings = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        router.replace('/login');
        return;
      }

      // Cargar datos del estudiante desde Firestore
      const studentDoc = await getDoc(doc(db, 'students', user.uid));
      
      if (studentDoc.exists()) {
        const studentData = studentDoc.data();
        console.log('📋 Datos cargados de Firestore:', studentData);
        
        setSettings({
          // Información personal (de Firestore)
          nombres: studentData.nombres || '',
          apellidos: studentData.apellidos || '',
          email: user.email || '',
          telefono: studentData.telefono || '',
          pais: studentData.pais || '',
          ciudad: studentData.ciudad || '',
          edad: studentData.edad ? studentData.edad.toString() : '',
          
          // Preferencias de notificaciones (valores por defecto)
          notificacionesEmail: studentData.notificacionesEmail !== false,
          notificacionesPush: studentData.notificacionesPush !== false,
          notificacionesNuevasVacantes: studentData.notificacionesNuevasVacantes !== false,
          notificacionesEstadoPostulacion: studentData.notificacionesEstadoPostulacion !== false,
          notificacionesVistasPerfil: studentData.notificacionesVistasPerfil !== false,
          
          // Preferencias de privacidad
          perfilPublico: studentData.perfilPublico !== false,
          mostrarEmail: studentData.mostrarEmail !== false,
          mostrarTelefono: studentData.mostrarTelefono !== false,
          disponibleParaTrabajar: studentData.disponibleParaTrabajar !== false,
        });
      } else {
        console.log('❌ No se encontró el documento del estudiante');
        Alert.alert('Error', 'No se encontró tu información de perfil');
      }
    } catch (error) {
      console.error('Error cargando configuración:', error);
      Alert.alert('Error', 'No se pudieron cargar las configuraciones');
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (field: keyof UserSettings, value: any) => {
    try {
      const user = auth.currentUser;
      if (!user || !settings) return;

      setSaving(true);
      
      console.log(`🔄 Actualizando campo ${field}:`, value);
      
      // Actualizar en Firestore
      await updateDoc(doc(db, 'students', user.uid), {
        [field]: value,
        updatedAt: serverTimestamp()
      });

      // Actualizar estado local
      setSettings(prev => prev ? { ...prev, [field]: value } : null);
      
      console.log('✅ Campo actualizado exitosamente');
      
    } catch (error) {
      console.error('Error actualizando configuración:', error);
      Alert.alert('Error', 'No se pudo actualizar la configuración');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePersonalInfo = async () => {
    try {
      const user = auth.currentUser;
      if (!user || !settings || !modalType) return;

      setSaving(true);

      console.log(`🔄 Actualizando ${modalType}:`, editValue);

      // Actualizar en Firestore
      await updateDoc(doc(db, 'students', user.uid), {
        [modalType]: modalType === 'edad' ? parseInt(editValue) || 0 : editValue,
        updatedAt: serverTimestamp()
      });

      // Actualizar estado local
      setSettings(prev => prev ? { 
        ...prev, 
        [modalType]: modalType === 'edad' ? parseInt(editValue) || 0 : editValue
      } : null);

      setModalVisible(false);
      setEditValue('');
      
      Alert.alert('Éxito', 'Información actualizada correctamente');
      console.log('✅ Información personal actualizada');
      
    } catch (error) {
      console.error('Error actualizando información:', error);
      Alert.alert('Error', 'No se pudo actualizar la información');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    try {
      const user = auth.currentUser;
      if (!user || !user.email) return;

      // Validaciones
      if (!currentPassword || !newPassword || !confirmPassword) {
        Alert.alert('Error', 'Todos los campos son obligatorios');
        return;
      }

      if (newPassword !== confirmPassword) {
        Alert.alert('Error', 'Las contraseñas no coinciden');
        return;
      }

      if (newPassword.length < 6) {
        Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres');
        return;
      }

      setSaving(true);

      // Reautenticar al usuario
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      // Cambiar contraseña
      await updatePassword(user, newPassword);

      setModalVisible(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      Alert.alert('Éxito', 'Contraseña actualizada correctamente');
      
    } catch (error: any) {
      console.error('Error cambiando contraseña:', error);
      
      if (error.code === 'auth/wrong-password') {
        Alert.alert('Error', 'La contraseña actual es incorrecta');
      } else if (error.code === 'auth/weak-password') {
        Alert.alert('Error', 'La contraseña es demasiado débil');
      } else if (error.code === 'auth/requires-recent-login') {
        Alert.alert('Error', 'Debes iniciar sesión nuevamente para cambiar la contraseña');
      } else {
        Alert.alert('Error', 'No se pudo cambiar la contraseña: ' + error.message);
      }
    } finally {
      setSaving(false);
    }
  };

  const openEditModal = (type: 'nombres' | 'apellidos' | 'telefono' | 'pais' | 'ciudad' | 'edad' | 'password', currentValue?: any) => {
    setModalType(type);
    setEditValue(currentValue?.toString() || '');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setModalVisible(true);
  };

  const renderPersonalInfo = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Información Personal</Text>
      
      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingLabel}>Nombres</Text>
          <Text style={styles.settingValue}>
            {settings?.nombres || 'No especificado'}
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.editButton}
          onPress={() => openEditModal('nombres', settings?.nombres)}
        >
          <Text style={styles.editButtonText}>Editar</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingLabel}>Apellidos</Text>
          <Text style={styles.settingValue}>
            {settings?.apellidos || 'No especificado'}
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.editButton}
          onPress={() => openEditModal('apellidos', settings?.apellidos)}
        >
          <Text style={styles.editButtonText}>Editar</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingLabel}>Email</Text>
          <Text style={styles.settingValue}>{settings?.email}</Text>
        </View>
        <Text style={styles.uneditableText}>No editable</Text>
      </View>

      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingLabel}>Teléfono</Text>
          <Text style={styles.settingValue}>
            {settings?.telefono || 'No especificado'}
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.editButton}
          onPress={() => openEditModal('telefono', settings?.telefono)}
        >
          <Text style={styles.editButtonText}>Editar</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingLabel}>País</Text>
          <Text style={styles.settingValue}>
            {settings?.pais || 'No especificado'}
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.editButton}
          onPress={() => openEditModal('pais', settings?.pais)}
        >
          <Text style={styles.editButtonText}>Editar</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingLabel}>Ciudad</Text>
          <Text style={styles.settingValue}>
            {settings?.ciudad || 'No especificado'}
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.editButton}
          onPress={() => openEditModal('ciudad', settings?.ciudad)}
        >
          <Text style={styles.editButtonText}>Editar</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingLabel}>Edad</Text>
          <Text style={styles.settingValue}>
            {settings?.edad ? `${settings.edad} años` : 'No especificado'}
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.editButton}
          onPress={() => openEditModal('edad', settings?.edad)}
        >
          <Text style={styles.editButtonText}>Editar</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingLabel}>Contraseña</Text>
          <Text style={styles.settingValue}>••••••••</Text>
        </View>
        <TouchableOpacity 
          style={styles.editButton}
          onPress={() => openEditModal('password')}
        >
          <Text style={styles.editButtonText}>Cambiar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderNotificaciones = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Preferencias de Notificaciones</Text>
      
      <View style={styles.switchRow}>
        <View style={styles.switchInfo}>
          <Text style={styles.switchLabel}>Notificaciones por Email</Text>
          <Text style={styles.switchDescription}>
            Recibir notificaciones importantes por correo electrónico
          </Text>
        </View>
        <Switch
          value={settings?.notificacionesEmail || false}
          onValueChange={(value) => updateSetting('notificacionesEmail', value)}
          trackColor={{ false: '#767577', true: '#81b0ff' }}
          thumbColor={settings?.notificacionesEmail ? '#d90429' : '#f4f3f4'}
        />
      </View>

      <View style={styles.switchRow}>
        <View style={styles.switchInfo}>
          <Text style={styles.switchLabel}>Notificaciones Push</Text>
          <Text style={styles.switchDescription}>
            Recibir notificaciones en la aplicación
          </Text>
        </View>
        <Switch
          value={settings?.notificacionesPush || false}
          onValueChange={(value) => updateSetting('notificacionesPush', value)}
          trackColor={{ false: '#767577', true: '#81b0ff' }}
          thumbColor={settings?.notificacionesPush ? '#d90429' : '#f4f3f4'}
        />
      </View>

      <View style={styles.switchRow}>
        <View style={styles.switchInfo}>
          <Text style={styles.switchLabel}>Nuevas vacantes</Text>
          <Text style={styles.switchDescription}>
            Alertas sobre nuevas vacantes que coincidan con tu perfil
          </Text>
        </View>
        <Switch
          value={settings?.notificacionesNuevasVacantes || false}
          onValueChange={(value) => updateSetting('notificacionesNuevasVacantes', value)}
          trackColor={{ false: '#767577', true: '#81b0ff' }}
          thumbColor={settings?.notificacionesNuevasVacantes ? '#d90429' : '#f4f3f4'}
        />
      </View>

      <View style={styles.switchRow}>
        <View style={styles.switchInfo}>
          <Text style={styles.switchLabel}>Estado de postulaciones</Text>
          <Text style={styles.switchDescription}>
            Actualizaciones sobre el estado de tus postulaciones
          </Text>
        </View>
        <Switch
          value={settings?.notificacionesEstadoPostulacion || false}
          onValueChange={(value) => updateSetting('notificacionesEstadoPostulacion', value)}
          trackColor={{ false: '#767577', true: '#81b0ff' }}
          thumbColor={settings?.notificacionesEstadoPostulacion ? '#d90429' : '#f4f3f4'}
        />
      </View>

      <View style={styles.switchRow}>
        <View style={styles.switchInfo}>
          <Text style={styles.switchLabel}>Vistas de perfil</Text>
          <Text style={styles.switchDescription}>
            Notificaciones cuando empresas vean tu perfil
          </Text>
        </View>
        <Switch
          value={settings?.notificacionesVistasPerfil || false}
          onValueChange={(value) => updateSetting('notificacionesVistasPerfil', value)}
          trackColor={{ false: '#767577', true: '#81b0ff' }}
          thumbColor={settings?.notificacionesVistasPerfil ? '#d90429' : '#f4f3f4'}
        />
      </View>
    </View>
  );

  const renderPrivacidad = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Privacidad</Text>
      
      <View style={styles.switchRow}>
        <View style={styles.switchInfo}>
          <Text style={styles.switchLabel}>Perfil público</Text>
          <Text style={styles.switchDescription}>
            Permitir que las empresas vean tu perfil y te contacten
          </Text>
        </View>
        <Switch
          value={settings?.perfilPublico || false}
          onValueChange={(value) => updateSetting('perfilPublico', value)}
          trackColor={{ false: '#767577', true: '#81b0ff' }}
          thumbColor={settings?.perfilPublico ? '#d90429' : '#f4f3f4'}
        />
      </View>

      <View style={styles.switchRow}>
        <View style={styles.switchInfo}>
          <Text style={styles.switchLabel}>Mostrar email</Text>
          <Text style={styles.switchDescription}>
            Mostrar tu dirección de email en el perfil público
          </Text>
        </View>
        <Switch
          value={settings?.mostrarEmail || false}
          onValueChange={(value) => updateSetting('mostrarEmail', value)}
          trackColor={{ false: '#767577', true: '#81b0ff' }}
          thumbColor={settings?.mostrarEmail ? '#d90429' : '#f4f3f4'}
        />
      </View>

      <View style={styles.switchRow}>
        <View style={styles.switchInfo}>
          <Text style={styles.switchLabel}>Mostrar teléfono</Text>
          <Text style={styles.switchDescription}>
            Mostrar tu número de teléfono en el perfil público
          </Text>
        </View>
        <Switch
          value={settings?.mostrarTelefono || false}
          onValueChange={(value) => updateSetting('mostrarTelefono', value)}
          trackColor={{ false: '#767577', true: '#81b0ff' }}
          thumbColor={settings?.mostrarTelefono ? '#d90429' : '#f4f3f4'}
        />
      </View>

      <View style={styles.switchRow}>
        <View style={styles.switchInfo}>
          <Text style={styles.switchLabel}>Disponible para trabajar</Text>
          <Text style={styles.switchDescription}>
            Mostrar que estás activamente buscando empleo
          </Text>
        </View>
        <Switch
          value={settings?.disponibleParaTrabajar || false}
          onValueChange={(value) => updateSetting('disponibleParaTrabajar', value)}
          trackColor={{ false: '#767577', true: '#81b0ff' }}
          thumbColor={settings?.disponibleParaTrabajar ? '#d90429' : '#f4f3f4'}
        />
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#d90429" />
        <Text style={styles.loadingText}>Cargando configuración...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Configuración</Text>
        <Text style={styles.headerSubtitle}>Gestiona tu cuenta y preferencias</Text>
      </View>

      {/* Navegación entre secciones */}
      <ScrollView horizontal style={styles.navScroll} showsHorizontalScrollIndicator={false}>
        <View style={styles.navContainer}>
          {[
            { key: 'personal' as const, label: 'Personal', icon: '👤' },
            { key: 'notificaciones' as const, label: 'Notificaciones', icon: '🔔' },
            { key: 'privacidad' as const, label: 'Privacidad', icon: '🔒' }
          ].map((section) => (
            <TouchableOpacity
              key={section.key}
              style={[
                styles.navButton,
                activeSection === section.key && styles.navButtonActive
              ]}
              onPress={() => setActiveSection(section.key)}
            >
              <Text style={styles.navIcon}>{section.icon}</Text>
              <Text style={[
                styles.navText,
                activeSection === section.key && styles.navTextActive
              ]}>
                {section.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Contenido de la sección activa */}
      <ScrollView style={styles.content}>
        {activeSection === 'personal' && renderPersonalInfo()}
        {activeSection === 'notificaciones' && renderNotificaciones()}
        {activeSection === 'privacidad' && renderPrivacidad()}
      </ScrollView>

      {/* Modal para editar información */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {modalType === 'nombres' && 'Editar nombres'}
              {modalType === 'apellidos' && 'Editar apellidos'}
              {modalType === 'telefono' && 'Editar teléfono'}
              {modalType === 'pais' && 'Editar país'}
              {modalType === 'ciudad' && 'Editar ciudad'}
              {modalType === 'edad' && 'Editar edad'}
              {modalType === 'password' && 'Cambiar contraseña'}
            </Text>
            
            {modalType === 'password' ? (
              <>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Contraseña actual"
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  secureTextEntry
                />
                <TextInput
                  style={styles.modalInput}
                  placeholder="Nueva contraseña"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                />
                <TextInput
                  style={styles.modalInput}
                  placeholder="Confirmar nueva contraseña"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                />
              </>
            ) : (
              <TextInput
                style={styles.modalInput}
                value={editValue}
                onChangeText={setEditValue}
                placeholder={
                  modalType === 'nombres' ? 'Ingresa tus nombres' :
                  modalType === 'apellidos' ? 'Ingresa tus apellidos' :
                  modalType === 'telefono' ? 'Ingresa tu teléfono' :
                  modalType === 'pais' ? 'Ingresa tu país' :
                  modalType === 'ciudad' ? 'Ingresa tu ciudad' :
                  modalType === 'edad' ? 'Ingresa tu edad' : ''
                }
                keyboardType={modalType === 'edad' ? 'numeric' : 'default'}
              />
            )}
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.saveButton]}
                onPress={() => 
                  modalType === 'password' 
                    ? handleChangePassword() 
                    : handleUpdatePersonalInfo()
                }
                disabled={saving}
              >
                <Text style={styles.saveButtonText}>
                  {saving ? 'Guardando...' : 'Guardar'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

// Los estilos se mantienen igual que en la versión anterior...
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
    paddingVertical: 16,
  },
  navButton: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginRight: 12,
    backgroundColor: '#f8f9fa',
    minWidth: 80,
  },
  navButtonActive: {
    backgroundColor: '#d90429',
  },
  navIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  navText: {
    fontSize: 12,
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 20,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 4,
  },
  settingValue: {
    fontSize: 14,
    color: '#6c757d',
  },
  editButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  uneditableText: {
    color: '#6c757d',
    fontSize: 12,
    fontStyle: 'italic',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
  },
  switchInfo: {
    flex: 1,
    marginRight: 16,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 4,
  },
  switchDescription: {
    fontSize: 12,
    color: '#6c757d',
    lineHeight: 16,
  },
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
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
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

export default ConfiguracionScreen;