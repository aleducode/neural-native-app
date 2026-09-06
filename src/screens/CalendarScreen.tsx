import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Pressable,
} from 'react-native';
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
import MonthCalendar, {
  toISODate,
  parseISODate,
  startOfMonth,
} from '../components/calendar/MonthCalendar';
import { trainingImage } from '../theme/trainingImages';
import { slotsApi } from '../api/slots';
import { Slot } from '../types';
import { RootStackParamList } from '../navigation/RootNavigator';

type CalendarNavigationProp = StackNavigationProp<RootStackParamList>;
type CalendarRouteProp = RouteProp<RootStackParamList, 'Calendar'>;

const SHORT_MONTHS = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
];

/** "6 Sep 2026", the format the design puts in the date chip. */
function formatChip(iso: string): string {
  const d = parseISODate(iso);
  return `${d.getDate()} ${SHORT_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
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

/**
 * One bookable slot, laid out as the design's card: a 198-wide column of text
 * against a 113x118 tile, 184 tall, with the type in green above the hour.
 *
 * The design puts one photo on every card; the API exposes a training type, so
 * the tile picks the cut-out that matches it and four identical 60-minute
 * functional slots stop looking like four copies of the same row.
 */
function SlotRow({ slot, onPress }: { slot: Slot; onPress: () => void }) {
  const { training_type, hour_init, hour_end, available_places, max_places } = slot;

  const duration = parseTimeToMinutes(hour_end) - parseTimeToMinutes(hour_init);
  const isFull = available_places <= 0;

  const body = (
    <>
      <View style={styles.slotInfo}>
        <View style={styles.slotHead}>
          <Text style={[styles.slotType, isFull && styles.slotTypeFull]} numberOfLines={1}>
            {training_type.name}
          </Text>
          <View style={styles.slotDetails}>
            <Text style={styles.slotHour} numberOfLines={1}>
              {hour_init} – {hour_end}
            </Text>
            <Text style={styles.slotDesc} numberOfLines={1}>
              {training_type.is_group ? 'Entrenamiento grupal' : 'Entrenamiento individual'}
            </Text>
          </View>
        </View>

        {/* Two rows, always: the design's card is 184 tall with a two-line
            Durations block, and a solo session that dropped the capacity row
            left a hole where the space-between pushed them apart. */}
        <View style={styles.slotMetas}>
          <View style={styles.slotMeta}>
            <Feather
              name={training_type.is_group ? 'users' : 'user'}
              size={16}
              color={colors.ink}
            />
            <Text style={styles.slotMetaText}>
              {!training_type.is_group
                ? 'Sesión individual'
                : isFull
                  ? 'Lleno'
                  : `${available_places} cupos`}
            </Text>
          </View>
          <View style={styles.slotMeta}>
            <Feather name="clock" size={16} color={colors.ink} />
            <Text style={styles.slotMetaText}>{duration} minutos</Text>
          </View>
        </View>
      </View>

      <View style={[styles.tile, isFull && styles.tileFull]}>
        <Image
          source={trainingImage(training_type)}
          style={[styles.tileImage, isFull && styles.tileImageFull]}
          resizeMode="contain"
          accessible={false}
        />
      </View>
    </>
  );

  // A full slot is not a Pressable at all, so it can neither be tapped nor
  // focused by a screen reader as an action.
  if (isFull) {
    return (
      <View
        style={styles.slotCard}
        accessible
        accessibilityLabel={`${training_type.name} de ${hour_init} a ${hour_end}. Lleno, sin cupos disponibles.`}
      >
        {body}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.slotCard, pressed && styles.slotCardPressed]}
      accessibilityRole="button"
      accessibilityLabel={`${training_type.name} de ${hour_init} a ${hour_end}, ${available_places} cupos disponibles`}
    >
      {body}
    </Pressable>
  );
}

export default function CalendarScreen() {
  const navigation = useNavigation<CalendarNavigationProp>();
  const route = useRoute<CalendarRouteProp>();
  const initialDate = route.params?.initialDate;

  const [selectedDate, setSelectedDate] = useState<string>(
    () => initialDate || toISODate(new Date())
  );
  const [visibleMonth, setVisibleMonth] = useState<Date>(() =>
    startOfMonth(parseISODate(initialDate || toISODate(new Date())))
  );

  // Arriving from the home week strip carries a date; follow it, and bring the
  // grid to the month that date lives in.
  useEffect(() => {
    if (!initialDate) return;
    setSelectedDate(initialDate);
    setVisibleMonth(startOfMonth(parseISODate(initialDate)));
  }, [initialDate]);

  const [slots, setSlots] = useState<Slot[]>([]);
  const [alreadyScheduled, setAlreadyScheduled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [availableDates, setAvailableDates] = useState<Set<string>>(new Set());
  const [isLoadingMonth, setIsLoadingMonth] = useState(false);

  // Short staggered entrance, in the same register as the rest of the app.
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

  const fetchSlots = useCallback(async (date: string, refresh = false) => {
    if (refresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    const { data, error: apiError } = await slotsApi.getSlotsByDate(date);

    if (data) {
      setSlots(data.slots);
      setAlreadyScheduled(data.alreadyScheduled);
    } else {
      setError(apiError || 'Error al cargar los entrenamientos');
      setSlots([]);
      setAlreadyScheduled(false);
    }

    setIsLoading(false);
    setIsRefreshing(false);
  }, []);

  useEffect(() => {
    fetchSlots(selectedDate);
  }, [selectedDate, fetchSlots]);

  /**
   * Which days of the visible month have slots — this is what draws the rings.
   *
   * It fails quietly: a month with no rings is a calendar that still works,
   * so a failure here must not take the day's schedule down with it.
   */
  useEffect(() => {
    let cancelled = false;
    const first = startOfMonth(visibleMonth);
    const last = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0);

    setIsLoadingMonth(true);
    slotsApi.getCalendarDays(toISODate(first), toISODate(last)).then(({ data }) => {
      if (cancelled) return;
      setAvailableDates(new Set((data ?? []).filter((d) => d.has_slots).map((d) => d.date)));
      setIsLoadingMonth(false);
    });

    return () => {
      cancelled = true;
    };
  }, [visibleMonth]);

  const handleSelectDate = (iso: string) => {
    setSelectedDate(iso);
    const picked = parseISODate(iso);
    if (picked.getMonth() !== visibleMonth.getMonth()) {
      setVisibleMonth(startOfMonth(picked));
    }
  };

  const handleChangeMonth = (delta: number) => {
    setVisibleMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));
  };

  const handleSlotPress = (slot: Slot) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('SlotDetail', { slotId: slot.id });
  };

  const handleRefresh = () => {
    fetchSlots(selectedDate, true);
  };

  const chip = useMemo(() => formatChip(selectedDate), [selectedDate]);

  return (
    <Screen wash>
      <AppHeader
        title="Calendario"
        action={{
          icon: 'list',
          label: 'Mis entrenamientos',
          onPress: () => navigation.navigate('MainTabs', { screen: 'Trainings' } as never),
        }}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.ink}
          />
        }
      >
        <Animated.View style={[styles.block, headStyle]}>
          <View style={styles.chipRow}>
            <View style={styles.chipIcon}>
              <Feather name="calendar" size={20} color={colors.gray400} />
            </View>
            <Text style={styles.chipText}>{chip}</Text>
          </View>

          <Text style={styles.headline}>¿Listo para reservar tu próximo entrenamiento?</Text>
        </Animated.View>

        <Animated.View style={headStyle}>
          <MonthCalendar
            month={visibleMonth}
            selectedDate={selectedDate}
            availableDates={availableDates}
            loadingAvailability={isLoadingMonth}
            onSelectDate={handleSelectDate}
            onChangeMonth={handleChangeMonth}
          />
        </Animated.View>

        <Animated.View style={[styles.block, bodyStyle]}>
          {alreadyScheduled && (
            <View style={styles.banner}>
              <Feather name="check-circle" size={18} color={colors.ink} />
              <Text style={styles.bannerText}>
                Ya tienes un entrenamiento agendado para este día
              </Text>
            </View>
          )}

          <Text style={styles.sectionTitle}>Entrenamientos disponibles</Text>

          {isLoading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={colors.ink} />
            </View>
          ) : error ? (
            // Inline, beside the block that failed — never an Alert the user has
            // to dismiss before seeing what went wrong.
            <View style={styles.errorBlock}>
              <Feather name="alert-circle" size={18} color={colors.ink} />
              <View style={styles.errorTexts}>
                <Text style={styles.errorTitle}>No pudimos cargar los horarios</Text>
                <Text style={styles.errorDetail}>{error}</Text>
              </View>
            </View>
          ) : slots.length === 0 ? (
            <View style={styles.centered}>
              <Feather name="calendar" size={28} color={colors.gray400} />
              <Text style={styles.emptyTitle}>Sin entrenamientos</Text>
              <Text style={styles.emptyText}>
                No hay entrenamientos disponibles para este día
              </Text>
            </View>
          ) : (
            <View style={styles.slotsList}>
              {slots.map((slot) => (
                <SlotRow key={slot.id} slot={slot} onPress={() => handleSlotPress(slot)} />
              ))}
            </View>
          )}
        </Animated.View>
      </ScrollView>
    </Screen>
  );
}

// Every measurement below is taken from the design's "Agendar" screen: a
// 343-wide container stacked at 24, a 16px gutter, cards at radius 20 with
// 12/16 padding and a 184 height.
const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 132,
    gap: 24,
  },
  block: {
    gap: 12,
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  chipIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#DEDEDE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    fontFamily: typography.fontFamily,
    fontSize: 16,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.ink,
  },
  headline: {
    fontFamily: typography.fontFamily,
    // 36/1.19 with -0.36 tracking, exactly as the design sets it.
    fontSize: 36,
    lineHeight: 43,
    letterSpacing: -0.36,
    color: colors.ink,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    // Brand tint carries the meaning; the label stays ink, because accentDeep
    // on accentSoft is 1.7:1 and unreadable as text.
    backgroundColor: colors.accentSoft,
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
  sectionTitle: {
    fontFamily: typography.fontFamily,
    fontSize: 20,
    fontWeight: typography.fontWeight.semiBold,
    letterSpacing: -0.2,
    color: colors.ink,
  },
  slotsList: {
    gap: 12,
  },
  slotCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 184,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: colors.white,
  },
  slotCardPressed: {
    opacity: 0.85,
  },
  slotInfo: {
    flex: 1,
    height: '100%',
    justifyContent: 'space-between',
    paddingRight: 12,
  },
  slotHead: {
    gap: 12,
  },
  slotType: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    // The design's #109D2F, which unlike the brand green holds 4.9:1 on white.
    color: '#109D2F',
  },
  slotTypeFull: {
    color: colors.gray400,
  },
  slotDetails: {
    gap: 4,
  },
  slotHour: {
    fontFamily: typography.fontFamily,
    fontSize: 20,
    fontWeight: typography.fontWeight.semiBold,
    letterSpacing: -0.2,
    color: colors.ink,
  },
  slotDesc: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    // The design specifies #A5A5A5 — 2.5:1 on white. gray400 keeps the muted
    // role at 5.3:1.
    color: colors.gray400,
  },
  slotMetas: {
    gap: 12,
  },
  slotMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  slotMetaText: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    color: colors.gray400,
  },
  tile: {
    width: 113,
    height: 118,
    borderRadius: 12,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  tileFull: {
    backgroundColor: colors.surface,
  },
  tileImage: {
    width: '100%',
    height: '100%',
  },
  tileImageFull: {
    // A full slot reads as unavailable at a glance, tile included.
    opacity: 0.45,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 56,
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
  errorBlock: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 16,
  },
  errorTexts: {
    flex: 1,
    gap: 4,
  },
  errorTitle: {
    fontFamily: typography.fontFamily,
    fontSize: 15,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.ink,
  },
  errorDetail: {
    fontFamily: typography.fontFamily,
    fontSize: 13,
    lineHeight: 18,
    color: colors.gray400,
  },
});
