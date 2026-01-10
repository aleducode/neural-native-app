import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../theme/colors';
import { slotsApi } from '../api/slots';
import { Training } from '../types';
import ConfirmModal from '../components/ConfirmModal';

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

  const LIMIT = 50;

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
    setTrainingToCancel(training);
    setShowCancelModal(true);
  };

  const confirmCancel = async () => {
    if (!trainingToCancel) return;

    setShowCancelModal(false);
    setCancellingId(trainingToCancel.id);

    const { success, error } = await slotsApi.cancelTraining(trainingToCancel.id);
    setCancellingId(null);

    if (success) {
      setShowSuccessModal(true);
      fetchTrainings(true);
    } else {
      Alert.alert('Error', error || 'No se pudo cancelar el entrenamiento');
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

  if (isLoading) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.white} />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Feather name="arrow-left" size={22} color={colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Mis entrenos</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={handleSchedule}
          >
            <Feather name="plus" size={22} color={colors.white} />
          </TouchableOpacity>
        </View>

        {trainings.length > 0 ? (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={onRefresh}
                tintColor={colors.white}
              />
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
            {trainings.map((training, index) => {
              const isPast = isTrainingPast(training);
              const canCancel = training.can_cancel && !isPast;
              const isFirst = index === 0;
              const showDateHeader = isFirst ||
                trainings[index - 1]?.slot.date !== training.slot.date;

              return (
                <View key={training.id}>
                  {/* Date Header */}
                  {showDateHeader && (
                    <View style={styles.dateHeader}>
                      <Text style={styles.dateHeaderText}>
                        {formatDate(training.slot.date)}
                      </Text>
                    </View>
                  )}

                  {/* Training Card */}
                  <View style={[styles.trainingCard, isPast && styles.trainingCardPast]}>
                    <View style={styles.cardContent}>
                      {/* Left: Training Info */}
                      <View style={styles.infoSection}>
                        <Text style={[styles.trainingType, isPast && styles.trainingTypePast]} numberOfLines={1}>
                          {training.training_type?.name || training.slot.training_type?.name}
                        </Text>
                        <Text style={styles.timeText}>
                          {training.slot.hour_init} - {training.slot.hour_end}
                        </Text>
                      </View>

                      {/* Right: Status Badge */}
                      {isPast ? (
                        <View style={styles.completedBadge}>
                          <Feather name="check" size={14} color={colors.gray400} />
                        </View>
                      ) : training.is_today ? (
                        <View style={styles.todayBadge}>
                          <Text style={styles.todayText}>Hoy</Text>
                        </View>
                      ) : (
                        <Feather name="chevron-right" size={20} color={colors.gray400} />
                      )}
                    </View>

                    {/* Cancel Button */}
                    {canCancel && (
                      <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={() => handleCancel(training)}
                        disabled={cancellingId === training.id}
                        activeOpacity={0.6}
                      >
                        {cancellingId === training.id ? (
                          <ActivityIndicator size="small" color={colors.error} />
                        ) : (
                          <>
                            <Feather name="x" size={14} color={colors.error} />
                            <Text style={styles.cancelText}>Cancelar</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}

            {/* Loading More Indicator */}
            {isLoadingMore && (
              <View style={styles.loadingMore}>
                <ActivityIndicator size="small" color={colors.gray400} />
              </View>
            )}

            <View style={styles.bottomSpacer} />
          </ScrollView>
        ) : (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Feather name="calendar" size={40} color={colors.gray400} />
            </View>
            <Text style={styles.emptyTitle}>Sin entrenos</Text>
            <Text style={styles.emptySubtitle}>
              Agenda tu primer entrenamiento
            </Text>
            <TouchableOpacity
              style={styles.scheduleButton}
              onPress={handleSchedule}
              activeOpacity={0.8}
            >
              <Feather name="plus" size={18} color={colors.white} />
              <Text style={styles.scheduleButtonText}>Agendar</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Cancel Modal */}
        <ConfirmModal
          visible={showCancelModal}
          title="Cancelar"
          message="¿Deseas cancelar este entrenamiento?"
          confirmText="Sí, cancelar"
          cancelText="No"
          onConfirm={confirmCancel}
          onCancel={closeCancelModal}
        />

        {/* Success Modal */}
        <ConfirmModal
          visible={showSuccessModal}
          title="Entreno cancelado"
          message="Tu sesión ha sido cancelada correctamente"
          confirmText="Aceptar"
          onConfirm={() => setShowSuccessModal(false)}
          onCancel={() => setShowSuccessModal(false)}
          singleButton
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.white,
    letterSpacing: -0.3,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  dateHeader: {
    paddingVertical: spacing.md,
    marginTop: spacing.md,
  },
  dateHeaderText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.medium,
    color: colors.gray400,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  trainingCard: {
    backgroundColor: colors.cardDark,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
    overflow: 'hidden',
  },
  trainingCardPast: {
    opacity: 0.5,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  infoSection: {
    flex: 1,
  },
  trainingType: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.white,
    marginBottom: 4,
  },
  trainingTypePast: {
    color: colors.gray400,
  },
  timeText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.regular,
    color: colors.gray400,
  },
  completedBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  todayText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.white,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.04)',
    backgroundColor: 'rgba(255, 77, 77, 0.04)',
  },
  cancelText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.medium,
    color: colors.error,
  },
  loadingMore: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  bottomSpacer: {
    height: 120,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  emptyTitle: {
    fontSize: typography.fontSize.xl,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
    letterSpacing: -0.5,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.regular,
    color: colors.gray400,
    textAlign: 'center',
    marginBottom: spacing.xxl,
  },
  scheduleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.full,
  },
  scheduleButtonText: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.white,
  },
});
