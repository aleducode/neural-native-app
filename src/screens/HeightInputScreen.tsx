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

const MIN_HEIGHT = 100;
const MAX_HEIGHT = 250;
const TICK_WIDTH = 10;
const SCREEN_WIDTH = Dimensions.get('window').width;

// Half a tick less than half the screen, so the pointer lands on the tick it
// selects rather than on the gap before it.
const RULER_PADDING = SCREEN_WIDTH / 2 - TICK_WIDTH / 2;

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

    // Snap to nearest value
    const snapOffset = (clampedValue - MIN_HEIGHT) * TICK_WIDTH;
    scrollViewRef.current?.scrollTo({ x: snapOffset, animated: true });
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
          <Text style={styles.title}>Tu altura</Text>
          <Text style={styles.subtitle}>Desliza la regla hasta el número y suelta.</Text>
        </Animated.View>

        <Animated.View style={[styles.stage, valueStyle]}>
          <View style={styles.valueRow}>
            <Text
              style={styles.value}
              accessibilityRole="text"
              accessibilityLabel={`${selectedHeight} centímetros`}
            >
              {selectedHeight}
            </Text>
            <Text style={styles.unit}>cm</Text>
          </View>
          <Text style={styles.hint}>{hint}</Text>

          <View style={styles.ruler}>
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
              {heights.map((height) => {
                const isMajor = height % 10 === 0;
                const isMinor5 = height % 5 === 0 && !isMajor;

                return (
                  <View key={height} style={styles.tickContainer}>
                    <View
                      style={[
                        styles.tick,
                        isMinor5 && styles.tickMinor5,
                        isMajor && styles.tickMajor,
                      ]}
                    />
                    {isMajor && <Text style={styles.tickLabel}>{height}</Text>}
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
