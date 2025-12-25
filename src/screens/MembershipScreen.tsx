import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, typography, spacing, borderRadius } from '../theme/colors';
import { membershipApi, MembershipResponse, NeuralPlan } from '../api/membership';

interface BenefitItemProps {
  text: string;
}

function BenefitItem({ text }: BenefitItemProps) {
  return (
    <View style={styles.benefitItem}>
      <View style={styles.benefitIconContainer}>
        <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
      </View>
      <Text style={styles.benefitText}>{text}</Text>
    </View>
  );
}

interface PlanCardProps {
  title: string;
  price: number;
  isSelected: boolean;
  onPress: () => void;
}

function PlanCard({ title, price, isSelected, onPress }: PlanCardProps) {
  const formattedPrice = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(price);

  return (
    <TouchableOpacity
      style={[styles.planCard, isSelected && styles.planCardSelected]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {isSelected && (
        <View style={styles.selectedBadge}>
          <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
        </View>
      )}
      <Text style={styles.planTitle}>{title}</Text>
      <Text style={styles.planPrice}>{formattedPrice}</Text>
      <Text style={styles.planPeriod}>mensual</Text>
    </TouchableOpacity>
  );
}

export default function MembershipScreen() {
  const navigation = useNavigation();
  const [isLoading, setIsLoading] = useState(true);
  const [membershipData, setMembershipData] = useState<MembershipResponse | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<NeuralPlan | null>(null);

  useEffect(() => {
    fetchMembership();
  }, []);

  const fetchMembership = async () => {
    setIsLoading(true);
    const { data, error } = await membershipApi.getMembership();
    if (data) {
      setMembershipData(data);
      // Pre-select first plan if no current membership
      if (!data.current_membership && data.available_plans.length > 0) {
        setSelectedPlan(data.available_plans[0]);
      }
    }
    setIsLoading(false);
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const getPlanDisplayName = (plan: NeuralPlan) => {
    if (plan.slug_name === 'mensualidad' || plan.duration <= 31) {
      return 'Plan Mensual';
    } else if (plan.slug_name === 'trimestre' || plan.duration <= 92) {
      return 'Plan Trimestral';
    } else if (plan.slug_name === 'semestre' || plan.duration <= 183) {
      return 'Plan Semestral';
    }
    return plan.name;
  };

  const currentMembership = membershipData?.current_membership;
  const currentPlanName = currentMembership?.plan?.name || 'Neural';

  const benefits = [
    'Entrenos funcionales adaptados a tu progreso.',
    'Seguimiento de tu rendimiento y estadísticas.',
    'Acceso a todas las clases y horarios disponibles.',
    'Planes que se ajustan a tus objetivos.',
  ];

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
      {/* Subtle Background Gradients */}
      <View style={styles.backgroundContainer}>
        <LinearGradient
          colors={['rgba(90, 107, 255, 0.15)', 'transparent']}
          style={styles.gradientTop}
        />
        <LinearGradient
          colors={['rgba(90, 107, 255, 0.15)', 'transparent']}
          style={styles.gradientBottom}
        />
      </View>

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name="chevron-back" size={24} color={colors.textDark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Membresía</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Current Membership Info */}
          {currentMembership ? (
            <View style={styles.currentMembershipCard}>
              <View style={styles.membershipHeader}>
                <Ionicons name="checkmark-circle" size={32} color={colors.primary} />
                <Text style={styles.membershipTitle}>Membresía Activa</Text>
              </View>
              <Text style={styles.planName}>{currentPlanName}</Text>
              <View style={styles.membershipDetails}>
                <View style={styles.detailRow}>
                  <Ionicons name="calendar-outline" size={18} color={colors.gray400} />
                  <Text style={styles.detailText}>
                    Vence: {new Date(currentMembership.expiration_date).toLocaleDateString('es-CO', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </Text>
                </View>
                <View style={styles.daysLeftContainer}>
                  <Text style={styles.daysLeftValue}>{currentMembership.days_left}</Text>
                  <Text style={styles.daysLeftLabel}>días restantes</Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.welcomeSection}>
              <Text style={styles.welcomeTitle}>Elige tu plan</Text>
              <Text style={styles.welcomeSubtitle}>
                Accede a entrenos personalizados y seguimiento de tu progreso
              </Text>
            </View>
          )}

          {/* Benefits Container */}
          <View style={styles.benefitsContainer}>
            {benefits.map((benefit, index) => (
              <BenefitItem key={index} text={benefit} />
            ))}
          </View>

          {/* Plan Cards */}
          {!currentMembership && membershipData?.available_plans && (
            <View style={styles.plansContainer}>
              {membershipData.available_plans.map((plan) => (
                <PlanCard
                  key={plan.id}
                  title={getPlanDisplayName(plan)}
                  price={plan.price}
                  isSelected={selectedPlan?.id === plan.id}
                  onPress={() => setSelectedPlan(plan)}
                />
              ))}
            </View>
          )}

          {/* Bottom Spacer */}
          <View style={styles.bottomSpacer} />
        </ScrollView>

        {/* Bottom Button */}
        {!currentMembership && (
          <View style={styles.bottomButtonContainer}>
            <TouchableOpacity
              style={[styles.subscribeButton, !selectedPlan && styles.subscribeButtonDisabled]}
              disabled={!selectedPlan}
              activeOpacity={0.8}
            >
              <Text style={styles.subscribeButtonText}>
                Suscribirse
              </Text>
            </TouchableOpacity>
          </View>
        )}
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
    top: 0,
    left: 0,
    right: 0,
    height: 300,
  },
  gradientBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 300,
    transform: [{ rotate: '180deg' }],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.lg,
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  headerTitle: {
    flex: 1,
    fontSize: typography.fontSize.xxl,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
  },
  headerSpacer: {
    width: 48,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.lg,
  },
  welcomeSection: {
    marginBottom: spacing.xxl,
    alignItems: 'center',
  },
  welcomeTitle: {
    fontSize: typography.fontSize.xxl,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.regular,
    color: colors.gray400,
    textAlign: 'center',
    lineHeight: typography.lineHeight.md,
  },
  currentMembershipCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xxl,
    padding: spacing.xxl,
    marginBottom: spacing.xxl,
  },
  membershipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  membershipTitle: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.bold,
    color: colors.textDark,
  },
  planName: {
    fontSize: typography.fontSize.xxxl,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.bold,
    color: colors.textDark,
    marginBottom: spacing.lg,
  },
  membershipDetails: {
    gap: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  detailText: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.regular,
    color: colors.gray400,
  },
  daysLeftContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  daysLeftValue: {
    fontSize: typography.fontSize.xxxl,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
  },
  daysLeftLabel: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.regular,
    color: colors.gray400,
  },
  benefitsContainer: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xxl,
    padding: spacing.xxl,
    gap: spacing.lg,
    marginBottom: spacing.xxl,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  benefitIconContainer: {
    marginTop: 2,
  },
  benefitText: {
    flex: 1,
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.regular,
    color: colors.textDark,
    lineHeight: typography.lineHeight.md,
  },
  plansContainer: {
    gap: spacing.lg,
    marginBottom: spacing.xl,
  },
  planCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xxl,
    padding: spacing.xxl,
    position: 'relative',
  },
  planCardSelected: {
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.gray200,
  },
  selectedBadge: {
    position: 'absolute',
    top: spacing.lg,
    right: spacing.lg,
  },
  planTitle: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.bold,
    color: colors.textDark,
    marginBottom: spacing.md,
  },
  planPrice: {
    fontSize: typography.fontSize.xxxl,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.bold,
    color: colors.textDark,
    marginBottom: spacing.xs,
  },
  planPeriod: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.regular,
    color: colors.gray400,
  },
  bottomButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.xxl,
    paddingTop: spacing.lg,
    backgroundColor: colors.bgDark,
  },
  subscribeButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subscribeButtonDisabled: {
    opacity: 0.5,
  },
  subscribeButtonText: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.textDark,
  },
  bottomSpacer: {
    height: 120,
  },
});
