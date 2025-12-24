import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LineChart } from 'react-native-chart-kit';
import { colors, typography, spacing, borderRadius } from '../theme/colors';
import { profileApi, UserWeight } from '../api/profile';

const SCREEN_WIDTH = Dimensions.get('window').width;

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

  const handleBack = () => {
    navigation.goBack();
  };

  const handleAddWeight = () => {
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
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Background Gradients */}
      <View style={styles.backgroundContainer}>
        <LinearGradient
          colors={['rgba(69, 255, 183, 0.4)', 'transparent']}
          style={styles.gradientTop}
        />
        <LinearGradient
          colors={['rgba(69, 255, 183, 0.4)', 'transparent']}
          style={styles.gradientBottom}
        />
      </View>

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name="chevron-back" size={24} color={colors.textDark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Historial de Peso</Text>
          <TouchableOpacity style={styles.addButton} onPress={handleAddWeight}>
            <Ionicons name="add" size={24} color={colors.textDark} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Stats Cards */}
          {stats && (
            <View style={styles.statsContainer}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Actual</Text>
                <Text style={styles.statValue}>
                  {stats.current ? `${stats.current} kg` : '-'}
                </Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Mínimo</Text>
                <Text style={styles.statValue}>
                  {stats.min ? `${stats.min} kg` : '-'}
                </Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Máximo</Text>
                <Text style={styles.statValue}>
                  {stats.max ? `${stats.max} kg` : '-'}
                </Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Cambio</Text>
                <Text
                  style={[
                    styles.statValue,
                    stats.change > 0 && styles.statPositive,
                    stats.change < 0 && styles.statNegative,
                  ]}
                >
                  {stats.change !== 0
                    ? `${stats.change > 0 ? '+' : ''}${stats.change} kg`
                    : '-'}
                </Text>
              </View>
            </View>
          )}

          {/* Chart */}
          {weights.length > 0 && (
            <View style={styles.chartContainer}>
              <Text style={styles.chartTitle}>Evolución</Text>
              <LineChart
                data={getChartData()}
                width={SCREEN_WIDTH - spacing.lg * 2}
                height={220}
                chartConfig={{
                  backgroundColor: colors.cardDark,
                  backgroundGradientFrom: colors.cardDark,
                  backgroundGradientTo: colors.cardDark,
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(69, 255, 183, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                  style: {
                    borderRadius: borderRadius.lg,
                  },
                  propsForDots: {
                    r: '6',
                    strokeWidth: '2',
                    stroke: colors.primary,
                  },
                }}
                bezier
                style={styles.chart}
              />
            </View>
          )}

          {/* History List */}
          <View style={styles.historyContainer}>
            <Text style={styles.historyTitle}>Registros</Text>
            {weights.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="scale-outline" size={48} color={colors.gray400} />
                <Text style={styles.emptyText}>Sin registros aún</Text>
                <Text style={styles.emptySubtext}>
                  Registra tu primer peso para empezar el seguimiento
                </Text>
              </View>
            ) : (
              weights.map((weight) => (
                <View key={weight.id} style={styles.historyItem}>
                  <View style={styles.historyLeft}>
                    <View style={styles.historyDot} />
                    <Text style={styles.historyDate}>{formatDate(weight.date)}</Text>
                  </View>
                  <Text style={styles.historyWeight}>{weight.weight} kg</Text>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgDark,
  },
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backgroundContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gradientTop: {
    position: 'absolute',
    top: 50,
    left: -150,
    width: 250,
    height: 250,
    borderRadius: 125,
  },
  gradientBottom: {
    position: 'absolute',
    bottom: 80,
    right: -150,
    width: 250,
    height: 250,
    borderRadius: 125,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
    textTransform: 'uppercase',
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.lg,
    marginHorizontal: -spacing.xs,
  },
  statCard: {
    width: '50%',
    padding: spacing.xs,
  },
  statCardInner: {
    backgroundColor: colors.cardDark,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  statLabel: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.medium,
    color: colors.gray400,
    marginBottom: spacing.xs,
  },
  statValue: {
    fontSize: typography.fontSize.xxl,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
  },
  statPositive: {
    color: colors.error,
  },
  statNegative: {
    color: colors.primary,
  },
  chartContainer: {
    marginTop: spacing.xl,
    backgroundColor: colors.cardDark,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  chartTitle: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.semibold,
    color: colors.white,
    marginBottom: spacing.md,
  },
  chart: {
    marginLeft: -spacing.md,
    borderRadius: borderRadius.lg,
  },
  historyContainer: {
    marginTop: spacing.xl,
    marginBottom: spacing.xxl,
  },
  historyTitle: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.semibold,
    color: colors.white,
    marginBottom: spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyText: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.semibold,
    color: colors.white,
    marginTop: spacing.md,
  },
  emptySubtext: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.regular,
    color: colors.gray400,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.cardDark,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  historyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginRight: spacing.sm,
  },
  historyDate: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.medium,
    color: colors.white,
  },
  historyWeight: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
  },
});
