import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, typography } from '../../theme/colors';

const WEEKDAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

/** YYYY-MM-DD in local time — `toISOString` shifts the day across timezones. */
export function toISODate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

interface Cell {
  date: Date;
  iso: string;
  inMonth: boolean;
}

/** Whole weeks covering the month, Sunday-first, padded with adjacent months. */
function buildGrid(month: Date): Cell[][] {
  const first = startOfMonth(month);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());

  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const weeks = Math.ceil((first.getDay() + daysInMonth) / 7);

  const grid: Cell[][] = [];
  for (let w = 0; w < weeks; w++) {
    const row: Cell[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(start);
      date.setDate(start.getDate() + w * 7 + d);
      row.push({ date, iso: toISODate(date), inMonth: date.getMonth() === month.getMonth() });
    }
    grid.push(row);
  }
  return grid;
}

interface MonthCalendarProps {
  /** Any date inside the month on display. */
  month: Date;
  selectedDate: string;
  /** Dates the gym has slots on — these get the ring. */
  availableDates: Set<string>;
  loadingAvailability?: boolean;
  onSelectDate: (iso: string) => void;
  onChangeMonth: (delta: number) => void;
}

/**
 * The month grid from the design: an ink card where the ring around a day
 * means "there are slots that day" and a filled circle means "this is the day
 * you're looking at".
 *
 * The design mock numbers its first row 4–10 under Dom–Sáb, which no real
 * September lands on; the grid here is generated from the actual month so the
 * weekday columns stay honest.
 */
export default function MonthCalendar({
  month,
  selectedDate,
  availableDates,
  loadingAvailability = false,
  onSelectDate,
  onChangeMonth,
}: MonthCalendarProps) {
  const grid = useMemo(() => buildGrid(month), [month]);
  const todayISO = useMemo(() => toISODate(new Date()), []);

  const step = (delta: number) => {
    Haptics.selectionAsync();
    onChangeMonth(delta);
  };

  const pick = (cell: Cell) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelectDate(cell.iso);
  };

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Text style={styles.month}>
          {MONTHS[month.getMonth()]} {month.getFullYear()}
        </Text>

        <View style={styles.steppers}>
          {loadingAvailability && (
            <ActivityIndicator size="small" color={colors.muted} style={styles.spinner} />
          )}
          <Pressable
            onPress={() => step(-1)}
            hitSlop={12}
            style={({ pressed }) => pressed && styles.pressed}
            accessibilityRole="button"
            accessibilityLabel="Mes anterior"
          >
            <Feather name="chevron-left" size={24} color={NAV} />
          </Pressable>
          <Pressable
            onPress={() => step(1)}
            hitSlop={12}
            style={({ pressed }) => pressed && styles.pressed}
            accessibilityRole="button"
            accessibilityLabel="Mes siguiente"
          >
            <Feather name="chevron-right" size={24} color={NAV} />
          </Pressable>
        </View>
      </View>

      <View style={styles.days}>
        <View style={styles.weekdays}>
          {WEEKDAYS.map((name) => (
            <Text key={name} style={styles.weekday}>
              {name}
            </Text>
          ))}
        </View>

        <View style={styles.grid}>
          {grid.map((week, i) => (
            <View key={i} style={styles.week}>
              {week.map((cell) => {
                const selected = cell.iso === selectedDate;
                const hasSlots = availableDates.has(cell.iso);
                const isToday = cell.iso === todayISO;

                return (
                  <Pressable
                    key={cell.iso}
                    onPress={() => pick(cell)}
                    style={styles.cell}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`${cell.date.getDate()} de ${
                      MONTHS[cell.date.getMonth()]
                    }${hasSlots ? ', con entrenamientos disponibles' : ''}`}
                  >
                    <View
                      style={[
                        styles.dot,
                        hasSlots && !selected && styles.dotRing,
                        selected && styles.dotOn,
                      ]}
                    >
                      <Text
                        style={[
                          styles.day,
                          !cell.inMonth && styles.dayOutside,
                          isToday && !selected && styles.dayToday,
                          selected && styles.dayOn,
                        ]}
                      >
                        {cell.date.getDate()}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

/** The design's chevron grey, which sits at 5.4:1 on the ink card. */
const NAV = '#8A8A8A';

const CELL = 31;

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.ink,
    borderRadius: 24,
    padding: 16,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
  },
  month: {
    fontFamily: typography.fontFamily,
    fontSize: 16,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.white,
  },
  steppers: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 27,
  },
  spinner: {
    marginRight: 4,
  },
  pressed: {
    opacity: 0.5,
  },
  days: {
    paddingVertical: 16,
    gap: 12,
  },
  weekdays: {
    flexDirection: 'row',
  },
  weekday: {
    flex: 1,
    textAlign: 'center',
    fontFamily: typography.fontFamily,
    fontSize: 12,
    color: colors.white,
  },
  grid: {
    gap: 12,
  },
  week: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: CELL,
  },
  dot: {
    width: CELL,
    height: CELL,
    borderRadius: CELL / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  dotRing: {
    borderColor: colors.accentDeep,
  },
  dotOn: {
    backgroundColor: colors.accentDeep,
    borderColor: colors.accentDeep,
  },
  day: {
    fontFamily: typography.fontFamily,
    fontSize: 16,
    color: colors.white,
  },
  dayOutside: {
    // Adjacent months still have to be legible, just quieter than the month
    // on display. The design mock happens to land on a month with no spill.
    color: colors.gray400,
  },
  dayToday: {
    // Lime, so "today" never reads as the green ring that means "bookable".
    color: colors.accent,
    fontWeight: typography.fontWeight.bold,
  },
  dayOn: {
    color: colors.ink,
    fontWeight: typography.fontWeight.semiBold,
  },
});
