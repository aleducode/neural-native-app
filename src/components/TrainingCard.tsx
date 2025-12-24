import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../theme/colors';
import { Slot } from '../types';

interface TrainingCardProps {
  slot: Slot;
  onPress?: () => void;
}

// Training type images (placeholder mapping)
const trainingImages: Record<string, any> = {
  'personal': require('../../assets/icon.png'),
  'grupal': require('../../assets/icon.png'),
  'default': require('../../assets/icon.png'),
};

export default function TrainingCard({ slot, onPress }: TrainingCardProps) {
  const { training_type, hour_init, hour_end, available_places, max_places } = slot;

  // Parse time in "HH:MM AM/PM" format to minutes
  const parseTimeToMinutes = (time: string): number => {
    const match = time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (!match) return 0;

    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const period = match[3]?.toUpperCase();

    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;

    return hours * 60 + minutes;
  };

  // Calculate duration in minutes
  const calculateDuration = () => {
    const initTotal = parseTimeToMinutes(hour_init);
    const endTotal = parseTimeToMinutes(hour_end);
    return endTotal - initTotal;
  };

  const duration = calculateDuration();
  const imageSource = trainingImages[training_type.slug_name] || trainingImages.default;
  const isFull = available_places === 0;

  return (
    <TouchableOpacity
      style={[styles.container, isFull && styles.containerDisabled]}
      onPress={onPress}
      disabled={isFull}
      activeOpacity={0.8}
    >
      <Image source={imageSource} style={styles.image} />

      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>
          {training_type.name}
        </Text>

        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Ionicons name="time-outline" size={14} color={colors.gray400} />
            <Text style={styles.infoText}>{hour_init}</Text>
          </View>

          <View style={styles.infoItem}>
            <Ionicons name="hourglass-outline" size={14} color={colors.gray400} />
            <Text style={styles.infoText}>{duration} min</Text>
          </View>

          {training_type.is_group && (
            <View style={styles.infoItem}>
              <Ionicons name="people-outline" size={14} color={colors.gray400} />
              <Text style={styles.infoText}>
                {available_places}/{max_places}
              </Text>
            </View>
          )}
        </View>

        {isFull && (
          <View style={styles.fullBadge}>
            <Text style={styles.fullBadgeText}>Lleno</Text>
          </View>
        )}
      </View>

      <View style={styles.arrowContainer}>
        <Ionicons
          name="chevron-forward"
          size={20}
          color={isFull ? colors.gray400 : colors.primary}
        />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  containerDisabled: {
    opacity: 0.6,
  },
  image: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
    backgroundColor: colors.gray200,
  },
  content: {
    flex: 1,
    marginLeft: spacing.lg,
  },
  title: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.semibold,
    color: colors.textDark,
    marginBottom: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.medium,
    color: colors.gray400,
  },
  fullBadge: {
    marginTop: spacing.sm,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    paddingHorizontal: spacing.md,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
    alignSelf: 'flex-start',
  },
  fullBadgeText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.medium,
    color: colors.error,
  },
  arrowContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.gray200,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
