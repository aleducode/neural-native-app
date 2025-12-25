import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, typography, spacing, borderRadius } from '../theme/colors';
import { slotsApi } from '../api/slots';
import { Slot } from '../types';
import { RootStackParamList } from '../navigation/RootNavigator';
import Button from '../components/Button';

type SlotDetailNavigationProp = StackNavigationProp<RootStackParamList>;

type SlotDetailRouteParams = {
  SlotDetail: {
    slotId: number;
  };
};

interface ConfirmedUser {
  id: number;
  name: string;
}

export default function SlotDetailScreen() {
  const navigation = useNavigation<SlotDetailNavigationProp>();
  const route = useRoute<RouteProp<SlotDetailRouteParams, 'SlotDetail'>>();
  const { slotId } = route.params;
  const insets = useSafeAreaInsets();

  const [slot, setSlot] = useState<Slot | null>(null);
  const [confirmedUsers, setConfirmedUsers] = useState<ConfirmedUser[]>([]);
  const [userHasBooked, setUserHasBooked] = useState(false);
  const [alreadyScheduledToday, setAlreadyScheduledToday] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isBooking, setIsBooking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSlotDetail = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const { data, error: apiError } = await slotsApi.getSlotDetail(slotId);

    if (data) {
      setSlot(data.slot);
      setConfirmedUsers(data.confirmedUsers);
      setUserHasBooked(data.userHasBooked);
      setAlreadyScheduledToday(data.alreadyScheduledToday);
    } else {
      setError(apiError || 'Error al cargar los detalles');
    }

    setIsLoading(false);
  }, [slotId]);

  useEffect(() => {
    fetchSlotDetail();
  }, [fetchSlotDetail]);

  const handleBook = async () => {
    if (!slot) return;

    if (alreadyScheduledToday && !userHasBooked) {
      Alert.alert(
        'Ya tienes reserva',
        'Ya tienes un entrenamiento reservado para este día. Cancela tu reserva actual para agendar otro horario.',
        [{ text: 'Entendido' }]
      );
      return;
    }

    if (slot.available_places <= 0) {
      Alert.alert(
        'Sin cupos',
        'Este horario ya no tiene cupos disponibles.',
        [{ text: 'Entendido' }]
      );
      return;
    }

    setIsBooking(true);

    const { success, error: bookError } = await slotsApi.bookSlot(slotId);

    setIsBooking(false);

    if (success) {
      // Navigate to confirmation screen
      navigation.replace('BookingConfirmation', {
        trainingType: slot.training_type.name,
        date: slot.date,
        hourInit: slot.hour_init,
        hourEnd: slot.hour_end,
      });
    } else {
      Alert.alert('Error', bookError || 'No se pudo realizar la reserva');
    }
  };

  const formatDate = (dateStr: string) => {
    // Parse date string (YYYY-MM-DD) to avoid timezone issues
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

    return `${dayNames[date.getDay()]} ${date.getDate()} ${monthNames[date.getMonth()]}`;
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (error || !slot) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Ionicons name="chevron-back" size={24} color={colors.textDark} />
            </TouchableOpacity>
            <View style={styles.headerSpacer} />
          </View>
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={48} color={colors.gray400} style={styles.errorIcon} />
            <Text style={styles.errorText}>{error || 'Slot no encontrado'}</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const canBook = !userHasBooked && !alreadyScheduledToday && slot.available_places > 0;

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

      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color={colors.textDark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{slot.training_type.name}</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Date & Time Card */}
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.iconContainer}>
                <Ionicons name="calendar-outline" size={20} color={colors.primary} />
              </View>
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Fecha</Text>
                <Text style={styles.infoText}>{formatDate(slot.date)}</Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <View style={styles.iconContainer}>
                <Ionicons name="time-outline" size={20} color={colors.primary} />
              </View>
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Horario</Text>
                <Text style={styles.infoText}>{slot.hour_init} - {slot.hour_end}</Text>
              </View>
            </View>
          </View>

          {/* Available Spots Card */}
          <View style={styles.spotsCard}>
            <View style={styles.spotsContent}>
              <Text style={styles.spotsNumber}>{slot.available_places}</Text>
              <View style={styles.spotsTextContainer}>
                <Text style={styles.spotsLabel}>Cupos disponibles</Text>
                <Text style={styles.spotsTotal}>de {slot.max_places} totales</Text>
              </View>
            </View>
          </View>

          {/* Status Banner */}
          {userHasBooked && (
            <View style={styles.bookedBanner}>
              <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
              <Text style={styles.bookedText}>Ya tienes reserva en este horario</Text>
            </View>
          )}

          {alreadyScheduledToday && !userHasBooked && (
            <View style={styles.warningBanner}>
              <Ionicons name="alert-circle-outline" size={20} color={colors.error} />
              <Text style={styles.warningText}>Ya tienes otro entrenamiento agendado para este día. Cancela tu reserva actual para agendar este horario.</Text>
            </View>
          )}

          {/* Confirmed Users */}
          {confirmedUsers.length > 0 && (
            <View style={styles.usersSection}>
              <Text style={styles.usersSectionTitle}>
                Usuarios confirmados ({confirmedUsers.length})
              </Text>
              <View style={styles.usersList}>
                {confirmedUsers.map((user, index) => (
                  <View key={user.id} style={styles.userItem}>
                    <View style={styles.userNumber}>
                      <Text style={styles.userNumberText}>{index + 1}</Text>
                    </View>
                    <Text style={styles.userName}>{user.name}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Bottom Spacer for Button */}
          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Book Button */}
        {!userHasBooked && (
          <View style={[styles.buttonContainer, { paddingBottom: Math.max(insets.bottom, spacing.xxl) + spacing.lg }]}>
            <Button
              title={isBooking ? 'Reservando...' : 'Confirmar Reserva'}
              onPress={handleBook}
              disabled={!canBook || isBooking}
              loading={isBooking}
            />
          </View>
        )}
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
    bottom: 200,
    right: -150,
    width: 250,
    height: 250,
    borderRadius: 125,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
  },
  errorIcon: {
    marginBottom: spacing.lg,
  },
  errorText: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.medium,
    color: colors.gray400,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
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
    paddingTop: spacing.md,
  },
  infoCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xxl,
    padding: spacing.xxl,
    marginBottom: spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(90, 107, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.lg,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.medium,
    color: colors.gray400,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoText: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.textDark,
  },
  divider: {
    height: 1,
    backgroundColor: colors.gray200,
    marginVertical: spacing.lg,
    marginLeft: 56, // iconContainer width + marginRight
  },
  spotsCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xxl,
    padding: spacing.xxl,
    marginBottom: spacing.lg,
  },
  spotsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  spotsNumber: {
    fontSize: 56,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
    lineHeight: 64,
  },
  spotsTextContainer: {
    alignItems: 'flex-end',
  },
  spotsLabel: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.textDark,
    marginBottom: spacing.xs,
  },
  spotsTotal: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.medium,
    color: colors.gray400,
  },
  bookedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: 'rgba(90, 107, 255, 0.15)',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  bookedText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.medium,
    color: colors.primary,
    flex: 1,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: 'rgba(255, 77, 77, 0.15)',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  warningText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.medium,
    color: colors.error,
    flex: 1,
  },
  usersSection: {
    marginTop: spacing.md,
  },
  usersSectionTitle: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.white,
    marginBottom: spacing.md,
  },
  usersList: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xxl,
    overflow: 'hidden',
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  userNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.gray200,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  userNumberText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.textDark,
  },
  userName: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.medium,
    color: colors.textDark,
    flex: 1,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xl,
    backgroundColor: colors.bgDark,
  },
});
