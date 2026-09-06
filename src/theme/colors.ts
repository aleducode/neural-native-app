// Neural App - Design Colors
// Primary color: #5a6bff (Blue)

import { Platform } from 'react-native';

export const colors = {
  // Primary
  primary: '#5a6bff',
  primaryDark: '#4a5aee',
  primaryLight: '#7a8aff',

  // Grayscale
  white: '#FFFFFF',
  gray100: '#FFFFFF',
  gray200: '#F5F5F5',
  gray400: '#727272',
  gray500: '#303030',
  gray600: '#171717',
  black: '#171717',

  // Backgrounds
  bgDark: '#171717',
  bgCard: '#FFFFFF',
  bgGray: '#F5F5F5',
  bgOverlay: 'rgba(255, 255, 255, 0.18)',
  cardDark: '#1E1E1E',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#727272',
  textDark: '#171717',
  textMuted: '#303030',

  // Transparent variants
  primaryTransparent: 'rgba(90, 107, 255, 0.4)',
  primaryTransparent15: 'rgba(90, 107, 255, 0.15)',
  whiteTransparent: 'rgba(255, 255, 255, 0.18)',
  whiteTransparent30: 'rgba(255, 255, 255, 0.3)',

  // Status colors
  error: '#FF4D4D',
  success: '#5a6bff',

  // Design system (Gainly-derived). Additive: nothing above is removed,
  // so the twenty screens that already read these tokens keep working.
  ink: '#111111',
  surface: '#F4F4F4',
  muted: '#9D9D9D',
  accent: '#C6FF40',
  accentDeep: '#17DD42',
  accentSoft: '#E8FCEC',

  // Liquid glass: a translucent pane needs a fill, a lit top edge and a
  // dimmer bottom edge. Without a real backdrop blur these carry the effect.
  glassFill: 'rgba(255, 255, 255, 0.10)',
  glassFillStrong: 'rgba(255, 255, 255, 0.18)',
  glassEdgeTop: 'rgba(255, 255, 255, 0.55)',
  glassEdgeBottom: 'rgba(255, 255, 255, 0.08)',
  glassSpecular: 'rgba(255, 255, 255, 0.35)',

  // Exact values read out of the design file, kept as named roles so the
  // screens don't carry raw hexes.
  pureBlack: '#000000',
  iconMuted: '#A5A5A5',
  placeholder: '#939393',
  link: '#5E3AE4',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const borderRadius = {
  xs: 8,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 28,
  full: 100,
};

const systemFontFamily = Platform.select({
  ios: 'System',
  android: 'Roboto',
  default: 'System',
});

export const typography = {
  // System fonts nativas para mejor rendimiento y experiencia nativa
  // iOS usa SF Pro, Android usa Roboto
  fontFamily: systemFontFamily,
  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    semiBold: '600' as const,
    bold: '700' as const,
    extraBold: '800' as const,
  },
  fontSize: {
    xs: 13,
    sm: 15,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 22,
    title2: 22,
    title1: 38,
    xxxl: 30,
  },
  lineHeight: {
    xs: 16,
    sm: 20,
    md: 20,
    lg: 24,
    xl: 24,
    xxl: 30,
    xxxl: 48,
  },
};
