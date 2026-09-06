import React from 'react';
import { View, Text, StyleSheet, Pressable, Modal } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import { colors, typography } from '../../theme/colors';
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
      style={({ pressed }) => [styles.pickerButton, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: isActive }}
    >
      <View style={[styles.pickerIcon, isActive && styles.pickerIconActive]}>
        <Feather
          name={REACTION_ICONS[type].icon as any}
          size={24}
          color={isActive ? colors.accentDeep : colors.ink}
        />
      </View>
      <Text style={[styles.pickerLabel, isActive && styles.pickerLabelActive]}>{label}</Text>
    </Pressable>
  );
}

/**
 * One reaction control plus the picker behind it.
 *
 * The bar used to show four always-on icon buttons and declare `onMainPress` /
 * `onMainLongPress` without ever reading them, so every long-press path its
 * callers had written was dead. Now the pill is the main control — tap to
 * react, hold to choose — and the chevron opens the same picker with a plain
 * tap, so the choice is reachable without knowing the gesture.
 */
export default function ReactionBar({
  userReaction,
  onReactionPress,
  showPicker,
  onClosePicker,
  onMainPress,
  onMainLongPress,
}: ReactionBarProps) {
  const handleMainPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onMainPress();
  };

  const handleOpenPicker = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onMainLongPress();
  };

  // A neutral face for "no reaction yet": the fire icon already means fuego,
  // so reusing it here would read as an active reaction.
  const icon = userReaction ? REACTION_ICONS[userReaction].icon : 'smile';
  const label = userReaction ? REACTION_LABELS[userReaction] : 'Reaccionar';

  return (
    <View style={styles.container}>
      <Pressable
        onPress={handleMainPress}
        onLongPress={handleOpenPicker}
        delayLongPress={240}
        style={({ pressed }) => [
          styles.main,
          !!userReaction && styles.mainActive,
          pressed && styles.pressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint="Mantén presionado para elegir otra reacción"
        accessibilityState={{ selected: !!userReaction }}
      >
        <Feather
          name={icon as any}
          size={16}
          color={userReaction ? colors.accentDeep : colors.ink}
        />
        <Text style={[styles.mainLabel, !!userReaction && styles.mainLabelActive]}>{label}</Text>
      </Pressable>

      <Pressable
        onPress={handleOpenPicker}
        style={({ pressed }) => [styles.more, pressed && styles.pressed]}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Elegir reacción"
      >
        <Feather name="chevron-up" size={16} color={colors.gray400} />
      </Pressable>

      <Modal visible={showPicker} transparent animationType="fade" onRequestClose={onClosePicker}>
        <Pressable style={styles.pickerOverlay} onPress={onClosePicker}>
          <View style={styles.pickerCard}>
            <Text style={styles.pickerTitle}>Reaccionar</Text>
            <View style={styles.pickerRow}>
              {REACTION_TYPES.map((type) => (
                <PickerReactionButton
                  key={type}
                  type={type}
                  isActive={userReaction === type}
                  label={REACTION_LABELS[type]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
    gap: 6,
  },
  main: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: colors.surface,
  },
  mainActive: {
    backgroundColor: colors.accentSoft,
  },
  mainLabel: {
    fontFamily: typography.fontFamily,
    fontSize: 13,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.ink,
  },
  mainLabelActive: {
    color: colors.accentDeep,
  },
  more: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  pressed: {
    opacity: 0.7,
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(17, 17, 17, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  pickerCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 20,
    gap: 20,
  },
  pickerTitle: {
    fontFamily: typography.fontFamily,
    fontSize: 20,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: -0.4,
    color: colors.ink,
  },
  pickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pickerButton: {
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  pickerIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  pickerIconActive: {
    backgroundColor: colors.accentSoft,
  },
  pickerLabel: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    color: colors.gray400,
  },
  pickerLabelActive: {
    color: colors.ink,
    fontWeight: typography.fontWeight.semiBold,
  },
});
