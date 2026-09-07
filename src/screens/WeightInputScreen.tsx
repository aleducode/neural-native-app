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

const MIN_WEIGHT = 30;
const MAX_WEIGHT = 200;
const TICK_WIDTH = 10;
const SCREEN_WIDTH = Dimensions.get('window').width;

// The ruler is centred on the tick itself, not on the gap before it: content
// padding of exactly half the screen leaves the pointer half a tick to the
// left of the number it claims to select.
const RULER_PADDING = SCREEN_WIDTH / 2 - TICK_WIDTH / 2;

const ADJUSTABLE_ACTIONS: AccessibilityActionInfo[] = [
  { name: 'increment' },
  { name: 'decrement' },
];

export default function WeightInputScreen() {
  const navigation = useNavigation<any>();
  const scrollViewRef = useRef<ScrollView>(null);

  const [selectedWeight, setSelectedWeight] = useState(70);
  const [previousWeight, setPreviousWeight] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const lastHapticValue = useRef(70);

  const weights = Array.from(
    { length: MAX_WEIGHT - MIN_WEIGHT + 1 },
    (_, i) => MIN_WEIGHT + i
  );

  // Short staggered entrance, same rhythm as the rest of the app.
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
    if (data?.latest_weight) {
      setSelectedWeight(data.latest_weight.weight);
      setPreviousWeight(data.latest_weight.weight);
      lastHapticValue.current = data.latest_weight.weight;
      // Scroll to current weight after layout
      setTimeout(() => {
        const offset = (data.latest_weight!.weight - MIN_WEIGHT) * TICK_WIDTH;
        scrollViewRef.current?.scrollTo({ x: offset, animated: false });
      }, 100);
    } else {
      // Default to 70
      setTimeout(() => {
        const offset = (70 - MIN_WEIGHT) * TICK_WIDTH;
        scrollViewRef.current?.scrollTo({ x: offset, animated: false });
      }, 100);
    }
    setIsLoading(false);
  };

  const handleSave = async () => {
    setSaveError(null);
    setIsSaving(true);
    const { data, error } = await profileApi.createWeight(selectedWeight);
    setIsSaving(false);

    if (data) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Navigate to weight history screen
      navigation.replace('WeightHistory');
    } else {
      // The failure belongs next to the button that failed, not behind a modal
      // the user has to dismiss before they can retry.
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setSaveError(error || 'No se pudo guardar el peso');
    }
  };

  const scrollToWeight = (value: number, animated: boolean) => {
    const offset = (value - MIN_WEIGHT) * TICK_WIDTH;
    scrollViewRef.current?.scrollTo({ x: offset, animated });
  };

  // Ruler drag is the primary input, but a screen reader user never drags a
  // horizontal list reliably — the "adjustable" role exposes swipe up/down as
  // a real increment/decrement instead.
  const stepWeight = (delta: number) => {
    const next = Math.max(MIN_WEIGHT, Math.min(MAX_WEIGHT, selectedWeight + delta));
    setSelectedWeight(next);
    setSaveError(null);
    Haptics.selectionAsync();
    scrollToWeight(next, true);
  };

  const handleAccessibilityAction = (event: AccessibilityActionEvent) => {
    if (event.nativeEvent.actionName === 'increment') stepWeight(1);
    else if (event.nativeEvent.actionName === 'decrement') stepWeight(-1);
  };

  // The ruler is static: nothing in it depends on the selected value.
  // Rebuilding its ticks on every scroll frame was reconciling every
  // one of them at 60fps, which is what made the ruler stick.
  const ticks = useMemo(
    () => (
      <>
        {weights.map((weight) => {
        const isMajor = weight % 10 === 0;
        const isMid = weight % 5 === 0 && !isMajor;
         return (
          <View key={weight} style={styles.tickContainer}>
            <View
              style={[styles.tick, isMid && styles.tickMid, isMajor && styles.tickMajor]}
            />
          </View>
        );
      })}
      </>
    ),
    [weights]
  );

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const value = Math.round(offsetX / TICK_WIDTH) + MIN_WEIGHT;
    const clampedValue = Math.max(MIN_WEIGHT, Math.min(MAX_WEIGHT, value));

    if (clampedValue !== selectedWeight) {
      setSelectedWeight(clampedValue);
      // A failure about the old value stops being true once it moves.
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
    const value = Math.round(offsetX / TICK_WIDTH) + MIN_WEIGHT;
    const clampedValue = Math.max(MIN_WEIGHT, Math.min(MAX_WEIGHT, value));

    // No scrollTo here: snapToInterval already lands the ruler on a tick,
    // and a second programmatic scroll fights the one the system is
    // already running — which is what made it stick.
    if (clampedValue !== selectedWeight) setSelectedWeight(clampedValue);
  };

  const delta = previousWeight === null ? null : selectedWeight - previousWeight;

  const hint =
    delta === null
      ? 'Es tu primer registro.'
      : delta === 0
      ? `Igual que tu último registro (${previousWeight} kg).`
      : `${delta > 0 ? '+' : '-'}${Math.abs(delta)} kg respecto a tu último registro.`;

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
          <Text style={styles.title}>¿Cuál es{'\n'}tu peso?</Text>
          <Text style={styles.subtitle}>Ingresa tu peso actual para seguir tu progreso.</Text>
        </Animated.View>

        <Animated.View style={[styles.stage, valueStyle]}>
          <View style={styles.selectBlock}>
            <View
              style={styles.rulerTrack}
              accessible
              accessibilityRole="adjustable"
              accessibilityLabel="Peso"
              accessibilityValue={{ text: `${selectedWeight} kilogramos` }}
              accessibilityActions={ADJUSTABLE_ACTIONS}
              onAccessibilityAction={handleAccessibilityAction}
            >
              {/* Centre pointer: the one place the brand gradient belongs here. */}
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
              <Text style={styles.numberFar}>{selectedWeight - 2}</Text>
              <Text style={styles.numberNear}>{selectedWeight - 1}</Text>
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
                      {selectedWeight}
                    </Text>
                  </View>
                </LinearGradient>
              </View>
              <Text style={styles.numberNear}>{selectedWeight + 1}</Text>
              <Text style={styles.numberFar}>{selectedWeight + 2}</Text>
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

          <PrimaryButton label="Guardar" onPress={handleSave} loading={isSaving} />
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
    // The five values used to run 32/48/64/48/32 in full ink, which at three
    // digits came to about 420 points of text on a 343 screen — heights ran
    // off both edges. They now fade outward, which buys the room and makes
    // the hierarchy at the same time.
    fontSize: 22,
    fontWeight: typography.fontWeight.regular,
    color: '#C9C9C9',
  },
  numberNear: {
    fontFamily: typography.fontFamily,
    fontSize: 30,
    fontWeight: typography.fontWeight.regular,
    letterSpacing: -0.48,
    color: colors.gray400,
  },
  numberBoxWrap: {
    height: 74,
    justifyContent: 'center',
  },
  numberBox: {
    minWidth: 104,
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
    fontSize: 44,
    fontWeight: typography.fontWeight.semiBold,
    lineHeight: 46,
    letterSpacing: -1.5,
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
});
