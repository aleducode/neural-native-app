import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
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

    // Snap to nearest value
    const snapOffset = (clampedValue - MIN_WEIGHT) * TICK_WIDTH;
    scrollViewRef.current?.scrollTo({ x: snapOffset, animated: true });
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
          <Text style={styles.title}>Tu peso</Text>
          <Text style={styles.subtitle}>Desliza la regla hasta el número y suelta.</Text>
        </Animated.View>

        <Animated.View style={[styles.stage, valueStyle]}>
          {/* The value is the whole point of the screen, so it carries the
              weight the ruler used to. */}
          <View style={styles.valueRow}>
            <Text
              style={styles.value}
              accessibilityRole="text"
              accessibilityLabel={`${selectedWeight} kilogramos`}
            >
              {selectedWeight}
            </Text>
            <Text style={styles.unit}>kg</Text>
          </View>
          <Text style={styles.hint}>{hint}</Text>

          <View style={styles.ruler}>
            {/* Centre pointer: the one place the brand accent belongs here. */}
            <View style={styles.pointer} pointerEvents="none">
              <View style={styles.pointerCap} />
              <View style={styles.pointerBar} />
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
            >
              {weights.map((weight) => {
                const isMajor = weight % 10 === 0;
                const isMinor5 = weight % 5 === 0 && !isMajor;

                return (
                  <View key={weight} style={styles.tickContainer}>
                    <View
                      style={[
                        styles.tick,
                        isMinor5 && styles.tickMinor5,
                        isMajor && styles.tickMajor,
                      ]}
                    />
                    {isMajor && <Text style={styles.tickLabel}>{weight}</Text>}
                  </View>
                );
              })}
            </ScrollView>
          </View>
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
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  head: {
    marginTop: 8,
    gap: 8,
  },
  title: {
    fontFamily: typography.fontFamily,
    fontSize: 36,
    fontWeight: typography.fontWeight.bold,
    lineHeight: 40,
    letterSpacing: -1,
    color: colors.ink,
  },
  subtitle: {
    fontFamily: typography.fontFamily,
    fontSize: 15,
    lineHeight: 21,
    // gray400 is 5.3:1 on white. The design's muted grey is 2.7:1 and fails AA,
    // so the role is kept and the value is not.
    color: colors.gray400,
  },
  stage: {
    flex: 1,
    justifyContent: 'center',
    gap: 8,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: 8,
  },
  value: {
    fontFamily: typography.fontFamily,
    fontSize: 76,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: -3,
    color: colors.ink,
  },
  unit: {
    fontFamily: typography.fontFamily,
    fontSize: 22,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.gray400,
  },
  hint: {
    fontFamily: typography.fontFamily,
    fontSize: 13,
    textAlign: 'center',
    color: colors.gray400,
  },
  ruler: {
    height: 92,
    marginTop: 24,
    // Bleeds past the 24pt gutter so the ruler reads as continuous.
    marginHorizontal: -24,
    justifyContent: 'flex-start',
  },
  pointer: {
    position: 'absolute',
    left: SCREEN_WIDTH / 2 - 5,
    top: 0,
    width: 10,
    alignItems: 'center',
    zIndex: 10,
  },
  pointerCap: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accentDeep,
  },
  pointerBar: {
    width: 3,
    height: 46,
    marginTop: 2,
    borderRadius: 2,
    backgroundColor: colors.accentDeep,
  },
  rulerContent: {
    paddingHorizontal: RULER_PADDING,
    alignItems: 'flex-start',
    paddingTop: 14,
  },
  tickContainer: {
    width: TICK_WIDTH,
    alignItems: 'center',
  },
  // Ticks are graphic rules, not text: they carry no information the number
  // above doesn't already state, so they stay quiet.
  tick: {
    width: 1.5,
    height: 16,
    borderRadius: 1,
    backgroundColor: colors.gray400,
    opacity: 0.3,
  },
  tickMinor5: {
    height: 24,
    opacity: 0.45,
  },
  tickMajor: {
    width: 2,
    height: 34,
    opacity: 1,
    backgroundColor: colors.ink,
  },
  tickLabel: {
    marginTop: 8,
    fontFamily: typography.fontFamily,
    fontSize: 12,
    fontWeight: typography.fontWeight.medium,
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
