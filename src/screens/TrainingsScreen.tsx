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
import Card from '../components/ui/Card';
import PrimaryButton from '../components/ui/PrimaryButton';

interface ConfirmSheetProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Confirmation sheet in the new language: white card, editorial title, pill
 * actions. The shared ConfirmModal still paints the legacy blue and shouts in
 * uppercase, and it is owned by screens that have not migrated yet, so this
 * screen carries its own rather than changing theirs.
 */
function ConfirmSheet({
  visible,
  title,
  message,
  confirmText,
  cancelText,
  destructive,
  onConfirm,
  onCancel,
}: ConfirmSheetProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={sheetStyles.scrim}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} accessibilityLabel="Cerrar" />
        <View style={sheetStyles.card}>
          <Text style={sheetStyles.title}>{title}</Text>
          <Text style={sheetStyles.message}>{message}</Text>
          <View style={sheetStyles.actions}>
            <PrimaryButton
              label={confirmText}
              variant={destructive ? 'danger' : 'primary'}
              onPress={onConfirm}
            />
            {!!cancelText && (
              <PrimaryButton label={cancelText} variant="secondary" onPress={onCancel} />
            )}
          </View>
        </View>
      </View>
    </Modal>
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
          title="Entrenos"
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
        title="Entrenos"
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

              return (
                <View key={training.id}>
                  {showDateHeader && (
                    <Text style={styles.dateHeader}>
                      {formatDate(training.slot.date).toUpperCase()}
                    </Text>
                  )}

                  <Card style={styles.trainingCard}>
                    <View style={styles.cardRow}>
                      <View style={styles.info}>
                        <Text
                          style={[styles.trainingType, isPast && styles.trainingTypePast]}
                          numberOfLines={1}
                        >
                          {training.training_type?.name || training.slot.training_type?.name}
                        </Text>
                        <Text style={styles.time}>
                          {training.slot.hour_init} - {training.slot.hour_end}
                        </Text>
                      </View>

                      {isPast ? (
                        <View style={styles.doneBadge}>
                          <Feather name="check" size={13} color={colors.gray400} />
                          <Text style={styles.doneText}>Completado</Text>
                        </View>
                      ) : training.is_today ? (
                        <View style={styles.todayBadge}>
                          <Text style={styles.todayText}>Hoy</Text>
                        </View>
                      ) : (
                        <View style={styles.nextBadge}>
                          <Text style={styles.nextText}>Próximo</Text>
                        </View>
                      )}
                    </View>

                    {!!failed && (
                      <View style={styles.errorRow}>
                        <Feather name="alert-circle" size={14} color={colors.error} />
                        <Text style={styles.errorText}>{failed}</Text>
                      </View>
                    )}

                    {canCancel && (
                      <Pressable
                        style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}
                        onPress={() => handleCancel(training)}
                        disabled={cancellingId === training.id}
                        accessibilityRole="button"
                        accessibilityLabel="Cancelar este entrenamiento"
                      >
                        {cancellingId === training.id ? (
                          <ActivityIndicator size="small" color={colors.error} />
                        ) : (
                          <>
                            <Feather name="x" size={14} color={colors.error} />
                            <Text style={styles.cancelText}>Cancelar</Text>
                          </>
                        )}
                      </Pressable>
                    )}
                  </Card>
                </View>
              );
            })}
          </Animated.View>

          {isLoadingMore && (
            <View style={styles.loadingMore}>
              <ActivityIndicator size="small" color={colors.gray400} />
            </View>
          )}

          {/* Clears the tab bar. */}
          <View style={{ height: 120 }} />
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
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    paddingHorizontal: 16,
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
  trainingCard: {
    marginBottom: 10,
    gap: 12,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  trainingType: {
    fontFamily: typography.fontFamily,
    fontSize: 17,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.ink,
  },
  trainingTypePast: {
    // Past sessions step back through the badge, not through opacity: dimming
    // the whole card was what pushed this text under the contrast floor.
    color: colors.gray400,
  },
  time: {
    fontFamily: typography.fontFamily,
    fontSize: 13,
    color: colors.gray400,
  },
  doneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surface,
  },
  doneText: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.gray400,
  },
  todayBadge: {
    justifyContent: 'center',
    paddingHorizontal: 12,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.accent,
  },
  todayText: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    fontWeight: typography.fontWeight.bold,
    color: colors.ink,
  },
  nextBadge: {
    justifyContent: 'center',
    paddingHorizontal: 12,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.accentSoft,
  },
  nextText: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.accentDeep,
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
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 77, 77, 0.10)',
  },
  cancelText: {
    fontFamily: typography.fontFamily,
    fontSize: 14,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.error,
  },
  pressed: {
    opacity: 0.85,
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

const sheetStyles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(17, 17, 17, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 24,
  },
  title: {
    fontFamily: typography.fontFamily,
    fontSize: 24,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: -0.6,
    color: colors.ink,
  },
  message: {
    marginTop: 8,
    fontFamily: typography.fontFamily,
    fontSize: 15,
    lineHeight: 21,
    color: colors.gray400,
  },
  actions: {
    marginTop: 24,
    gap: 10,
  },
});
