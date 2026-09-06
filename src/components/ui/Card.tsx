import React from 'react';
import { View, Text, StyleSheet, Pressable, type ViewStyle } from 'react-native';
import { colors, typography } from '../../theme/colors';

interface CardProps {
  children?: React.ReactNode;
  title?: string;
  subtitle?: string;
  onPress?: () => void;
  style?: ViewStyle;
}

/**
 * White card on the surface ground: 20 radius, 16 padding, 16 gap — the
 * measurements the design file uses for every card on the home screen.
 */
export default function Card({ children, title, subtitle, onPress, style }: CardProps) {
  const content = (
    <>
      {(!!title || !!subtitle) && (
        <View style={styles.head}>
          {!!title && <Text style={styles.title}>{title}</Text>}
          {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
      )}
      {children}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.card, pressed && styles.pressed, style]}
        accessibilityRole="button"
      >
        {content}
      </Pressable>
    );
  }

  return <View style={[styles.card, style]}>{content}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 16,
    gap: 16,
  },
  pressed: {
    opacity: 0.85,
  },
  head: {
    gap: 4,
  },
  title: {
    fontFamily: typography.fontFamily,
    fontSize: 20,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.ink,
  },
  subtitle: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    // The design specifies #A5A5A5, which is 2.5:1 on white. gray400 holds the
    // same muted role at 5.3:1.
    color: colors.gray400,
  },
});
