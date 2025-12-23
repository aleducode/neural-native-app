import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colors, typography, borderRadius, spacing } from '../theme/colors';

interface TrainingLevelTagProps {
  label: string;
  isSelected: boolean;
  onPress?: () => void;
}

export default function TrainingLevelTag({ label, isSelected, onPress }: TrainingLevelTagProps) {
  return (
    <TouchableOpacity
      style={[styles.tag, isSelected && styles.tagSelected]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={styles.text}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  tag: {
    height: 36,
    paddingHorizontal: spacing.xxxl,
    paddingVertical: 6,
    borderRadius: borderRadius.xxl,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagSelected: {
    backgroundColor: colors.primary,
  },
  text: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.medium,
    lineHeight: typography.lineHeight.xl,
    color: colors.textDark,
    fontFamily: typography.fontFamily.medium,
  },
});

