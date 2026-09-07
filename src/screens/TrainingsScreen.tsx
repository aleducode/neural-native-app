import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { colors, typography } from '../theme/colors';
import { slotsApi } from '../api/slots';
import { Training } from '../types';
import Screen from '../components/ui/Screen';
import AppHeader from '../components/ui/AppHeader';
import PrimaryButton from '../components/ui/PrimaryButton';
import ConfirmSheet from '../components/ui/ConfirmSheet';

// Design node qM8hZ ("07 · Mis entrenos") draws the divider between the
// start/end time dots as a flat #DEDEDE line. It's a decorative rule, not
// text, so the WCAG substitution the brief calls out for muted text doesn't
// apply to it.
const TIMELINE_LINE = '#DEDEDE';

/** "HH:MM AM/PM" -> minutes since midnight. */
function toMinutes(time: string): number {
  const match = time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!match) return 0;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3]?.toUpperCase();

  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

/** "05:00 PM" -> "17:00", the format the design's narrow time column expects. */
function to24h(time: string): string {
  const total = toMinutes(time);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

/**
 * How far along the session is: finished sessions read full, one running right
 * now fills as it runs, and anything still ahead reads empty.
 */
function sessionProgress(training: Training, isPast: boolean): number {
  if (isPast) return 1;
  if (!training.is_today) return 0;

  const now = new Date();
  const minutesNow = now.getHours() * 60 + now.getMinutes();
  const start = toMinutes(training.slot.hour_init);
  const end = toMinutes(training.slot.hour_end);

  if (minutesNow <= start || end <= start) return 0;
  return Math.min((minutesNow - start) / (end - start), 1);
}

/** The design's hatch bar: 28 hairlines behind the fill. */
const HATCH = Array.from({ length: 28 }, (_, i) => i);

/** One column of the metrics row: a value, a small unit, and a label. */
function Metric({ value, unit, label }: { value: string; unit: string; label: string }) {
  return (
    <View style={styles.metric}>
      <View style={styles.metricValueRow}>
        <Text style={styles.metricValue}>{value}</Text>
        <Text style={styles.metricUnit}>{unit}</Text>
      </View>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}



export default function TrainingsScreen() {
  const navigation = useNavigation<any>();
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const offsetRef = useRef(0);
  const [isFetching, setIsFetching] = useState(false);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [trainingToCancel, setTrainingToCancel] = useState<Training | null>(null);
  // A failed cancellation belongs on the card that failed, not in an alert
  // that hides which of the listed sessions it was about.
  const [cancelError, setCancelError] = useState<{ id: number; message: string } | null>(null);

  const LIMIT = 50;

  const intro = useSharedValue(0);
  useEffect(() => {
    intro.value = withTiming(1, { duration: 460, easing: Easing.out(Easing.cubic) });
  }, []);

  const headStyle = useAnimatedStyle(() => ({
    opacity: intro.value,
    transform: [{ translateY: (1 - intro.value) * 14 }],
  }));
  const listStyle = useAnimatedStyle(() => ({
    opacity: withDelay(90, withTiming(intro.value, { duration: 400 })),
    transform: [{ translateY: withDelay(90, withTiming((1 - intro.value) * 14, { duration: 400 })) }],
  }));

  const fetchTrainings = useCallback(async (reset: boolean = false) => {
    if (isFetching) return;

    setIsFetching(true);

    if (reset) {
      setIsLoading(true);
      setOffset(0);
      offsetRef.current = 0;
      setHasMore(true);
    } else {
      setIsLoadingMore(true);
    }

    const offsetToUse = reset ? 0 : offsetRef.current;
    const { data, hasMore: moreAvailable } = await slotsApi.getMyTrainings(true, LIMIT, offsetToUse);

    if (data) {
      if (reset) {
        setTrainings(data);
        setOffset(data.length);
        offsetRef.current = data.length;
      } else {
        setTrainings(prev => [...prev, ...data]);
        const newOffset = offsetRef.current + data.length;
        setOffset(newOffset);
        offsetRef.current = newOffset;
      }
      setHasMore(moreAvailable ?? false);
    }

    setIsLoading(false);
    setIsLoadingMore(false);
    setIsFetching(false);
  }, [isFetching]);

  const loadMore = useCallback(() => {
    if (!isLoadingMore && !isFetching && hasMore) {
      fetchTrainings(false);
    }
  }, [isLoadingMore, isFetching, hasMore, fetchTrainings]);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      const loadData = async () => {
        if (isMounted) {
          await fetchTrainings(true);
        }
      };

      loadData();

      return () => {
        isMounted = false;
      };
    }, [])
  );

  const onRefresh = useCallback(async () => {
    if (isFetching) return;

    setIsRefreshing(true);
    await fetchTrainings(true);
    setIsRefreshing(false);
  }, [fetchTrainings, isFetching]);

  const handleCancel = (training: Training) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCancelError(null);
    setTrainingToCancel(training);
    setShowCancelModal(true);
  };

  const confirmCancel = async () => {
    if (!trainingToCancel) return;

    const target = trainingToCancel;
    setShowCancelModal(false);
    setCancellingId(target.id);

    const { success, error } = await slotsApi.cancelTraining(target.id);
    setCancellingId(null);

    if (success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowSuccessModal(true);
      fetchTrainings(true);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setCancelError({ id: target.id, message: error || 'No se pudo cancelar el entrenamiento' });
    }

    setTrainingToCancel(null);
  };

  const closeCancelModal = () => {
    setShowCancelModal(false);
    setTrainingToCancel(null);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${dayNames[date.getDay()]} ${date.getDate()} ${monthNames[date.getMonth()]}`;
  };

  const handleSchedule = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('Calendar');
  };

  const isTrainingPast = (training: Training): boolean => {
    try {
      const [year, month, day] = training.slot.date.split('-').map(Number);
      const trainingDate = new Date(year, month - 1, day);

      const endTimeStr = training.slot.hour_end;
      let hour24 = 0;
      let minutes = 0;

      if (endTimeStr.includes('AM') || endTimeStr.includes('PM')) {
        const cleanTime = endTimeStr.replace(/\s*(AM|PM)/i, '').trim();
        const [hours, mins] = cleanTime.split(':').map(Number);

        if (endTimeStr.toUpperCase().includes('PM') && hours !== 12) {
          hour24 = hours + 12;
        } else if (endTimeStr.toUpperCase().includes('AM') && hours === 12) {
          hour24 = 0;
        } else {
          hour24 = hours;
        }
        minutes = mins || 0;
      } else {
        const [hours, mins] = endTimeStr.split(':').map(Number);
        hour24 = hours || 0;
        minutes = mins || 0;
      }

      const trainingEndDate = new Date(trainingDate);
      trainingEndDate.setHours(hour24, minutes, 0, 0);

      const now = new Date();
      return trainingEndDate < now;
    } catch {
      const [year, month, day] = training.slot.date.split('-').map(Number);
      const trainingDate = new Date(year, month - 1, day);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      trainingDate.setHours(0, 0, 0, 0);
      return trainingDate < today;
    }
  };

  const sheets = (
    <>
      <ConfirmSheet
        visible={showCancelModal}
        title="Cancelar entreno"
        message="¿Deseas cancelar este entrenamiento? Tu lugar quedará libre para alguien más."
        confirmText="Sí, cancelar"
        cancelText="No, volver"
        destructive
        onConfirm={confirmCancel}
        onCancel={closeCancelModal}
      />

      <ConfirmSheet
        visible={showSuccessModal}
        title="Entreno cancelado"
        message="Tu sesión ha sido cancelada correctamente."
        confirmText="Aceptar"
        onConfirm={() => setShowSuccessModal(false)}
        onCancel={() => setShowSuccessModal(false)}
      />
    </>
  );

  if (isLoading) {
    return (
      <Screen tone="surface" wash>
        <AppHeader
          title="Mis entrenos"
          showBack={false}
          action={{ icon: 'plus', label: 'Agendar entrenamiento', onPress: handleSchedule }}
        />
        <View style={styles.loading}>
          <ActivityIndicator size="small" color={colors.ink} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen tone="surface" wash>
      {/* A tab root has nothing behind it, so it carries no back control. */}
      <AppHeader
        title="Mis entrenos"
        showBack={false}
        action={{ icon: 'plus', label: 'Agendar entrenamiento', onPress: handleSchedule }}
      />

      {trainings.length > 0 ? (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.ink} />
          }
          onScroll={({ nativeEvent }) => {
            const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
            const paddingToBottom = 200;
            const isCloseToBottom = layoutMeasurement.height + contentOffset.y >=
              contentSize.height - paddingToBottom;

            if (isCloseToBottom && hasMore && !isLoadingMore && !isFetching) {
              loadMore();
            }
          }}
          scrollEventThrottle={400}
        >
          <Animated.View style={[styles.head, headStyle]}>
            <Text style={styles.title}>Tu agenda</Text>
            <Text style={styles.subtitle}>
              {trainings.length === 1
                ? '1 sesión en tu historial'
                : `${trainings.length} sesiones en tu historial`}
            </Text>
          </Animated.View>

          <Animated.View style={listStyle}>
            {trainings.map((training, index) => {
              const isPast = isTrainingPast(training);
              const canCancel = training.can_cancel && !isPast;
              const isFirst = index === 0;
              const showDateHeader = isFirst ||
                trainings[index - 1]?.slot.date !== training.slot.date;
              const failed = cancelError?.id === training.id ? cancelError.message : null;

              const duration =
                toMinutes(training.slot.hour_end) - toMinutes(training.slot.hour_init);
              const taken = Math.max(
                training.slot.max_places - training.slot.available_places,
                0
              );
              const progress = sessionProgress(training, isPast);
              const statusLabel = isPast ? 'Completado' : training.is_today ? 'Hoy' : 'Próximo';
              const statusStyle = isPast
                ? styles.statusDone
                : training.is_today
                  ? styles.statusToday
                  : styles.statusNext;

              return (
                <View key={training.id}>
                  {showDateHeader && (
                    <Text style={styles.dateHeader}>
                      {formatDate(training.slot.date).toUpperCase()}
                    </Text>
                  )}

                  <View style={styles.item}>
                    {/* Time column: qM8hZ > Items > Item > Time Col — 46 wide,
                        times stacked at 12/600 over a 6x92 rail. The design
                        writes "06:00 / 07:00" with no meridiem, which is why 46
                        is enough; this API returns "08:00 PM", so the column
                        shows 24-hour time and the AM/PM stops wrapping. */}
                    <View style={styles.timeCol}>
                      <View style={styles.times}>
                        <Text style={styles.timeStart}>{to24h(training.slot.hour_init)}</Text>
                        <Text style={styles.timeEnd}>{to24h(training.slot.hour_end)}</Text>
                      </View>
                      <View style={styles.rail}>
                        <View style={[styles.railDot, isPast && styles.railDotMuted]} />
                        <View style={styles.railLine} />
                        <View style={[styles.railDot, isPast && styles.railDotMuted]} />
                      </View>
                    </View>

                    <View style={styles.card}>
                      <View style={styles.titleRow}>
                        <Text
                          style={[styles.trainingType, isPast && styles.trainingTypePast]}
                          numberOfLines={1}
                        >
                          {training.training_type?.name || training.slot.training_type?.name}
                        </Text>

                        {/* The design draws this on every card. It is the only
                            action a training has, so it appears only when there
                            is one — and it replaces the separate Cancelar
                            button rather than sitting beside it. */}
                        {canCancel && (
                          <Pressable
                            onPress={() => handleCancel(training)}
                            disabled={cancellingId === training.id}
                            hitSlop={12}
                            accessibilityRole="button"
                            accessibilityLabel="Cancelar este entrenamiento"
                            style={({ pressed }) => pressed && styles.pressed}
                          >
                            {cancellingId === training.id ? (
                              <ActivityIndicator size="small" color={colors.gray400} />
                            ) : (
                              <Feather name="more-vertical" size={16} color={colors.ink} />
                            )}
                          </Pressable>
                        )}
                      </View>

                      <View style={styles.statusRow}>
                        <Text style={[styles.status, statusStyle]} numberOfLines={1}>
                          {statusLabel}
                        </Text>

                        {/* The hatch bar carries real progress: a finished
                            session is full, one running right now fills as it
                            runs, and one still ahead is empty. */}
                        <View style={styles.hatch}>
                          <View style={styles.hatchTicks} pointerEvents="none">
                            {HATCH.map((i) => (
                              <View key={i} style={styles.hatchTick} />
                            ))}
                          </View>
                          {progress > 0 && (
                            <LinearGradient
                              colors={[colors.accent, colors.accentDeep]}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 0 }}
                              style={[styles.hatchFill, { width: `${progress * 100}%` }]}
                            />
                          )}
                        </View>
                      </View>

                      {/* The design's third metric is calories and the second is
                          heart rate; neither exists on a Training, and the mock
                          itself shows them as 0. These two are real. */}
                      <View style={styles.metrics}>
                        <Metric value={String(duration)} unit="min" label="Duración" />
                        <Metric
                          value={String(taken)}
                          unit={`/${training.slot.max_places}`}
                          label="Cupos"
                        />
                      </View>
                    </View>
                  </View>

                  {!!failed && (
                    <View style={styles.errorRow}>
                      <Feather name="alert-circle" size={14} color={colors.error} />
                      <Text style={styles.errorText}>{failed}</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </Animated.View>

          {isLoadingMore && (
            <View style={styles.loadingMore}>
              <ActivityIndicator size="small" color={colors.gray400} />
            </View>
          )}
        </ScrollView>
      ) : (
        <Animated.View style={[styles.empty, listStyle]}>
          <View style={styles.emptyIcon}>
            <Feather name="calendar" size={32} color={colors.ink} />
          </View>
          <Text style={styles.emptyTitle}>Sin entrenos</Text>
          <Text style={styles.emptySubtitle}>
            Agenda tu primer entrenamiento y aparecerá aquí.
          </Text>
          <PrimaryButton
            label="Agendar"
            icon="plus"
            onPress={handleSchedule}
            style={styles.emptyCta}
          />
        </Animated.View>
      )}

      {sheets}
    </Screen>
  );
}

const styles = StyleSheet.create({
  // qM8hZ > Container > Exercise List > Items > Item: a 46-wide time column and
  // a white card at radius 16, padding [8,12], stacked at 16, 16 apart.
  item: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 4,
  },
  timeCol: {
    width: 46,
    alignItems: 'center',
    gap: 8,
  },
  times: {
    alignItems: 'center',
    gap: 4,
  },
  timeStart: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.ink,
  },
  timeEnd: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    fontWeight: typography.fontWeight.semiBold,
    // The design's #A5A5A5 is 2.5:1 here; gray400 keeps the muted role at 5.3:1.
    color: colors.gray400,
  },
  rail: {
    flex: 1,
    alignItems: 'center',
  },
  railDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accentDeep,
  },
  railDotMuted: {
    backgroundColor: colors.gray400,
  },
  railLine: {
    flex: 1,
    width: 2,
    minHeight: 24,
    backgroundColor: TIMELINE_LINE,
  },
  card: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  trainingType: {
    flex: 1,
    fontFamily: typography.fontFamily,
    fontSize: 16,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.ink,
  },
  trainingTypePast: {
    color: colors.gray400,
  },
  pressed: {
    opacity: 0.6,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  status: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
  },
  statusDone: {
    // The design writes this in #17DD42, which is 1.8:1 on white. #109D2F is
    // the same green read at 4.9:1, and the design already uses it elsewhere.
    color: '#109D2F',
  },
  statusToday: {
    // The mock's amber is 1.9:1. Today's session is the one that matters, so it
    // takes ink and weight instead of a colour nobody can read.
    color: colors.ink,
    fontWeight: typography.fontWeight.semiBold,
  },
  statusNext: {
    color: colors.gray400,
  },
  hatch: {
    flex: 1,
    height: 6,
    borderRadius: 32,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  hatchTicks: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  hatchTick: {
    width: 2,
    height: 6,
    backgroundColor: TIMELINE_LINE,
  },
  hatchFill: {
    height: '100%',
    borderRadius: 32,
  },
  metrics: {
    flexDirection: 'row',
    gap: 16,
    paddingVertical: 4,
  },
  metric: {
    flex: 1,
    gap: 4,
  },
  metricValueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  metricValue: {
    fontFamily: typography.fontFamily,
    fontSize: 16,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.ink,
  },
  metricUnit: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    color: colors.gray400,
  },
  metricLabel: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    color: colors.gray400,
  },

  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    paddingHorizontal: 16,
    // Tab root behind the floating tab bar: brief-mandated 132 clearance.
    paddingBottom: 132,
  },
  head: {
    marginTop: 8,
    marginBottom: 8,
  },
  title: {
    fontFamily: typography.fontFamily,
    fontSize: 32,
    fontWeight: typography.fontWeight.bold,
    lineHeight: 38,
    letterSpacing: -1,
    color: colors.ink,
  },
  subtitle: {
    marginTop: 4,
    fontFamily: typography.fontFamily,
    fontSize: 14,
    color: colors.gray400,
  },
  dateHeader: {
    fontFamily: typography.fontFamily,
    fontSize: 11,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: 1.2,
    color: colors.gray400,
    marginTop: 20,
    marginBottom: 10,
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
  loadingMore: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 80,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontFamily: typography.fontFamily,
    fontSize: 28,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: -0.8,
    color: colors.ink,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontFamily: typography.fontFamily,
    fontSize: 15,
    lineHeight: 21,
    color: colors.gray400,
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyCta: {
    alignSelf: 'stretch',
  },
});

