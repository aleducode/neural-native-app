import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  type TextInput,
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
import { useRevealOnFocus } from '../hooks/useRevealOnFocus';
import { authApi } from '../api/auth';
import { profileApi, ProfileResponse } from '../api/profile';
import { dashboardApi, DashboardResponse } from '../api/dashboard';
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

/** One of the three measurements that live on their own screens (node WMkdd/qfA2t/W83Rz). */
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
        <Feather name="edit-2" size={11} color={colors.gray400} />
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
  const [phone, setPhone] = useState(user?.phone_number || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [profileData, setProfileData] = useState<ProfileResponse | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardResponse | null>(null);
  // Everything that can fail on this screen now fails beside the thing that
  // failed: the name field, the phone field, the avatar, or the save button.
  const [nameError, setNameError] = useState<string | undefined>(undefined);
  const [phoneError, setPhoneError] = useState<string | undefined>(undefined);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Correo is read-only, so the return-key chain skips straight from
  // Apellido to Teléfono — the same handoff pattern as RegisterScreen.
  const lastNameRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);

  // Android never scrolls a focused field clear of the keyboard on its own,
  // and this is the longest form in the app.
  const { scrollRef, onScroll, reveal } = useRevealOnFocus();

  const userEmail = user?.email || '';
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

      // The design's membership card (node KypUw) reads days_left, which
      // only /dashboard/ has — profileApi never returns it.
      const fetchDashboardData = async () => {
        const { data } = await dashboardApi.getDashboard();
        if (data) {
          setDashboardData(data);
        }
      };
      fetchDashboardData();
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
  const membership = dashboardData?.membership;
  const membershipDays = membership?.days_left ?? 0;

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

    // Same "required" rule RegisterScreen uses for this field (no format
    // regex there either — the backend is the source of truth for format).
    if (!phone.trim()) {
      setPhoneError('Ingresa tu teléfono');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    setPhoneError(undefined);

    setIsSaving(true);

    const { data, error } = await authApi.updateProfile({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      phone_number: phone.trim(),
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
    firstName !== (user?.first_name || '') ||
    lastName !== (user?.last_name || '') ||
    phone !== (user?.phone_number || '');

  return (
    <Screen tone="plain" wash edges={['top', 'bottom']}>
      {/* The design also puts a trailing "more" icon in this header (node
          n16oI1) with no action defined anywhere in the file — dropped
          instead of wired to a made-up menu. */}
      <AppHeader title="Editar perfil" />

      <KeyboardAvoidingView
        style={styles.flex}
        // Both platforms need padding. The manifest still asks for
          // adjustResize, but this app is edge-to-edge, and from Android 15 on
          // those windows are not resized for the keyboard — nothing shrinks on
          // its own, so the compensation has to happen here.
          behavior="padding"
      >
        <ScrollView
          ref={scrollRef}
          onScroll={onScroll}
          scrollEventThrottle={16}
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <Animated.View style={headStyle}>
            {/* ProfileCard — node oelK8 */}
            <View style={styles.profileCard}>
              <View style={styles.blobLeft} />
              <View style={styles.blobRight} />

              <Pressable
                onPress={handleChangePhoto}
                disabled={isUploadingPhoto}
                style={({ pressed }) => [styles.photoWrap, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel="Cambiar foto de perfil"
              >
                {/* The design's Photo node (V7T0t) is the same repeated stock
                    photo used on the Perfil screen — replaced with the real
                    avatar and its initials fallback. */}
                {userPhoto ? (
                  <Image source={{ uri: userPhoto }} style={styles.photo} />
                ) : (
                  <View style={[styles.photo, styles.photoFallback]}>
                    <Text style={styles.photoFallbackText}>{userInitials}</Text>
                  </View>
                )}

                {isUploadingPhoto ? (
                  <View style={styles.photoOverlay}>
                    <ActivityIndicator size="small" color={colors.white} />
                  </View>
                ) : (
                  <View style={styles.cameraBadge}>
                    <Feather name="camera" size={13} color={colors.white} />
                  </View>
                )}
              </Pressable>
            </View>

            {!!photoError && (
              <View style={styles.errorRow}>
                <Feather name="alert-circle" size={14} color={colors.error} />
                <Text style={styles.errorText}>{photoError}</Text>
              </View>
            )}

            {/* PointsCard — node KypUw, reads membership.days_left. */}
            <Pressable
              onPress={() => go('Membership')}
              style={({ pressed }) => [styles.pointsCard, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel={`Membresía. ${membershipDays} días restantes`}
            >
              <View style={styles.pointsBlobTL} />
              <View style={styles.pointsBlobBR} />
              <Text style={styles.pointsLabel}>Membresía</Text>
              <View style={styles.pointsRow}>
                <Feather name="zap" size={22} color="#EDB61D" />
                <Text style={styles.pointsValue}>{membershipDays}</Text>
              </View>
              <Text style={styles.pointsHint}>días restantes</Text>
            </Pressable>
          </Animated.View>

          <Animated.View style={bodyStyle}>
            {/* InfoCard — node QZyq0. Its own "Editar" pill (SKlHp) is
                dropped: this screen doesn't have a separate view/edit mode
                to toggle into, the fields below are already live inputs, so
                a second "Editar" control would do nothing. Its ScoreCard
                sibling (H2sZtE — body-progress %, weekly goal, 32-tick bar)
                is dropped outright: no endpoint in src/api exposes a body
                score, a weekly target or per-week progress, so there is
                nothing real to put on it. */}
            <View style={styles.infoCard}>
              <View style={styles.infoTop}>
                <View style={styles.iconBtn}>
                  <Feather name="user" size={20} color={colors.gray400} />
                </View>
                <Text style={styles.infoTitle}>Datos personales</Text>
              </View>

              <View style={styles.form}>
                <AuthField
                  kind="text"
                  label="Nombre"
                  value={firstName}
                  error={nameError}
                  editable={!isSaving}
                  returnKeyType="next"
                  onSubmitEditing={() => lastNameRef.current?.focus()}
                  onChangeText={(text) => {
                    setFirstName(text);
                    if (nameError) setNameError(undefined);
                  }}
                />
                <AuthField
                  ref={lastNameRef}
                  onFocus={() => reveal(lastNameRef.current)}
                  kind="text"
                  label="Apellido"
                  value={lastName}
                  editable={!isSaving}
                  returnKeyType="next"
                  onSubmitEditing={() => phoneRef.current?.focus()}
                  onChangeText={setLastName}
                />
              </View>

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
            </View>

            {/* Correo and teléfono have no place in the design's InfoCard —
                it only models the name and the three measurements — so this
                keeps its own card rather than being forced into that one.
                Teléfono is editable: it's explicitly one of the fields the
                product owner asked to be able to edit, and User.phone_number
                is a real, writable field on the same PATCH /auth/me/ call
                this screen already makes for first/last name — there's no
                actual restriction to enforce. Correo stays read-only: it's
                the login identifier (auth email), it wasn't part of what was
                asked, and there's no endpoint here to change it safely. */}
            <View style={styles.contactCard}>
              <AuthField
                kind="email"
                label="Correo electrónico"
                value={userEmail}
                editable={false}
                onChangeText={() => {}}
              />
              <AuthField
                ref={phoneRef}
                onFocus={() => reveal(phoneRef.current)}
                kind="phone"
                label="Teléfono"
                value={phone}
                error={phoneError}
                editable={!isSaving}
                returnKeyType="done"
                onSubmitEditing={handleSave}
                onChangeText={(text) => {
                  setPhone(text);
                  if (phoneError) setPhoneError(undefined);
                }}
              />
              <Text style={styles.readOnlyNote}>
                El correo es tu usuario de acceso y lo gestiona Neural. Escríbenos si necesitas
                cambiarlo.
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
    gap: 12,
  },
  profileCard: {
    height: 200,
    borderRadius: 20,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  blobLeft: {
    position: 'absolute',
    left: -60,
    top: -90,
    width: 196,
    height: 218,
    borderRadius: 109,
    backgroundColor: '#B4E83A',
  },
  blobRight: {
    position: 'absolute',
    left: 270,
    top: 110,
    width: 112,
    height: 124,
    borderRadius: 62,
    backgroundColor: '#B4E83A',
  },
  photoWrap: {
    width: 200,
    height: 200,
  },
  photo: {
    width: 200,
    height: 200,
  },
  photoFallback: {
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoFallbackText: {
    fontFamily: typography.fontFamily,
    fontSize: 48,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
  },
  photoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(17, 17, 17, 0.5)',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.accent,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  errorText: {
    flex: 1,
    fontFamily: typography.fontFamily,
    fontSize: 13,
    color: colors.error,
  },
  pointsCard: {
    height: 118,
    padding: 16,
    borderRadius: 20,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    overflow: 'hidden',
  },
  pointsBlobTL: {
    position: 'absolute',
    left: -40,
    top: -50,
    width: 120,
    height: 100,
    borderRadius: 60,
    backgroundColor: '#D9D9D9',
    opacity: 0.08,
  },
  pointsBlobBR: {
    position: 'absolute',
    left: 280,
    top: 70,
    width: 120,
    height: 100,
    borderRadius: 60,
    backgroundColor: '#D9D9D9',
    opacity: 0.08,
  },
  pointsLabel: {
    fontFamily: typography.fontFamily,
    fontSize: 16,
    fontWeight: typography.fontWeight.regular,
    color: colors.white,
  },
  pointsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pointsValue: {
    fontFamily: typography.fontFamily,
    fontSize: 24,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.white,
  },
  pointsHint: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    fontWeight: typography.fontWeight.regular,
    color: '#787878',
    textAlign: 'center',
  },
  infoCard: {
    padding: 16,
    borderRadius: 20,
    backgroundColor: colors.white,
    gap: 16,
  },
  infoTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 32,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#DEDEDE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoTitle: {
    fontFamily: typography.fontFamily,
    fontSize: 16,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.ink,
  },
  form: {
    gap: 18,
  },
  tiles: {
    flexDirection: 'row',
    gap: 10,
  },
  tile: {
    flex: 1,
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
    fontWeight: typography.fontWeight.regular,
    // Design uses #A5A5A5, which is 2.5:1 on the card's white — gray400
    // (5.3:1) keeps the same muted role and clears WCAG AA.
    color: colors.gray400,
  },
  tileValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  tileValue: {
    fontFamily: typography.fontFamily,
    fontSize: 32,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.ink,
  },
  tileUnit: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    color: colors.gray400,
  },
  contactCard: {
    padding: 16,
    borderRadius: 20,
    backgroundColor: colors.white,
    gap: 18,
  },
  readOnlyNote: {
    fontFamily: typography.fontFamily,
    fontSize: 13,
    lineHeight: 18,
    color: colors.gray400,
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
