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
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Mi calendario</Text>
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
          {/* Divider */}
          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>Mis entrenos</Text>
            <View style={styles.dividerLine} />
          </View>

          {trainings.length > 0 ? (
            trainings.map((training) => (
              <View key={training.id} style={styles.trainingCard}>
                <Text style={styles.trainingDateTime}>
                  {formatDate(training.slot.date)} | {training.slot.hour_init} - {training.slot.hour_end}
                  <Text style={styles.calendarIcon}> </Text>
                  <Ionicons name="calendar" size={14} color={colors.primary} />
                </Text>

                <View style={styles.trainingContent}>
                  <Image
                    source={require('../../assets/a.jpg')}
                    style={styles.trainingImage}
                  />
                  <View style={styles.trainingInfo}>
                    <Text style={styles.trainingType}>
                      {training.training_type?.name || training.slot.training_type?.name}
                    </Text>
                    <Text style={styles.trainingDay}>
                      {training.is_today ? 'Hoy' : formatDate(training.slot.date)}
                    </Text>
                    {training.can_cancel && (
                      <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={() => handleCancel(training)}
                        disabled={cancellingId === training.id}
                      >
                        {cancellingId === training.id ? (
                          <ActivityIndicator size="small" color={colors.primary} />
                        ) : (
                          <>
                            <Text style={styles.cancelButtonText}>Cancelar</Text>
                            <Ionicons name="arrow-forward" size={14} color={colors.primary} />
                          </>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            ))
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
          <View style={{ height: 100 }} />
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
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.lg,
  },
  headerTitle: {
    fontSize: typography.fontSize.xxl,
    fontFamily: typography.fontFamily.bold,
    color: colors.white,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.xxl,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.gray400,
  },
  dividerText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.gray400,
    paddingHorizontal: spacing.lg,
  },
  trainingCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  trainingDateTime: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.gray400,
    marginBottom: spacing.md,
  },
  calendarIcon: {
    marginLeft: spacing.sm,
  },
  trainingContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trainingImage: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
  },
  trainingInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  trainingType: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.semibold,
    color: colors.textDark,
  },
  trainingDay: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.gray400,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
    gap: 4,
  },
  cancelButtonText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.primary,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 22,
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
    gap: 12,
  },
  emptyTitle: {
    fontSize: typography.fontSize.title1,
    fontFamily: typography.fontFamily.bold,
    color: colors.white,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.medium,
    color: colors.gray200,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 1000,
    marginTop: 10,
  },
  emptyButtonText: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.semibold,
    color: colors.textDark,
    textTransform: 'uppercase',
  },
});
