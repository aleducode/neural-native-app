import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { colors, typography } from '../theme/colors';
import { dashboardApi, DashboardResponse } from '../api/dashboard';
import { notificationsApi } from '../api/notifications';
import { profileApi, type UserWeight, type WeightListResponse } from '../api/profile';
import WeightCard from '../components/WeightCard';
import ProfileSetupSheet, { MissingField } from '../components/ProfileSetupSheet';
import pushNotificationService from '../services/pushNotifications';

const NUDGE_SNOOZE_KEY = 'neural_profile_nudge_until';
const NUDGE_SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;

const { width: SCREEN_W } = Dimensions.get('window');

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

// Two hexes straight from the .pen that have no equivalent in theme/colors.ts
// (outside this screen's lane, so not adding tokens there): the icon-button
// hairline stroke and the "Horas" stat tint.
const STROKE_MUTED = '#DEDEDE';
const HOURS_TINT = '#E2223F';

// The racha progress track is a row of hairline ticks in the design (36 of
// them across the card width) rather than a flat bar. Rendered as a fixed
// count spaced with `space-between` so it holds up at any card width.
const TRACK_HATCHES = Array.from({ length: 36 });

/** Sunday-anchored week, formatted without timezone conversion so the day never shifts. */
function getWeekDates() {
  const today = new Date();
  const currentDay = today.getDay();

  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(today);
    date.setDate(today.getDate() - currentDay + i);
    const fullDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
      date.getDate()
    ).padStart(2, '0')}`;
    return {
      name: DAY_NAMES[i],
      number: date.getDate().toString().padStart(2, '0'),
      isToday: i === currentDay,
      fullDate,
    };
  });
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

  const intro = useSharedValue(0);
  useEffect(() => {
    intro.value = withTiming(1, { duration: 460, easing: Easing.out(Easing.cubic) });
  }, []);

  const headerStyle = useAnimatedStyle(() => ({
    opacity: intro.value,
    transform: [{ translateY: (1 - intro.value) * 14 }],
  }));
  const bodyStyle = useAnimatedStyle(() => ({
    opacity: withDelay(90, withTiming(intro.value, { duration: 400 })),
    transform: [{ translateY: withDelay(90, withTiming((1 - intro.value) * 14, { duration: 400 })) }],
  }));

  // The gym asks for weight, height and birthdate on sign-up, but nothing
  // enforces them, so members reach the app without any of the three.
  const [missingProfile, setMissingProfile] = useState<MissingField[]>([]);
  const [nudgeSnoozed, setNudgeSnoozed] = useState(true);
  // Once the sheet has had its turn it stays down until the next launch, even
  // if the member comes back to Home with a field still empty.
  const [nudgeShown, setNudgeShown] = useState(false);
  const [weights, setWeights] = useState<UserWeight[]>([]);
  const [weightStats, setWeightStats] = useState<WeightListResponse['stats'] | null>(null);

  const fetchWeights = useCallback(async () => {
    const { data } = await profileApi.getWeights();
    if (!data) return;
    setWeights(data.weights);
    setWeightStats(data.stats);
  }, []);

  const fetchProfileGaps = useCallback(async () => {
    const { data } = await profileApi.getProfile();
    if (!data) return;

    const gaps: MissingField[] = [];
    if (data.latest_weight?.weight == null) gaps.push('weight');
    if (data.profile?.height == null) gaps.push('height');
    if (data.profile?.birthdate == null) gaps.push('birthdate');
    setMissingProfile(gaps);
  }, []);

  // "Ahora no" holds for a week. Asking again on the next launch would make the
  // dismissal meaningless; never asking again would lose the data for good.
  const readSnooze = useCallback(async () => {
    try {
      const until = await AsyncStorage.getItem(NUDGE_SNOOZE_KEY);
      setNudgeSnoozed(!!until && Date.now() < Number(until));
    } catch {
      setNudgeSnoozed(false);
    }
  }, []);

  const snoozeNudge = useCallback(async () => {
    setNudgeSnoozed(true);
    setNudgeShown(true);
    try {
      await AsyncStorage.setItem(NUDGE_SNOOZE_KEY, String(Date.now() + NUDGE_SNOOZE_MS));
    } catch {
      // A snooze that fails to persist comes back next launch; that is the
      // safe direction to fail in, and not worth an error in front of anyone.
    }
  }, []);

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
      fetchProfileGaps();
      fetchWeights();
      readSnooze();
    }, [fetchDashboard, fetchNotificationCount, fetchProfileGaps, fetchWeights, readSnooze])
  );

  const closeNudge = useCallback(() => setNudgeShown(true), []);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      fetchDashboard(),
      fetchNotificationCount(),
      fetchProfileGaps(),
      fetchWeights(),
    ]);
    setIsRefreshing(false);
  };

  const stats = {
    strike: dashboardData?.strike?.weeks ?? 0,
    calories: dashboardData?.stats?.calories ?? 0,
    trainings: dashboardData?.stats?.trainings ?? 0,
    hours: dashboardData?.stats?.hours ?? 0,
  };
  const next = dashboardData?.next_training ?? null;

  // The streak card needs a target to draw against. Four weeks is a month of
  // consistency; past that the bar just stays full.
  const STREAK_TARGET = 4;
  const streakRatio = Math.min(stats.strike / STREAK_TARGET, 1);

  const go = (screen: string, params?: object) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate(screen, params);
  };

  const handleDayPress = (index: number) => {
    setSelectedDay(index);
    const selected = weekDates[index];
    if (selected?.fullDate) {
      go('Calendar', { initialDate: selected.fullDate });
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* A single soft wash of brand colour behind the header, so the screen
          has depth without competing with the cards. */}
      <LinearGradient
        colors={[colors.accentSoft, colors.surface]}
        style={styles.wash}
        pointerEvents="none"
      />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor={colors.ink}
            />
          }
        >
          <Animated.View style={[styles.header, headerStyle]}>
            <Pressable
              style={styles.profile}
              onPress={() => go('Profile')}
              accessibilityRole="button"
              accessibilityLabel="Ver tu perfil"
            >
              {userPhoto ? (
                <Image source={{ uri: userPhoto }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback]}>
                  <Text style={styles.avatarText}>{userInitials}</Text>
                </View>
              )}
              <View style={styles.greeting}>
                <Text style={styles.hello}>¡BIENVENIDO!</Text>
                <Text style={styles.name} numberOfLines={1}>
                  {userName}
                </Text>
              </View>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.bell, pressed && styles.pressed]}
              onPress={() => go('Notifications')}
              accessibilityRole="button"
              accessibilityLabel={
                unreadNotifications > 0
                  ? `Notificaciones, ${unreadNotifications} sin leer`
                  : 'Notificaciones'
              }
            >
              <Feather name="bell" size={24} color={colors.ink} />
              {unreadNotifications > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {unreadNotifications > 9 ? '9+' : unreadNotifications}
                  </Text>
                </View>
              )}
            </Pressable>
          </Animated.View>

          <Animated.View style={bodyStyle}>
            {/* The one thing worth reading first: whether you are booked. */}
            <Pressable
              style={({ pressed }) => [styles.hero, pressed && styles.pressed]}
              onPress={() => go(next ? 'Trainings' : 'Calendar')}
              accessibilityRole="button"
            >
              <Text style={styles.heroLabel}>
                {next ? 'PRÓXIMO ENTRENAMIENTO' : 'SIN RESERVAS'}
              </Text>
              <Text style={styles.heroTitle}>
                {next
                  ? `${next.training_type}, ${next.day_name} ${next.hour}.`
                  : 'Todavía no reservaste tu próximo entreno.'}
              </Text>
              <View style={styles.heroCta}>
                <Text style={styles.heroCtaText}>
                  {next ? 'Ver mi agenda' : 'Reservar ahora'}
                </Text>
                <Feather name="arrow-right" size={16} color={colors.ink} />
              </View>
            </Pressable>

            {/* Week strip: a shortcut straight to one day's slots. Not in the
                design, but dropping it would remove a working path to book. */}
            <View style={styles.week}>
              {weekDates.map((day, index) => {
                const on = index === selectedDay;
                return (
                  <Pressable
                    key={day.fullDate}
                    style={styles.dayCell}
                    onPress={() => handleDayPress(index)}
                    accessibilityRole="button"
                    accessibilityLabel={`${day.name} ${day.number}`}
                  >
                    <Text style={[styles.dayName, on && styles.dayNameOn]}>{day.name}</Text>
                    <View style={[styles.dayPill, on && styles.dayPillOn]}>
                      <Text style={[styles.dayNumber, on && styles.dayNumberOn]}>
                        {day.number}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.card}>
              <View style={styles.cardHead}>
                <Text style={styles.cardTitle}>Resumen</Text>
                <Text style={styles.cardSubtitle}>Tu semana en Neural</Text>
              </View>
              <View style={styles.statRow}>
                {(
                  // Order and tint follow the design (verde/morado/rojo); the
                  // design's icons (scale/footprints/droplet) are template
                  // leftovers from a weight-loss/health kit, so they're swapped
                  // for the Feather equivalents already in use here.
                  [
                    ['zap', stats.calories, 'Calorías', 'kcal', colors.accentDeep],
                    // "Entrenos" already names its own unit, and "Horas hrs"
                    // says the same word twice. Only calories need one.
                    ['activity', stats.trainings, 'Entrenos', '', colors.link],
                    ['clock', stats.hours, 'Horas', 'h', HOURS_TINT],
                  ] as const
                ).map(([icon, value, label, unit, tint]) => (
                  <View key={label} style={styles.stat}>
                    <Feather name={icon} size={24} color={tint} />
                    <Text style={styles.statLabel}>{label}</Text>
                    <View style={styles.statValueRow}>
                      <Text style={styles.statValue}>{value}</Text>
                      {!!unit && <Text style={styles.statUnit}>{unit}</Text>}
                    </View>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.cardHead}>
                <Text style={styles.cardTitle}>Racha</Text>
                <Text style={styles.cardSubtitle}>
                  {stats.strike > 0
                    ? `Llevas ${stats.strike} ${stats.strike === 1 ? 'semana' : 'semanas'} seguidas`
                    : 'Empieza tu racha esta semana'}
                </Text>
              </View>

              <View style={styles.streakRow}>
                <View style={styles.streakValue}>
                  <Text style={styles.streakNumber}>{stats.strike}</Text>
                  <Text style={styles.streakUnit}>
                    {stats.strike === 1 ? 'semana' : 'semanas'}
                  </Text>
                </View>
                <View style={styles.streakTarget}>
                  <Text style={styles.streakTargetLabel}>Meta</Text>
                  <View style={styles.streakTargetRow}>
                    <Text style={styles.streakTargetValue}>{STREAK_TARGET}</Text>
                    <Text style={styles.streakTargetUnit}>semanas</Text>
                  </View>
                </View>
              </View>

              <View
                style={styles.track}
                accessibilityRole="progressbar"
                accessibilityValue={{ min: 0, max: STREAK_TARGET, now: stats.strike }}
              >
                <View style={styles.trackHatches} pointerEvents="none">
                  {TRACK_HATCHES.map((_, i) => (
                    <View key={i} style={styles.hatch} />
                  ))}
                </View>
                <LinearGradient
                  colors={[colors.accent, colors.accentDeep]}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={[styles.trackFill, { width: `${Math.max(streakRatio * 100, 4)}%` }]}
                />
              </View>
            </View>

            {/* The weight block from "09 · Progreso corporal", cut to a card.
                It renders only once there is a weight to show — before that,
                the sheet is already asking for it. */}
            <WeightCard
              weights={weights}
              stats={weightStats}
              onPress={() => navigation.navigate('WeightHistory')}
            />

            <Pressable
              style={({ pressed }) => [styles.card, pressed && styles.pressed]}
              onPress={() => go('Calendar')}
              accessibilityRole="button"
            >
              <View style={styles.cardHead}>
                <Text style={styles.cardTitle}>Agendar entrenamiento</Text>
                <Text style={styles.cardSubtitle}>Reserva tu próximo entrenamiento</Text>
              </View>
              <View style={styles.bookCta}>
                <Text style={styles.bookCtaText}>Ver horarios</Text>
                <Feather name="arrow-right" size={16} color={colors.white} />
              </View>
            </Pressable>
          </Animated.View>

          {/* Clears the floating pill, which sits over the content rather
              than pushing it. */}
          <View style={{ height: 132 }} />
        </ScrollView>
      </SafeAreaView>

      <ProfileSetupSheet
        visible={!nudgeSnoozed && !nudgeShown && missingProfile.length > 0}
        missing={missingProfile}
        onLater={snoozeNudge}
        onClose={closeNudge}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // The design grounds this screen on the surface tone, not white, so the
    // white cards read as raised.
    backgroundColor: colors.surface,
  },
  wash: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_W * 0.9,
  },
  safeArea: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 24,
  },
  profile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarFallback: {
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: typography.fontFamily,
    fontSize: 15,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
  },
  greeting: {
    flex: 1,
    gap: 3,
  },
  hello: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    fontWeight: typography.fontWeight.regular,
    color: colors.gray400,
  },
  name: {
    fontFamily: typography.fontFamily,
    fontSize: 16,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.ink,
  },
  bell: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: STROKE_MUTED,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontFamily: typography.fontFamily,
    fontSize: 10,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
  },
  pressed: {
    opacity: 0.85,
  },
  hero: {
    marginBottom: 20,
  },
  heroLabel: {
    fontFamily: typography.fontFamily,
    fontSize: 11,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: 1.2,
    color: colors.gray400,
    marginBottom: 8,
  },
  heroTitle: {
    fontFamily: typography.fontFamily,
    fontSize: 30,
    fontWeight: typography.fontWeight.bold,
    lineHeight: 36,
    letterSpacing: -0.8,
    color: colors.ink,
  },
  heroCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  heroCtaText: {
    fontFamily: typography.fontFamily,
    fontSize: 14,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.ink,
    textDecorationLine: 'underline',
  },
  week: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  dayCell: {
    alignItems: 'center',
    gap: 6,
  },
  dayName: {
    fontFamily: typography.fontFamily,
    fontSize: 11,
    color: colors.gray400,
  },
  dayNameOn: {
    color: colors.ink,
    fontWeight: typography.fontWeight.semiBold,
  },
  dayPill: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayPillOn: {
    backgroundColor: colors.ink,
  },
  dayNumber: {
    fontFamily: typography.fontFamily,
    fontSize: 14,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.ink,
  },
  dayNumberOn: {
    color: colors.white,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 20,
    // Design padding is [12,16] (vertical, horizontal), not the uniform 16
    // the shared Card.tsx uses.
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 16,
  },
  cardHead: {
    gap: 4,
  },
  cardTitle: {
    fontFamily: typography.fontFamily,
    fontSize: 20,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.ink,
  },
  cardSubtitle: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    // The design specifies #A5A5A5 here, which is 2.5:1 on white. gray400
    // holds the same muted role at 5.3:1.
    color: colors.gray400,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stat: {
    flex: 1,
    gap: 8,
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
  },
  statValue: {
    fontFamily: typography.fontFamily,
    fontSize: 16,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.ink,
  },
  statUnit: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    color: colors.gray400,
  },
  statLabel: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    color: colors.gray400,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  streakValue: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  streakNumber: {
    fontFamily: typography.fontFamily,
    fontSize: 24,
    fontWeight: typography.fontWeight.medium,
    color: colors.ink,
  },
  streakUnit: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    color: colors.gray400,
  },
  streakTarget: {
    alignItems: 'flex-end',
    gap: 4,
  },
  streakTargetLabel: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    color: colors.gray400,
  },
  streakTargetRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
  },
  streakTargetValue: {
    fontFamily: typography.fontFamily,
    fontSize: 16,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.ink,
  },
  streakTargetUnit: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    color: colors.gray400,
  },
  track: {
    height: 16,
    borderRadius: 8,
    overflow: 'hidden',
  },
  trackHatches: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  hatch: {
    width: 2,
    height: '100%',
    backgroundColor: STROKE_MUTED,
  },
  trackFill: {
    height: '100%',
    borderRadius: 8,
  },
  bookCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    // 44 kept over the design's 32: with no icon+slots row next to it (that
    // data isn't in the API — see report), this button is the card's only
    // interactive element, so it keeps the app's minimum touch target.
    borderRadius: 32,
    backgroundColor: colors.ink,
  },
  bookCtaText: {
    fontFamily: typography.fontFamily,
    fontSize: 14,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.white,
  },
});
