import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
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

interface ReactionButtonProps {
  type: ReactionType;
  isActive: boolean;
  onPress: () => void;
}

function ReactionButton({ type, isActive, onPress }: ReactionButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.reactionButton,
        isActive && styles.reactionButtonActive,
        pressed && styles.reactionButtonPressed,
      ]}
    >
      <Feather
        name={REACTION_ICONS[type].icon as any}
        size={18}
        color={isActive ? colors.primary : colors.gray400}
      />
    </Pressable>
  );
}

interface PickerReactionButtonProps {
  type: ReactionType;
  isActive: boolean;
  label: string;
  onPress: () => void;
}

function PickerReactionButton({ type, isActive, label, onPress }: PickerReactionButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.pickerButton,
        isActive && styles.pickerButtonActive,
        pressed && styles.pickerButtonPressed,
      ]}
    >
      <View style={[styles.pickerIconContainer, isActive && styles.pickerIconContainerActive]}>
        <Feather
          name={REACTION_ICONS[type].icon as any}
          size={28}
          color={isActive ? colors.primary : colors.white}
        />
      </View>
      <Text style={styles.pickerLabel}>{label}</Text>
    </Pressable>
  );
}

export default function ReactionBar({
  userReaction,
  onReactionPress,
  showPicker,
  onClosePicker,
}: ReactionBarProps) {
  return (
    <View style={styles.container}>
      {/* Reaction Buttons */}
      <View style={styles.reactionButtons}>
        {REACTION_TYPES.map((type) => (
          <ReactionButton
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
              {REACTION_TYPES.map((type) => (
                <PickerReactionButton
                  key={type}
                  type={type}
                  isActive={userReaction === type}
                  label={REACTION_LABELS[type]}
                  onPress={() => {
                    onReactionPress(type);
                    onClosePicker();
                  }}
                />
              ))}
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
  reactionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  reactionButtonActive: {
    backgroundColor: 'rgba(90, 107, 255, 0.15)',
    borderColor: 'rgba(90, 107, 255, 0.3)',
  },
  reactionButtonPressed: {
    opacity: 0.7,
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
  pickerButtonPressed: {
    opacity: 0.7,
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
  pickerIconContainerActive: {
    backgroundColor: 'rgba(90, 107, 255, 0.15)',
    borderColor: 'rgba(90, 107, 255, 0.3)',
  },
  pickerLabel: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.medium,
    color: colors.gray400,
  },
});
