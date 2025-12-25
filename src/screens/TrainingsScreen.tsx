import React, { useState, useCallback } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../theme/colors';
import { slotsApi } from '../api/slots';
import { Training } from '../types';
import ConfirmModal from '../components/ConfirmModal';

export default function TrainingsScreen() {
  const navigation = useNavigation<any>();
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [trainingToCancel, setTrainingToCancel] = useState<Training | null>(null);

  const fetchTrainings = useCallback(async () => {
    const { data, error } = await slotsApi.getMyTrainings();
    if (data) {
      setTrainings(data);
    }
    setIsLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchTrainings();
    }, [fetchTrainings])
  );

  const onRefresh = async () => {
    setIsRefreshing(true);
    await fetchTrainings();
    setIsRefreshing(false);
  };

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
      fetchTrainings();
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
      {/* Subtle Background Gradients */}
      <View style={styles.backgroundContainer}>
        <LinearGradient
          colors={['rgba(69, 255, 183, 0.15)', 'transparent']}
          style={styles.gradientTop}
        />
        <LinearGradient
          colors={['rgba(69, 255, 183, 0.15)', 'transparent']}
          style={styles.gradientBottom}
        />
      </View>

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color={colors.textDark} />
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
              tintColor={colors.primary}
            />
          }
        >
          {trainings.length > 0 ? (
            <View style={styles.trainingsList}>
              {trainings.map((training) => (
                <View key={training.id} style={styles.trainingCard}>
                  {/* Date and Time Header */}
                  <View style={styles.trainingHeader}>
                    <View style={styles.dateTimeContainer}>
                      <Ionicons name="calendar-outline" size={16} color={colors.gray400} />
                      <Text style={styles.trainingDateTime}>
                        {formatDate(training.slot.date)}
                      </Text>
                    </View>
                    <View style={styles.timeContainer}>
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
                      {training.is_today && (
                        <View style={styles.todayBadge}>
                          <Text style={styles.todayBadgeText}>Hoy</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Cancel Button */}
                  {training.can_cancel && (
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={() => handleCancel(training)}
                      disabled={cancellingId === training.id}
                      activeOpacity={0.7}
                    >
                      {cancellingId === training.id ? (
                        <ActivityIndicator size="small" color={colors.error} />
                      ) : (
                        <>
                          <Ionicons name="close-circle-outline" size={18} color={colors.error} />
                          <Text style={styles.cancelButtonText}>Cancelar</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              {/* Icon Container */}
              <View style={styles.emptyIconContainer}>
                <View style={styles.emptyIconCircle}>
                  <Ionicons name="calendar-outline" size={40} color={colors.textDark} />
                </View>
              </View>

              {/* Message */}
              <View style={styles.emptyMessageContainer}>
                <Text style={styles.emptyTitle}>Sin Entrenos</Text>
                <Text style={styles.emptySubtitle}>
                  Aún no tienes entrenos agendados.{'\n'}¡Agenda uno ahora!
                </Text>
              </View>

              {/* Button */}
              <TouchableOpacity style={styles.emptyButton} onPress={handleSchedule}>
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
  backgroundContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gradientTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 300,
  },
  gradientBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 300,
    transform: [{ rotate: '180deg' }],
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
    paddingVertical: spacing.lg,
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.white,
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
  },
  headerSpacer: {
    width: 48,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.lg,
  },
  trainingsList: {
    gap: spacing.lg,
  },
  trainingCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xxl,
    padding: spacing.xxl,
    marginBottom: 0,
  },
  trainingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  dateTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  trainingDateTime: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.medium,
    color: colors.textDark,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  trainingTime: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.medium,
    color: colors.gray400,
  },
  trainingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  trainingImageContainer: {
    width: 64,
    height: 64,
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
    marginLeft: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  trainingType: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.bold,
    color: colors.textDark,
    flex: 1,
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
    color: colors.textDark,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gray200,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  cancelButtonText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.error,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxxl * 2,
    gap: spacing.xxl,
  },
  emptyIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyMessageContainer: {
    alignItems: 'center',
    gap: spacing.md,
  },
  emptyTitle: {
    fontSize: typography.fontSize.xxl,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.regular,
    color: colors.gray400,
    textAlign: 'center',
    lineHeight: typography.lineHeight.md,
  },
  emptyButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xxxl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    marginTop: spacing.md,
  },
  emptyButtonText: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.textDark,
  },
  bottomSpacer: {
    height: 100,
  },
});
