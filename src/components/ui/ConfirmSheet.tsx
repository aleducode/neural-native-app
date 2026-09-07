import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable } from 'react-native';
import { colors, typography } from '../../theme/colors';
import PrimaryButton from './PrimaryButton';

interface ConfirmSheetProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Confirmation sheet in the new language: white card, editorial title, pill
 * actions.
 *
 * The older ConfirmModal still paints the legacy blue and shouts in uppercase,
 * and it belongs to screens that have not migrated yet — so the migrated ones
 * share this instead of changing theirs.
 */
export default function ConfirmSheet({
  visible,
  title,
  message,
  confirmText,
  cancelText,
  destructive,
  onConfirm,
  onCancel,
}: ConfirmSheetProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={sheetStyles.scrim}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} accessibilityLabel="Cerrar" />
        <View style={sheetStyles.card}>
          <Text style={sheetStyles.title}>{title}</Text>
          <Text style={sheetStyles.message}>{message}</Text>
          <View style={sheetStyles.actions}>
            <PrimaryButton
              label={confirmText}
              variant={destructive ? 'danger' : 'primary'}
              onPress={onConfirm}
            />
            {!!cancelText && (
              <PrimaryButton label={cancelText} variant="secondary" onPress={onCancel} />
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const sheetStyles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(17, 17, 17, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 24,
  },
  title: {
    fontFamily: typography.fontFamily,
    fontSize: 24,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: -0.6,
    color: colors.ink,
  },
  message: {
    marginTop: 8,
    fontFamily: typography.fontFamily,
    fontSize: 15,
    lineHeight: 21,
    color: colors.gray400,
  },
  actions: {
    marginTop: 24,
    gap: 10,
  },
});
