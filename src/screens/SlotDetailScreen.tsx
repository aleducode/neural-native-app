import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { colors, typography } from '../theme/colors';
import Screen from '../components/ui/Screen';
import AppHeader from '../components/ui/AppHeader';
import Card from '../components/ui/Card';
import PrimaryButton from '../components/ui/PrimaryButton';
import { slotsApi } from '../api/slots';
import { Slot } from '../types';
import { RootStackParamList } from '../navigation/RootNavigator';

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

/** Up to two initials, so the roster reads as people rather than row numbers. */
function initialsOf(name: string): string {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return `${parts[0][0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase();
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
  // Booking failures and blocked attempts land here, right above the button
  // that was pressed, instead of in a modal.
  const [bookError, setBookError] = useState<string | null>(null);

  const intro = useSharedValue(0);
  useEffect(() => {
    intro.value = withTiming(1, { duration: 460, easing: Easing.out(Easing.cubic) });
  }, []);

  const headStyle = useAnimatedStyle(() => ({
    opacity: intro.value,
    transform: [{ translateY: (1 - intro.value) * 14 }],
  }));
  const bodyStyle = useAnimatedStyle(() => ({
    opacity: withDelay(90, withTiming(intro.value, { duration: 400 })),
    transform: [
      { translateY: withDelay(90, withTiming((1 - intro.value) * 14, { duration: 400 })) },
    ],
  }));

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

    setBookError(null);

    if (alreadyScheduledToday && !userHasBooked) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setBookError(
        'Ya tienes un entrenamiento reservado para este día. Cancela tu reserva actual para agendar otro horario.'
      );
      return;
    }

    if (slot.available_places <= 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setBookError('Este horario ya no tiene cupos disponibles.');
      return;
    }

    setIsBooking(true);

    const { success, error: bookingError } = await slotsApi.bookSlot(slotId);

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
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setBookError(bookingError || 'No se pudo realizar la reserva');
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
      <Screen wash>
        <AppHeader title="Entrenamiento" />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.ink} />
        </View>
      </Screen>
    );
  }

  if (error || !slot) {
    return (
      <Screen wash>
        <AppHeader title="Entrenamiento" />
        <View style={styles.centered}>
          <Feather name="alert-circle" size={28} color={colors.gray400} />
          <Text style={styles.emptyTitle}>No pudimos abrir este horario</Text>
          <Text style={styles.emptyText}>{error || 'Slot no encontrado'}</Text>
        </View>
      </Screen>
    );
  }

  const canBook = !userHasBooked && !alreadyScheduledToday && slot.available_places > 0;

  const freeRatio =
    slot.max_places > 0
      ? Math.max(Math.min(slot.available_places / slot.max_places, 1), 0)
      : 0;

  return (
    <Screen wash edges={['top', 'bottom']}>
      <AppHeader title={slot.training_type.name} />

      <Animated.View style={[styles.head, headStyle]}>
        <Text style={styles.editorial}>{formatDate(slot.date)}</Text>
        <Text style={styles.editorialMeta}>
          {slot.hour_init} — {slot.hour_end}
        </Text>
      </Animated.View>

      <Animated.View style={[styles.bodyWrap, bodyStyle]}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Places. The meter measures what is left, not what is taken: it
              drains as the class fills, so a fuller class never reads as a
              better one. */}
          <Card style={styles.card}>
            <View style={styles.spotsRow}>
              <View style={styles.spotsValue}>
                <Text style={styles.spotsNumber}>{slot.available_places}</Text>
                <Text style={styles.spotsUnit}>de {slot.max_places}</Text>
              </View>
              <Text style={styles.spotsLabel}>
                {slot.available_places === 1 ? 'cupo disponible' : 'cupos disponibles'}
              </Text>
            </View>

            <View
              style={styles.track}
              accessibilityRole="progressbar"
              accessibilityLabel="Cupos disponibles"
              accessibilityValue={{ min: 0, max: slot.max_places, now: slot.available_places }}
            >
              <View style={[styles.trackFill, { width: `${freeRatio * 100}%` }]} />
            </View>
          </Card>

          {userHasBooked && (
            <View style={styles.banner}>
              <Feather name="check-circle" size={18} color={colors.ink} />
              <Text style={styles.bannerText}>Ya tienes reserva en este horario</Text>
            </View>
          )}

          {alreadyScheduledToday && !userHasBooked && (
            <View style={styles.warning}>
              <Feather name="alert-circle" size={18} color={colors.ink} />
              <Text style={styles.bannerText}>
                Ya tienes otro entrenamiento agendado para este día. Cancela tu reserva actual
                para agendar este horario.
              </Text>
            </View>
          )}

          {!userHasBooked && !alreadyScheduledToday && slot.available_places <= 0 && (
            <View style={styles.warning}>
              <Feather name="slash" size={18} color={colors.ink} />
              <Text style={styles.bannerText}>
                Este horario ya no tiene cupos disponibles.
              </Text>
            </View>
          )}

          {confirmedUsers.length > 0 && (
            <Card
              title="Confirmados"
              subtitle={`${confirmedUsers.length} ${
                confirmedUsers.length === 1 ? 'persona' : 'personas'
              } en este horario`}
              style={styles.card}
            >
              <View style={styles.usersList}>
                {confirmedUsers.map((user, index) => (
                  <View
                    key={user.id}
                    style={[styles.userItem, index > 0 && styles.userItemDivided]}
                  >
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{initialsOf(user.name)}</Text>
                    </View>
                    <Text style={styles.userName} numberOfLines={1}>
                      {user.name}
                    </Text>
                  </View>
                ))}
              </View>
            </Card>
          )}

          <View style={{ height: 16 }} />
        </ScrollView>

        {/* Book button */}
        {!userHasBooked && (
          <View style={styles.footer}>
            {!!bookError && (
              <View style={styles.inlineError}>
                <Feather name="alert-circle" size={16} color={colors.ink} />
                <Text style={styles.inlineErrorText}>{bookError}</Text>
              </View>
            )}
            <PrimaryButton
              label={isBooking ? 'Reservando...' : 'Confirmar reserva'}
              onPress={handleBook}
              disabled={!canBook || isBooking}
              loading={isBooking}
            />
          </View>
        )}
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontFamily: typography.fontFamily,
    fontSize: 17,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.ink,
    textAlign: 'center',
  },
  emptyText: {
    fontFamily: typography.fontFamily,
    fontSize: 14,
    color: colors.gray400,
    textAlign: 'center',
  },
  head: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 20,
  },
  editorial: {
    fontFamily: typography.fontFamily,
    fontSize: 34,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: -1,
    color: colors.ink,
  },
  editorialMeta: {
    marginTop: 4,
    fontFamily: typography.fontFamily,
    fontSize: 15,
    // gray400 keeps the muted role at 5.3:1; #9D9D9D would be 2.7:1.
    color: colors.gray400,
  },
  bodyWrap: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  card: {
    gap: 14,
  },
  spotsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
  },
  spotsValue: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  spotsNumber: {
    fontFamily: typography.fontFamily,
    fontSize: 44,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: -1.5,
    color: colors.ink,
  },
  spotsUnit: {
    fontFamily: typography.fontFamily,
    fontSize: 15,
    color: colors.gray400,
  },
  spotsLabel: {
    flex: 1,
    textAlign: 'right',
    fontFamily: typography.fontFamily,
    fontSize: 13,
    color: colors.gray400,
  },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  trackFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: colors.ink,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.accentSoft,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  warning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    // The error hue only tints the ground. As text it is 3.3:1 on white and
    // fails AA, so the copy stays ink.
    backgroundColor: 'rgba(255, 77, 77, 0.10)',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  bannerText: {
    flex: 1,
    fontFamily: typography.fontFamily,
    fontSize: 13,
    fontWeight: typography.fontWeight.medium,
    lineHeight: 18,
    color: colors.ink,
  },
  usersList: {
    marginTop: -2,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  userItemDivided: {
    borderTopWidth: 1,
    borderTopColor: colors.surface,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: typography.fontFamily,
    fontSize: 13,
    fontWeight: typography.fontWeight.bold,
    color: colors.ink,
  },
  userName: {
    flex: 1,
    fontFamily: typography.fontFamily,
    fontSize: 15,
    fontWeight: typography.fontWeight.medium,
    color: colors.ink,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    gap: 12,
  },
  inlineError: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: 'rgba(255, 77, 77, 0.10)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  inlineErrorText: {
    flex: 1,
    fontFamily: typography.fontFamily,
    fontSize: 13,
    lineHeight: 18,
    color: colors.ink,
  },
});
