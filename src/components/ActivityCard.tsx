import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, borderRadius, spacing } from '../theme/colors';

interface ActivityCardProps {
  title: string;
  image: string | { uri: string };
  calories: string;
  difficulty: string;
  duration: string;
  onPress?: () => void;
}

export default function ActivityCard({
  title,
  image,
  calories,
  difficulty,
  duration,
  onPress,
}: ActivityCardProps) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <Image source={typeof image === 'string' ? { uri: image } : image} style={styles.image} />
      <View style={styles.info}>
        <Text style={styles.title}>{title.toUpperCase()}</Text>
        <View style={styles.meta}>
          <Ionicons name="flame" size={14} color={colors.textDark} />
          <Text style={styles.kcal}>{calories} Kcal</Text>
        </View>
        <Text style={styles.detail}>
          {difficulty} - {duration}
        </Text>
      </View>
      <View style={styles.arrow}>
        <Ionicons name="chevron-forward" size={18} color={colors.textDark} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.md,
    height: 88,
  },
  image: {
    width: 72,
    height: 72,
    borderRadius: borderRadius.md,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontFamily: typography.fontFamily.bold,
    color: colors.textDark,
    textTransform: 'uppercase',
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  kcal: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.medium,
    color: colors.textDark,
  },
  detail: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.gray400,
  },
  arrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.gray200,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
