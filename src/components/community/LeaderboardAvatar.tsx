import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, typography } from '../../theme/colors';

interface LeaderboardAvatarProps {
  photoUrl: string | null;
  initials: string;
  size: number;
  borderColor?: string;
  borderWidth?: number;
  /** Fixed override — the pulse strip wants 15px regardless of avatar size. */
  fontSize?: number;
}

/**
 * Circular avatar shared by the pulse strip, the podium and the ranking rows:
 * a photo when there is one, initials on a dark fill otherwise.
 */
export default function LeaderboardAvatar({
  photoUrl,
  initials,
  size,
  borderColor,
  borderWidth = 0,
  fontSize,
}: LeaderboardAvatarProps) {
  const resolvedFontSize = fontSize ?? Math.round(size * 0.32);

  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth,
          borderColor: borderColor ?? 'transparent',
        },
      ]}
    >
      {photoUrl ? (
        <Image source={{ uri: photoUrl }} style={styles.image} resizeMode="cover" />
      ) : initials.trim() ? (
        <Text style={[styles.initials, { fontSize: resolvedFontSize }]}>{initials}</Text>
      ) : (
        // No photo and no letters to fall back on: an empty dark disc reads as
        // a failed image, and a person does not.
        <Feather name="user" size={Math.round(size * 0.44)} color={colors.gray400} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    backgroundColor: '#2A2A2A',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  initials: {
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.white,
  },
});
