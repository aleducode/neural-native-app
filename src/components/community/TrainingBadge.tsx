import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, typography } from '../../theme/colors';
import { PostTraining } from '../../types/community';

interface TrainingBadgeProps {
  training: PostTraining;
}

/** An attached training reads as an achievement, so it carries the accent. */
export default function TrainingBadge({ training }: TrainingBadgeProps) {
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
