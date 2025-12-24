import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { colors, typography, spacing, borderRadius } from '../theme/colors';
import { dashboardApi, DashboardResponse } from '../api/dashboard';
import { authApi } from '../api/auth';
import ConfirmModal from '../components/ConfirmModal';

interface MenuItemProps {
  icon: string;
  title: string;
  onPress: () => void;
}

function MenuItem({ icon, title, onPress }: MenuItemProps) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.menuIconContainer}>
        <Ionicons name={icon as any} size={20} color={colors.textDark} />
      </View>
      <Text style={styles.menuTitle}>{title}</Text>
      <Ionicons name="chevron-forward" size={20} color={colors.textDark} />
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const { user, logout, updateUser } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardResponse | null>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

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

  const userName = user ? `${user.first_name} ${user.last_name}`.trim() : 'Usuario';
  const userEmail = user?.email || '';
  const userInitials = user
    ? `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase()
    : 'U';
  const userPhoto = user?.photo_url;

  // Stats from dashboard
  const membershipDays = dashboardData?.membership?.days_left ?? 0;
  const trainingsCount = dashboardData?.stats?.trainings ?? 0;
  const strikeWeeks = dashboardData?.strike?.weeks ?? 0;

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = () => {
    setShowLogoutModal(false);
    logout();
  };

  const handleMembership = () => {
    navigation.navigate('Membership');
  };

  const handleEditProfile = () => {
    navigation.navigate('EditProfile');
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
        Alert.alert('Foto actualizada', 'Tu foto de perfil ha sido actualizada correctamente.');
      } else {
        Alert.alert('Error', error || 'No se pudo actualizar la foto de perfil.');
      }
    }
  };

  const handleNotifications = () => {
    // TODO: Navigate to notifications settings
  };

  const handleMore = () => {
    // TODO: Navigate to more options
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Perfil</Text>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Profile Card */}
          <View style={styles.profileCardContainer}>
            {/* Avatar - positioned above the card */}
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
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Membresía</Text>
                  <View style={styles.statValueContainer}>
                    <Text style={styles.statValue}>{membershipDays}</Text>
                    <Text style={styles.statUnit}> días</Text>
                  </View>
                </View>

                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Entrenos</Text>
                  <View style={styles.statValueContainer}>
                    <Text style={styles.statValue}>{trainingsCount}</Text>
                    <Text style={styles.statUnit}> sem</Text>
                  </View>
                </View>

                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Racha</Text>
                  <View style={styles.statValueContainer}>
                    <Text style={styles.statValue}>{strikeWeeks}</Text>
                    <Text style={styles.statUnit}> sem</Text>
                  </View>
                </View>
              </View>
            </LinearGradient>
          </View>

          {/* Menu Items */}
          <View style={styles.menuContainer}>
            <MenuItem
              icon="card-outline"
              title="Membresía"
              onPress={handleMembership}
            />
            <MenuItem
              icon="person-outline"
              title="Mi Perfil"
              onPress={handleEditProfile}
            />
            <MenuItem
              icon="notifications-outline"
              title="Notificaciones"
              onPress={handleNotifications}
            />
            <MenuItem
              icon="ellipsis-horizontal"
              title="Más"
              onPress={handleMore}
            />
          </View>

          {/* Logout Button */}
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color="#F94848" />
            <Text style={styles.logoutText}>Cerrar Sesión</Text>
          </TouchableOpacity>

          {/* Bottom Spacer */}
          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Logout Modal */}
        <ConfirmModal
          visible={showLogoutModal}
          title="Cerrar Sesión"
          message="¿Estás seguro que deseas cerrar sesión?"
          confirmText="Sí"
          cancelText="No"
          onConfirm={confirmLogout}
          onCancel={() => setShowLogoutModal(false)}
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
  header: {
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: typography.fontSize.title1,
    fontFamily: typography.fontFamily.bold,
    color: colors.white,
    textTransform: 'uppercase',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.xxl,
  },
  profileCardContainer: {
    marginTop: 50,
    marginBottom: spacing.xxl,
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
  menuContainer: {
    gap: spacing.xl,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xxl,
    height: 64,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.gray200,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.lg,
  },
  menuTitle: {
    flex: 1,
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bold,
    color: colors.textDark,
    textTransform: 'uppercase',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xxl,
    gap: spacing.md,
  },
  logoutText: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bold,
    color: '#F94848',
    textTransform: 'uppercase',
  },
});
