import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, typography } from '../theme/colors';

interface WeekDayProps {
  day: string;
  date: string;
  isSelected: boolean;
  onPress?: () => void;
}

export default function WeekDay({ day, date, isSelected, onPress }: WeekDayProps) {
  return (
    <TouchableOpacity
      style={[styles.container, isSelected && styles.containerSelected]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[styles.dayName, isSelected && styles.dayNameSelected]}>{day}</Text>
      <View style={[styles.dateCircle, isSelected && styles.dateCircleSelected]}>
        <Text style={[styles.dateNumber, isSelected && styles.dateNumberSelected]}>{date}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 40,
    height: 64,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  containerSelected: {
    backgroundColor: colors.white,
  },
  dayName: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    lineHeight: typography.lineHeight.sm,
    color: colors.white,
    marginBottom: 4,
  },
  dayNameSelected: {
    color: colors.textDark,
  },
  dateCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateCircleSelected: {
    backgroundColor: colors.primary,
  },
  dateNumber: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.semibold,
    color: colors.white,
  },
  dateNumberSelected: {
    color: colors.textDark,
  },
});
