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

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const { user, logout, updateUser } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardResponse | null>(null);
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

  useFocusEffect(
    useCallback(() => {
      fetchDashboard();
    }, [fetchDashboard])
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
  const userEmail = user?.email || '';
  const userInitials = user
    ? `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase()
    : 'U';
  const userPhoto = user?.photo_url;

  const membershipDays = dashboardData?.membership?.days_left ?? 0;
  const trainingsCount = dashboardData?.stats?.trainings ?? 0;
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
      {/* A tab root has nothing behind it, so it carries no back control. */}
      <AppHeader title="Perfil" showBack={false} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.identity, identityStyle]}>
          <Pressable
            onPress={handleChangePhoto}
            disabled={isUploadingPhoto}
            style={({ pressed }) => [styles.avatarWrap, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Cambiar foto de perfil"
          >
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
                <Feather name="camera" size={14} color={colors.white} />
              </View>
            )}
          </Pressable>

          <Text style={styles.name}>{userName}</Text>
          {!!userEmail && <Text style={styles.email}>{userEmail}</Text>}

          {!!photoError && (
            <View style={styles.errorRow}>
              <Feather name="alert-circle" size={14} color={colors.error} />
              <Text style={styles.errorText}>{photoError}</Text>
            </View>
          )}
        </Animated.View>

        <Animated.View style={bodyStyle}>
          <Card title="Tu progreso" subtitle="Membresía, entrenos y racha">
            <View style={styles.statRow}>
              {(
                [
                  ['credit-card', membershipDays, 'Días', colors.link],
                  ['activity', trainingsCount, 'Entrenos', colors.accentDeep],
                  ['zap', strikeWeeks, 'Semanas', colors.error],
                ] as const
              ).map(([icon, value, label, tint]) => (
                <View key={label} style={styles.stat}>
                  <Feather name={icon} size={18} color={tint} />
                  <Text style={styles.statValue}>{value}</Text>
                  <Text style={styles.statLabel}>{label}</Text>
                </View>
              ))}
            </View>
          </Card>

          <Text style={styles.sectionLabel}>CUENTA</Text>

          <Card style={styles.menuCard}>
            <MenuRow
              first
              icon="calendar"
              title="Mi calendario"
              subtitle="Ver mis entrenamientos"
              onPress={() => go('Trainings')}
            />
            <MenuRow
              icon="credit-card"
              title="Membresía"
              subtitle={`${membershipDays} días restantes`}
              onPress={() => go('Membership')}
            />
            <MenuRow
              icon="user"
              title="Editar perfil"
              subtitle="Información personal"
              onPress={() => go('EditProfile')}
            />
            <MenuRow
              icon="bell"
              title="Notificaciones"
              // The row opens the list of notifications, not a settings pane,
              // so it no longer promises preferences it cannot show.
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

        {/* Clears the tab bar. */}
        <View style={{ height: 96 }} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 16,
  },
  identity: {
    marginTop: 8,
    marginBottom: 24,
  },
  avatarWrap: {
    width: 88,
    height: 88,
    marginBottom: 16,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  avatarFallback: {
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: typography.fontFamily,
    fontSize: 28,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
  },
  avatarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 44,
    backgroundColor: 'rgba(17, 17, 17, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.surface,
  },
  name: {
    fontFamily: typography.fontFamily,
    fontSize: 32,
    fontWeight: typography.fontWeight.bold,
    lineHeight: 38,
    letterSpacing: -1,
    color: colors.ink,
  },
  email: {
    marginTop: 4,
    fontFamily: typography.fontFamily,
    fontSize: 14,
    color: colors.gray400,
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
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stat: {
    flex: 1,
    gap: 6,
  },
  statValue: {
    fontFamily: typography.fontFamily,
    fontSize: 24,
    fontWeight: typography.fontWeight.bold,
    color: colors.ink,
  },
  statLabel: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    color: colors.gray400,
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
