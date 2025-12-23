import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { colors, typography, spacing } from '../theme/colors';
import WeekDay from '../components/WeekDay';
import StatCard from '../components/StatCard';
import ActivityCard from '../components/ActivityCard';

const CONTENT_PADDING = 16;

const weekDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function getWeekDates() {
  const today = new Date();
  const currentDay = today.getDay();
  const dates = [];

  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - currentDay + i);
    dates.push({
      name: weekDays[i],
      number: date.getDate().toString().padStart(2, '0'),
      isToday: i === currentDay,
    });
  }
  return dates;
}

export default function HomeScreen() {
  const { user } = useAuth();
  const weekDates = getWeekDates();
  const today = new Date();
  const [selectedDay, setSelectedDay] = useState(today.getDay());

  const userName = user ? `${user.first_name} ${user.last_name}`.trim() : 'Usuario';
  const userInitials = user
    ? `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase()
    : 'U';
  const userPhoto = user?.photo_url;

  // Mock data - will be replaced with API data
  const mockStats = {
    distance: '5.2',
    steps: '5000',
    calories: '130',
    heartrate: '150',
  };

  const activities = [
    {
      id: 1,
      title: 'Squats',
      image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=200',
      calories: '80',
      difficulty: 'Principiante',
      duration: '10 min',
    },
    {
      id: 2,
      title: 'Flutter Kicks',
      image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=200',
      calories: '50',
      difficulty: 'Intermedio',
      duration: '20 min',
    },
  ];

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
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
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
            <TouchableOpacity style={styles.notificationBtn}>
              <Ionicons name="notifications-outline" size={18} color={colors.textDark} />
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
                onPress={() => setSelectedDay(index)}
              />
            ))}
          </View>

          {/* Overview Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>RESUMEN</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statRow}>
                <StatCard
                  label="Distancia"
                  value={mockStats.distance}
                  unit="km"
                  icon="location-outline"
                  variant="primary"
                />
                <StatCard
                  label="Pasos"
                  value={mockStats.steps}
                  unit="pasos"
                  icon="footsteps-outline"
                />
              </View>
              <View style={styles.statRow}>
                <StatCard
                  label="Calorías"
                  value={mockStats.calories}
                  unit="cal"
                  icon="flame-outline"
                />
                <StatCard
                  label="Ritmo"
                  value={mockStats.heartrate}
                  unit="bpm"
                  icon="heart-outline"
                />
              </View>
            </View>
          </View>

          {/* Latest Activity Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>ÚLTIMA ACTIVIDAD</Text>
              <TouchableOpacity>
                <Text style={styles.viewAll}>Ver todo</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.activitiesList}>
              {activities.map((activity) => (
                <ActivityCard
                  key={activity.id}
                  title={activity.title}
                  image={activity.image}
                  calories={activity.calories}
                  difficulty={activity.difficulty}
                  duration={activity.duration}
                />
              ))}
            </View>
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
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: typography.fontSize.xxl,
    fontFamily: typography.fontFamily.bold,
    color: colors.textDark,
  },
  userText: {
    gap: 1,
  },
  welcomeText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.bold,
    color: colors.white,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  userName: {
    fontSize: typography.fontSize.xxl,
    fontFamily: typography.fontFamily.medium,
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

  // Week Selector
  weekSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },

  // Sections
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.fontSize.xxl,
    fontFamily: typography.fontFamily.bold,
    color: colors.white,
    textTransform: 'uppercase',
    marginBottom: spacing.md,
  },
  viewAll: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
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

  // Activities List
  activitiesList: {
    gap: spacing.md,
  },
});
