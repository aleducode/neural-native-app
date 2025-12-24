import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { colors, typography, spacing } from '../theme/colors';
import WeekDay from '../components/WeekDay';
import TrainingCard from '../components/TrainingCard';
import { slotsApi } from '../api/slots';
import { Slot } from '../types';
import { RootStackParamList } from '../navigation/RootNavigator';

type CalendarNavigationProp = StackNavigationProp<RootStackParamList>;

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
  const days: WeekDayData[] = [];

  // Start from today and get 7 days
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);

    const dayName = DAY_NAMES[date.getDay()];
    const dayNumber = date.getDate().toString();
    const fullDate = date.toISOString().split('T')[0];

    days.push({ date, dayName, dayNumber, fullDate });
  }

  return days;
}

function formatMonthYear(date: Date): string {
  return `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
}

export default function CalendarScreen() {
  const navigation = useNavigation<CalendarNavigationProp>();
  const [weekDays] = useState<WeekDayData[]>(getWeekDays);
  const [selectedDate, setSelectedDate] = useState<string>(weekDays[0].fullDate);
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
          <Text style={styles.headerTitle}>CALENDARIO</Text>
          <Text style={styles.monthYear}>
            {selectedDayData ? formatMonthYear(selectedDayData.date) : ''}
          </Text>
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
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerTitle: {
    fontSize: typography.fontSize.title1,
    fontFamily: typography.fontFamily.bold,
    lineHeight: typography.lineHeight.title1,
    color: colors.white,
    textTransform: 'uppercase',
  },
  monthYear: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.medium,
    color: colors.gray400,
    marginTop: spacing.xs,
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
    fontFamily: typography.fontFamily.semibold,
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
    fontFamily: typography.fontFamily.medium,
    color: colors.gray400,
    textAlign: 'center',
  },
  scheduledBanner: {
    backgroundColor: 'rgba(69, 255, 183, 0.15)',
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  scheduledText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.primary,
    textAlign: 'center',
  },
  slotsList: {
    paddingBottom: 100,
  },
});
