import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { colors, typography, spacing, borderRadius } from '../theme/colors';
import WeekDay from '../components/WeekDay';
import StatCard from '../components/StatCard';
import MenuCard from '../components/MenuCard';
import { dashboardApi, DashboardResponse } from '../api/dashboard';
import { notificationsApi } from '../api/notifications';
import pushNotificationService from '../services/pushNotifications';

const CONTENT_PADDING = 16;

const weekDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function getWeekDates() {
  const today = new Date();
  const currentDay = today.getDay();
  const dates = [];

  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - currentDay + i);
    // Format as YYYY-MM-DD without timezone conversion to avoid day shifts
    const fullDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    dates.push({
      name: weekDays[i],
      number: date.getDate().toString().padStart(2, '0'),
      isToday: i === currentDay,
      fullDate: fullDate, // YYYY-MM-DD format
    });
  }
  return dates;
}

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const weekDates = getWeekDates();
  const today = new Date();
  const [selectedDay, setSelectedDay] = useState(today.getDay());
  const [dashboardData, setDashboardData] = useState<DashboardResponse | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const userName = user ? `${user.first_name} ${user.last_name}`.trim() : 'Usuario';
  const userInitials = user
    ? `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase()
    : 'U';
  const userPhoto = user?.photo_url;

  const fetchDashboard = useCallback(async () => {
    const { data } = await dashboardApi.getDashboard();
    if (data) {
      setDashboardData(data);
    }
  }, []);

  const fetchNotificationCount = useCallback(async () => {
    const { data } = await notificationsApi.getCount();
    if (data) {
      setUnreadNotifications(data.unread);
    }
  }, []);

  // Setup push notifications on mount
  useEffect(() => {
    pushNotificationService.setup();
  }, []);

  // Fetch on focus
  useFocusEffect(
    useCallback(() => {
      fetchDashboard();
      fetchNotificationCount();
    }, [fetchDashboard, fetchNotificationCount])
  );

  const onRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([fetchDashboard(), fetchNotificationCount()]);
    setIsRefreshing(false);
  };

  // Stats from API or defaults
  const stats = {
    strike: dashboardData?.strike?.weeks ?? 0,
    calories: dashboardData?.stats?.calories ?? 0,
    trainings: dashboardData?.stats?.trainings ?? 0,
    hours: dashboardData?.stats?.hours ?? 0,
  };

  const handleScheduleTraining = () => {
    navigation.navigate('Calendar');
  };

  const handleViewAgenda = () => {
    navigation.navigate('Trainings');
  };

  const handleDayPress = (index: number) => {
    setSelectedDay(index);
    const selectedDate = weekDates[index];
    if (selectedDate?.fullDate) {
      navigation.navigate('Calendar', { initialDate: selectedDate.fullDate });
    }
  };

  return (
    <View style={styles.container}>
      {/* Background Gradients */}
      <View style={styles.backgroundContainer}>
        <LinearGradient
          colors={['rgba(90, 107, 255, 0.15)', 'transparent']}
          style={styles.gradientTop}
        />
        <LinearGradient
          colors={['rgba(90, 107, 255, 0.15)', 'transparent']}
          style={styles.gradientBottom}
        />
      </View>

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        >
          {/* Header: User Info + Notification */}
          <View style={styles.header}>
            <View style={styles.userInfo}>
              {userPhoto ? (
                <Image source={{ uri: userPhoto }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>{userInitials}</Text>
                </View>
              )}
              <View style={styles.userText}>
                <Text style={styles.welcomeText}>¡BIENVENIDO!</Text>
                <Text style={styles.userName}>{userName}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.notificationBtn}
              onPress={() => navigation.navigate('Notifications')}
            >
              <Ionicons name="notifications-outline" size={18} color={colors.textDark} />
              {unreadNotifications > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {unreadNotifications > 9 ? '9+' : unreadNotifications}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Week Selector */}
          <View style={styles.weekSelector}>
            {weekDates.map((day, index) => (
              <WeekDay
                key={index}
                day={day.name}
                date={day.number}
                isSelected={index === selectedDay}
                onPress={() => handleDayPress(index)}
              />
            ))}
          </View>

          {/* Overview Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>RESUMEN</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statRow}>
                <StatCard
                  label="Racha"
                  value={stats.strike.toString()}
                  unit="semanas"
                  icon="star"
                  variant="primary"
                />
                <StatCard
                  label="Calorías"
                  value={stats.calories.toString()}
                  unit="kcal"
                  icon="flame-outline"
                />
              </View>
              <View style={styles.statRow}>
                <StatCard
                  label="Entrenos"
                  value={stats.trainings.toString()}
                  unit="veces"
                  icon="fitness-outline"
                />
                <StatCard
                  label="Horas"
                  value={stats.hours.toString()}
                  unit="hrs"
                  icon="time-outline"
                />
              </View>
            </View>
          </View>

          {/* Menu Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>MENÚ</Text>
            <MenuCard
              title="Agendar Entrenamiento funcional"
              subtitle="Reserva tu próximo entrenamiento"
              badge="Funcional"
              badgeColor="#00BCD4"
              badgeIcon="fitness"
              image={require('../../assets/a.jpg')}
              onPress={handleScheduleTraining}
            />
            <MenuCard
              title="Ver mi agenda"
              subtitle="Revisa tus entrenamientos agendados"
              badge="Calendario"
              badgeColor={colors.primary}
              badgeIcon="calendar"
              image={require('../../assets/d.jpg')}
              onPress={handleViewAgenda}
            />
          </View>

          {/* Bottom Spacer for Tab Bar */}
          <View style={{ height: 80 }} />
        </ScrollView>
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
  scrollContent: {
    paddingHorizontal: CONTENT_PADDING,
    paddingBottom: spacing.lg,
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

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.bold,
    color: colors.textDark,
  },
  userText: {
    gap: 2,
  },
  welcomeText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  userName: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.medium,
    color: colors.white,
  },
  notificationBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    fontSize: 10,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
  },

  // Week Selector
  weekSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },

  // Sections
  section: {
    marginBottom: spacing.xxl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  viewAll: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.medium,
    color: colors.primary,
  },

  // Stats Grid
  statsGrid: {
    gap: spacing.md,
  },
  statRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
});
