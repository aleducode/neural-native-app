import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, borderRadius, spacing } from '../theme/colors';

interface SocialButtonProps {
  type: 'google' | 'apple';
  onPress: () => void;
}

export default function SocialButton({ type, onPress }: SocialButtonProps) {
  return (
    <TouchableOpacity
      style={styles.button}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.iconContainer}>
        {type === 'google' ? (
          <Ionicons name="logo-google" size={24} color={colors.textDark} />
        ) : (
          <Ionicons name="logo-apple" size={24} color={colors.textDark} />
        )}
      </View>
      <Text style={styles.text}>{type === 'google' ? 'Google' : 'Apple'}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gray200, // bg-[#f5f5f5] in Figma
    borderRadius: 1000,
    paddingHorizontal: spacing.xl,
    paddingVertical: 6, // py-[6px] in Figma
    gap: spacing.xs, // gap-[4px] in Figma
    minHeight: 48,
  },
  iconContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: typography.fontSize.md, // Reduced from 20px to 16px
    fontWeight: typography.fontWeight.semibold,
    lineHeight: typography.lineHeight.md,
    color: colors.textDark,
    fontFamily: typography.fontFamily.bold,
    textTransform: 'uppercase',
  },
});

