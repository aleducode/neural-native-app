import React from 'react';
import { View, StyleSheet, Dimensions, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../theme/colors';

const { width: SCREEN_W } = Dimensions.get('window');

interface ScreenProps {
  children: React.ReactNode;
  /**
   * `surface` grounds content on #F4F4F4 so white cards read as raised — use
   * it for anything card-based. `plain` is flat white, for forms and single
   * columns of text.
   */
  tone?: 'surface' | 'plain';
  /** Soft brand wash behind the top of the screen. */
  wash?: boolean;
  edges?: readonly Edge[];
  style?: ViewStyle;
}

/**
 * Ground for every migrated screen: light background, dark status bar icons,
 * and the optional brand wash.
 *
 * The app still ships `StatusBar style="light"` at the root for its unmigrated
 * dark screens, so each light screen has to state its own — otherwise the
 * clock and battery disappear into the background.
 */
export default function Screen({
  children,
  tone = 'surface',
  wash = false,
  edges = ['top'],
  style,
}: ScreenProps) {
  return (
    <View
      style={[
        styles.root,
        { backgroundColor: tone === 'surface' ? colors.surface : colors.white },
        style,
      ]}
    >
      <StatusBar style="dark" />

      {wash && (
        <LinearGradient
          colors={[colors.accentSoft, tone === 'surface' ? colors.surface : colors.white]}
          style={styles.wash}
          pointerEvents="none"
        />
      )}

      <SafeAreaView style={styles.safe} edges={edges}>
        {children}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  wash: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_W * 0.9,
  },
  safe: {
    flex: 1,
  },
});
