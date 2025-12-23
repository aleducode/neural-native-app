import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing } from '../theme/colors';

interface DividerProps {
  text: string;
}

export default function Divider({ text }: DividerProps) {
  return (
    <View style={styles.container}>
      <View style={styles.line} />
      <Text style={styles.text}>{text}</Text>
      <View style={styles.line} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: spacing.md, // gap-[12px] in Figma
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: colors.gray400,
    opacity: 0.3,
  },
  text: {
    fontSize: typography.fontSize.sm, // text-[15px] in Figma
    fontWeight: typography.fontWeight.regular,
    lineHeight: typography.lineHeight.sm, // leading-[20px] in Figma
    color: colors.textDark,
    fontFamily: typography.fontFamily.regular,
    textAlign: 'center',
  },
});

