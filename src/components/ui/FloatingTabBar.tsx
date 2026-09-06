import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, RadialGradient, Stop, Circle } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { colors, typography } from '../../theme/colors';

// Measurements taken from the design file's Navbar component: a 343x69 pill
// at #111111 with a full radius, 8/24 padding, floating 32 above the edge,
// 24px icons tinted #C6FF40 when active and #8A8A8A when not.
const PILL_HEIGHT = 69;
const PILL_RADIUS = 100;
const SIDE_INSET = 16;
const FLOAT_ABOVE = 32;
const ORB_SIZE = 53;

const INACTIVE = '#8A8A8A';

const ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  Home: 'home',
  Calendar: 'calendar',
  Community: 'users',
  Trainings: 'activity',
  Profile: 'user',
};

/**
 * The orb from the design: a radial bloom, a solid core and two off-centre
 * sparks. In the kit it launches an AI assistant this app does not have, so it
 * carries the app's own primary action instead — booking a session.
 *
 * Drawn with SVG because a radial gradient is not something expo-linear-gradient
 * can express, and the bloom is what makes it read as light rather than a dot.
 */
function Orb() {
  return (
    <Svg width={ORB_SIZE} height={ORB_SIZE} viewBox="0 0 53 53">
      <Defs>
        <RadialGradient id="bloom" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={colors.white} stopOpacity={0.95} />
          <Stop offset="0.35" stopColor={colors.accent} stopOpacity={0.9} />
          <Stop offset="0.75" stopColor={colors.accentDeep} stopOpacity={0.55} />
          <Stop offset="1" stopColor={colors.accentDeep} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx="26.5" cy="26.5" r="22.5" fill="url(#bloom)" />
      <Circle cx="26.5" cy="26.5" r="7.5" fill={colors.white} />
      <Circle cx="35" cy="18" r="2" fill={colors.white} />
      <Circle cx="18.5" cy="34" r="1.5" fill={colors.white} fillOpacity={0.8} />
    </Svg>
  );
}

/**
 * Floating pill navigation, imported from the design.
 *
 * The kit puts four tabs around the orb; this app has five destinations and
 * dropping one would be a product decision, not a visual one — so all five
 * stay and the orb sits among them as a sixth, action slot.
 */
export default function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  const go = (routeName: string, index: number) => {
    const isFocused = state.index === index;
    const event = navigation.emit({
      type: 'tabPress',
      target: state.routes[index].key,
      canPreventDefault: true,
    });
    if (!isFocused && !event.defaultPrevented) {
      Haptics.selectionAsync();
      navigation.navigate(routeName);
    }
  };

  const book = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate('Calendar' as never);
  };

  // The orb sits after the second tab, so the two halves stay balanced.
  const ORB_AT = 2;

  return (
    <View
      style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, FLOAT_ABOVE / 2) + 8 }]}
      pointerEvents="box-none"
    >
      <View style={styles.pill}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const label = (route.name in ICONS ? route.name : 'Home') as keyof typeof ICONS;

          return (
            <React.Fragment key={route.key}>
              {index === ORB_AT && (
                <Pressable
                  onPress={book}
                  style={({ pressed }) => [styles.orb, pressed && styles.orbPressed]}
                  accessibilityRole="button"
                  accessibilityLabel="Agendar entrenamiento"
                >
                  <Orb />
                </Pressable>
              )}

              <Pressable
                onPress={() => go(route.name, index)}
                style={styles.tab}
                hitSlop={6}
                accessibilityRole="tab"
                accessibilityState={{ selected: focused }}
                accessibilityLabel={TAB_LABELS[route.name] ?? route.name}
              >
                <Feather
                  name={ICONS[label]}
                  size={24}
                  color={focused ? colors.accent : INACTIVE}
                />
              </Pressable>
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
}

// Icons alone are not a label. The bar shows no text, so every destination
// names itself to assistive technology instead.
const TAB_LABELS: Record<string, string> = {
  Home: 'Inicio',
  Calendar: 'Calendario',
  Community: 'Comunidad',
  Trainings: 'Entrenos',
  Profile: 'Perfil',
};

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: SIDE_INSET,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: PILL_HEIGHT,
    borderRadius: PILL_RADIUS,
    backgroundColor: colors.ink,
    paddingHorizontal: 24,
    ...Platform.select({
      ios: {
        shadowColor: colors.ink,
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.28,
        shadowRadius: 24,
      },
      android: { elevation: 12 },
    }),
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: PILL_HEIGHT,
  },
  orb: {
    width: ORB_SIZE,
    height: ORB_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    // The design carries the bloom outside the shape with a soft accent glow.
    ...Platform.select({
      ios: {
        shadowColor: colors.accent,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 9,
      },
      android: { elevation: 8 },
    }),
  },
  orbPressed: {
    transform: [{ scale: 0.92 }],
  },
});
