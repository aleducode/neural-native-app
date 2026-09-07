import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { colors, typography } from '../../theme/colors';
import { RankedMember, rankBy, valueOf } from '../../services/leaderboard';
import LeaderboardAvatar from './LeaderboardAvatar';
import { ordinal } from './ordinal';

interface LeaderboardStripProps {
  /** Unsorted roster — this component ranks it by trainings itself. */
  members: RankedMember[];
  loading: boolean;
  currentUserId?: number;
  onViewTable: () => void;
}

const PLACE_COLOR = [colors.accentDeep, colors.accent, '#8A8A8A'] as const;

/**
 * The weekly pulse strip: top 3 by trainings, and where you stand. Sits above
 * the wall as the feed's first element.
 *
 * The board only knows members who post (see `services/leaderboard.ts`), so
 * this never claims to rank the whole gym — it ranks the community.
 */
export default function LeaderboardStrip({
  members,
  loading,
  currentUserId,
  onViewTable,
}: LeaderboardStripProps) {
  const ranked = useMemo(() => rankBy(members, 'trainings'), [members]);

  const pulse = useSharedValue(0.4);
  useEffect(() => {
    if (!loading) return;
    pulse.value = withRepeat(
      withTiming(0.9, { duration: 700, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [loading]);
  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  if (loading) {
    return (
      <View style={[styles.card, styles.cardSpacing]}>
        <View style={styles.topRow}>
          <Animated.View style={[styles.skeletonLine, { width: 90 }, pulseStyle]} />
          <Animated.View style={[styles.skeletonLine, { width: 60 }, pulseStyle]} />
        </View>
        <View style={styles.top3Row}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={styles.top3Col}>
              <Animated.View
                style={[
                  styles.skeletonAvatar,
                  { width: i === 1 ? 56 : 48, height: i === 1 ? 56 : 48 },
                  pulseStyle,
                ]}
              />
              <Animated.View style={[styles.skeletonLine, { width: 40, height: 10 }, pulseStyle]} />
            </View>
          ))}
        </View>
        <Animated.View style={[styles.skeletonPosition, pulseStyle]} />
      </View>
    );
  }

  // No one has posted this week, or the roster read failed — the strip stays
  // out of the feed rather than showing a broken card.
  if (ranked.length === 0) return null;

  const top3 = ranked.slice(0, 3).map((member, i) => ({ member, place: i + 1 }));
  const visualOrder = [top3[1], top3[0], top3[2]].filter(
    (entry): entry is { member: RankedMember; place: number } => !!entry
  );

  const myIndex = currentUserId != null ? ranked.findIndex((m) => m.id === currentUserId) : -1;
  let myBadge: string | null = null;
  let myMessage: string;
  if (myIndex === -1) {
    myMessage = 'Publicá tu primer entreno para entrar';
  } else if (myIndex === 0) {
    myBadge = ordinal(1);
    myMessage = 'Vas primero. Sostenelo.';
  } else {
    const above = ranked[myIndex - 1];
    const diff = valueOf(above, 'trainings') - valueOf(ranked[myIndex], 'trainings');
    myBadge = ordinal(myIndex + 1);
    myMessage = `Te faltan ${diff} entrenos para el ${ordinal(myIndex)}`;
  }

  return (
    <View style={[styles.card, styles.cardSpacing]}>
      <View style={styles.topRow}>
        <Text style={styles.eyebrow}>ESTA SEMANA</Text>
        <Pressable
          style={({ pressed }) => [styles.viewTable, pressed && styles.pressed]}
          onPress={onViewTable}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Ver la tabla completa"
        >
          <Text style={styles.viewTableText}>Ver tabla</Text>
          <Feather name="chevron-right" size={14} color={colors.accent} />
        </Pressable>
      </View>

      <View style={styles.top3Row}>
        {visualOrder.map(({ member, place }) => {
          const color = PLACE_COLOR[place - 1];
          const size = place === 1 ? 56 : 48;
          return (
            <View key={member.id} style={styles.top3Col}>
              <LeaderboardAvatar
                photoUrl={member.photoUrl}
                initials={member.initials}
                size={size}
                borderWidth={2}
                borderColor={color}
                fontSize={15}
              />
              <Text style={styles.top3Name} numberOfLines={1}>
                {member.name.split(' ')[0]}
              </Text>
              <Text style={[styles.top3Value, { color }]}>{valueOf(member, 'trainings')}</Text>
            </View>
          );
        })}
      </View>

      <View style={styles.position}>
        {!!myBadge && <Text style={styles.positionBadge}>{myBadge}</Text>}
        <Text style={styles.positionText}>{myMessage}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.ink,
    borderRadius: 20,
    padding: 16,
    gap: 14,
    width: '100%',
  },
  cardSpacing: {
    marginBottom: 16,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eyebrow: {
    fontFamily: typography.fontFamily,
    fontSize: 11,
    fontWeight: typography.fontWeight.semiBold,
    letterSpacing: 1,
    color: '#8A8A8A',
  },
  viewTable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewTableText: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.accent,
  },
  pressed: {
    opacity: 0.7,
  },
  top3Row: {
    flexDirection: 'row',
    gap: 8,
  },
  top3Col: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  top3Name: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    color: colors.white,
    maxWidth: '100%',
  },
  top3Value: {
    fontFamily: typography.fontFamily,
    fontSize: 18,
    fontWeight: typography.fontWeight.semiBold,
    letterSpacing: -0.2,
  },
  position: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#1E1E1E',
    borderRadius: 14,
  },
  positionBadge: {
    fontFamily: typography.fontFamily,
    fontSize: 15,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.accent,
  },
  positionText: {
    flex: 1,
    fontFamily: typography.fontFamily,
    fontSize: 13,
    color: colors.white,
  },
  // Skeleton
  skeletonLine: {
    height: 12,
    borderRadius: 6,
    backgroundColor: '#2A2A2A',
  },
  skeletonAvatar: {
    borderRadius: 999,
    backgroundColor: '#2A2A2A',
  },
  skeletonPosition: {
    height: 40,
    borderRadius: 14,
    backgroundColor: '#1E1E1E',
  },
});
