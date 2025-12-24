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
      <View style={styles.benefitIcon}>
        <Ionicons name="checkmark" size={16} color={colors.textDark} />
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
      activeOpacity={0.8}
    >
      <Text style={styles.planTitle}>{title}</Text>
      <Text style={styles.planPrice}>{formattedPrice}</Text>
      {isSelected && (
        <View style={styles.selectedIndicator}>
          <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
        </View>
      )}
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
            <View style={styles.currentMembershipContainer}>
              <Text style={styles.mainTitle}>
                Tu membresía {currentPlanName}
              </Text>
              <View style={styles.membershipStatus}>
                <Text style={styles.membershipStatusText}>
                  Activa hasta: {new Date(currentMembership.expiration_date).toLocaleDateString('es-CO', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </Text>
                <Text style={styles.daysLeftText}>
                  {currentMembership.days_left} días restantes
                </Text>
              </View>
            </View>
          ) : (
            <Text style={styles.mainTitle}>
              ¡Obtén la experiencia completa de tu plan {currentPlanName}!
            </Text>
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
          <View style={{ height: 120 }} />
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
    fontSize: typography.fontSize.title1,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
    textTransform: 'uppercase',
  },
  headerSpacer: {
    width: 48,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
  },
  currentMembershipContainer: {
    marginBottom: spacing.xl,
  },
  mainTitle: {
    fontSize: typography.fontSize.title1,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
    textAlign: 'center',
    textTransform: 'uppercase',
    marginBottom: spacing.xl,
    lineHeight: 34,
  },
  membershipStatus: {
    backgroundColor: 'rgba(69, 255, 183, 0.2)',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
  },
  membershipStatusText: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.medium,
    color: colors.white,
    marginBottom: spacing.sm,
  },
  daysLeftText: {
    fontSize: typography.fontSize.xxl,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
  },
  benefitsContainer: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    gap: spacing.lg,
    marginBottom: spacing.xl,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  benefitIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.textDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitText: {
    flex: 1,
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.medium,
    color: colors.textDark,
    lineHeight: 22,
  },
  plansContainer: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  planCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  planCardSelected: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  planTitle: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.medium,
    color: colors.textDark,
  },
  planPrice: {
    fontSize: typography.fontSize.xxl,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.bold,
    color: colors.textDark,
    textTransform: 'uppercase',
  },
  selectedIndicator: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
  },
  bottomButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    paddingTop: spacing.lg,
  },
  subscribeButton: {
    backgroundColor: colors.primary,
    borderRadius: 1000,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subscribeButtonDisabled: {
    opacity: 0.5,
  },
  subscribeButtonText: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.semibold,
    color: colors.textDark,
    textTransform: 'uppercase',
  },
});
