import React from 'react';
import { Text, StyleSheet, Pressable, ActivityIndicator, Platform, type ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import { colors, typography } from '../../theme/colors';

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Feather.glyphMap;
  style?: ViewStyle;
}

/**
 * The app's action button. Solid ink by default: a primary action has to look
 * pressable before it is pressed, which an outlined pill does not.
 *
 * Fires a light impact on press so the tap is confirmed before the network is.
 */
export default function PrimaryButton({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  icon,
  style,
}: PrimaryButtonProps) {
  const isDisabled = disabled || loading;

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const tint =
    variant === 'primary' ? colors.white : variant === 'danger' ? colors.error : colors.ink;

  return (
    <Pressable
      onPress={handlePress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        variant === 'primary' && styles.primary,
        variant === 'secondary' && styles.secondary,
        variant === 'danger' && styles.danger,
        pressed && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={tint} />
      ) : (
        <>
          <Text style={[styles.label, { color: tint }]}>{label}</Text>
          {!!icon && <Feather name={icon} size={18} color={tint} />}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 56,
    borderRadius: 28,
  },
  primary: {
    backgroundColor: colors.ink,
    ...Platform.select({
      ios: {
        shadowColor: colors.ink,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 18,
      },
      android: { elevation: 5 },
    }),
  },
  secondary: {
    backgroundColor: colors.surface,
  },
  danger: {
    backgroundColor: 'rgba(255, 77, 77, 0.10)',
  },
  pressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.92,
  },
  disabled: {
    opacity: 0.45,
  },
  label: {
    fontFamily: typography.fontFamily,
    fontSize: 17,
    fontWeight: typography.fontWeight.semiBold,
    letterSpacing: 0.2,
  },
});
