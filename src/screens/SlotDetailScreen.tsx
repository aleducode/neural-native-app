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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
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
    const date = new Date(dateStr + 'T00:00:00');
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

    return `${dayNames[date.getDay()]} ${date.getDate()} ${monthNames[date.getMonth()]}`;
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

  if (error || !slot) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color={colors.textDark} />
            </TouchableOpacity>
          </View>
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error || 'Slot no encontrado'}</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const canBook = !userHasBooked && !alreadyScheduledToday && slot.available_places > 0;

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.textDark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{slot.training_type.name.toUpperCase()}</Text>
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
              <Ionicons name="calendar-outline" size={20} color={colors.gray400} />
              <Text style={styles.infoText}>{formatDate(slot.date)}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="time-outline" size={20} color={colors.gray400} />
              <Text style={styles.infoText}>{slot.hour_init} - {slot.hour_end}</Text>
            </View>
          </View>

          {/* Available Spots Card */}
          <View style={styles.spotsCard}>
            <Text style={styles.spotsNumber}>{slot.available_places}</Text>
            <Text style={styles.spotsLabel}>Cupos disponibles</Text>
            <Text style={styles.spotsTotal}>de {slot.max_places} totales</Text>
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
              <Ionicons name="warning" size={20} color={colors.warning} />
              <Text style={styles.warningText}>Ya tienes otro entrenamiento este día</Text>
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
        </ScrollView>

        {/* Book Button */}
        {!userHasBooked && (
          <View style={styles.buttonContainer}>
            <Button
              title={isBooking ? 'Reservando...' : 'Confirmar Reserva'}
              onPress={handleBook}
              disabled={!canBook || isBooking}
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
  errorText: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.medium,
    color: colors.gray400,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  },
  headerTitle: {
    fontSize: typography.fontSize.title2,
    fontFamily: typography.fontFamily.bold,
    color: colors.white,
    textTransform: 'uppercase',
  },
  headerSpacer: {
    width: 48,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.xxl,
    paddingBottom: 120,
  },
  infoCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.xxl,
    marginBottom: spacing.lg,
    gap: spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  infoText: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.medium,
    color: colors.textDark,
  },
  spotsCard: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.xl,
    padding: spacing.xxl,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  spotsNumber: {
    fontSize: 64,
    fontFamily: typography.fontFamily.bold,
    color: colors.textDark,
    lineHeight: 72,
  },
  spotsLabel: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.semibold,
    color: colors.textDark,
  },
  spotsTotal: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.textDark,
    opacity: 0.7,
  },
  bookedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: 'rgba(69, 255, 183, 0.15)',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  bookedText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.primary,
    flex: 1,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: 'rgba(255, 149, 0, 0.15)',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  warningText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.warning,
    flex: 1,
  },
  usersSection: {
    marginTop: spacing.lg,
  },
  usersSectionTitle: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.semibold,
    color: colors.white,
    marginBottom: spacing.lg,
  },
  usersList: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
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
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.gray200,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.lg,
  },
  userNumberText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semibold,
    color: colors.textDark,
  },
  userName: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.medium,
    color: colors.textDark,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.xxl,
    paddingTop: spacing.lg,
    backgroundColor: colors.bgDark,
  },
});
