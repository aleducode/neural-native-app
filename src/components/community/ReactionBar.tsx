import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { colors, typography, spacing, borderRadius } from '../../theme/colors';
import { ReactionType, REACTION_ICONS, REACTION_LABELS } from '../../types/community';

interface ReactionBarProps {
  userReaction: ReactionType | null;
  onReactionPress: (type: ReactionType) => void;
  showPicker: boolean;
  onClosePicker: () => void;
  onMainPress: () => void;
  onMainLongPress: () => void;
}

const REACTION_TYPES: ReactionType[] = ['fire', 'muscle', 'clap', 'heart'];

interface AnimatedReactionButtonProps {
  type: ReactionType;
  isActive: boolean;
  onPress: () => void;
}

interface PickerReactionButtonProps {
  type: ReactionType;
  isActive: boolean;
  label: string;
  onPress: () => void;
}

function PickerReactionButton({ type, isActive, label, onPress }: PickerReactionButtonProps) {
  const scale = useSharedValue(1);
  const iconScale = useSharedValue(1);

  const handlePress = () => {
    // More pronounced bounce for picker buttons
    scale.value = withSequence(
      withSpring(0.8, { damping: 6, stiffness: 400 }),
      withSpring(1.05, { damping: 8, stiffness: 200 }),
      withSpring(1, { damping: 10, stiffness: 150 })
    );
    iconScale.value = withSequence(
      withSpring(1.5, { damping: 5, stiffness: 400 }),
      withSpring(0.9, { damping: 8, stiffness: 200 }),
      withSpring(1, { damping: 10, stiffness: 150 })
    );
    onPress();
  };

  const animatedButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  return (
    <Pressable onPress={handlePress}>
      <Animated.View style={[styles.pickerButton, isActive && styles.pickerButtonActive, animatedButtonStyle]}>
        <Animated.View style={[styles.pickerIconContainer, animatedIconStyle]}>
          <Ionicons 
            name={(isActive 
              ? REACTION_ICONS[type].filled 
              : REACTION_ICONS[type].outline) as any} 
            size={28} 
            color={isActive ? colors.primary : colors.white} 
          />
        </Animated.View>
        <Text style={styles.pickerLabel}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

function AnimatedReactionButton({ type, isActive, onPress }: AnimatedReactionButtonProps) {
  const scale = useSharedValue(1);
  const iconScale = useSharedValue(1);
  const rippleScale = useSharedValue(0);
  const rippleOpacity = useSharedValue(0);

  const handlePress = () => {
    // More pronounced bounce animation on press - ONLY when user clicks
    scale.value = withSequence(
      withSpring(0.75, { damping: 6, stiffness: 400 }),
      withSpring(1.1, { damping: 8, stiffness: 200 }),
      withSpring(1, { damping: 10, stiffness: 150 })
    );
    
    // Icon bounce - more dramatic
    iconScale.value = withSequence(
      withSpring(1.6, { damping: 5, stiffness: 400 }),
      withSpring(0.9, { damping: 8, stiffness: 200 }),
      withSpring(1, { damping: 10, stiffness: 150 })
    );

    // Ripple effect - more visible
    rippleScale.value = 0;
    rippleOpacity.value = 0.5;
    rippleScale.value = withTiming(2.5, { duration: 500 });
    rippleOpacity.value = withTiming(0, { duration: 500 });

    onPress();
  };

  const animatedButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
    opacity: isActive ? 1 : 0.7,
  }));

  const animatedRippleStyle = useAnimatedStyle(() => {
    const rippleOpacityValue = interpolate(
      rippleScale.value,
      [0, 1, 2.5],
      [0, 0.5, 0],
      Extrapolate.CLAMP
    );
    return {
      transform: [{ scale: rippleScale.value }],
      opacity: rippleOpacityValue,
    };
  });

  const animatedContainerStyle = useAnimatedStyle(() => {
    const backgroundColor = isActive
      ? 'rgba(90, 107, 255, 0.15)'
      : 'rgba(255, 255, 255, 0.05)';
    const borderColor = isActive
      ? 'rgba(90, 107, 255, 0.3)'
      : 'rgba(255, 255, 255, 0.08)';
    
    return {
      backgroundColor,
      borderColor,
    };
  });

  return (
    <Pressable onPress={handlePress} style={styles.reactionButtonWrapper}>
      <Animated.View style={[styles.reactionButton, animatedContainerStyle, animatedButtonStyle]}>
        {/* Ripple effect */}
        <Animated.View style={[styles.ripple, animatedRippleStyle]} />
        
        {/* Icon */}
        <Animated.View style={animatedIconStyle}>
          <Ionicons 
            name={(isActive 
              ? REACTION_ICONS[type].filled 
              : REACTION_ICONS[type].outline) as any} 
            size={18} 
            color={isActive ? colors.primary : colors.gray400} 
          />
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

export default function ReactionBar({
  userReaction,
  onReactionPress,
  showPicker,
  onClosePicker,
  onMainPress,
  onMainLongPress,
}: ReactionBarProps) {
  return (
    <View style={styles.container}>
      {/* Reaction Buttons */}
      <View style={styles.reactionButtons}>
        {REACTION_TYPES.map((type) => (
          <AnimatedReactionButton
            key={type}
            type={type}
            isActive={userReaction === type}
            onPress={() => onReactionPress(type)}
          />
        ))}
      </View>

      {/* Reaction Picker Modal */}
      <Modal
        visible={showPicker}
        transparent
        animationType="fade"
        onRequestClose={onClosePicker}
      >
        <Pressable style={styles.pickerOverlay} onPress={onClosePicker}>
          <View style={styles.pickerContainer}>
            <Text style={styles.pickerTitle}>Reaccionar</Text>
            <View style={styles.pickerButtons}>
              {REACTION_TYPES.map((type) => {
                const isActive = userReaction === type;
                return (
                  <PickerReactionButton
                    key={type}
                    type={type}
                    isActive={isActive}
                    label={REACTION_LABELS[type]}
                    onPress={() => {
                      onReactionPress(type);
                      onClosePicker();
                    }}
                  />
                );
              })}
            </View>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reactionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  reactionButtonWrapper: {
    // Wrapper for proper hit area
  },
  reactionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    overflow: 'hidden',
  },
  ripple: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    opacity: 0,
    top: 0,
    left: 0,
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
  },
  pickerContainer: {
    backgroundColor: colors.cardDark,
    borderRadius: borderRadius.xl,
    padding: spacing.xxl,
    width: '100%',
    maxWidth: 320,
  },
  pickerTitle: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  pickerButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  pickerButton: {
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    minWidth: 70,
  },
  pickerButtonActive: {
    backgroundColor: 'rgba(90, 107, 255, 0.15)',
  },
  pickerIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  pickerLabel: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.medium,
    color: colors.gray400,
  },
});
