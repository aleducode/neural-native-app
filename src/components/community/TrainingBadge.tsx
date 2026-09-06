import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, typography } from '../../theme/colors';
import { PostTraining } from '../../types/community';

interface TrainingBadgeProps {
  training: PostTraining;
  /**
   * `compact` is the pill the feed design (kJac5 > "Post Juan Pérez" >
   * "Training badge") actually shows: a dumbbell icon plus one line of text,
   * hugging its content instead of spanning the card. `full` is the larger
   * card used on the post-detail screen, where there's room to spell out the
   * date and duration as their own rows — the feed design doesn't cover that
   * screen, so it's built from the same tokens (accentSoft, radii, type
   * scale) rather than a new style.
   */
  variant?: 'full' | 'compact';
}

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr + 'T00:00:00');
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return `${dayNames[date.getDay()]} ${date.getDate()} ${monthNames[date.getMonth()]}`;
};

const formatDuration = (minutes: number) => {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
};

/** An attached training reads as an achievement, so it carries the accent. */
export default function TrainingBadge({ training, variant = 'full' }: TrainingBadgeProps) {
  if (variant === 'compact') {
    return (
      <View style={styles.pill}>
        {/* The design names icon="dumbbell", which doesn't exist in Feather
            (the icon set this app uses everywhere) — a name copied from a
            different icon library. "activity" is the substitute already
            used for training elsewhere (the full variant below, the
            create-post training chip). */}
        <Feather name="activity" size={14} color={colors.accentDeep} />
        <Text style={styles.pillText}>
          {training.type} · {formatDuration(training.duration_minutes)}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.icon}>
        <Feather name="activity" size={20} color={colors.accentDeep} />
      </View>

      <View style={styles.content}>
        <Text style={styles.type}>{training.type}</Text>
        <View style={styles.details}>
          <View style={styles.detail}>
            <Feather name="calendar" size={13} color={colors.gray400} />
            <Text style={styles.detailText}>{formatDate(training.date)}</Text>
          </View>
          <View style={styles.detail}>
            <Feather name="clock" size={13} color={colors.gray400} />
            <Text style={styles.detailText}>{formatDuration(training.duration_minutes)}</Text>
          </View>
        </View>
      </View>

      <Feather name="check-circle" size={20} color={colors.accentDeep} />
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 100,
    backgroundColor: colors.accentSoft,
  },
  pillText: {
    fontFamily: typography.fontFamily,
    fontSize: 11,
    fontWeight: typography.fontWeight.semiBold,
    // Exact literal from the design (BRIEF rule 2): #109D2F is 4.9:1 on
    // white, so it's used as-is rather than mapped to accentDeep.
    color: '#109D2F',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.accentSoft,
    borderRadius: 16,
    padding: 12,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: 4,
  },
  type: {
    fontFamily: typography.fontFamily,
    fontSize: 15,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.ink,
  },
  details: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  detail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    color: colors.gray400,
  },
});
