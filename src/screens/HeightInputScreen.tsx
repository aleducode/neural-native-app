import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { colors, typography, spacing } from '../theme/colors';
import { profileApi } from '../api/profile';
import ConfirmModal from '../components/ConfirmModal';

const MIN_HEIGHT = 100;
const MAX_HEIGHT = 250;
const TICK_WIDTH = 10;
const SCREEN_WIDTH = Dimensions.get('window').width;

export default function HeightInputScreen() {
  const navigation = useNavigation();
  const scrollViewRef = useRef<ScrollView>(null);

  const [selectedHeight, setSelectedHeight] = useState(170);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const lastHapticValue = useRef(170);

  const heights = Array.from(
    { length: MAX_HEIGHT - MIN_HEIGHT + 1 },
    (_, i) => MIN_HEIGHT + i
  );

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const { data } = await profileApi.getProfile();
    if (data?.profile.height) {
      setSelectedHeight(data.profile.height);
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

  const handleBack = () => {
    navigation.goBack();
  };

  const handleSave = async () => {
    setIsSaving(true);
    const { data, error } = await profileApi.updateProfile({ height: selectedHeight });
    setIsSaving(false);

    if (data) {
      setShowSuccessModal(true);
    } else {
      Alert.alert('Error', error || 'No se pudo guardar la altura');
    }
  };

  const handleSuccessClose = () => {
    setShowSuccessModal(false);
    navigation.goBack();
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const value = Math.round(offsetX / TICK_WIDTH) + MIN_HEIGHT;
    const clampedValue = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, value));

    if (clampedValue !== selectedHeight) {
      setSelectedHeight(clampedValue);

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
          <Text style={styles.headerTitle}>Altura</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Current Height Display */}
        <View style={styles.currentValueContainer}>
          <Text style={styles.currentValue}>{selectedHeight}</Text>
          <Text style={styles.currentUnit}>cm</Text>
        </View>

        {/* Ruler Picker */}
        <View style={styles.rulerContainer}>
          {/* Center Indicator */}
          <View style={styles.centerIndicator} />

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
                      isMajor && styles.tickMajor,
                      isMinor5 && styles.tickMinor5,
                    ]}
                  />
                  {isMajor && (
                    <Text style={styles.tickLabel}>{height}</Text>
                  )}
                </View>
              );
            })}
          </ScrollView>
        </View>

        {/* Save Button */}
        <View style={styles.bottomButtonContainer}>
          <TouchableOpacity
            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={isSaving}
            activeOpacity={0.8}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={colors.textDark} />
            ) : (
              <Text style={styles.saveButtonText}>Guardar</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Success Modal */}
        <ConfirmModal
          visible={showSuccessModal}
          title="Guardado"
          message="Tu altura ha sido actualizada correctamente."
          confirmText="OK"
          onConfirm={handleSuccessClose}
          onCancel={handleSuccessClose}
          singleButton
        />
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
  currentValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginTop: spacing.xxl * 2,
    marginBottom: spacing.xxl * 2,
  },
  currentValue: {
    fontSize: 80,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
  },
  currentUnit: {
    fontSize: typography.fontSize.title1,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.medium,
    color: colors.gray400,
    marginLeft: spacing.sm,
  },
  rulerContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  centerIndicator: {
    position: 'absolute',
    left: SCREEN_WIDTH / 2 - 1,
    top: 0,
    bottom: 60,
    width: 2,
    backgroundColor: colors.primary,
    zIndex: 10,
  },
  rulerContent: {
    paddingHorizontal: SCREEN_WIDTH / 2,
    alignItems: 'flex-start',
    paddingTop: 20,
  },
  tickContainer: {
    width: TICK_WIDTH,
    alignItems: 'center',
  },
  tick: {
    width: 1,
    height: 20,
    backgroundColor: colors.gray400,
  },
  tickMajor: {
    height: 40,
    width: 2,
    backgroundColor: colors.white,
  },
  tickMinor5: {
    height: 30,
    backgroundColor: colors.gray400,
  },
  tickLabel: {
    marginTop: spacing.sm,
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.medium,
    color: colors.gray400,
  },
  bottomButtonContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    paddingTop: spacing.lg,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 1000,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.semibold,
    color: colors.textDark,
    textTransform: 'uppercase',
  },
});
