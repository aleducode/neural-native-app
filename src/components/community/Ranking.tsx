import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, typography } from '../../theme/colors';
import Screen from '../ui/Screen';
import { METRICS, Metric, RankedMember, rankBy, valueOf } from '../../services/leaderboard';
import LeaderboardAvatar from './LeaderboardAvatar';

interface RankingProps {
  /** Unsorted roster — re-sorted locally by whichever metric chip is active. */
  members: RankedMember[];
  loading: boolean;
  currentUserId?: number;
  onBack: () => void;
  onSelectUser: (userId: number) => void;
}

const BASE_HEIGHT = [84, 56, 40] as const;

/**
 * The full weekly table: metric chips, a scope notice, a 3-up podium and the
 * rest of the roster as rows.
 *
 * This is not a navigator route — the strip toggles it in from local state in
 * `CommunityScreen`, so it can't reuse `AppHeader`'s back control (that calls
 * `navigation.goBack`, which would leave this overlay and pop the real stack
 * instead of just closing the table). The header below matches AppHeader's
 * look but wires back to `onBack`.
 */
export default function Ranking({ members, loading, currentUserId, onBack, onSelectUser }: RankingProps) {
  const [metric, setMetric] = useState<Metric>('trainings');
  const ranked = useMemo(() => rankBy(members, metric), [members, metric]);
  const unit = METRICS.find((m) => m.key === metric)?.unit ?? '';

  const podium = ranked.slice(0, 3).map((member, i) => ({ member, place: i + 1 }));
  const podiumOrder = [podium[1], podium[0], podium[2]].filter(
    (entry): entry is { member: RankedMember; place: number } => !!entry
  );
  const rest = ranked.slice(3);

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable
          onPress={onBack}
          style={({ pressed }) => [styles.headerControl, pressed && styles.pressed]}
          hitSlop={14}
          accessibilityRole="button"
          accessibilityLabel="Volver"
        >
          <Feather name="arrow-left" size={24} color={colors.ink} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Tabla de la semana
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.flex} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.chips}>
          {METRICS.map((m) => {
            const active = m.key === metric;
            return (
              <Pressable
                key={m.key}
                onPress={() => setMetric(m.key)}
                style={({ pressed }) => [
                  styles.chip,
                  active ? styles.chipActive : styles.chipInactive,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text style={[styles.chipText, active ? styles.chipTextActive : styles.chipTextInactive]}>
                  {m.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.scopeNotice}>
          <Feather name="users" size={16} color={colors.ink} />
          <Text style={styles.scopeText}>Entre quienes participan en la comunidad</Text>
        </View>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={colors.ink} />
          </View>
        ) : ranked.length === 0 ? (
          <Text style={styles.emptyText}>Todavía no hay datos suficientes para armar la tabla.</Text>
        ) : (
          <>
            <View style={styles.podiumCard}>
              <View style={styles.podiumRow}>
                {podiumOrder.map(({ member, place }) => {
                  const avatarSize = place === 1 ? 64 : 56;
                  const baseHeight = BASE_HEIGHT[place - 1];
                  const isFirst = place === 1;
                  return (
                    <Pressable
                      key={member.id}
                      style={styles.podiumCol}
                      onPress={() => onSelectUser(member.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`Ver el perfil de ${member.name}`}
                    >
                      <LeaderboardAvatar
                        photoUrl={member.photoUrl}
                        initials={member.initials}
                        size={avatarSize}
                      />
                      <Text style={styles.podiumValue}>{valueOf(member, metric)}</Text>
                      <View style={[styles.podiumBase, { height: baseHeight }]}>
                        <Text
                          style={[
                            styles.podiumRank,
                            isFirst && styles.podiumRankFirst,
                          ]}
                        >
                          {place}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.rows}>
              {rest.map((member, idx) => {
                const rank = idx + 4;
                const isMe = currentUserId != null && member.id === currentUserId;
                return (
                  <Pressable
                    key={member.id}
                    style={({ pressed }) => [
                      styles.row,
                      isMe && styles.rowMe,
                      pressed && styles.pressed,
                    ]}
                    onPress={() => onSelectUser(member.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`Ver el perfil de ${member.name}`}
                  >
                    <Text style={[styles.rowRank, isMe && styles.rowAccentText]}>{rank}</Text>
                    <LeaderboardAvatar photoUrl={member.photoUrl} initials={member.initials} size={40} />
                    <Text style={[styles.rowName, isMe && styles.rowNameMe]} numberOfLines={1}>
                      {member.name}
                    </Text>
                    <View style={styles.rowValueBlock}>
                      <Text style={[styles.rowValue, isMe && styles.rowAccentText]}>
                        {valueOf(member, metric)}
                      </Text>
                      {/*
                       * gray400 is only proven at 5.3:1 on white (BRIEF rule 2).
                       * On the "me" row's ink background it falls to ~3.9:1, so
                       * it swaps for #8A8A8A — the muted tone the design itself
                       * already uses on ink elsewhere (the strip's "ESTA
                       * SEMANA" eyebrow), which clears AA there.
                       */}
                      <Text style={[styles.rowUnit, isMe && styles.rowUnitMe]}>{unit}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    height: 52,
  },
  headerControl: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSpacer: {
    width: 24,
  },
  pressed: {
    opacity: 0.7,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: typography.fontFamily,
    fontSize: 20,
    fontWeight: typography.fontWeight.semiBold,
    letterSpacing: -0.2,
    color: colors.ink,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 132,
    gap: 16,
  },
  chips: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    minWidth: 86,
    maxWidth: 110,
    height: 30,
    borderRadius: 32,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: colors.ink,
  },
  chipInactive: {
    backgroundColor: colors.white,
  },
  chipText: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    fontWeight: typography.fontWeight.semiBold,
  },
  chipTextActive: {
    color: colors.white,
  },
  chipTextInactive: {
    color: '#555555',
  },
  scopeNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.accentSoft,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  scopeText: {
    flex: 1,
    fontFamily: typography.fontFamily,
    fontSize: 12,
    color: colors.ink,
  },
  loading: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: typography.fontFamily,
    fontSize: 14,
    color: colors.gray400,
    textAlign: 'center',
    paddingVertical: 24,
  },
  podiumCard: {
    backgroundColor: colors.ink,
    borderRadius: 20,
    padding: 16,
    height: 232,
  },
  podiumRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  podiumCol: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  podiumValue: {
    fontFamily: typography.fontFamily,
    fontSize: 20,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.white,
  },
  podiumBase: {
    width: '100%',
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  podiumRank: {
    fontFamily: typography.fontFamily,
    fontSize: 24,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.white,
  },
  podiumRankFirst: {
    fontSize: 28,
    color: colors.accent,
  },
  rows: {
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  rowMe: {
    backgroundColor: colors.ink,
  },
  rowRank: {
    width: 24,
    textAlign: 'center',
    fontFamily: typography.fontFamily,
    fontSize: 16,
    fontWeight: typography.fontWeight.semiBold,
    color: '#8A8A8A',
  },
  rowAccentText: {
    color: colors.accent,
  },
  rowName: {
    flex: 1,
    fontFamily: typography.fontFamily,
    fontSize: 15,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.ink,
  },
  rowNameMe: {
    color: colors.white,
  },
  rowValueBlock: {
    alignItems: 'flex-end',
  },
  rowValue: {
    fontFamily: typography.fontFamily,
    fontSize: 20,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.ink,
  },
  rowUnit: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    color: colors.gray400,
  },
  rowUnitMe: {
    color: '#8A8A8A',
  },
});
