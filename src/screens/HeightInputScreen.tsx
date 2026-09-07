import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  AccessibilityActionEvent,
  AccessibilityActionInfo,
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
import { colors, typography } from '../theme/colors';
import { profileApi } from '../api/profile';
import Screen from '../components/ui/Screen';
import AppHeader from '../components/ui/AppHeader';
import PrimaryButton from '../components/ui/PrimaryButton';

const MIN_HEIGHT = 100;
const MAX_HEIGHT = 250;
const TICK_WIDTH = 10;
const SCREEN_WIDTH = Dimensions.get('window').width;

// Half a tick less than half the screen, so the pointer lands on the tick it
// selects rather than on the gap before it.
const RULER_PADDING = SCREEN_WIDTH / 2 - TICK_WIDTH / 2;

const ADJUSTABLE_ACTIONS: AccessibilityActionInfo[] = [
  { name: 'increment' },
  { name: 'decrement' },
];

export default function HeightInputScreen() {
  const navigation = useNavigation();
  const scrollViewRef = useRef<ScrollView>(null);

  const [selectedHeight, setSelectedHeight] = useState(170);
  const [previousHeight, setPreviousHeight] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const lastHapticValue = useRef(170);

  const heights = Array.from(
    { length: MAX_HEIGHT - MIN_HEIGHT + 1 },
    (_, i) => MIN_HEIGHT + i
  );

  const intro = useSharedValue(0);
  useEffect(() => {
    intro.value = withTiming(1, { duration: 460, easing: Easing.out(Easing.cubic) });
  }, []);

  const headerStyle = useAnimatedStyle(() => ({
    opacity: intro.value,
    transform: [{ translateY: (1 - intro.value) * 16 }],
  }));
  const valueStyle = useAnimatedStyle(() => ({
    opacity: withDelay(90, withTiming(intro.value, { duration: 400 })),
    transform: [{ translateY: withDelay(90, withTiming((1 - intro.value) * 16, { duration: 400 })) }],
  }));
  const footerStyle = useAnimatedStyle(() => ({
    opacity: withDelay(170, withTiming(intro.value, { duration: 400 })),
  }));

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const { data } = await profileApi.getProfile();
    if (data?.profile.height) {
      setSelectedHeight(data.profile.height);
      setPreviousHeight(data.profile.height);
      lastHapticValue.current = data.profile.height;
      // Scroll to current height after layout
      setTimeout(() => {
        const offset = (data.profile.height! - MIN_HEIGHT) * TICK_WIDTH;
        scrollViewRef.current?.scrollTo({ x: offset, animated: false });
      }, 100);
    } else {
      // Default to 170
      setTimeout(() => {
        const offset = (170 - MIN_HEIGHT) * TICK_WIDTH;
        scrollViewRef.current?.scrollTo({ x: offset, animated: false });
      }, 100);
    }
    setIsLoading(false);
  };

  const handleSave = async () => {
    setSaveError(null);
    setIsSaving(true);
    const { data, error } = await profileApi.updateProfile({ height: selectedHeight });
    setIsSaving(false);

    if (data) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSaved(true);
      setPreviousHeight(selectedHeight);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setSaveError(error || 'No se pudo guardar la altura');
    }
  };

  const handleSuccessClose = () => {
    setSaved(false);
    navigation.goBack();
  };

  const scrollToHeight = (value: number, animated: boolean) => {
    const offset = (value - MIN_HEIGHT) * TICK_WIDTH;
    scrollViewRef.current?.scrollTo({ x: offset, animated });
  };

  // Ruler drag is the primary input, but a screen reader user never drags a
  // horizontal list reliably — the "adjustable" role exposes swipe up/down as
  // a real increment/decrement instead.
  const stepHeight = (delta: number) => {
    const next = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, selectedHeight + delta));
    setSelectedHeight(next);
    setSaved(false);
    setSaveError(null);
    Haptics.selectionAsync();
    scrollToHeight(next, true);
  };

  const handleAccessibilityAction = (event: AccessibilityActionEvent) => {
    if (event.nativeEvent.actionName === 'increment') stepHeight(1);
    else if (event.nativeEvent.actionName === 'decrement') stepHeight(-1);
  };

  // The ruler is static: nothing in it depends on the selected value.
  // Rebuilding its ticks on every scroll frame was reconciling every
  // one of them at 60fps, which is what made the ruler stick.
  const ticks = useMemo(
    () => (
      <>
        {heights.map((height) => {
        const isMajor = height % 10 === 0;
        const isMid = height % 5 === 0 && !isMajor;
         return (
          <View key={height} style={styles.tickContainer}>
            <View
              style={[styles.tick, isMid && styles.tickMid, isMajor && styles.tickMajor]}
            />
          </View>
        );
      })}
      </>
    ),
    [heights]
  );

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const value = Math.round(offsetX / TICK_WIDTH) + MIN_HEIGHT;
    const clampedValue = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, value));

    if (clampedValue !== selectedHeight) {
      setSelectedHeight(clampedValue);
      // Moving the ruler makes the confirmation stale.
      setSaved(false);
      setSaveError(null);

      // Haptic feedback when value changes
      if (clampedValue !== lastHapticValue.current) {
        Haptics.selectionAsync();
        lastHapticValue.current = clampedValue;
      }
    }
  };

  const handleScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const value = Math.round(offsetX / TICK_WIDTH) + MIN_HEIGHT;
    const clampedValue = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, value));

    // No scrollTo here: snapToInterval already lands the ruler on a tick,
    // and a second programmatic scroll fights the one the system is
    // already running — which is what made it stick.
    if (clampedValue !== selectedHeight) setSelectedHeight(clampedValue);
  };

  const meters = (selectedHeight / 100).toFixed(2).replace('.', ',');
  const hint =
    previousHeight === null
      ? `Equivale a ${meters} m. Es tu primer registro.`
      : `Equivale a ${meters} m. Tenías ${previousHeight} cm registrados.`;

  if (isLoading) {
    return (
      <Screen tone="plain" wash edges={['top', 'bottom']}>
        <AppHeader title="Datos corporales" />
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.ink} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen tone="plain" wash edges={['top', 'bottom']}>
      <AppHeader title="Datos corporales" />

      <View style={styles.body}>
        <Animated.View style={[styles.head, headerStyle]}>
          <Text style={styles.title}>¿Cuál es{'\n'}tu altura?</Text>
          <Text style={styles.subtitle}>Ingresa tu altura para calcular tus métricas.</Text>
        </Animated.View>

        <Animated.View style={[styles.stage, valueStyle]}>
          <View style={styles.selectBlock}>
            <View
              style={styles.rulerTrack}
              accessible
              accessibilityRole="adjustable"
              accessibilityLabel="Altura"
              accessibilityValue={{ text: `${selectedHeight} centímetros` }}
              accessibilityActions={ADJUSTABLE_ACTIONS}
              onAccessibilityAction={handleAccessibilityAction}
            >
              <View style={styles.pointer} pointerEvents="none">
                <LinearGradient
                  colors={[colors.accent, colors.accentDeep]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.pointerDiamond}
                />
              </View>

              <ScrollView
                ref={scrollViewRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.rulerContent}
                onScroll={handleScroll}
                onMomentumScrollEnd={handleScrollEnd}
                onScrollEndDrag={handleScrollEnd}
                scrollEventThrottle={16}
                decelerationRate="fast"
                snapToInterval={TICK_WIDTH}
                importantForAccessibility="no-hide-descendants"
              >
                                {ticks}
              </ScrollView>
            </View>

            {/* The design's five-up strip, not a lone giant number: the ticks
                pick the value, this reads it back at a glance. */}
            <View style={styles.numbersRow}>
              <Text style={styles.numberFar}>{selectedHeight - 2}</Text>
              <Text style={styles.numberNear}>{selectedHeight - 1}</Text>
              <View style={styles.numberBoxWrap}>
                <LinearGradient
                  colors={[colors.accent, colors.accentDeep]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.numberBox}
                >
                  <View style={styles.numberBoxInner}>
                    <Text
                      style={styles.numberCenter}
                      accessibilityElementsHidden
                      importantForAccessibility="no"
                    >
                      {selectedHeight}
                    </Text>
                  </View>
                </LinearGradient>
              </View>
              <Text style={styles.numberNear}>{selectedHeight + 1}</Text>
              <Text style={styles.numberFar}>{selectedHeight + 2}</Text>
            </View>
          </View>

          <Text style={styles.hint}>{hint}</Text>
        </Animated.View>

        <Animated.View style={[styles.footer, footerStyle]}>
          {!!saveError && (
            <View style={styles.errorRow}>
              <Feather name="alert-circle" size={16} color={colors.error} />
              <Text style={styles.errorText}>{saveError}</Text>
            </View>
          )}

          {/* Confirmation reads in place. A modal over a saved value only asks
              the user to dismiss news they can already see. */}
          {saved && (
            <View style={styles.successRow}>
              <Feather name="check-circle" size={16} color={colors.accentDeep} />
              <Text style={styles.successText}>
                Guardado. Tu altura quedó en {selectedHeight} cm.
              </Text>
            </View>
          )}

          <PrimaryButton
            label={saved ? 'Listo' : 'Guardar'}
            onPress={saved ? handleSuccessClose : handleSave}
            loading={isSaving}
          />
        </Animated.View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    // Matches the design's container padding: 16 on each side, none at the
    // bottom (the footer carries its own).
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  head: {
    marginTop: 8,
    gap: 8,
    alignItems: 'center',
  },
  title: {
    fontFamily: typography.fontFamily,
    fontSize: 36,
    fontWeight: typography.fontWeight.semiBold,
    lineHeight: 43, // 36 * 1.19, read out of the design
    letterSpacing: -1.08,
    color: colors.ink,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
    maxWidth: 260,
    // The design specifies #9D9D9D, which is 2.7:1 on white and fails AA.
    // gray400 holds the same muted role at 5.3:1.
    color: colors.gray400,
  },
  stage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 32,
  },
  selectBlock: {
    width: '100%',
    alignItems: 'center',
    gap: 4,
  },
  rulerTrack: {
    height: 60,
    width: '100%',
    // Bleeds past the 16pt gutter so the ruler reads as continuous.
    marginHorizontal: -16,
    justifyContent: 'flex-start',
  },
  pointer: {
    position: 'absolute',
    left: SCREEN_WIDTH / 2 - 13,
    top: 4,
    width: 26,
    alignItems: 'center',
    zIndex: 10,
  },
  pointerDiamond: {
    width: 22,
    height: 22,
    borderRadius: 5,
    transform: [{ rotate: '45deg' }],
  },
  rulerContent: {
    paddingHorizontal: RULER_PADDING,
    alignItems: 'flex-start',
    paddingTop: 30,
  },
  tickContainer: {
    width: TICK_WIDTH,
    alignItems: 'center',
  },
  // Ticks are graphic rules, not text: the numbers strip below already
  // states every value, so ticks lost their labels and just mark rhythm.
  tick: {
    width: 4,
    height: 10,
    borderRadius: 2,
    backgroundColor: colors.gray400,
  },
  tickMid: {
    height: 13,
  },
  tickMajor: {
    height: 16,
    backgroundColor: colors.ink,
  },
  numbersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    height: 74,
  },
  numberFar: {
    fontFamily: typography.fontFamily,
    fontSize: 32,
    fontWeight: typography.fontWeight.regular,
    color: colors.ink,
  },
  numberNear: {
    fontFamily: typography.fontFamily,
    fontSize: 48,
    fontWeight: typography.fontWeight.regular,
    letterSpacing: -0.48,
    color: colors.ink,
  },
  numberBoxWrap: {
    height: 74,
    justifyContent: 'center',
  },
  numberBox: {
    minWidth: 110,
    height: 74,
    padding: 1,
  },
  numberBoxInner: {
    flex: 1,
    paddingHorizontal: 7,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  numberCenter: {
    fontFamily: typography.fontFamily,
    fontSize: 64,
    fontWeight: typography.fontWeight.semiBold,
    lineHeight: 64,
    letterSpacing: -2.56,
    color: colors.ink,
  },
  hint: {
    fontFamily: typography.fontFamily,
    fontSize: 13,
    textAlign: 'center',
    color: colors.gray400,
  },
  footer: {
    gap: 14,
    paddingTop: 8,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontFamily: typography.fontFamily,
    fontSize: 13,
    color: colors.error,
  },
  successRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: colors.accentSoft,
  },
  successText: {
    flex: 1,
    fontFamily: typography.fontFamily,
    fontSize: 13,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.ink,
  },
});
