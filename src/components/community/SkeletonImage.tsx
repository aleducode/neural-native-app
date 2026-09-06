import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Image,
  ImageProps,
  StyleProp,
  ViewStyle,
  ImageStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { colors } from '../../theme/colors';

interface SkeletonImageProps extends Omit<ImageProps, 'source' | 'style'> {
  source: { uri: string } | number;
  style?: StyleProp<ViewStyle>;
  skeletonStyle?: StyleProp<ViewStyle>;
  borderRadius?: number;
}

export default function SkeletonImage({
  source,
  style,
  skeletonStyle,
  borderRadius = 0,
  ...imageProps
}: SkeletonImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const shimmerTranslate = useSharedValue(-1);
  const imageOpacity = useSharedValue(0);

  useEffect(() => {
    // Shimmer animation loop
    shimmerTranslate.value = withRepeat(
      withTiming(1, { duration: 1500 }),
      -1,
      false
    );
  }, []);

  useEffect(() => {
    if (!isLoading) {
      // Fade in image when loaded
      imageOpacity.value = withTiming(1, { duration: 300 });
    }
  }, [isLoading]);

  const shimmerStyle = useAnimatedStyle(() => {
    const translateX = interpolate(
      shimmerTranslate.value,
      [-1, 1],
      [0, 400],
      Extrapolate.CLAMP
    );
    return {
      transform: [{ translateX }, { skewX: '-20deg' }],
    };
  });

  const imageAnimatedStyle = useAnimatedStyle(() => ({
    opacity: imageOpacity.value,
  }));

  const skeletonAnimatedStyle = useAnimatedStyle(() => ({
    opacity: isLoading ? 1 : 0,
  }));

  return (
    <View style={[styles.container, style, { borderRadius }]}>
      {/* Skeleton/Shimmer */}
      {isLoading && (
        <Animated.View
          style={[
            styles.skeleton,
            skeletonStyle,
            { borderRadius },
            skeletonAnimatedStyle,
          ]}
        >
          <Animated.View style={[styles.shimmer, shimmerStyle]} />
        </Animated.View>
      )}

      {/* Image */}
      {!hasError && (
        <Animated.View style={[styles.imageWrapper, { borderRadius }, imageAnimatedStyle]}>
          <Image
            {...imageProps}
            source={source}
            style={[styles.image, style as StyleProp<ImageStyle>]}
            onLoadStart={() => setIsLoading(true)}
            onLoadEnd={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false);
              setHasError(true);
            }}
          />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    // The placeholder sits on white cards now, so it has to be a light tone;
    // the old translucent white was invisible against them.
    backgroundColor: colors.surface,
  },
  skeleton: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    left: '-50%',
    width: '50%',
    height: '100%',
    backgroundColor: colors.white,
    opacity: 0.7,
    transform: [{ skewX: '-20deg' }],
  },
  imageWrapper: {
    width: '100%',
    height: '100%',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});

