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
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../theme/colors';
import { slotsApi } from '../api/slots';
import { Training } from '../types';
import ConfirmModal from '../components/ConfirmModal';
import Button from '../components/Button';

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
    // Prevent multiple simultaneous calls
    if (isFetching) {
      console.log('[TrainingsScreen] Already fetching, skipping...');
      return;
    }

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
    const { data, error, hasMore: moreAvailable } = await slotsApi.getMyTrainings(true, LIMIT, offsetToUse);
    
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
      console.log('[TrainingsScreen] Fetched trainings:', data.length, 'trainings, hasMore:', moreAvailable);
    } else {
      console.error('[TrainingsScreen] Error fetching trainings:', error);
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

  // Check if training is in the past (considering date and end time)
  const isTrainingPast = (training: Training): boolean => {
    try {
      const [year, month, day] = training.slot.date.split('-').map(Number);
      const trainingDate = new Date(year, month - 1, day);
      
      // Parse end time (format: "06:00 AM" or "18:00")
      const endTimeStr = training.slot.hour_end;
      let hour24 = 0;
      let minutes = 0;
      
      if (endTimeStr.includes('AM') || endTimeStr.includes('PM')) {
        // 12-hour format
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
        // 24-hour format
        const [hours, mins] = endTimeStr.split(':').map(Number);
        hour24 = hours || 0;
        minutes = mins || 0;
      }
      
      // Set the end time of the training
      const trainingEndDate = new Date(trainingDate);
      trainingEndDate.setHours(hour24, minutes, 0, 0);
      
      // Compare with current time
      const now = new Date();
      
      console.log('[TrainingsScreen] Checking if training is past:', {
        trainingDate: training.slot.date,
        endTime: training.slot.hour_end,
        trainingEndDate: trainingEndDate.toISOString(),
        now: now.toISOString(),
        isPast: trainingEndDate < now,
      });
      
      return trainingEndDate < now;
    } catch (error) {
      console.error('[TrainingsScreen] Error checking if training is past:', error);
      // Fallback: check only date
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
            <ActivityIndicator size="large" color={colors.primary} />
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
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-back" size={20} color={colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Mi calendario</Text>
          <View style={styles.headerSpacer} />
        </View>

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
          scrollEventThrottle={1000}
        >
          {trainings.length > 0 ? (
            <View style={styles.trainingsList}>
              {trainings.map((training) => {
                const isPast = isTrainingPast(training);
                const canCancel = training.can_cancel && !isPast;
                
                return (
                  <View 
                    key={training.id} 
                    style={[
                      styles.trainingCard,
                      isPast && styles.trainingCardPast
                    ]}
                  >
                    {/* Date and Time Header */}
                    <View style={styles.trainingHeader}>
                      <View style={styles.dateTimeRow}>
                        <Ionicons name="calendar-outline" size={16} color={colors.gray400} />
                        <Text style={styles.trainingDateTime}>
                          {formatDate(training.slot.date)}
                        </Text>
                      </View>
                      <View style={styles.timeRow}>
                        <Ionicons name="time-outline" size={16} color={colors.gray400} />
                        <Text style={styles.trainingTime}>
                          {training.slot.hour_init} - {training.slot.hour_end}
                        </Text>
                      </View>
                    </View>

                    {/* Training Content */}
                    <View style={styles.trainingContent}>
                      <View style={styles.trainingImageContainer}>
                        <Image
                          source={require('../../assets/a.jpg')}
                          style={styles.trainingImage}
                        />
                      </View>
                      <View style={styles.trainingInfo}>
                        <Text style={styles.trainingType}>
                          {training.training_type?.name || training.slot.training_type?.name}
                        </Text>
                        {training.is_today && !isPast && (
                          <View style={styles.todayBadge}>
                            <Text style={styles.todayBadgeText}>Hoy</Text>
                          </View>
                        )}
                        {isPast && (
                          <View style={styles.pastBadge}>
                            <Text style={styles.pastBadgeText}>Completado</Text>
                          </View>
                        )}
                      </View>
                    </View>

                    {/* Action Buttons - Inline */}
                    <View style={styles.actionButtons}>
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
                              <Ionicons name="close-outline" size={16} color={colors.error} />
                              <Text style={styles.cancelButtonText}>Cancelar</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })}
              {isLoadingMore && (
                <View style={styles.loadingMoreContainer}>
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
              )}
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="calendar-outline" size={56} color={colors.gray400} />
              </View>
              <View style={styles.emptyMessageContainer}>
                <Text style={styles.emptyTitle}>Sin Entrenos</Text>
                <Text style={styles.emptySubtitle}>
                  Aún no tienes entrenos agendados.{'\n'}Agenda uno ahora.
                </Text>
              </View>
              <TouchableOpacity 
                style={styles.emptyButton} 
                onPress={handleSchedule}
                activeOpacity={0.8}
              >
                <Text style={styles.emptyButtonText}>Agendar</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Bottom Spacer for Tab Bar */}
          <View style={styles.bottomSpacer} />
        </ScrollView>

        {/* Cancel Confirmation Modal */}
        <ConfirmModal
          visible={showCancelModal}
          title="Cancelar"
          message="¿Estás seguro de cancelar el entrenamiento?"
          confirmText="Sí"
          cancelText="No"
          onConfirm={confirmCancel}
          onCancel={closeCancelModal}
        />

        {/* Success Modal */}
        <ConfirmModal
          visible={showSuccessModal}
          title="Eliminado"
          message="Tu sesión de entrenamiento ha sido cancelada."
          confirmText="OK"
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
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  headerTitle: {
    flex: 1,
    fontSize: typography.fontSize.xxl,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
    letterSpacing: -0.5,
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  trainingsList: {
    gap: spacing.lg,
  },
  trainingCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  trainingCardPast: {
    backgroundColor: colors.gray200,
    opacity: 0.95,
  },
  trainingHeader: {
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  dateTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 2,
  },
  trainingDateTime: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.textDark,
    letterSpacing: -0.3,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  trainingTime: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.regular,
    color: colors.gray400,
  },
  trainingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  trainingImageContainer: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: colors.gray200,
  },
  trainingImage: {
    width: '100%',
    height: '100%',
  },
  trainingInfo: {
    flex: 1,
    marginLeft: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  trainingType: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.bold,
    color: colors.textDark,
    flex: 1,
    letterSpacing: -0.3,
  },
  todayBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    marginLeft: spacing.md,
  },
  todayBadgeText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.white,
    letterSpacing: 0.5,
  },
  pastBadge: {
    backgroundColor: colors.gray400,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    marginLeft: spacing.md,
  },
  pastBadgeText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.white,
    letterSpacing: 0.5,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'stretch',
  },
  cancelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 77, 77, 0.08)',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
    minHeight: 44,
  },
  cancelButtonText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.medium,
    color: colors.error,
    letterSpacing: 0.3,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxxl * 3,
    paddingHorizontal: spacing.xxl,
  },
  emptyIconContainer: {
    marginBottom: spacing.xl,
    opacity: 0.6,
  },
  emptyMessageContainer: {
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xxl,
  },
  emptyTitle: {
    fontSize: typography.fontSize.xl,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.regular,
    color: colors.gray400,
    textAlign: 'center',
    lineHeight: typography.lineHeight.lg,
  },
  emptyButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xxxl,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.full,
    minWidth: 140,
  },
  emptyButtonText: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.white,
    letterSpacing: 0.5,
  },
  bottomSpacer: {
    height: spacing.xxxl * 2,
  },
  loadingMoreContainer: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
