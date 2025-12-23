// Neural App - Design System
// Fonts: Inter - Compact sizing for mobile

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

  // Semantic colors
  error: '#FF3B30',
  success: '#22C55E',
  warning: '#FF9500',
  info: '#A855F7',
};

export const spacing = {
  xs: 2,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 20,
  xxxl: 24,
};

export const borderRadius = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 100,
};

// Font family names that match useFonts hook
export const fonts = {
  regular: 'Inter-Regular',
  medium: 'Inter-Medium',
  semiBold: 'Inter-SemiBold',
  bold: 'Inter-Bold',
  extraBold: 'Inter-ExtraBold',
  black: 'Inter-Black',
};

export const typography = {
  fontFamily: {
    regular: fonts.regular,
    medium: fonts.medium,
    semibold: fonts.semiBold,
    bold: fonts.bold,
    extraBold: fonts.extraBold,
    black: fonts.black,
  },
  // Compact sizes for mobile
  fontSize: {
    xs: 10,
    sm: 11,
    md: 12,
    lg: 13,
    xl: 14,
    xxl: 16,
    xxxl: 18,
    title2: 20,
    title1: 24,
  },
  lineHeight: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 18,
    xxl: 20,
    xxxl: 22,
    title2: 24,
    title1: 28,
  },
  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extraBold: '800' as const,
    black: '900' as const,
  },
};
