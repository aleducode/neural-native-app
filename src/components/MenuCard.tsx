import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../theme/colors';

interface MenuCardProps {
  title: string;
  subtitle: string;
  badge: string;
  badgeColor: string;
  badgeIcon: string;
  image: any;
  onPress: () => void;
}

export default function MenuCard({
  title,
  subtitle,
  badge,
  badgeColor,
  badgeIcon,
  image,
  onPress,
}: MenuCardProps) {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.content}>
        <Image source={image} style={styles.image} />

        <View style={styles.info}>
          <View style={styles.badgeRow}>
            <View style={[styles.badge, { backgroundColor: badgeColor }]}>
              <Ionicons name={badgeIcon as any} size={12} color={colors.white} />
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
            <TouchableOpacity style={styles.heartButton}>
              <Ionicons name="heart" size={16} color="#FF4757" />
            </TouchableOpacity>
          </View>

          <Text style={styles.title} numberOfLines={2}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.stars}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Ionicons key={star} name="star" size={14} color="#FFD700" />
          ))}
        </View>
        <TouchableOpacity style={styles.viewButton} onPress={onPress}>
          <Text style={styles.viewText}>Ver</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.primary} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  content: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.gray200,
  },
  info: {
    flex: 1,
    marginLeft: spacing.lg,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    gap: 4,
  },
  badgeText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.medium,
    color: colors.white,
  },
  heartButton: {
    padding: 4,
  },
  title: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.semibold,
    color: colors.textDark,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.regular,
    color: colors.gray400,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stars: {
    flexDirection: 'row',
    gap: 2,
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.medium,
    color: colors.primary,
  },
});
