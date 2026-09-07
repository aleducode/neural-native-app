import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, typography } from '../../theme/colors';

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  /** Hide the back control on screens that are a tab root. */
  showBack?: boolean;
  /** Optional trailing control, e.g. a "mark all read" action. */
  action?: { icon: keyof typeof Feather.glyphMap; label: string; onPress: () => void };
}

/**
 * Screen header: circular back control, title, optional subtitle and one
 * trailing action.
 *
 * Back always resolves somewhere. A screen reached from a deep link or opened
 * as the initial route has nothing behind it, and React Navigation refuses an
 * unguarded goBack in that state.
 */
export default function AppHeader({ title, subtitle, showBack = true, action }: AppHeaderProps) {
  const navigation = useNavigation<any>();

  const goBack = () => {
    if (navigation.canGoBack?.()) navigation.goBack();
    else navigation.navigate('MainTabs');
  };

  return (
    <View style={styles.row}>
      {showBack ? (
        <Pressable
          onPress={goBack}
          style={({ pressed }) => [styles.control, pressed && styles.pressed]}
          hitSlop={14}
          accessibilityRole="button"
          accessibilityLabel="Volver"
        >
          <Feather name="arrow-left" size={24} color={colors.ink} />
        </Pressable>
      ) : (
        <View style={styles.spacer} />
      )}

      <View style={styles.titles}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {!!subtitle && (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>

      {action ? (
        <Pressable
          onPress={action.onPress}
          style={({ pressed }) => [styles.control, pressed && styles.pressed]}
          hitSlop={14}
          accessibilityRole="button"
          accessibilityLabel={action.label}
        >
          <Feather name={action.icon} size={24} color={colors.ink} />
        </Pressable>
      ) : (
        <View style={styles.spacer} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    // The design's header row is 52 tall.
    height: 52,
  },
  control: {
    // The design draws these as bare 24px glyphs, not buttons on a disc. The
    // hitSlop carries the touch target the disc used to provide.
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spacer: {
    width: 24,
  },
  pressed: {
    opacity: 0.7,
  },
  titles: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  title: {
    fontFamily: typography.fontFamily,
    fontSize: 20,
    fontWeight: typography.fontWeight.semiBold,
    letterSpacing: -0.2,
    color: colors.ink,
  },
  subtitle: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    color: colors.gray400,
  },
});
