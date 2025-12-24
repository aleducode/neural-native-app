import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { colors, typography, spacing, borderRadius } from '../theme/colors';
import { authApi } from '../api/auth';
import { profileApi, ProfileResponse } from '../api/profile';
import ConfirmModal from '../components/ConfirmModal';

interface InputFieldProps {
  label: string;
  value: string;
  onChangeText?: (text: string) => void;
  placeholder?: string;
  editable?: boolean;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
}

function InputField({
  label,
  value,
  onChangeText,
  placeholder,
  editable = true,
  keyboardType = 'default',
}: InputFieldProps) {
  return (
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={[styles.inputWrapper, !editable && styles.inputDisabled]}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.gray400}
          editable={editable}
          keyboardType={keyboardType}
        />
      </View>
    </View>
  );
}

export default function EditProfileScreen() {
  const navigation = useNavigation<any>();
  const { user, updateUser } = useAuth();

  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [profileData, setProfileData] = useState<ProfileResponse | null>(null);

  const userEmail = user?.email || '';
  const userPhone = user?.phone_number || '';
  const userPhoto = user?.photo_url;
  const userInitials = user
    ? `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase()
    : 'U';

  // Fetch profile data on focus
  useFocusEffect(
    useCallback(() => {
      const fetchProfileData = async () => {
        const { data } = await profileApi.getProfile();
        if (data) {
          setProfileData(data);
        }
      };
      fetchProfileData();
    }, [])
  );

  const age = profileData?.profile.age;
  const height = profileData?.profile.height;
  const weight = profileData?.latest_weight?.weight;

  const handleBack = () => {
    navigation.goBack();
  };

  const handleChangePhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert(
        'Permiso requerido',
        'Necesitamos acceso a tu galería para cambiar la foto de perfil.'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setIsUploadingPhoto(true);

      const { data, error } = await authApi.uploadPhoto(
        asset.uri,
        asset.fileName || `photo_${Date.now()}.jpg`,
        asset.mimeType || 'image/jpeg'
      );

      setIsUploadingPhoto(false);

      if (data) {
        updateUser(data);
      } else {
        Alert.alert('Error', error || 'No se pudo actualizar la foto de perfil.');
      }
    }
  };

  const handleSave = async () => {
    if (!firstName.trim()) {
      Alert.alert('Error', 'El nombre es requerido');
      return;
    }

    setIsSaving(true);

    const { data, error } = await authApi.updateProfile({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
    });

    setIsSaving(false);

    if (data) {
      updateUser(data);
      setShowSuccessModal(true);
    } else {
      Alert.alert('Error', error || 'No se pudo actualizar el perfil.');
    }
  };

  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
    navigation.goBack();
  };

  const hasChanges =
    firstName !== (user?.first_name || '') || lastName !== (user?.last_name || '');

  return (
    <View style={styles.container}>
      {/* Background Gradients */}
      <View style={styles.backgroundContainer}>
        <LinearGradient
          colors={['rgba(69, 255, 183, 0.4)', 'transparent']}
          style={styles.gradientTop}
        />
        <LinearGradient
          colors={['rgba(69, 255, 183, 0.4)', 'transparent']}
          style={styles.gradientBottom}
        />
      </View>

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <Ionicons name="chevron-back" size={24} color={colors.textDark} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Editar Perfil</Text>
            <View style={styles.headerSpacer} />
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Profile Card */}
            <View style={styles.profileCardContainer}>
              {/* Avatar */}
              <TouchableOpacity
                style={styles.avatarContainer}
                onPress={handleChangePhoto}
                disabled={isUploadingPhoto}
                activeOpacity={0.8}
              >
                {userPhoto ? (
                  <Image source={{ uri: userPhoto }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarText}>{userInitials}</Text>
                  </View>
                )}
                {isUploadingPhoto ? (
                  <View style={styles.avatarOverlay}>
                    <ActivityIndicator size="small" color={colors.white} />
                  </View>
                ) : (
                  <View style={styles.cameraIconContainer}>
                    <Ionicons name="camera" size={16} color={colors.white} />
                  </View>
                )}
              </TouchableOpacity>

              {/* Gradient Card */}
              <LinearGradient
                colors={['#45FFB7', '#A8FFD9', '#FFFFFF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.profileCard}
              >
                <View style={styles.statsContainer}>
                  <TouchableOpacity
                    style={styles.statItem}
                    onPress={() => navigation.navigate('BirthdateInput')}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.statLabel}>Edad</Text>
                    <View style={styles.statValueContainer}>
                      <Text style={styles.statValue}>{age ?? '--'}</Text>
                      <Text style={styles.statUnit}> años</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.statItem}
                    onPress={() => navigation.navigate('WeightInput')}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.statLabel}>Peso</Text>
                    <View style={styles.statValueContainer}>
                      <Text style={styles.statValue}>{weight ?? '--'}</Text>
                      <Text style={styles.statUnit}> Kg</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.statItem}
                    onPress={() => navigation.navigate('HeightInput')}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.statLabel}>Altura</Text>
                    <View style={styles.statValueContainer}>
                      <Text style={styles.statValue}>{height ?? '--'}</Text>
                      <Text style={styles.statUnit}> Cm</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </View>

            {/* Form Fields */}
            <View style={styles.formContainer}>
              <InputField
                label="Nombre"
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Tu nombre"
              />
              <InputField
                label="Apellido"
                value={lastName}
                onChangeText={setLastName}
                placeholder="Tu apellido"
              />
              <InputField
                label="Email"
                value={userEmail}
                editable={false}
                keyboardType="email-address"
              />
              <InputField
                label="Teléfono"
                value={userPhone}
                editable={false}
                keyboardType="phone-pad"
              />
            </View>

            {/* Bottom Spacer */}
            <View style={{ height: 120 }} />
          </ScrollView>

          {/* Save Button */}
          <View style={styles.bottomButtonContainer}>
            <TouchableOpacity
              style={[styles.saveButton, (!hasChanges || isSaving) && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={!hasChanges || isSaving}
              activeOpacity={0.8}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color={colors.textDark} />
              ) : (
                <Text style={styles.saveButtonText}>Guardar</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>

        {/* Success Modal */}
        <ConfirmModal
          visible={showSuccessModal}
          title="Actualizado"
          message="Tu perfil ha sido actualizado correctamente."
          confirmText="OK"
          onConfirm={handleSuccessModalClose}
          onCancel={handleSuccessModalClose}
          singleButton
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgDark,
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  backgroundContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gradientTop: {
    position: 'absolute',
    top: 50,
    left: -150,
    width: 250,
    height: 250,
    borderRadius: 125,
  },
  gradientBottom: {
    position: 'absolute',
    bottom: 80,
    right: -150,
    width: 250,
    height: 250,
    borderRadius: 125,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: typography.fontSize.title1,
    fontFamily: typography.fontFamily.bold,
    color: colors.white,
    textTransform: 'uppercase',
  },
  headerSpacer: {
    width: 48,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
  },
  profileCardContainer: {
    marginTop: 50,
    marginBottom: spacing.xl,
  },
  avatarContainer: {
    position: 'absolute',
    top: -50,
    left: '50%',
    marginLeft: -50,
    zIndex: 10,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: colors.white,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.white,
  },
  avatarText: {
    fontSize: 36,
    fontFamily: typography.fontFamily.bold,
    color: colors.textDark,
  },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },
  avatarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 50,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileCard: {
    borderRadius: borderRadius.xl,
    paddingTop: 70,
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.xxl,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'flex-start',
  },
  statLabel: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.medium,
    color: colors.gray400,
    marginBottom: 4,
  },
  statValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  statValue: {
    fontSize: typography.fontSize.title1,
    fontFamily: typography.fontFamily.bold,
    color: colors.textDark,
  },
  statUnit: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.medium,
    color: colors.textDark,
  },
  formContainer: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  inputContainer: {
    gap: spacing.xs,
  },
  inputLabel: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.medium,
    color: colors.textDark,
  },
  inputWrapper: {
    backgroundColor: colors.gray200,
    borderRadius: 30,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    height: 50,
    justifyContent: 'center',
  },
  inputDisabled: {
    opacity: 0.6,
  },
  input: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.medium,
    color: colors.textDark,
  },
  bottomButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    paddingTop: spacing.lg,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 1000,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.semibold,
    color: colors.textDark,
    textTransform: 'uppercase',
  },
});
