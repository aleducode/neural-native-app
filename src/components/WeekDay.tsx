import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { colors, typography, spacing, borderRadius } from '../theme/colors';

interface WeekDayProps {
  day: string;
  date: string;
  isSelected?: boolean;
  onPress?: () => void;
}

export default function WeekDay({ day, date, isSelected, onPress }: WeekDayProps) {
  return (
    <TouchableOpacity
      style={[styles.container, isSelected && styles.selectedContainer]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.dayText, isSelected && styles.dayTextSelected]}>{day}</Text>
      <View style={[styles.dateCircle, isSelected && styles.dateCircleSelected]}>
        <Text style={[styles.dateText, isSelected && styles.dateTextSelected]}>{date}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 44,
    height: 68,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.gray500,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
  },
  selectedContainer: {
    backgroundColor: colors.white,
  },
  dayText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.medium,
    color: colors.gray400,
    marginBottom: 4,
  },
  dayTextSelected: {
    color: colors.textDark,
  },
  dateCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateCircleSelected: {
    backgroundColor: colors.primary,
  },
  dateText: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
  },
  dateTextSelected: {
    color: colors.textDark,
  },
});
