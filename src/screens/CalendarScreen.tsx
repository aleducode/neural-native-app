import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing } from '../theme/colors';
import WeekDay from '../components/WeekDay';
import TrainingCard from '../components/TrainingCard';
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
    setSelectedDate(fullDate);
  };

  const handleSlotPress = (slot: Slot) => {
    navigation.navigate('SlotDetail', { slotId: slot.id });
  };

  const handleRefresh = () => {
    fetchSlots(selectedDate, true);
  };

  const selectedDayData = weekDays.find(d => d.fullDate === selectedDate);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color={colors.textDark} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Calendario</Text>
            <Text style={styles.monthYear}>
              {selectedDayData ? formatMonthYear(selectedDayData.date) : ''}
            </Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        {/* Week Day Selector */}
        <View style={styles.weekSelector}>
          {weekDays.map((day) => (
            <WeekDay
              key={day.fullDate}
              day={day.dayName}
              date={day.dayNumber}
              isSelected={selectedDate === day.fullDate}
              onPress={() => handleDayPress(day.fullDate)}
            />
          ))}
        </View>

        {/* Content */}
        <View style={styles.contentContainer}>
          <Text style={styles.sectionTitle}>Entrenamientos disponibles</Text>

          {alreadyScheduled && (
            <View style={styles.scheduledBanner}>
              <Text style={styles.scheduledText}>
                Ya tienes un entrenamiento agendado para este día
              </Text>
            </View>
          )}

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : error ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>{error}</Text>
            </View>
          ) : slots.length === 0 ? (
            <View style={styles.emptyContainer}>
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
                  tintColor={colors.primary}
                />
              }
              contentContainerStyle={styles.slotsList}
            >
              {slots.map((slot) => (
                <TrainingCard
                  key={slot.id}
                  slot={slot}
                  onPress={() => handleSlotPress(slot)}
                />
              ))}
            </ScrollView>
          )}
        </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
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
    marginRight: spacing.md,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: typography.fontSize.xxl,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
  },
  monthYear: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.medium,
    color: colors.gray400,
    marginTop: spacing.xs,
  },
  headerSpacer: {
    width: 48,
  },
  weekSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.lg,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.fontSize.xxl,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.white,
    marginBottom: spacing.xl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
  },
  emptyText: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.medium,
    color: colors.gray400,
    textAlign: 'center',
  },
  scheduledBanner: {
    backgroundColor: 'rgba(90, 107, 255, 0.15)',
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  scheduledText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.medium,
    color: colors.primary,
    textAlign: 'center',
  },
  slotsList: {
    paddingBottom: 100,
  },
});
