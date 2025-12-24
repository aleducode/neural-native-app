import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../theme/colors';

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
      <View style={styles.headerRow}>
        <View style={[styles.iconContainer, isPrimary && styles.primaryIconContainer]}>
          <Ionicons
            name={icon}
            size={16}
            color={isPrimary ? colors.textDark : colors.gray400}
          />
        </View>
        <Text style={[styles.label, isPrimary && styles.labelPrimary]}>{label}</Text>
      </View>
      <View style={styles.valueRow}>
        <Text style={[styles.value, isPrimary && styles.valuePrimary]}>{value}</Text>
        {unit && <Text style={[styles.unit, isPrimary && styles.unitPrimary]}> {unit}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    minHeight: 100,
  },
  primaryContainer: {
    backgroundColor: colors.primary,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.gray200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryIconContainer: {
    backgroundColor: colors.white,
  },
  label: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.medium,
    color: colors.gray400,
  },
  labelPrimary: {
    color: colors.textDark,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  value: {
    fontSize: 28,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.bold,
    color: colors.textDark,
  },
  valuePrimary: {
    color: colors.textDark,
  },
  unit: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.regular,
    color: colors.gray400,
  },
  unitPrimary: {
    color: colors.textDark,
  },
});
