import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, borderRadius, spacing } from '../theme/colors';

interface DailyGoalCardProps {
  title: string;
  image: string | { uri: string };
  calories: string;
  exercises: string;
}

export default function DailyGoalCard({ title, image, calories, exercises }: DailyGoalCardProps) {
  return (
    <View style={styles.card}>
      <Image source={typeof image === 'string' ? { uri: image } : image} style={styles.image} />
      <Text style={styles.title}>{title.toUpperCase()}</Text>
      <View style={styles.footer}>
        <View style={styles.calories}>
          <Ionicons name="flame" size={20} color={colors.textDark} />
          <Text style={styles.caloriesText}>{calories} Kcal</Text>
        </View>
        <Text style={styles.exercises}>{exercises} Exercise</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 262,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.xs,
  },
  image: {
    width: 262,
    height: 140,
    borderRadius: borderRadius.lg,
  },
  title: {
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.bold,
    lineHeight: typography.lineHeight.xxl,
    color: colors.textDark,
    fontFamily: typography.fontFamily.bold,
    textTransform: 'uppercase',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  calories: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  caloriesText: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.medium,
    lineHeight: typography.lineHeight.xl,
    color: colors.textDark,
    fontFamily: typography.fontFamily.medium,
  },
  exercises: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.medium,
    lineHeight: typography.lineHeight.xl,
    color: colors.textDark,
    fontFamily: typography.fontFamily.medium,
  },
});

