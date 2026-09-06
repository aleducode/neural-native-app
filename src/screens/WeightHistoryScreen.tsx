import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { colors, typography, borderRadius } from '../theme/colors';
import { profileApi, UserWeight } from '../api/profile';
import Screen from '../components/ui/Screen';
import AppHeader from '../components/ui/AppHeader';
import Card from '../components/ui/Card';

const GUTTER = 16;

// Design node WRrFz ("09 · Progreso corporal") draws its "Comparison" chart as
// three columns whose bar height (79 / 123 / 161) encodes the value — no axis,
// no chart-kit, just a rounded column. The app has react-native-svg installed
// but no charting library and none gets added, so this is Views + the
// gradient the same node uses for its progress fills (accent -> accentDeep).
// The .pen buckets are "last month / last week / this week" (a body-score
// concept the weight API doesn't return); ours plots the same last-10 series
// the list below shows, so no number is invented.
const CHART_HEIGHT = 140;
const CHART_MIN_BAR = 28;
const CHART_RADIUS = borderRadius.xs; // 8, matches the node's cornerRadius exactly

function WeightChart({ weights }: { weights: UserWeight[] }) {
  // Reverse to show oldest to newest, same slice the list below already uses.
  const sortedWeights = [...weights].reverse().slice(-10);
  if (sortedWeights.length === 0) return null;

  const values = sortedWeights.map((w) => w.weight);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  return (
    <View style={styles.chartRow}>
      {sortedWeights.map((w) => {
        const ratio = (w.weight - min) / span;
        const barHeight = CHART_MIN_BAR + ratio * (CHART_HEIGHT - CHART_MIN_BAR);
        const date = new Date(w.date);
        const label = `${date.getDate()}/${date.getMonth() + 1}`;

        return (
          <View key={w.id} style={styles.chartCol}>
            <Text style={styles.chartValue} numberOfLines={1}>
              {w.weight}
            </Text>
            <View style={styles.chartTrack}>
              <LinearGradient
                colors={[colors.accent, colors.accentDeep]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={[styles.chartFill, { height: barHeight }]}
              />
            </View>
            <Text style={styles.chartLabel} numberOfLines={1}>
              {label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

export default function WeightHistoryScreen() {
  const navigation = useNavigation<any>();

  const [weights, setWeights] = useState<UserWeight[]>([]);
  const [stats, setStats] = useState<{
    current: number | null;
    min: number | null;
    max: number | null;
    total_entries: number;
    change: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const intro = useSharedValue(0);
  useEffect(() => {
    intro.value = withTiming(1, { duration: 460, easing: Easing.out(Easing.cubic) });
  }, []);

  const heroStyle = useAnimatedStyle(() => ({
    opacity: intro.value,
    transform: [{ translateY: (1 - intro.value) * 14 }],
  }));
  const bodyStyle = useAnimatedStyle(() => ({
    opacity: withDelay(90, withTiming(intro.value, { duration: 400 })),
    transform: [{ translateY: withDelay(90, withTiming((1 - intro.value) * 14, { duration: 400 })) }],
  }));

  useEffect(() => {
    fetchWeights();
  }, []);

  const fetchWeights = async () => {
    const { data } = await profileApi.getWeights();
    if (data) {
      setWeights(data.weights);
      setStats(data.stats);
    }
    setIsLoading(false);
  };

  const handleAddWeight = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('WeightInput');
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <Screen wash>
        <AppHeader title="Tu progreso" />
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.ink} />
        </View>
      </Screen>
    );
  }

  // Losing weight is the outcome this app treats as progress, so that direction
  // gets the brand accent. A gain is stated plainly rather than flagged red.
  const change = stats?.change ?? 0;
  const changeTint = change < 0 ? colors.accentDeep : colors.ink;

  return (
    <Screen wash>
      <AppHeader
        title="Tu progreso"
        action={{ icon: 'plus', label: 'Registrar peso', onPress: handleAddWeight }}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.hero, heroStyle]}>
          <Text style={styles.heroLabel}>PESO ACTUAL</Text>
          <View style={styles.heroValueRow}>
            <Text style={styles.heroValue}>{stats?.current ?? '-'}</Text>
            {!!stats?.current && <Text style={styles.heroUnit}>kg</Text>}
          </View>
          <Text style={styles.heroCaption}>
            {stats && stats.total_entries > 0
              ? `${stats.total_entries} ${
                  stats.total_entries === 1 ? 'registro' : 'registros'
                } en tu historial`
              : 'Todavía no registraste tu peso.'}
          </Text>
        </Animated.View>

        <Animated.View style={bodyStyle}>
          {/* Stats */}
          {stats && (
            <Card title="Resumen" subtitle="Mínimo, máximo y cambio acumulado" style={styles.card}>
              <View style={styles.statRow}>
                <View style={styles.stat}>
                  <Feather name="arrow-down" size={16} color={colors.gray400} />
                  <Text style={styles.statValue}>
                    {stats.min ? `${stats.min} kg` : '-'}
                  </Text>
                  <Text style={styles.statLabel}>Mínimo</Text>
                </View>
                <View style={styles.stat}>
                  <Feather name="arrow-up" size={16} color={colors.gray400} />
                  <Text style={styles.statValue}>
                    {stats.max ? `${stats.max} kg` : '-'}
                  </Text>
                  <Text style={styles.statLabel}>Máximo</Text>
                </View>
                <View style={styles.stat}>
                  <Feather
                    name={change < 0 ? 'trending-down' : change > 0 ? 'trending-up' : 'minus'}
                    size={16}
                    color={change === 0 ? colors.gray400 : changeTint}
                  />
                  <Text style={[styles.statValue, change !== 0 && { color: changeTint }]}>
                    {change !== 0 ? `${change > 0 ? '+' : ''}${change} kg` : '-'}
                  </Text>
                  <Text style={styles.statLabel}>Cambio</Text>
                </View>
              </View>
            </Card>
          )}

          {/* Chart */}
          {weights.length > 0 && (
            <Card title="Evolución" subtitle="Tus últimos 10 registros" style={styles.card}>
              <WeightChart weights={weights} />
            </Card>
          )}

          {/* History List */}
          <Card title="Registros" style={styles.card}>
            {weights.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <Feather name="bar-chart-2" size={22} color={colors.ink} />
                </View>
                <Text style={styles.emptyText}>Sin registros aún</Text>
                <Text style={styles.emptySubtext}>
                  Registra tu primer peso para empezar el seguimiento
                </Text>
              </View>
            ) : (
              <View>
                {weights.map((weight, index) => (
                  <View
                    key={weight.id}
                    style={[styles.historyItem, index === 0 && styles.historyItemFirst]}
                  >
                    <View style={styles.historyLeft}>
                      <View style={[styles.historyDot, index === 0 && styles.historyDotLatest]} />
                      <Text style={styles.historyDate}>{formatDate(weight.date)}</Text>
                    </View>
                    <Text style={styles.historyWeight}>{weight.weight} kg</Text>
                  </View>
                ))}
              </View>
            )}
          </Card>
        </Animated.View>

        {/* Clears the floating tab bar: brief-mandated 132 clearance. */}
        <View style={{ height: 132 }} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: GUTTER,
  },
  hero: {
    marginTop: 8,
    marginBottom: 24,
  },
  heroLabel: {
    fontFamily: typography.fontFamily,
    fontSize: 11,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: 1.2,
    color: colors.gray400,
    marginBottom: 6,
  },
  heroValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  heroValue: {
    // Design node WRrFz > Score > "87": fontSize 64, letterSpacing -0.64.
    fontFamily: typography.fontFamily,
    fontSize: 64,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: -0.64,
    color: colors.ink,
  },
  heroUnit: {
    // Design's "/100" companion text: fontSize 20, muted.
    fontFamily: typography.fontFamily,
    fontSize: 20,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.gray400,
  },
  heroCaption: {
    marginTop: 6,
    fontFamily: typography.fontFamily,
    fontSize: 12,
    // gray400 is 5.3:1 on the surface tone; the design's muted grey is 2.5:1.
    color: colors.gray400,
  },
  card: {
    marginBottom: 12,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stat: {
    flex: 1,
    gap: 6,
  },
  statValue: {
    // Matches the stat-value size used across WRrFz's own stat rows (24/600).
    fontFamily: typography.fontFamily,
    fontSize: 24,
    fontWeight: typography.fontWeight.bold,
    color: colors.ink,
  },
  statLabel: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    color: colors.gray400,
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  chartCol: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  chartValue: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.ink,
  },
  chartTrack: {
    width: '100%',
    height: CHART_HEIGHT,
    justifyContent: 'flex-end',
    borderRadius: CHART_RADIUS,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  chartFill: {
    width: '100%',
    borderRadius: CHART_RADIUS,
  },
  chartLabel: {
    fontFamily: typography.fontFamily,
    fontSize: 11,
    color: colors.gray400,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 6,
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  emptyText: {
    fontFamily: typography.fontFamily,
    fontSize: 17,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.ink,
  },
  emptySubtext: {
    fontFamily: typography.fontFamily,
    fontSize: 13,
    lineHeight: 18,
    color: colors.gray400,
    textAlign: 'center',
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.surface,
  },
  historyItemFirst: {
    borderTopWidth: 0,
    paddingTop: 0,
  },
  historyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  historyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.gray400,
  },
  historyDotLatest: {
    backgroundColor: colors.accentDeep,
    borderColor: colors.accentDeep,
  },
  historyDate: {
    fontFamily: typography.fontFamily,
    fontSize: 14,
    color: colors.gray400,
  },
  historyWeight: {
    fontFamily: typography.fontFamily,
    fontSize: 16,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.ink,
  },
});
