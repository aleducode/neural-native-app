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
          style={({ pressed }) => [styles.circle, pressed && styles.pressed]}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Volver"
        >
          <Feather name="arrow-left" size={20} color={colors.ink} />
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
          style={({ pressed }) => [styles.circle, pressed && styles.pressed]}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={action.label}
        >
          <Feather name={action.icon} size={20} color={colors.ink} />
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
    paddingVertical: 12,
  },
  circle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spacer: {
    width: 44,
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
    fontSize: 18,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.ink,
  },
  subtitle: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    color: colors.gray400,
  },
});
