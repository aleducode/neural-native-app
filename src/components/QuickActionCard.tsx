import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, borderRadius, spacing } from '../theme/colors';

interface QuickActionCardProps {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
}

export default function QuickActionCard({ title, icon, onPress }: QuickActionCardProps) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.iconContainer}>
        <Ionicons name={icon} size={20} color={colors.textDark} />
      </View>
      <Text style={styles.title}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 188,
    height: 64,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md, // 16px
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md, // 12px
    gap: spacing.md, // 12px
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.xs,
    backgroundColor: colors.gray200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.medium,
    lineHeight: typography.lineHeight.xl,
    color: colors.textDark,
    fontFamily: typography.fontFamily.medium,
  },
});

