import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Modal,
} from 'react-native';
import { colors, typography, spacing, borderRadius } from '../../theme/colors';
import { ReactionType, REACTION_EMOJIS, REACTION_LABELS } from '../../types/community';

interface ReactionBarProps {
  userReaction: ReactionType | null;
  onReactionPress: (type: ReactionType) => void;
  showPicker: boolean;
  onClosePicker: () => void;
  onMainPress: () => void;
  onMainLongPress: () => void;
}

const REACTION_TYPES: ReactionType[] = ['fire', 'muscle', 'clap', 'heart'];

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
          <TouchableOpacity
            key={type}
            style={[
              styles.reactionButton,
              userReaction === type && styles.reactionButtonActive,
            ]}
            onPress={() => onReactionPress(type)}
            activeOpacity={0.7}
          >
            <Text style={styles.reactionEmoji}>{REACTION_EMOJIS[type]}</Text>
          </TouchableOpacity>
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
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.pickerButton,
                    userReaction === type && styles.pickerButtonActive,
                  ]}
                  onPress={() => {
                    onReactionPress(type);
                    onClosePicker();
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.pickerEmoji}>{REACTION_EMOJIS[type]}</Text>
                  <Text style={styles.pickerLabel}>{REACTION_LABELS[type]}</Text>
                </TouchableOpacity>
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
    gap: spacing.xs,
  },
  reactionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.gray600,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reactionButtonActive: {
    backgroundColor: 'rgba(90, 107, 255, 0.3)',
  },
  reactionEmoji: {
    fontSize: 18,
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
  },
  pickerButtonActive: {
    backgroundColor: 'rgba(90, 107, 255, 0.2)',
  },
  pickerEmoji: {
    fontSize: 32,
    marginBottom: spacing.xs,
  },
  pickerLabel: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.medium,
    color: colors.gray400,
  },
});
