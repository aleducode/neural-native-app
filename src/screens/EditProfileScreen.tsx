import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { colors, typography } from '../theme/colors';
import { authApi } from '../api/auth';
import { profileApi, ProfileResponse } from '../api/profile';
import AuthField from '../components/AuthField';
import Screen from '../components/ui/Screen';
import AppHeader from '../components/ui/AppHeader';
import PrimaryButton from '../components/ui/PrimaryButton';

interface MetricTileProps {
  label: string;
  value: string | number;
  unit: string;
  onPress: () => void;
}

/** One of the three measurements that live on their own screens. */
function MetricTile({ label, value, unit, onPress }: MetricTileProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value} ${unit}. Tocar para editar`}
    >
      <View style={styles.tileHead}>
        <Text style={styles.tileLabel}>{label}</Text>
        <Feather name="edit-2" size={12} color={colors.gray400} />
      </View>
      <View style={styles.tileValueRow}>
        <Text style={styles.tileValue}>{value}</Text>
        <Text style={styles.tileUnit}>{unit}</Text>
      </View>
    </Pressable>
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
  // Everything that can fail on this screen now fails beside the thing that
  // failed: the name field, the avatar, or the save button.
  const [nameError, setNameError] = useState<string | undefined>(undefined);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

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

  const intro = useSharedValue(0);
  useEffect(() => {
    intro.value = withTiming(1, { duration: 460, easing: Easing.out(Easing.cubic) });
  }, []);

  const headStyle = useAnimatedStyle(() => ({
    opacity: intro.value,
    transform: [{ translateY: (1 - intro.value) * 14 }],
  }));
  const bodyStyle = useAnimatedStyle(() => ({
    opacity: withDelay(90, withTiming(intro.value, { duration: 400 })),
    transform: [{ translateY: withDelay(90, withTiming((1 - intro.value) * 14, { duration: 400 })) }],
  }));

  const age = profileData?.profile.age;
  const height = profileData?.profile.height;
  const weight = profileData?.latest_weight?.weight;

  const go = (screen: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate(screen);
  };

  const handleChangePhoto = async () => {
    setPhotoError(null);

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      setPhotoError('Necesitamos acceso a tu galería para cambiar la foto de perfil.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
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
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        setPhotoError(error || 'No se pudo actualizar la foto de perfil.');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    }
  };

  const handleSave = async () => {
    setSaveError(null);

    if (!firstName.trim()) {
      setNameError('El nombre es requerido');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    setNameError(undefined);

    setIsSaving(true);

    const { data, error } = await authApi.updateProfile({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
    });

    setIsSaving(false);

    if (data) {
      updateUser(data);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowSuccessModal(true);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setSaveError(error || 'No se pudo actualizar el perfil.');
    }
  };

  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
    navigation.goBack();
  };

  const hasChanges =
    firstName !== (user?.first_name || '') || lastName !== (user?.last_name || '');

  return (
    <Screen tone="plain" wash edges={['top', 'bottom']}>
      <AppHeader title="Editar perfil" />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <Animated.View style={headStyle}>
            <Pressable
              onPress={handleChangePhoto}
              disabled={isUploadingPhoto}
              style={({ pressed }) => [styles.photoRow, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Cambiar foto de perfil"
            >
              <View style={styles.avatarWrap}>
                {userPhoto ? (
                  <Image source={{ uri: userPhoto }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarFallback]}>
                    <Text style={styles.avatarText}>{userInitials}</Text>
                  </View>
                )}

                {isUploadingPhoto ? (
                  <View style={styles.avatarOverlay}>
                    <ActivityIndicator size="small" color={colors.white} />
                  </View>
                ) : (
                  <View style={styles.cameraBadge}>
                    <Feather name="camera" size={13} color={colors.white} />
                  </View>
                )}
              </View>

              <View style={styles.photoText}>
                <Text style={styles.photoTitle}>Foto de perfil</Text>
                <Text style={styles.photoHint}>Toca para cambiarla</Text>
              </View>
            </Pressable>

            {!!photoError && (
              <View style={styles.errorRow}>
                <Feather name="alert-circle" size={14} color={colors.error} />
                <Text style={styles.errorText}>{photoError}</Text>
              </View>
            )}
          </Animated.View>

          <Animated.View style={bodyStyle}>
            <Text style={styles.sectionLabel}>MEDIDAS</Text>
            <View style={styles.tiles}>
              <MetricTile
                label="Edad"
                value={age ?? '--'}
                unit="años"
                onPress={() => go('BirthdateInput')}
              />
              <MetricTile
                label="Peso"
                value={weight ?? '--'}
                unit="Kg"
                onPress={() => go('WeightInput')}
              />
              <MetricTile
                label="Altura"
                value={height ?? '--'}
                unit="Cm"
                onPress={() => go('HeightInput')}
              />
            </View>

            <Text style={styles.sectionLabel}>TUS DATOS</Text>
            <View style={styles.form}>
              <AuthField
                kind="text"
                label="Nombre"
                value={firstName}
                error={nameError}
                editable={!isSaving}
                returnKeyType="next"
                onChangeText={(text) => {
                  setFirstName(text);
                  if (nameError) setNameError(undefined);
                }}
              />
              <AuthField
                kind="text"
                label="Apellido"
                value={lastName}
                editable={!isSaving}
                returnKeyType="done"
                onChangeText={setLastName}
              />
              <AuthField
                kind="email"
                label="Correo electrónico"
                value={userEmail}
                editable={false}
                onChangeText={() => {}}
              />
              <AuthField
                kind="phone"
                label="Teléfono"
                value={userPhone}
                editable={false}
                onChangeText={() => {}}
              />
              {/* Two of the four fields cannot be edited here, so the screen
                  says why instead of leaving them looking broken. */}
              <Text style={styles.readOnlyNote}>
                El correo y el teléfono los gestiona Neural. Escríbenos si necesitas cambiarlos.
              </Text>
            </View>

            {!!saveError && (
              <View style={styles.errorRow}>
                <Feather name="alert-circle" size={14} color={colors.error} />
                <Text style={styles.errorText}>{saveError}</Text>
              </View>
            )}
          </Animated.View>
        </ScrollView>

        <View style={styles.footer}>
          <PrimaryButton
            label="Guardar"
            onPress={handleSave}
            loading={isSaving}
            disabled={!hasChanges || isSaving}
          />
        </View>
      </KeyboardAvoidingView>

      {/* The shared ConfirmModal is still legacy blue and uppercase, and other
          unmigrated screens depend on it, so this confirmation is local. */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={handleSuccessModalClose}
      >
        <View style={styles.scrim}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={handleSuccessModalClose}
            accessibilityLabel="Cerrar"
          />
          <View style={styles.sheet}>
            <View style={styles.sheetIcon}>
              <Feather name="check" size={22} color={colors.accentDeep} />
            </View>
            <Text style={styles.sheetTitle}>Perfil actualizado</Text>
            <Text style={styles.sheetMessage}>Tus datos se guardaron correctamente.</Text>
            <PrimaryButton
              label="Listo"
              onPress={handleSuccessModalClose}
              style={styles.sheetCta}
            />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 8,
  },
  avatarWrap: {
    width: 76,
    height: 76,
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
  },
  avatarFallback: {
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: typography.fontFamily,
    fontSize: 24,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
  },
  avatarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 38,
    backgroundColor: 'rgba(17, 17, 17, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.white,
  },
  photoText: {
    flex: 1,
    gap: 2,
  },
  photoTitle: {
    fontFamily: typography.fontFamily,
    fontSize: 18,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.ink,
  },
  photoHint: {
    fontFamily: typography.fontFamily,
    fontSize: 13,
    color: colors.gray400,
  },
  sectionLabel: {
    fontFamily: typography.fontFamily,
    fontSize: 11,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: 1.2,
    color: colors.gray400,
    marginTop: 28,
    marginBottom: 10,
  },
  tiles: {
    flexDirection: 'row',
    gap: 10,
  },
  tile: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    gap: 8,
  },
  tileHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tileLabel: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.gray400,
  },
  tileValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  tileValue: {
    fontFamily: typography.fontFamily,
    fontSize: 26,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: -0.8,
    color: colors.ink,
  },
  tileUnit: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    color: colors.gray400,
  },
  form: {
    gap: 18,
  },
  readOnlyNote: {
    fontFamily: typography.fontFamily,
    fontSize: 13,
    lineHeight: 18,
    color: colors.gray400,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
  },
  errorText: {
    flex: 1,
    fontFamily: typography.fontFamily,
    fontSize: 13,
    color: colors.error,
  },
  pressed: {
    opacity: 0.85,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: colors.white,
  },
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(17, 17, 17, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  sheet: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 24,
  },
  sheetIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontFamily: typography.fontFamily,
    fontSize: 24,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: -0.6,
    color: colors.ink,
  },
  sheetMessage: {
    marginTop: 8,
    fontFamily: typography.fontFamily,
    fontSize: 15,
    lineHeight: 21,
    color: colors.gray400,
  },
  sheetCta: {
    marginTop: 24,
  },
});
