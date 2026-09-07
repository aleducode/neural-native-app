import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
} from 'react-native';
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
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { colors, typography } from '../theme/colors';
import Screen from '../components/ui/Screen';
import AppHeader from '../components/ui/AppHeader';
import ConfirmSheet from '../components/ui/ConfirmSheet';
import { slotsApi } from '../api/slots';
import { Slot, Training } from '../types';
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

/** "HH:MM AM/PM" -> minutes since midnight. */
function parseTimeToMinutes(time: string): number {
  const match = time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!match) return 0;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3]?.toUpperCase();

  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

/** "06:00 AM" -> ["06:00", "AM"], so the meridiem can sit smaller and muted. */
function splitHour(hour: string): [string, string] {
  const match = hour.match(/^\s*(\d{1,2}:\d{2})\s*(AM|PM)?/i);
  if (!match) return [hour, ''];
  return [match[1], (match[2] ?? '').toUpperCase()];
}

/** The meter's 34 hairlines, exactly as the design draws them. */
const TICKS = Array.from({ length: 34 }, (_, i) => i);

/** One column of the stats row: icon, value with a small unit, and a label. */
function Stat({
  icon,
  value,
  unit,
  label,
}: {
  icon: keyof typeof Feather.glyphMap;
  value: string;
  unit: string;
  label: string;
}) {
  return (
    <View style={styles.stat}>
      <Feather name={icon} size={24} color={colors.ink} />
      <View style={styles.statCol}>
        <View style={styles.statValueRow}>
          <Text style={styles.statValue}>{value}</Text>
          {!!unit && <Text style={styles.statUnit}>{unit}</Text>}
        </View>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    </View>
  );
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
  // The design shows the roster open; the pill collapses it, not the reverse.
  const [showRoster, setShowRoster] = useState(true);

  // Cancelling needs the training id, and the slot detail endpoint does not
  // return one — so when the member has a place here, the booking is located
  // among their own trainings by slot.
  const [myTraining, setMyTraining] = useState<Training | null>(null);
  const [askCancel, setAskCancel] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

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

  useEffect(() => {
    if (!userHasBooked) {
      setMyTraining(null);
      return;
    }
    let cancelled = false;
    slotsApi.getMyTrainings(false).then(({ data }) => {
      if (cancelled) return;
      setMyTraining(data?.find((t) => t.slot?.id === slotId) ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [userHasBooked, slotId]);

  const confirmCancel = async () => {
    if (!myTraining) return;
    setAskCancel(false);
    setIsCancelling(true);
    setBookError(null);

    const { success, error: cancelApiError } = await slotsApi.cancelTraining(myTraining.id);
    setIsCancelling(false);

    if (success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      fetchSlotDetail();
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setBookError(cancelApiError || 'No se pudo cancelar la reserva');
    }
  };

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
        <AppHeader title="Detalle del turno" />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.ink} />
        </View>
      </Screen>
    );
  }

  if (error || !slot) {
    return (
      <Screen wash>
        <AppHeader title="Detalle del turno" />
        <View style={styles.centered}>
          <Feather name="alert-circle" size={28} color={colors.gray400} />
          <Text style={styles.emptyTitle}>No pudimos abrir este horario</Text>
          <Text style={styles.emptyText}>{error || 'Slot no encontrado'}</Text>
        </View>
      </Screen>
    );
  }

  const taken = Math.max(slot.max_places - slot.available_places, 0);
  const takenRatio = slot.max_places > 0 ? Math.min(taken / slot.max_places, 1) : 0;
  const isFull = slot.available_places <= 0;
  const duration = parseTimeToMinutes(slot.hour_end) - parseTimeToMinutes(slot.hour_init);
  const [hourValue, hourUnit] = splitHour(slot.hour_init);
  // The badge rides the boundary, so it needs room at both ends.
  const fillPct = Math.min(Math.max(takenRatio, 0.06), 0.94) * 100;

  return (
    <Screen wash edges={['top', 'bottom']}>
      <AppHeader
        title="Detalle del turno"
        action={
          confirmedUsers.length > 0
            ? {
                icon: 'more-vertical',
                label: showRoster ? 'Ocultar asistentes' : 'Ver asistentes',
                onPress: () => setShowRoster((v) => !v),
              }
            : undefined
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <Animated.View style={[styles.hero, headStyle]}>
          <Image
            source={require('../../assets/trainings/hero-gym.jpg')}
            style={styles.heroImage}
            accessible={false}
          />
          {/* The design lays a 3% ink wash under the caption. At that opacity
              white text on a bright gym photo is unreadable, so the wash is a
              gradient that actually darkens the strip it sits on. */}
          <LinearGradient
            colors={['rgba(17,17,17,0)', 'rgba(17,17,17,0.72)']}
            style={styles.heroScrim}
            pointerEvents="none"
          />
          <View style={styles.heroCaption}>
            <Text style={styles.heroTitle} numberOfLines={1}>
              {slot.training_type.name}
            </Text>

            <View style={styles.heroMeta}>
              {/* The mock reads these three bars as difficulty, which no slot
                  carries. They report how full the class is instead — the same
                  glyph, saying something the API actually knows. */}
              <View style={styles.levelBars}>
                {[0, 1, 2].map((i) => (
                  <View
                    key={i}
                    style={[
                      styles.levelBar,
                      { height: 9 - i * 3 },
                      takenRatio > i / 3 && styles.levelBarOn,
                    ]}
                  />
                ))}
              </View>
              <Text style={styles.heroDate} numberOfLines={1}>
                {formatDate(slot.date)}
              </Text>
            </View>
          </View>
        </Animated.View>

        <Animated.View style={[styles.body, bodyStyle]}>
          <View style={styles.stats}>
            <Stat icon="zap" value={hourValue} unit={hourUnit} label="Horario" />
            <Stat icon="clock" value={String(duration)} unit="min" label="Duración" />
            <Stat
              icon="trending-up"
              value={String(slot.available_places)}
              unit={`/${slot.max_places}`}
              label="Cupos"
            />
          </View>

          <View style={styles.occupancy}>
            <View style={styles.occupancyTop}>
              <View style={styles.occupancyCol}>
                <Text style={styles.occupancyLabel}>Cupos ocupados</Text>
                <View style={styles.occupancyValueRow}>
                  <Text style={styles.occupancyValue}>{taken}</Text>
                  <Text style={styles.occupancyUnit}>/{slot.max_places}</Text>
                </View>
              </View>

              {confirmedUsers.length > 0 && (
                <Pressable
                  onPress={() => setShowRoster((v) => !v)}
                  style={({ pressed }) => [styles.rosterPill, pressed && styles.pressed]}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: showRoster }}
                >
                  <Text style={styles.rosterPillLabel}>
                    {showRoster ? 'Ocultar' : 'Ver lista'}
                  </Text>
                </Pressable>
              )}
            </View>

            <View
              style={styles.meter}
              accessibilityRole="progressbar"
              accessibilityLabel="Cupos ocupados"
              accessibilityValue={{ min: 0, max: slot.max_places, now: taken }}
            >
              {/* Green while there is room, red as the last places go: the
                  design's own palette, ordered so the colour tracks urgency.

                  The gradient spans the whole track and the empty part is
                  covered from the right, so a nearly empty class shows the
                  green end of the ramp instead of the whole ramp squeezed into
                  a sliver. */}
              <LinearGradient
                colors={['#FF4040', colors.accent, colors.accentDeep]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />

              {/* Everything past the fill is hatched, as the design draws it. */}
              <View style={[styles.meterEmpty, { left: `${fillPct}%` }]} pointerEvents="none">
                <View style={styles.hatchRow}>
                  {TICKS.map((i) => (
                    <View key={i} style={styles.hatchLine} />
                  ))}
                </View>
              </View>

              <View style={[styles.meterBadge, { left: `${fillPct}%` }]} pointerEvents="none">
                <Text style={styles.meterBadgeGlyph}>🏋️</Text>
              </View>
            </View>
          </View>

          {showRoster && (
            <View style={styles.roster}>
              {confirmedUsers.map((user) => (
                <View key={user.id} style={styles.rosterRow}>
                  <View style={styles.rosterTexts}>
                    <Text style={styles.rosterName} numberOfLines={1}>
                      {user.name}
                    </Text>
                    <Text style={styles.rosterState}>Confirmada</Text>
                  </View>
                  {/* The mock puts a switch on each row. A toggle beside another
                      member's name would do nothing; the check states the fact. */}
                  <Feather name="check" size={22} color={colors.accentDeep} />
                </View>
              ))}
            </View>
          )}

          {userHasBooked && (
            <View style={styles.banner}>
              <Feather name="check-circle" size={18} color={colors.ink} />
              <Text style={styles.bannerText}>Ya tienes reserva en este horario</Text>
            </View>
          )}

          {!userHasBooked && alreadyScheduledToday && (
            <View style={styles.warning}>
              <Feather name="alert-circle" size={18} color={colors.ink} />
              <Text style={styles.bannerText}>
                Ya tienes un entrenamiento agendado para este día
              </Text>
            </View>
          )}

          {!userHasBooked && isFull && (
            <View style={styles.warning}>
              <Feather name="slash" size={18} color={colors.ink} />
              <Text style={styles.bannerText}>Este horario ya no tiene cupos</Text>
            </View>
          )}
        </Animated.View>
      </ScrollView>

      {(!userHasBooked || myTraining?.can_cancel) && (
        <View style={styles.footer}>
          {!!bookError && (
            <View style={styles.inlineError}>
              <Feather name="alert-circle" size={16} color={colors.ink} />
              <Text style={styles.inlineErrorText}>{bookError}</Text>
            </View>
          )}

          {userHasBooked ? (
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setAskCancel(true);
              }}
              disabled={isCancelling}
              style={({ pressed }) => [
                styles.cta,
                styles.ctaCancel,
                isCancelling && styles.ctaDisabled,
                pressed && styles.ctaPressed,
              ]}
              accessibilityRole="button"
              accessibilityState={{ disabled: isCancelling, busy: isCancelling }}
            >
              {isCancelling ? (
                <ActivityIndicator color={colors.error} />
              ) : (
                <>
                  <Text style={[styles.ctaLabel, styles.ctaLabelCancel]}>Cancelar reserva</Text>
                  <Feather name="x" size={20} color={colors.error} />
                </>
              )}
            </Pressable>
          ) : (
          <Pressable
            onPress={handleBook}
            disabled={isBooking || isFull}
            style={({ pressed }) => [
              styles.cta,
              (isBooking || isFull) && styles.ctaDisabled,
              pressed && styles.ctaPressed,
            ]}
            accessibilityRole="button"
            accessibilityState={{ disabled: isBooking || isFull, busy: isBooking }}
          >
            {isBooking ? (
              <ActivityIndicator color={colors.ink} />
            ) : (
              <>
                <Text style={styles.ctaLabel}>Confirmar reserva</Text>
                {/* Three chevrons overlapping at -5, straight from the design. */}
                <View style={styles.ctaArrows}>
                  <Feather name="chevron-right" size={24} color={colors.ink} />
                  <Feather name="chevron-right" size={24} color={colors.ink} style={styles.ctaArrowLap} />
                  <Feather name="chevron-right" size={24} color={colors.ink} style={styles.ctaArrowLap} />
                </View>
              </>
            )}
          </Pressable>
          )}
        </View>
      )}

      <ConfirmSheet
        visible={askCancel}
        title="Cancelar reserva"
        message="Tu lugar en este horario quedará libre para alguien más."
        confirmText="Sí, cancelar"
        cancelText="No, volver"
        destructive
        onConfirm={confirmCancel}
        onCancel={() => setAskCancel(false)}
      />
    </Screen>
  );
}

// Values from the design's "Detalle del turno" node: a 268-tall hero at radius
// 20, content stacked at 24, an occupancy card 159 tall with a 50-tall meter at
// radius 16, and a 54-tall CTA at radius 32.
const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 24,
    gap: 24,
  },
  /**
   * The design's Content frame stacks everything below the hero at 24. The
   * scroll container's gap only separated the hero from this block; inside it
   * the stats, the occupancy card and the roster were flush against each other.
   */
  body: {
    gap: 24,
  },
  hero: {
    height: 268,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: colors.ink,
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  heroScrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 120,
  },
  heroCaption: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  heroMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  levelBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    height: 9,
  },
  levelBar: {
    width: 6,
    borderRadius: 2,
    // Off is the same bar dimmed, so the row keeps its shape at any level.
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
  },
  levelBarOn: {
    backgroundColor: '#E2223F',
  },
  heroTitle: {
    fontFamily: typography.fontFamily,
    fontSize: 20,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.white,
  },
  heroDate: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    color: colors.white,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stat: {
    flexDirection: 'row',
    gap: 8,
  },
  statCol: {
    gap: 6,
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
    // #A5A5A5 is 2.5:1 on this ground; gray400 keeps the muted role at 5.3:1.
    color: colors.gray400,
  },
  statLabel: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    color: colors.gray400,
  },
  occupancy: {
    backgroundColor: colors.white,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 20,
  },
  occupancyTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  occupancyCol: {
    gap: 8,
  },
  occupancyLabel: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    color: colors.gray400,
  },
  occupancyValueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
  },
  occupancyValue: {
    fontFamily: typography.fontFamily,
    fontSize: 36,
    letterSpacing: -0.36,
    color: colors.ink,
  },
  occupancyUnit: {
    fontFamily: typography.fontFamily,
    fontSize: 20,
    color: colors.gray400,
    paddingBottom: 4,
  },
  rosterPill: {
    minWidth: 105,
    height: 32,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: '#DEDEDE',
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  rosterPillLabel: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    color: colors.ink,
  },
  pressed: {
    opacity: 0.7,
  },
  meter: {
    height: 50,
    borderRadius: 16,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  meterTicks: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
  },
  tick: {
    width: 2,
    height: 50,
    backgroundColor: '#DEDEDE',
  },
  meterEmpty: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  hatchRow: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 4,
  },
  hatchLine: {
    width: 2,
    height: 80,
    backgroundColor: '#DEDEDE',
    // The design rakes these over instead of standing them upright.
    transform: [{ rotate: '20deg' }],
  },
  meterBadge: {
    position: 'absolute',
    width: 30,
    height: 30,
    marginLeft: -15,
    borderRadius: 15,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meterBadgeGlyph: {
    fontSize: 12,
  },
  roster: {
    gap: 20,
    paddingHorizontal: 4,
  },
  rosterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rosterTexts: {
    flex: 1,
    gap: 4,
  },
  rosterName: {
    fontFamily: typography.fontFamily,
    fontSize: 16,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.ink,
  },
  rosterState: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    color: colors.gray400,
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
    backgroundColor: colors.white,
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
  footer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 10,
  },
  inlineError: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: colors.white,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  inlineErrorText: {
    flex: 1,
    fontFamily: typography.fontFamily,
    fontSize: 13,
    lineHeight: 18,
    color: colors.ink,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 54,
    borderRadius: 32,
    paddingLeft: 24,
    paddingRight: 16,
    backgroundColor: colors.white,
    // White on the #F4F4F4 ground is 1.06:1, so the pill's own edge would be
    // invisible. The label is ink on white and reads fine; the hairline and
    // shadow give the control the boundary the colour cannot.
    borderWidth: 1,
    borderColor: '#DEDEDE',
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 3,
  },
  ctaDisabled: {
    opacity: 0.45,
  },
  ctaCancel: {
    borderColor: colors.error,
  },
  ctaLabelCancel: {
    color: colors.error,
  },
  ctaPressed: {
    transform: [{ scale: 0.98 }],
  },
  ctaLabel: {
    fontFamily: typography.fontFamily,
    fontSize: 16,
    color: colors.ink,
  },
  ctaArrows: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ctaArrowLap: {
    // The design overlaps the chevrons with a -5 gap, which RN's layout has no
    // equivalent for; a negative left margin on the followers does the same.
    marginLeft: -5,
  },
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
  },
  emptyText: {
    fontFamily: typography.fontFamily,
    fontSize: 14,
    color: colors.gray400,
    textAlign: 'center',
  },
});
