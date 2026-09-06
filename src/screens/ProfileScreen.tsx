import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  Alert,
  ActivityIndicator,
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
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { colors, typography } from '../theme/colors';
import { dashboardApi, DashboardResponse } from '../api/dashboard';
import { profileApi, ProfileResponse } from '../api/profile';
import { authApi } from '../api/auth';
import Screen from '../components/ui/Screen';
import AppHeader from '../components/ui/AppHeader';
import Card from '../components/ui/Card';
import PrimaryButton from '../components/ui/PrimaryButton';

interface MenuRowProps {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  subtitle?: string;
  onPress: () => void;
  first?: boolean;
}

/**
 * One line of the account menu. Rows share a card, so the separator is drawn
 * on every row but the first instead of after every row — a trailing rule
 * inside a rounded card reads as a rendering fault.
 */
function MenuRow({ icon, title, subtitle, onPress, first }: MenuRowProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.menuRow, !first && styles.menuRowDivided, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
    >
      <View style={styles.menuIcon}>
        <Feather name={icon} size={18} color={colors.ink} />
      </View>
      <View style={styles.menuText}>
        <Text style={styles.menuTitle}>{title}</Text>
        {!!subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
      </View>
      <Feather name="chevron-right" size={20} color={colors.gray400} />
    </Pressable>
  );
}

interface StatRowProps {
  label: string;
  value: string | number;
  unit: string;
  divided?: boolean;
}

/** One line of the dark measurements box on the profile card (node V0CIi6). */
function StatRow({ label, value, unit, divided }: StatRowProps) {
  return (
    <View style={[styles.statBoxRow, divided && styles.statBoxRowDivided]}>
      <Text style={styles.statBoxLabel}>{label}</Text>
      <View style={styles.statBoxValueRow}>
        <Text style={styles.statBoxNum}>{value}</Text>
        <Text style={styles.statBoxUnit}>{unit}</Text>
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const { user, logout, updateUser } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardResponse | null>(null);
  const [profileData, setProfileData] = useState<ProfileResponse | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  // The photo flow used to fail into an Alert. It belongs next to the avatar
  // that failed, where you can see what you were trying to change.
  const [photoError, setPhotoError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    const { data } = await dashboardApi.getDashboard();
    if (data) {
      setDashboardData(data);
    }
  }, []);

  // The design's profile card shows age/weight/height (node c5EBjq/zY26j/D2YIKu),
  // which live on /profile/, not /dashboard/ — so this screen now also reads
  // profileApi, exactly the way EditProfileScreen already does.
  const fetchProfile = useCallback(async () => {
    const { data } = await profileApi.getProfile();
    if (data) {
      setProfileData(data);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchDashboard();
      fetchProfile();
    }, [fetchDashboard, fetchProfile])
  );

  const intro = useSharedValue(0);
  useEffect(() => {
    intro.value = withTiming(1, { duration: 460, easing: Easing.out(Easing.cubic) });
  }, []);

  const identityStyle = useAnimatedStyle(() => ({
    opacity: intro.value,
    transform: [{ translateY: (1 - intro.value) * 14 }],
  }));
  const bodyStyle = useAnimatedStyle(() => ({
    opacity: withDelay(90, withTiming(intro.value, { duration: 400 })),
    transform: [{ translateY: withDelay(90, withTiming((1 - intro.value) * 14, { duration: 400 })) }],
  }));

  const userName = user ? `${user.first_name} ${user.last_name}`.trim() : 'Usuario';
  const userInitials = user
    ? `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase()
    : 'U';
  const userPhoto = user?.photo_url;

  const age = profileData?.profile.age;
  const weight = profileData?.latest_weight?.weight;
  const height = profileData?.profile.height;

  const membership = dashboardData?.membership;
  const membershipDays = membership?.days_left ?? 0;
  const trainingsCount = dashboardData?.stats?.trainings ?? 0;
  const trainingHours = dashboardData?.stats?.hours ?? 0;
  const caloriesCount = dashboardData?.stats?.calories ?? 0;
  const strikeWeeks = dashboardData?.strike?.weeks ?? 0;

  const go = (screen: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate(screen);
  };

  const handleLogout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Signing out throws away the session, so it keeps its confirmation. A
    // native alert is the right shape for a destructive yes/no.
    Alert.alert(
      'Cerrar sesión',
      '¿Estás seguro que deseas cerrar sesión?',
      Array.from([
        { text: 'No', style: 'cancel' as const },
        { text: 'Sí, cerrar', style: 'destructive' as const, onPress: () => logout() },
      ])
    );
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
        setPhotoError(error || 'No se pudo actualizar la foto.');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    }
  };

  return (
    <Screen tone="surface" wash>
      {/* A tab root has nothing behind it, so it carries no back control. The
          design's header also has a trailing "more" icon (node F68UI) with no
          action anywhere in the file — every account action it could open
          already has a home below (menu rows, sign-out button), so it's
          dropped rather than wired to a made-up menu. */}
      <AppHeader title="Perfil" showBack={false} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={identityStyle}>
          {/* ProfileCard — node Q3yQ6G */}
          <View style={styles.profileCard}>
            <View style={styles.blobLeft} />
            <View style={styles.blobRight} />

            <View style={styles.profileRow}>
              <Pressable
                onPress={handleChangePhoto}
                disabled={isUploadingPhoto}
                style={({ pressed }) => [styles.photoWrap, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel="Cambiar foto de perfil"
              >
                {/* The design's Photo node (KGWd0) fills this slot with a
                    repeated stock photo — replaced with the real avatar and
                    its initials fallback, as everywhere else in the app. */}
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

              <View style={styles.infoCol}>
                <Text style={styles.profileName} numberOfLines={1}>
                  {userName}
                </Text>

                <View style={styles.statBox}>
                  <StatRow label="Edad" value={age ?? '--'} unit="años" divided />
                  <StatRow label="Peso" value={weight ?? '--'} unit="Kg" divided />
                  <StatRow label="Altura" value={height ?? '--'} unit="cm" />
                </View>
              </View>
            </View>
          </View>

          {!!photoError && (
            <View style={styles.errorRow}>
              <Feather name="alert-circle" size={14} color={colors.error} />
              <Text style={styles.errorText}>{photoError}</Text>
            </View>
          )}
        </Animated.View>

        <Animated.View style={bodyStyle}>
          {/* WorkoutPlanCard (ftVQW) in the design highlights four arbitrary
              weekdays and a 3-bar "level" meter with no backing data anywhere
              in the API — the closed-testing equivalent of the brief's
              "calendar numbers that match no real month". Replaced with the
              plan name and active/inactive state, which are real fields on
              GET /dashboard/. */}
          <Pressable
            onPress={() => go('Membership')}
            style={({ pressed }) => [styles.membershipCard, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={`Membresía. ${membership?.plan_name || 'Sin plan'}`}
          >
            <View style={styles.membershipTop}>
              <Text style={styles.membershipLabel}>Membresía</Text>
              {!!membership && (
                <Text
                  style={[
                    styles.membershipStatus,
                    membership.is_active ? styles.membershipStatusActive : styles.membershipStatusInactive,
                  ]}
                >
                  {membership.is_active ? 'Activa' : 'Vencida'}
                </Text>
              )}
            </View>
            <Text style={styles.membershipPlan}>{membership?.plan_name || 'Sin plan activo'}</Text>
          </Pressable>

          {/* PointsCard (GdF5n) — maps directly to membership.days_left. */}
          <Pressable
            onPress={() => go('Membership')}
            style={({ pressed }) => [styles.pointsCard, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={`Tu membresía. ${membershipDays} días restantes`}
          >
            <View style={styles.pointsBlobTL} />
            <View style={styles.pointsBlobBR} />
            <Text style={styles.pointsLabel}>Tu membresía</Text>
            <View style={styles.pointsRow}>
              <Feather name="zap" size={22} color="#EDB61D" />
              <Text style={styles.pointsValue}>{membershipDays}</Text>
            </View>
            <Text style={styles.pointsHint}>días restantes</Text>
          </Pressable>

          <Text style={styles.sectionLabel}>ACTIVIDAD RECIENTE</Text>

          {/* StepsCard (a4WJz) — "Ver todo" takes the place of the old "Mi
              calendario" menu row: same destination (go('Trainings')), just
              relocated onto the card the design gives this data. Its 5-bar
              graph (qPrrv) has no per-day series anywhere in the API, so it
              is not reproduced rather than faked. Its icon (node nW8k1,
              icon="footprints") isn't in Feather's glyphmap — swapped for
              "activity", the same icon HomeScreen and CreatePostScreen
              already use for this "Entrenos" concept, so the substitution
              stays consistent app-wide rather than one-off. */}
          <View style={styles.stepsCard}>
            <View style={styles.stepsTop}>
              <View style={styles.stepsTitleWrap}>
                <View style={styles.iconBtn}>
                  <Feather name="activity" size={24} color={colors.accentDeep} />
                </View>
                <Text style={styles.stepsTitle}>Entrenos</Text>
              </View>
              <Pressable
                onPress={() => go('Trainings')}
                style={({ pressed }) => [styles.seeAllBtn, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel="Ver todos los entrenamientos"
              >
                <Text style={styles.seeAllLabel}>Ver todo</Text>
              </Pressable>
            </View>
            <View style={styles.stepsBottom}>
              <View style={styles.stepsValueRow}>
                <Text style={styles.stepsValue}>{trainingsCount}</Text>
                <Text style={styles.stepsUnit}>entrenos</Text>
              </View>
              <View style={styles.stepsSubRow}>
                <Text style={styles.stepsSub}>este mes</Text>
                <View style={styles.dot} />
                <Text style={styles.stepsSub}>{trainingHours} h</Text>
              </View>
            </View>
          </View>

          <View style={styles.halfRow}>
            {/* Calories (n3iaxl) */}
            <View style={styles.halfCard}>
              <Text style={styles.halfTitle}>Calorías</Text>
              <View style={styles.halfValueRow}>
                <Text style={styles.halfValue}>{caloriesCount}</Text>
                <Text style={styles.halfUnit}>kcal</Text>
              </View>
              <View style={styles.stepsSubRow}>
                <Text style={styles.stepsSub}>este mes</Text>
                <View style={styles.dot} />
                <Text style={styles.stepsSub}>promedio</Text>
              </View>
            </View>

            {/* Energy Level / "Racha" (pqGOY). Its "récord: 4" chip has no
                field in DashboardStrike (only weeks and is_current) — left
                out instead of invented. */}
            <View style={styles.halfCard}>
              <Text style={styles.halfTitle}>Racha</Text>
              <View style={styles.halfValueRow}>
                <Text style={styles.halfValue}>{strikeWeeks}</Text>
                <Text style={styles.halfUnit}>sem</Text>
              </View>
              <View style={styles.stepsSubRow}>
                <Text style={styles.stepsSub}>
                  {dashboardData?.strike?.is_current ? 'seguidas' : 'interrumpida'}
                </Text>
              </View>
            </View>
          </View>

          <Text style={styles.sectionLabel}>CUENTA</Text>

          {/* "Mi calendario" and "Membresía" moved onto the cards above; these
              two have no design equivalent on this screen but the navigation
              they carry is still real and stays reachable. "Historial de
              peso" is new: WeightHistoryScreen (route "WeightHistory") only
              had one way in — the confirmation step after logging a new
              weight from EditProfile — with nothing to open it on demand.
              The design has no row for it either, so it follows the same
              MenuRow pattern as the rows beside it instead of being left
              unreachable. */}
          <Card style={styles.menuCard}>
            <MenuRow
              first
              icon="user"
              title="Editar perfil"
              subtitle="Información personal"
              onPress={() => go('EditProfile')}
            />
            <MenuRow
              icon="bar-chart-2"
              title="Historial de peso"
              subtitle="Tu progreso corporal"
              onPress={() => go('WeightHistory')}
            />
            <MenuRow
              icon="bell"
              title="Notificaciones"
              subtitle="Tus avisos y novedades"
              onPress={() => go('Notifications')}
            />
          </Card>

          <PrimaryButton
            label="Cerrar sesión"
            variant="danger"
            icon="log-out"
            onPress={handleLogout}
            style={styles.logout}
          />
        </Animated.View>

        {/* Floating tab bar clearance. */}
        <View style={{ height: 132 }} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 24,
  },
  profileCard: {
    height: 200,
    borderRadius: 20,
    backgroundColor: colors.accent,
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
  profileRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  photoWrap: {
    width: 162,
    height: 200,
  },
  photo: {
    width: 162,
    height: 200,
  },
  photoFallback: {
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoFallbackText: {
    fontFamily: typography.fontFamily,
    fontSize: 40,
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
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.accent,
  },
  infoCol: {
    flex: 1,
    gap: 16,
    justifyContent: 'center',
    paddingRight: 16,
  },
  profileName: {
    fontFamily: typography.fontFamily,
    fontSize: 20,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.ink,
  },
  statBox: {
    gap: 8,
    padding: 12,
    borderRadius: 16,
    backgroundColor: colors.ink,
  },
  statBoxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
  },
  statBoxRowDivided: {
    borderBottomWidth: 1,
    borderBottomColor: '#424242',
  },
  statBoxLabel: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    fontWeight: typography.fontWeight.regular,
    // #A5A5A5 as the design specifies — this box sits on #111111, where the
    // kit's grays clear WCAG AA, unlike on white.
    color: colors.iconMuted,
  },
  statBoxValueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
  },
  statBoxNum: {
    fontFamily: typography.fontFamily,
    fontSize: 16,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.white,
  },
  statBoxUnit: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    fontWeight: typography.fontWeight.regular,
    color: colors.iconMuted,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  errorText: {
    flex: 1,
    fontFamily: typography.fontFamily,
    fontSize: 13,
    color: colors.error,
  },
  membershipCard: {
    marginTop: 24,
    padding: 16,
    borderRadius: 20,
    backgroundColor: colors.white,
    gap: 8,
  },
  membershipTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  membershipLabel: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.pureBlack,
  },
  membershipStatus: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    fontWeight: typography.fontWeight.semiBold,
  },
  membershipStatusActive: {
    color: colors.accentDeep,
  },
  membershipStatusInactive: {
    color: colors.error,
  },
  membershipPlan: {
    fontFamily: typography.fontFamily,
    fontSize: 16,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.ink,
  },
  pointsCard: {
    marginTop: 12,
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
  sectionLabel: {
    fontFamily: typography.fontFamily,
    fontSize: 11,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: 1.2,
    color: colors.gray400,
    marginTop: 24,
    marginBottom: 10,
  },
  stepsCard: {
    marginTop: 12,
    padding: 16,
    borderRadius: 20,
    backgroundColor: colors.white,
    gap: 20,
  },
  stepsTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepsTitleWrap: {
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
  stepsTitle: {
    fontFamily: typography.fontFamily,
    fontSize: 16,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.ink,
  },
  seeAllBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 32,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seeAllLabel: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    fontWeight: typography.fontWeight.regular,
    color: colors.ink,
  },
  stepsBottom: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  stepsValueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  stepsValue: {
    fontFamily: typography.fontFamily,
    fontSize: 24,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.ink,
  },
  stepsUnit: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    fontWeight: typography.fontWeight.regular,
    color: colors.gray400,
  },
  stepsSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepsSub: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    fontWeight: typography.fontWeight.regular,
    color: colors.gray400,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.gray400,
  },
  halfRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  halfCard: {
    flex: 1,
    padding: 16,
    borderRadius: 20,
    backgroundColor: colors.white,
    gap: 8,
  },
  halfTitle: {
    fontFamily: typography.fontFamily,
    fontSize: 16,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.ink,
  },
  halfValueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  halfValue: {
    fontFamily: typography.fontFamily,
    fontSize: 24,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.ink,
  },
  halfUnit: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    fontWeight: typography.fontWeight.regular,
    color: colors.gray400,
  },
  menuCard: {
    padding: 0,
    gap: 0,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  menuRowDivided: {
    borderTopWidth: 1,
    borderTopColor: colors.surface,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuText: {
    flex: 1,
    gap: 2,
  },
  menuTitle: {
    fontFamily: typography.fontFamily,
    fontSize: 16,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.ink,
  },
  menuSubtitle: {
    fontFamily: typography.fontFamily,
    fontSize: 13,
    color: colors.gray400,
  },
  pressed: {
    opacity: 0.85,
  },
  logout: {
    marginTop: 24,
  },
});
