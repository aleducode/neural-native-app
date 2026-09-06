import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import Screen from '../components/ui/Screen';
import AppHeader from '../components/ui/AppHeader';
import Card from '../components/ui/Card';
import PrimaryButton from '../components/ui/PrimaryButton';
import { colors, typography } from '../theme/colors';
import { membershipApi, MembershipResponse, NeuralPlan } from '../api/membership';

/** What `createPayment` hands back: reference, amount and Bold's checkout credentials. */
type PaymentReference = NonNullable<
  Awaited<ReturnType<typeof membershipApi.createPayment>>['data']
>;

const BENEFITS = [
  'Entrenos funcionales adaptados a tu progreso.',
  'Seguimiento de tu rendimiento y estadísticas.',
  'Acceso a todas las clases y horarios disponibles.',
  'Planes que se ajustan a tus objetivos.',
];

function formatPrice(price: number, currency = 'COP') {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(price);
}

function getPlanDisplayName(plan: NeuralPlan) {
  if (plan.slug_name === 'mensualidad' || plan.duration <= 31) {
    return 'Plan Mensual';
  } else if (plan.slug_name === 'trimestre' || plan.duration <= 92) {
    return 'Plan Trimestral';
  } else if (plan.slug_name === 'semestre' || plan.duration <= 183) {
    return 'Plan Semestral';
  }
  return plan.name;
}

interface PlanCardProps {
  plan: NeuralPlan;
  isSelected: boolean;
  onPress: () => void;
}

/** A plan reads as a row you can tick, not as a card that happens to be tappable. */
function PlanCard({ plan, isSelected, onPress }: PlanCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.plan,
        isSelected && styles.planOn,
        pressed && styles.pressed,
      ]}
      accessibilityRole="radio"
      accessibilityState={{ selected: isSelected }}
      accessibilityLabel={`${getPlanDisplayName(plan)}, ${formatPrice(plan.price)}, ${plan.duration} días`}
    >
      <View style={styles.planText}>
        <Text style={styles.planTitle}>{getPlanDisplayName(plan)}</Text>
        {!!plan.description && (
          <Text style={styles.planDesc} numberOfLines={1}>
            {plan.description}
          </Text>
        )}
        <Text style={styles.planPrice}>{formatPrice(plan.price)}</Text>
        <Text style={styles.planPeriod}>{plan.duration} días</Text>
      </View>

      <View style={[styles.tick, isSelected && styles.tickOn]}>
        {isSelected && <Feather name="check" size={16} color={colors.white} />}
      </View>
    </Pressable>
  );
}

export default function MembershipScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const [membershipData, setMembershipData] = useState<MembershipResponse | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<NeuralPlan | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Payment: the reference lives here until the Bold checkout exists to consume it.
  const [isCreatingPayment, setIsCreatingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [pendingPayment, setPendingPayment] = useState<PaymentReference | null>(null);

  const intro = useSharedValue(0);
  useEffect(() => {
    intro.value = withTiming(1, { duration: 460, easing: Easing.out(Easing.cubic) });
  }, []);

  const headerStyle = useAnimatedStyle(() => ({
    opacity: intro.value,
    transform: [{ translateY: (1 - intro.value) * 14 }],
  }));
  const bodyStyle = useAnimatedStyle(() => ({
    opacity: withDelay(90, withTiming(intro.value, { duration: 400 })),
    transform: [
      { translateY: withDelay(90, withTiming((1 - intro.value) * 14, { duration: 400 })) },
    ],
  }));

  useEffect(() => {
    fetchMembership();
  }, []);

  const fetchMembership = async () => {
    setIsLoading(true);
    setLoadError(null);
    const { data, error } = await membershipApi.getMembership();
    if (data) {
      setMembershipData(data);
      // Pre-select first plan if no current membership
      if (!data.current_membership && data.available_plans.length > 0) {
        setSelectedPlan(data.available_plans[0]);
      }
    } else {
      setLoadError(error || 'No pudimos cargar tu membresía.');
    }
    setIsLoading(false);
  };

  const handleSelectPlan = (plan: NeuralPlan) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedPlan(plan);
    // A new plan invalidates any reference already created for the old one.
    setPendingPayment(null);
    setPaymentError(null);
  };

  /**
   * Ask the backend for a payment reference for the selected plan.
   *
   * This is as far as the app can take the user today: the reference, the
   * amount, the integrity signature and Bold's public key all come back here
   * and there is nothing yet to hand them to.
   */
  const handleSubscribe = async () => {
    if (!selectedPlan || isCreatingPayment) return;

    setPaymentError(null);
    setIsCreatingPayment(true);
    const { data, error } = await membershipApi.createPayment(selectedPlan.id);
    setIsCreatingPayment(false);

    if (!data) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setPaymentError(error || 'No pudimos iniciar el pago. Intenta de nuevo.');
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setPendingPayment(data);

    // TODO(pago-bold): the checkout step is missing, and it needs the Bold SDK.
    // Everything it consumes is already in `data`:
    //   - data.bold_public_key      -> initialises the checkout
    //   - data.reference            -> orderId, both for Bold and for verifyPayment
    //   - data.amount, data.currency
    //   - data.integrity_signature  -> signs the order server-side
    // What has to be built:
    //   1. Add the Bold checkout SDK (native module or WebView on the hosted
    //      checkout URL) — a new dependency and a native rebuild.
    //   2. Open it with the five fields above and wait for its callback.
    //   3. Call membershipApi.verifyPayment(data.reference, txStatus) with the
    //      tx_status Bold returns ('approved' | 'rejected' | 'failed' | ...).
    //   4. On { success: true }, refetch with fetchMembership() so the active
    //      membership card replaces the plan list, and surface the returned
    //      message on failure.
    //   5. Handle the user closing the checkout without paying: the reference
    //      stays open, so it should be verified or discarded on the next visit.
    // Until then the screen tells the user the reference exists and stops.
  };

  const currentMembership = membershipData?.current_membership;
  const currentPlanName = currentMembership?.plan?.name || 'Neural';
  const plans = membershipData?.available_plans ?? [];
  const canSubscribe = !currentMembership;

  if (isLoading) {
    return (
      <Screen tone="surface" wash>
        <AppHeader title="Membresía" />
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.ink} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen tone="surface" wash>
      <AppHeader title="Membresía" />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.hero, headerStyle]}>
          <Text style={styles.heroLabel}>
            {currentMembership ? 'MEMBRESÍA ACTIVA' : 'TU PLAN'}
          </Text>
          <Text style={styles.heroTitle}>
            {currentMembership ? currentPlanName : 'Elige tu plan.'}
          </Text>
          {!currentMembership && (
            <Text style={styles.heroSubtitle}>
              Accede a entrenos personalizados y seguimiento de tu progreso.
            </Text>
          )}
        </Animated.View>

        <Animated.View style={[styles.body, bodyStyle]}>
          {!!loadError && (
            <Card>
              <Text style={styles.errorText}>{loadError}</Text>
              <PrimaryButton label="Reintentar" variant="secondary" onPress={fetchMembership} />
            </Card>
          )}

          {currentMembership && (
            <Card>
              {/* check-circle stands in for the design's "badge-check", which Feather doesn't have. */}
              <View style={styles.daysRow}>
                <Feather name="check-circle" size={16} color={colors.accentDeep} />
                <Text style={styles.daysLabel}>
                  {currentMembership.days_left}{' '}
                  {currentMembership.days_left === 1 ? 'día restante' : 'días restantes'}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Feather name="calendar" size={16} color={colors.gray400} />
                <Text style={styles.detailText}>
                  Vence:{' '}
                  {new Date(currentMembership.expiration_date).toLocaleDateString('es-CO', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </Text>
              </View>
            </Card>
          )}

          <Card title="Qué incluye" subtitle="Tu membresía Neural">
            <View style={styles.benefits}>
              {BENEFITS.map((benefit) => (
                <View key={benefit} style={styles.benefit}>
                  <Feather name="check-circle" size={18} color={colors.accentDeep} />
                  <Text style={styles.benefitText}>{benefit}</Text>
                </View>
              ))}
            </View>
          </Card>

          {canSubscribe && plans.length > 0 && (
            <View style={styles.plans} accessibilityRole="radiogroup">
              {plans.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  isSelected={selectedPlan?.id === plan.id}
                  onPress={() => handleSelectPlan(plan)}
                />
              ))}
            </View>
          )}

          {!!pendingPayment && (
            <Card title="Referencia generada">
              <Text style={styles.pendingText}>
                Reservamos tu pago de{' '}
                {formatPrice(pendingPayment.amount, pendingPayment.currency)} para el{' '}
                {getPlanDisplayName(pendingPayment.plan)}. Todavía no podemos abrir el checkout
                desde la app, así que el cobro queda pendiente.
              </Text>
              <Text style={styles.pendingRef}>Referencia: {pendingPayment.reference}</Text>
              <PrimaryButton
                label="Entendido"
                variant="secondary"
                onPress={() => setPendingPayment(null)}
              />
            </Card>
          )}
        </Animated.View>
      </ScrollView>

      {canSubscribe && (
        <View style={styles.footer}>
          {!!paymentError && (
            <Text style={styles.footerError} accessibilityLiveRegion="polite">
              {paymentError}
            </Text>
          )}
          <PrimaryButton
            label="Suscribirse"
            onPress={handleSubscribe}
            loading={isCreatingPayment}
            disabled={!selectedPlan}
          />
        </View>
      )}
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
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  hero: {
    marginTop: 8,
    marginBottom: 24,
    gap: 8,
  },
  heroLabel: {
    fontFamily: typography.fontFamily,
    fontSize: 11,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: 1.2,
    color: colors.gray400,
  },
  heroTitle: {
    fontFamily: typography.fontFamily,
    fontSize: 34,
    fontWeight: typography.fontWeight.bold,
    lineHeight: 40,
    letterSpacing: -1,
    color: colors.ink,
  },
  heroSubtitle: {
    fontFamily: typography.fontFamily,
    fontSize: 14,
    lineHeight: 20,
    color: colors.gray400,
  },
  body: {
    gap: 12,
  },
  errorText: {
    fontFamily: typography.fontFamily,
    fontSize: 14,
    lineHeight: 20,
    color: colors.error,
  },
  daysRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  daysLabel: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    color: colors.ink,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontFamily: typography.fontFamily,
    fontSize: 14,
    color: colors.gray400,
  },
  benefits: {
    gap: 12,
  },
  benefit: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  benefitText: {
    flex: 1,
    fontFamily: typography.fontFamily,
    fontSize: 14,
    lineHeight: 20,
    color: colors.ink,
  },
  plans: {
    gap: 8,
  },
  plan: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: colors.white,
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: colors.white,
  },
  planOn: {
    borderColor: colors.ink,
  },
  pressed: {
    opacity: 0.85,
  },
  planText: {
    flex: 1,
    gap: 4,
  },
  planTitle: {
    fontFamily: typography.fontFamily,
    fontSize: 20,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.ink,
  },
  planDesc: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    color: colors.gray400,
  },
  planPrice: {
    fontFamily: typography.fontFamily,
    fontSize: 16,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.ink,
  },
  planPeriod: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    color: colors.gray400,
  },
  tick: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tickOn: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  pendingText: {
    fontFamily: typography.fontFamily,
    fontSize: 14,
    lineHeight: 20,
    color: colors.ink,
  },
  pendingRef: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    color: colors.gray400,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    gap: 10,
    backgroundColor: colors.surface,
  },
  footerError: {
    fontFamily: typography.fontFamily,
    fontSize: 13,
    lineHeight: 18,
    color: colors.error,
    textAlign: 'center',
  },
});
