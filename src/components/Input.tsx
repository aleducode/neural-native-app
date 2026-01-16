import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../theme/colors';

interface InputProps {
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  error?: string;
  editable?: boolean;
}

export default function Input({
  placeholder,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType = 'default',
  autoCapitalize = 'none',
  error,
  editable = true,
}: InputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = secureTextEntry !== undefined;

  return (
    <View style={[styles.container, error && styles.containerError]}>
      <Text style={styles.placeholder}>{placeholder}</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={[styles.input, !editable && styles.inputDisabled, error && styles.inputError]}
          value={value || ''}
          onChangeText={(text) => {
            // Ensure onChangeText always receives a string, never null/undefined
            if (onChangeText) {
              onChangeText(text || '');
            }
          }}
          secureTextEntry={isPassword && !showPassword}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          placeholderTextColor={colors.gray400}
          editable={editable}
        />
        {isPassword && (
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={error ? colors.error : colors.gray400}
            />
          </TouchableOpacity>
        )}
      </View>
      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={14} color={colors.error} />
          <Text style={styles.error}>{error}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.gray200,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  containerError: {
    borderColor: colors.error,
    backgroundColor: colors.white,
  },
  inputError: {
    color: colors.textDark,
  },
  placeholder: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.medium,
    color: colors.gray400,
    marginBottom: spacing.xs,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.medium,
    color: colors.textDark,
    padding: 0,
    minHeight: 24,
  },
  inputDisabled: {
    color: colors.gray400,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  error: {
    flex: 1,
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.regular,
    color: colors.error,
    lineHeight: typography.lineHeight.xs,
  },
});
