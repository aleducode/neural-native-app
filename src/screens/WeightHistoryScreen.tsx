import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  ScrollView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { LineChart } from 'react-native-chart-kit';
import { colors, typography, borderRadius } from '../theme/colors';
import { profileApi, UserWeight } from '../api/profile';
import Screen from '../components/ui/Screen';
import AppHeader from '../components/ui/AppHeader';
import Card from '../components/ui/Card';

const SCREEN_WIDTH = Dimensions.get('window').width;

const GUTTER = 16;
// The chart lives inside a card, so it has the card's padding to clear too.
const CHART_WIDTH = SCREEN_WIDTH - GUTTER * 2 - 32;

/**
 * chart-kit asks for `rgba(r, g, b, opacity)` factories, so the token has to be
 * unpacked rather than handed over as a hex string. This keeps the chart on the
 * palette instead of on a literal.
 */
function withAlpha(hex: string, opacity: number) {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
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

  const getChartData = () => {
    // Reverse to show oldest to newest
    const sortedWeights = [...weights].reverse().slice(-10);

    if (sortedWeights.length === 0) {
      return {
        labels: [''],
        datasets: [{ data: [0] }],
      };
    }

    const labels = sortedWeights.map((w) => {
      const date = new Date(w.date);
      return `${date.getDate()}/${date.getMonth() + 1}`;
    });

    const data = sortedWeights.map((w) => w.weight);

    return {
      labels,
      datasets: [{ data }],
    };
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
        <AppHeader title="Peso" />
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
        title="Peso"
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
              <LineChart
                data={getChartData()}
                width={CHART_WIDTH}
                height={220}
                chartConfig={{
                  backgroundColor: colors.white,
                  backgroundGradientFrom: colors.white,
                  backgroundGradientTo: colors.white,
                  decimalPlaces: 0,
                  color: (opacity = 1) => withAlpha(colors.accentDeep, opacity),
                  labelColor: (opacity = 1) => withAlpha(colors.gray400, opacity),
                  style: {
                    borderRadius: borderRadius.lg,
                  },
                  propsForBackgroundLines: {
                    stroke: colors.surface,
                    strokeWidth: 1,
                  },
                  propsForDots: {
                    r: '5',
                    strokeWidth: '2',
                    stroke: colors.white,
                    fill: colors.accentDeep,
                  },
                }}
                bezier
                withInnerLines
                withOuterLines={false}
                style={styles.chart}
              />
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

        {/* Clears the tab bar. */}
        <View style={{ height: 96 }} />
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
    fontFamily: typography.fontFamily,
    fontSize: 46,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: -1.6,
    color: colors.ink,
  },
  heroUnit: {
    fontFamily: typography.fontFamily,
    fontSize: 18,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.gray400,
  },
  heroCaption: {
    marginTop: 6,
    fontFamily: typography.fontFamily,
    fontSize: 13,
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
    fontFamily: typography.fontFamily,
    fontSize: 20,
    fontWeight: typography.fontWeight.bold,
    color: colors.ink,
  },
  statLabel: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    color: colors.gray400,
  },
  chart: {
    marginLeft: -16,
    borderRadius: borderRadius.lg,
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
