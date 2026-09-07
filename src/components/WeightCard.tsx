import React from 'react';
import { View, Text, StyleSheet, Pressable, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { colors, typography } from '../theme/colors';
import type { UserWeight, WeightListResponse } from '../api/profile';

const BAR_HEIGHT = 62;
const BAR_MIN = 14;
const POINTS = 8;

interface WeightCardProps {
  weights: UserWeight[];
  stats: WeightListResponse['stats'] | null;
  onPress: () => void;
  /** Spacing belongs to whoever stacks the cards, not to the card. */
  style?: ViewStyle;
}

/**
 * The weight block from "09 · Progreso corporal", cut down to a home card.
 *
 * Same language as the full screen — a large current value with a small unit
 * over gradient columns — but eight points instead of ten and no per-bar
 * labels, because at this size the labels would collide and the card is a way
 * in, not the reading itself.
 */
export default function WeightCard({ weights, stats, onPress, style }: WeightCardProps) {
  const current = stats?.current;
  if (current == null) return null;

  // Oldest to newest, the same direction the history screen plots.
  const series = [...weights].reverse().slice(-POINTS);
  const values = series.map((w) => w.weight);
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 0;
  const span = max - min || 1;

  const change = stats?.change ?? 0;
  const hasChange = Math.abs(change) >= 0.1;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, style, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`Tu peso, ${current} kilos. Ver historial.`}
    >
      <View style={styles.head}>
        <View>
          <Text style={styles.title}>Tu peso</Text>
          <Text style={styles.subtitle}>
            {stats && stats.total_entries > 0
              ? `${stats.total_entries} ${stats.total_entries === 1 ? 'registro' : 'registros'}`
              : 'Sin registros todavía'}
          </Text>
        </View>
        <Feather name="chevron-right" size={20} color={colors.gray400} />
      </View>

      <View style={styles.valueRow}>
        <Text style={styles.value}>{current}</Text>
        <Text style={styles.unit}>kg</Text>

        {hasChange && (
          <View style={styles.change}>
            {/* Neither direction is good news on its own — the arrow states the
                direction and the colour stays neutral. */}
            <Feather
              name={change > 0 ? 'arrow-up-right' : 'arrow-down-right'}
              size={14}
              color={colors.gray400}
            />
            <Text style={styles.changeText}>{Math.abs(change).toFixed(1)} kg</Text>
          </View>
        )}
      </View>

      {series.length > 1 && (
        <View style={styles.chart}>
          {series.map((w) => {
            const ratio = (w.weight - min) / span;
            const height = BAR_MIN + ratio * (BAR_HEIGHT - BAR_MIN);
            return (
              <View key={w.id} style={styles.col}>
                <LinearGradient
                  colors={[colors.accent, colors.accentDeep]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={[styles.bar, { height }]}
                />
              </View>
            );
          })}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 16,
  },
  pressed: {
    opacity: 0.85,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  title: {
    fontFamily: typography.fontFamily,
    fontSize: 20,
    fontWeight: typography.fontWeight.semiBold,
    letterSpacing: -0.2,
    color: colors.ink,
  },
  subtitle: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    color: colors.gray400,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  value: {
    fontFamily: typography.fontFamily,
    fontSize: 36,
    letterSpacing: -0.36,
    color: colors.ink,
  },
  unit: {
    fontFamily: typography.fontFamily,
    fontSize: 20,
    color: colors.gray400,
    paddingBottom: 4,
  },
  change: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 'auto',
    paddingBottom: 6,
  },
  changeText: {
    fontFamily: typography.fontFamily,
    fontSize: 13,
    fontWeight: typography.fontWeight.medium,
    color: colors.gray400,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: BAR_HEIGHT,
    gap: 6,
  },
  col: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    borderRadius: 8,
  },
});
