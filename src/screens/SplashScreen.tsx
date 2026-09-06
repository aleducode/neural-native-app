import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Image, Dimensions, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import Svg, { Path, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  withRepeat,
  withSequence,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { colors, typography } from '../theme/colors';

const { width: SCREEN_W } = Dimensions.get('window');

// The brand shape, lifted verbatim from the design file (Blob Vector,
// 343x380.74). Keeping the original viewBox lets it scale without redrawing.
const BLOB_VIEWBOX = '0 0 343 380.74';
const BLOB_PATH =
  'M0 142.78c0 0 0 152.29 0 152.29 0 0 47.64 0 47.64 0 5 0 9.96 0.99 14.58 2.9 4.63 1.91 8.83 4.72 12.37 8.25 3.54 3.54 6.34 7.74 8.26 12.36 1.91 4.62 2.9 9.57 2.9 14.57 0 0 0 47.59 0 47.59 0 0 114.33 0 114.33 0 0 0 142.92-142.78 142.92-142.78 0 0 0-152.29 0-152.29 0 0-47.64 0-47.64 0-5 0-9.96-0.99-14.58-2.9-4.63-1.92-8.83-4.72-12.37-8.26-3.54-3.53-6.34-7.73-8.26-12.35-1.91-4.62-2.9-9.57-2.9-14.57 0 0 0-47.59 0-47.59 0 0-114.33 0-114.33 0 0 0-142.92 142.78-142.92 142.78z m161.97 142.77c0 0-66.69 0-66.69 0 0 0 0-104.7 0-104.7 0 0 85.75-85.67 85.75-85.67 0 0 66.69 0 66.69 0 0 0 0 104.71 0 104.71 0 0-85.75 85.66-85.75 85.66z';

const BLOB_W = Math.min(SCREEN_W - 72, 300);
const BLOB_H = BLOB_W * (380.74 / 343);

const PANE_W = Math.min(SCREEN_W - 96, 258);
const PANE_H = 118;

// The shape is hollow through its middle band, so a pane centred on it would
// sit half over colour and half over the hole. Riding its bottom edge instead
// reads as a deliberate overlap and keeps a solid backdrop under the logo.
const PANE_DROP = BLOB_H * 0.40;

const SWEEP_W = PANE_W * 0.5;
const SWEEP_FROM = -PANE_W * 0.7;
const SWEEP_TO = PANE_W * 0.9;

const AnimatedGradient = Animated.createAnimatedComponent(LinearGradient);

interface SplashScreenProps {
  /** Called once the intro has played out and the app can take over. */
  onFinish?: () => void;
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const blobIn = useSharedValue(0);
  const blobBreathe = useSharedValue(0);
  const paneIn = useSharedValue(0);
  const sweep = useSharedValue(0);
  const titleIn = useSharedValue(0);
  const progress = useSharedValue(0);

  useEffect(() => {
    titleIn.value = withTiming(1, { duration: 520, easing: Easing.out(Easing.quad) });

    blobIn.value = withDelay(120, withSpring(1, { damping: 16, stiffness: 90, mass: 1 }));

    // A slow, shallow breath keeps the shape alive without drawing attention.
    blobBreathe.value = withDelay(
      900,
      withRepeat(withTiming(1, { duration: 3600, easing: Easing.inOut(Easing.sin) }), -1, true)
    );

    paneIn.value = withDelay(360, withSpring(1, { damping: 15, stiffness: 115 }));

    // Hold the glint off-screen between passes so it reads as an occasional
    // catch of light rather than a rotating shine.
    sweep.value = withDelay(
      700,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
          withTiming(1, { duration: 950 }),
          withTiming(0, { duration: 0 })
        ),
        -1,
        false
      )
    );

    progress.value = withDelay(
      420,
      withTiming(1, { duration: 1700, easing: Easing.inOut(Easing.cubic) }, (finished) => {
        if (finished && onFinish) {
          runOnJS(onFinish)();
        }
      })
    );
  }, []);

  const blobStyle = useAnimatedStyle(() => ({
    opacity: blobIn.value,
    transform: [
      { scale: 0.82 + blobIn.value * 0.18 + blobBreathe.value * 0.02 },
      { rotateZ: `${(1 - blobIn.value) * -6 + blobBreathe.value * 1.5}deg` },
    ],
  }));

  const paneStyle = useAnimatedStyle(() => ({
    opacity: paneIn.value,
    transform: [
      { translateY: PANE_DROP + (1 - paneIn.value) * 14 },
      { scale: 0.9 + paneIn.value * 0.1 },
    ],
  }));

  const sweepStyle = useAnimatedStyle(() => ({
    opacity: sweep.value > 0 && sweep.value < 1 ? 1 : 0,
    transform: [
      { translateX: SWEEP_FROM + sweep.value * (SWEEP_TO - SWEEP_FROM) },
      { rotateZ: '18deg' },
    ],
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleIn.value,
    transform: [{ translateY: (1 - titleIn.value) * 12 }],
  }));

  const progressStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: progress.value }],
  }));

  return (
    <View style={styles.container}>
      {/* The app ships a light status bar for its dark screens; this one is
          light-grounded, so it needs the dark icon set while it is up. */}
      <StatusBar style="dark" />

      <Animated.View style={[styles.titleBlock, titleStyle]}>
        <Text style={styles.title}>Entrena con{'\n'}propósito</Text>
      </Animated.View>

      {/* Brand shape from the design, with its own gradient. The glass pane
          sits on top of it, so the shape is what the pane refracts. */}
      <View style={styles.stage}>
        <Animated.View style={blobStyle}>
          <Svg width={BLOB_W} height={BLOB_H} viewBox={BLOB_VIEWBOX}>
            <Defs>
              <SvgGradient id="brand" x1="0" y1="1" x2="1" y2="0">
                <Stop offset="0" stopColor={colors.accent} />
                <Stop offset="1" stopColor={colors.accentDeep} />
              </SvgGradient>
            </Defs>
            <Path d={BLOB_PATH} fill="url(#brand)" fillRule="evenodd" />
          </Svg>
        </Animated.View>

        <Animated.View style={[styles.pane, paneStyle]}>
          <LinearGradient
            colors={[colors.glassFillStrong, colors.glassFill]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
          />
          <LinearGradient
            colors={[colors.glassEdgeTop, 'transparent', colors.glassEdgeBottom]}
            style={styles.edge}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
          />

          <View style={styles.sweepClip} pointerEvents="none">
            <AnimatedGradient
              colors={['transparent', colors.glassSpecular, 'transparent']}
              style={[styles.sweep, sweepStyle]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
            />
          </View>

          <Image
            source={require('../../assets/neural.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>
      </View>

      {/* Loading hairline, anchored left so it grows rather than centring. */}
      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressFill, progressStyle]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBlock: {
    position: 'absolute',
    top: '14%',
    paddingHorizontal: 24,
  },
  title: {
    fontFamily: typography.fontFamily,
    fontSize: 34,
    fontWeight: typography.fontWeight.bold,
    lineHeight: 40,
    letterSpacing: -0.5,
    textAlign: 'center',
    color: colors.ink,
  },
  stage: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pane: {
    position: 'absolute',
    width: PANE_W,
    height: PANE_H,
    borderRadius: 28,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.55)',
    ...Platform.select({
      ios: {
        shadowColor: colors.ink,
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.16,
        shadowRadius: 30,
      },
      android: { elevation: 12 },
    }),
  },
  edge: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 28,
  },
  sweepClip: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  sweep: {
    position: 'absolute',
    top: -PANE_H,
    bottom: -PANE_H,
    width: SWEEP_W,
  },
  logo: {
    width: 150,
    height: 40,
  },
  progressTrack: {
    position: 'absolute',
    bottom: 72,
    width: 116,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(17, 17, 17, 0.10)',
    overflow: 'hidden',
  },
  progressFill: {
    width: '100%',
    height: '100%',
    borderRadius: 2,
    backgroundColor: colors.ink,
    transformOrigin: 'left',
  },
});
