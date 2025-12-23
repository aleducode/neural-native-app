import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing } from '../theme/colors';

interface InputProps extends TextInputProps {
  label: string;
  placeholder?: string;
  error?: string;
}

export default function Input({ label, placeholder, error, secureTextEntry, ...props }: InputProps) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const togglePasswordVisibility = () => {
    setIsPasswordVisible(!isPasswordVisible);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputWrapper, error && styles.inputWrapperError]}>
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={colors.gray400}
          secureTextEntry={secureTextEntry && !isPasswordVisible}
          {...props}
        />
        {secureTextEntry && (
          <TouchableOpacity onPress={togglePasswordVisibility} style={styles.eyeButton}>
            <Ionicons
              name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'}
              size={18}
              color={colors.gray400}
            />
          </TouchableOpacity>
        )}
        {error && !secureTextEntry && (
          <View style={styles.errorIndicator}>
            <Ionicons name="alert-circle" size={14} color={colors.error} />
          </View>
        )}
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: spacing.sm,
  },
  label: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.medium,
    color: colors.textDark,
  },
  inputWrapper: {
    backgroundColor: colors.gray200,
    height: 44,
    borderRadius: 22,
    paddingHorizontal: spacing.xl,
    justifyContent: 'center',
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputWrapperError: {
    borderWidth: 1,
    borderColor: colors.error,
  },
  input: {
    flex: 1,
    fontSize: typography.fontSize.xl,
    fontFamily: typography.fontFamily.regular,
    color: colors.textDark,
    padding: 0,
  },
  eyeButton: {
    padding: spacing.sm,
    marginLeft: spacing.sm,
  },
  errorIndicator: {
    marginLeft: spacing.sm,
  },
  error: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.error,
  },
});
