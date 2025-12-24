import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing } from '../theme/colors';

interface StatCardProps {
  label: string;
  value: string;
  unit?: string;
  icon: keyof typeof Ionicons.glyphMap;
  variant?: 'default' | 'primary';
}

export default function StatCard({ label, value, unit, icon, variant = 'default' }: StatCardProps) {
  const isPrimary = variant === 'primary';

  return (
    <View style={[styles.container, isPrimary && styles.primaryContainer]}>
      <View style={[styles.iconContainer, isPrimary && styles.primaryIcon]}>
        <Ionicons
          name={icon}
          size={16}
          color={isPrimary ? colors.textDark : colors.primary}
        />
      </View>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.valueRow}>
        <Text style={styles.value}>{value}</Text>
        {unit && <Text style={styles.unit}>{unit}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cardDark,
    borderRadius: 12,
    padding: spacing.md,
    minHeight: 72,
  },
  primaryContainer: {
    backgroundColor: colors.primary,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(69, 255, 183, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  primaryIcon: {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  label: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.textMuted,
    marginBottom: 2,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },
  value: {
    fontSize: typography.fontSize.title2,
    fontFamily: typography.fontFamily.bold,
    color: colors.white,
  },
  unit: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
  },
});
