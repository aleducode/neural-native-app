// Neural App - Figma Design Colors (Pixel Perfect)
// Source: https://www.figma.com/design/3pKI0AQarLogRrOnglU50N/FitZone

import { Platform } from 'react-native';

export const colors = {
  // Primary
  primary: '#45FFB7',
  primaryDark: '#3DE0A1',

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

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#727272',
  textDark: '#171717',
  textMuted: '#303030',

  // Transparent variants
  primaryTransparent: 'rgba(69, 255, 183, 0.4)',
  whiteTransparent: 'rgba(255, 255, 255, 0.18)',
  whiteTransparent30: 'rgba(255, 255, 255, 0.3)',

  // Status colors
  error: '#FF4D4D',
  success: '#45FFB7',
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
