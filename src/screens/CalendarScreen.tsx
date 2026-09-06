import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
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
import Card from '../components/ui/Card';
import { slotsApi } from '../api/slots';
import { Slot } from '../types';
import { RootStackParamList } from '../navigation/RootNavigator';

type CalendarNavigationProp = StackNavigationProp<RootStackParamList>;
type CalendarRouteProp = RouteProp<RootStackParamList, 'Calendar'>;

interface WeekDayData {
  date: Date;
  dayName: string;
  dayNumber: string;
  fullDate: string; // YYYY-MM-DD format for API
}

// Spanish day abbreviations
const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const LONG_DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

function getWeekDays(): WeekDayData[] {
  const today = new Date();
  const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const days: WeekDayData[] = [];

  // Calculate week starting from Sunday (same logic as HomeScreen)
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - currentDay + i);

    const dayName = DAY_NAMES[date.getDay()];
    const dayNumber = date.getDate().toString();
    // Format as YYYY-MM-DD without timezone conversion to avoid day shifts
    const fullDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

    days.push({ date, dayName, dayNumber, fullDate });
  }

  return days;
}

function formatMonthYear(date: Date): string {
  return `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
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
 * One bookable slot.
 *
 * The meter reads as *availability*, never occupancy: the bar is how much room
 * is left, so it shrinks towards empty as the class fills. A progress bar that
 * grew — and went green — as places ran out would say the opposite of what is
 * happening.
 */
function SlotRow({ slot, onPress }: { slot: Slot; onPress: () => void }) {
  const { training_type, hour_init, hour_end, available_places, max_places } = slot;

  const duration = parseTimeToMinutes(hour_end) - parseTimeToMinutes(hour_init);
  const isFull = available_places <= 0;
  const freeRatio = max_places > 0 ? Math.max(Math.min(available_places / max_places, 1), 0) : 0;

  const body = (
    <>
      <View style={styles.slotTop}>
        <View style={styles.slotHeadings}>
          <Text style={[styles.slotHour, isFull && styles.slotMutedStrong]} numberOfLines={1}>
            {hour_init}
          </Text>
          <Text style={styles.slotType} numberOfLines={1}>
            {training_type.name}
          </Text>
        </View>

        {isFull ? (
          <View style={styles.fullBadge}>
            <Text style={styles.fullBadgeText}>LLENO</Text>
          </View>
        ) : (
          <View style={styles.slotChevron}>
            <Feather name="chevron-right" size={18} color={colors.ink} />
          </View>
        )}
      </View>

      <View style={styles.slotMetaRow}>
        <View style={styles.slotMeta}>
          <Feather name="clock" size={13} color={colors.gray400} />
          <Text style={styles.slotMetaText}>{duration} min</Text>
        </View>

        {training_type.is_group && (
          <View style={styles.slotMeta}>
            <Feather name="users" size={13} color={colors.gray400} />
            <Text style={styles.slotMetaText}>
              {available_places}/{max_places} cupos
            </Text>
          </View>
        )}
      </View>

      {training_type.is_group && (
        <View
          style={styles.track}
          accessibilityRole="progressbar"
          accessibilityLabel="Cupos disponibles"
          accessibilityValue={{ min: 0, max: max_places, now: available_places }}
        >
          <View style={[styles.trackFill, { width: `${freeRatio * 100}%` }]} />
        </View>
      )}
    </>
  );

  // A full slot is not a Pressable at all, so it can neither be tapped nor
  // focused by a screen reader as an action.
  if (isFull) {
    return (
      <View
        accessible
        accessibilityLabel={`${training_type.name} a las ${hour_init}. Lleno, sin cupos disponibles.`}
      >
        <Card style={styles.slotCard}>{body}</Card>
      </View>
    );
  }

  return (
    <Card style={styles.slotCard} onPress={onPress}>
      {body}
    </Card>
  );
}

export default function CalendarScreen() {
  const navigation = useNavigation<CalendarNavigationProp>();
  const route = useRoute<CalendarRouteProp>();
  const initialDate = route.params?.initialDate;
  
  // Calculate week days starting from initialDate if provided, otherwise from today
  // Uses the same logic as HomeScreen: calculate the week containing the given date
  const getInitialWeekDays = useCallback((): WeekDayData[] => {
    if (initialDate) {
      // Parse the date string (YYYY-MM-DD) to avoid timezone issues
      const [year, month, day] = initialDate.split('-').map(Number);
      const targetDate = new Date(year, month - 1, day); // month is 0-indexed
      const dayOfWeek = targetDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const days: WeekDayData[] = [];
      
      // Calculate week starting from Sunday (same logic as HomeScreen)
      for (let i = 0; i < 7; i++) {
        const date = new Date(year, month - 1, day - dayOfWeek + i);
        
        const dayName = DAY_NAMES[date.getDay()];
        const dayNumber = date.getDate().toString();
        // Format as YYYY-MM-DD without timezone conversion
        const fullDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        
        days.push({ date, dayName, dayNumber, fullDate });
      }
      
      return days;
    }
    return getWeekDays();
  }, [initialDate]);
  
  // Initialize weekDays and selectedDate based on initialDate
  const initialWeekDays = getInitialWeekDays();
  const [weekDays, setWeekDays] = useState<WeekDayData[]>(initialWeekDays);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    // If initialDate is provided, verify it exists in the calculated week
    if (initialDate) {
      const foundDay = initialWeekDays.find(d => d.fullDate === initialDate);
      if (foundDay) {
        return initialDate;
      }
      // If not found, use the first day (shouldn't happen, but fallback)
      return initialWeekDays[0]?.fullDate || '';
    }
    return initialWeekDays[0]?.fullDate || '';
  });
  
  // Update week days and selected date when initialDate changes (e.g., when navigating from HomeScreen)
  useEffect(() => {
    if (initialDate) {
      const newWeekDays = getInitialWeekDays();
      setWeekDays(newWeekDays);
      // Verify the initialDate exists in the new week days before setting it
      const foundDay = newWeekDays.find(d => d.fullDate === initialDate);
      if (foundDay) {
        // Use setTimeout to ensure state updates happen after render
        setTimeout(() => {
          setSelectedDate(initialDate);
        }, 0);
      } else {
        // Fallback: use the first day if initialDate not found (shouldn't happen)
        console.warn('InitialDate not found in calculated week:', initialDate, 'Available dates:', newWeekDays.map(d => d.fullDate));
        setSelectedDate(newWeekDays[0]?.fullDate || '');
      }
    }
  }, [initialDate, getInitialWeekDays]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [alreadyScheduled, setAlreadyScheduled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleDayPress = (fullDate: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedDate(fullDate);
  };

  const handleSlotPress = (slot: Slot) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('SlotDetail', { slotId: slot.id });
  };

  const handleRefresh = () => {
    fetchSlots(selectedDate, true);
  };

  const selectedDayData = weekDays.find(d => d.fullDate === selectedDate);

  return (
    <Screen wash>
      <AppHeader title="Calendario" />

      <Animated.View style={[styles.head, headStyle]}>
        <Text style={styles.editorial} numberOfLines={1}>
          {selectedDayData
            ? `${LONG_DAY_NAMES[selectedDayData.date.getDay()]} ${selectedDayData.date.getDate()}`
            : 'Calendario'}
        </Text>
        <Text style={styles.editorialMeta}>
          {selectedDayData ? formatMonthYear(selectedDayData.date) : ''}
        </Text>

        {/* Week selector */}
        <View style={styles.week}>
          {weekDays.map((day) => {
            const on = selectedDate === day.fullDate;
            return (
              <Pressable
                key={day.fullDate}
                style={styles.dayCell}
                onPress={() => handleDayPress(day.fullDate)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`${day.dayName} ${day.dayNumber}`}
              >
                <Text style={[styles.dayName, on && styles.dayNameOn]}>{day.dayName}</Text>
                <View style={[styles.dayPill, on && styles.dayPillOn]}>
                  <Text style={[styles.dayNumber, on && styles.dayNumberOn]}>{day.dayNumber}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </Animated.View>

      <Animated.View style={[styles.body, bodyStyle]}>
        {alreadyScheduled && (
          <View style={styles.banner}>
            <Feather name="check-circle" size={18} color={colors.ink} />
            <Text style={styles.bannerText}>
              Ya tienes un entrenamiento agendado para este día
            </Text>
          </View>
        )}

        <Text style={styles.sectionLabel}>ENTRENAMIENTOS DISPONIBLES</Text>

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
          <ScrollView
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                tintColor={colors.ink}
              />
            }
            contentContainerStyle={styles.slotsList}
          >
            {slots.map((slot) => (
              <SlotRow key={slot.id} slot={slot} onPress={() => handleSlotPress(slot)} />
            ))}
          </ScrollView>
        )}
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: {
    paddingHorizontal: 16,
    paddingTop: 4,
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
    fontSize: 14,
    // gray400 is 5.3:1 on the surface tone. The design's #9D9D9D is 2.7:1.
    color: colors.gray400,
  },
  week: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 8,
  },
  dayCell: {
    alignItems: 'center',
    gap: 6,
  },
  dayName: {
    fontFamily: typography.fontFamily,
    fontSize: 11,
    color: colors.gray400,
  },
  dayNameOn: {
    color: colors.ink,
    fontWeight: typography.fontWeight.semiBold,
  },
  dayPill: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayPillOn: {
    backgroundColor: colors.ink,
  },
  dayNumber: {
    fontFamily: typography.fontFamily,
    fontSize: 14,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.ink,
  },
  dayNumberOn: {
    color: colors.white,
  },
  body: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
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
    marginBottom: 16,
  },
  bannerText: {
    flex: 1,
    fontFamily: typography.fontFamily,
    fontSize: 13,
    fontWeight: typography.fontWeight.medium,
    lineHeight: 18,
    color: colors.ink,
  },
  sectionLabel: {
    fontFamily: typography.fontFamily,
    fontSize: 11,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: 1.2,
    color: colors.gray400,
    marginBottom: 12,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingBottom: 80,
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
  slotsList: {
    paddingBottom: 100,
    gap: 12,
  },
  slotCard: {
    gap: 12,
  },
  slotTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  slotHeadings: {
    flex: 1,
    gap: 2,
  },
  slotHour: {
    fontFamily: typography.fontFamily,
    fontSize: 20,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: -0.4,
    color: colors.ink,
  },
  slotMutedStrong: {
    color: colors.gray400,
  },
  slotType: {
    fontFamily: typography.fontFamily,
    fontSize: 13,
    color: colors.gray400,
  },
  slotChevron: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullBadge: {
    // Solid ink reads at 16:1. A red-on-pink badge would have been 3:1 and
    // failed AA at this size.
    backgroundColor: colors.ink,
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  fullBadgeText: {
    fontFamily: typography.fontFamily,
    fontSize: 10,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: 1,
    color: colors.white,
  },
  slotMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  slotMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  slotMetaText: {
    fontFamily: typography.fontFamily,
    fontSize: 13,
    color: colors.gray400,
  },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  trackFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: colors.ink,
  },
});
