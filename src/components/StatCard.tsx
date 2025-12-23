import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, borderRadius, spacing } from '../theme/colors';

interface StatCardProps {
  label: string;
  value: string;
  unit: string;
  icon: keyof typeof Ionicons.glyphMap;
  variant?: 'primary' | 'default';
}

export default function StatCard({ label, value, unit, icon, variant = 'default' }: StatCardProps) {
  const isPrimary = variant === 'primary';

  return (
    <View style={[styles.card, isPrimary && styles.cardPrimary]}>
      <View style={styles.header}>
        <View style={[styles.iconCircle, isPrimary ? styles.iconCirclePrimary : styles.iconCircleDefault]}>
          <Ionicons name={icon} size={16} color={colors.textDark} />
        </View>
        <Text style={[styles.label, isPrimary && styles.labelPrimary]}>{label}</Text>
      </View>
      <View style={styles.valueContainer}>
        <Text style={styles.value}>{value}</Text>
        <Text style={styles.unit}>{unit}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    height: 80,
    borderRadius: borderRadius.md,
    backgroundColor: colors.white,
    padding: spacing.lg,
    justifyContent: 'space-between',
  },
  cardPrimary: {
    backgroundColor: colors.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCirclePrimary: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  iconCircleDefault: {
    backgroundColor: colors.gray200,
  },
  label: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.medium,
    color: colors.gray400,
  },
  labelPrimary: {
    color: colors.gray500,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },
  value: {
    fontSize: typography.fontSize.title2,
    fontFamily: typography.fontFamily.bold,
    color: colors.textDark,
  },
  unit: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.textDark,
  },
});
