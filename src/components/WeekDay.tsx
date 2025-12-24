import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing } from '../theme/colors';

interface WeekDayProps {
  day: string;
  date: string;
  isSelected?: boolean;
  onPress?: () => void;
}

export default function WeekDay({ day, date, isSelected, onPress }: WeekDayProps) {
  return (
    <TouchableOpacity
      style={[styles.container, isSelected && styles.selected]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.day, isSelected && styles.selectedText]}>{day}</Text>
      <Text style={[styles.date, isSelected && styles.selectedText]}>{date}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 40,
    height: 56,
    borderRadius: 20,
    backgroundColor: colors.cardDark,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  selected: {
    backgroundColor: colors.primary,
  },
  day: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  date: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bold,
    color: colors.white,
  },
  selectedText: {
    color: colors.textDark,
  },
});
