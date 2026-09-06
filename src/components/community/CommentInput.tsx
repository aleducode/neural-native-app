import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import { colors, typography } from '../../theme/colors';

interface CommentInputProps {
  onSubmit: (content: string) => Promise<void>;
  placeholder?: string;
  /** Inline failure message, shown above the field instead of in an alert. */
  error?: string;
  onChangeContent?: () => void;
}

export default function CommentInput({
  onSubmit,
  placeholder = 'Escribe un comentario...',
  error,
  onChangeContent,
}: CommentInputProps) {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    const trimmedContent = content.trim();
    if (!trimmedContent || isSubmitting) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsSubmitting(true);
    try {
      await onSubmit(trimmedContent);
      setContent('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = content.trim().length > 0 && !isSubmitting;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.wrapper}>
        {!!error && <Text style={styles.error}>{error}</Text>}

        <View style={styles.row}>
          <View style={styles.field}>
            <TextInput
              style={styles.input}
              value={content}
              onChangeText={(text) => {
                setContent(text);
                onChangeContent?.();
              }}
              placeholder={placeholder}
              placeholderTextColor={colors.gray400}
              multiline
              maxLength={300}
              editable={!isSubmitting}
            />
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.send,
              !canSubmit && styles.sendDisabled,
              pressed && styles.pressed,
            ]}
            onPress={handleSubmit}
            disabled={!canSubmit}
            accessibilityRole="button"
            accessibilityLabel="Enviar comentario"
            accessibilityState={{ disabled: !canSubmit, busy: isSubmitting }}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Feather
                name="arrow-up"
                size={20}
                color={canSubmit ? colors.white : colors.gray400}
              />
            )}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.white,
  },
  error: {
    fontFamily: typography.fontFamily,
    fontSize: 13,
    color: colors.error,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  field: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 12 : 6,
    minHeight: 44,
    maxHeight: 110,
  },
  input: {
    fontFamily: typography.fontFamily,
    fontSize: 15,
    color: colors.ink,
    maxHeight: 86,
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: {
    backgroundColor: colors.surface,
  },
  pressed: {
    opacity: 0.85,
  },
});
