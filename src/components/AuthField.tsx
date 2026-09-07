import React, { forwardRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  Platform,
  type TextInputProps,
  type ViewProps,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import { colors, typography } from '../theme/colors';

type FieldKind = 'email' | 'password' | 'text' | 'phone';

interface AuthFieldProps {
  kind: FieldKind;
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  editable?: boolean;
  returnKeyType?: TextInputProps['returnKeyType'];
  onSubmitEditing?: TextInputProps['onSubmitEditing'];
  /** Lets the screen scroll this field clear of the keyboard. */
  onFocus?: () => void;
  /** Reports where the field sits, so the screen knows how far to scroll. */
  onLayout?: ViewProps['onLayout'];
}

const LEADING_ICON: Record<FieldKind, keyof typeof Feather.glyphMap> = {
  email: 'mail',
  password: 'lock',
  text: 'user',
  phone: 'phone',
};

const AUTOCOMPLETE: Record<FieldKind, TextInputProps['autoComplete']> = {
  email: 'email',
  password: 'current-password',
  text: 'name',
  phone: 'tel',
};

const TEXT_CONTENT: Record<FieldKind, TextInputProps['textContentType']> = {
  email: 'emailAddress',
  password: 'password',
  text: 'name',
  phone: 'telephoneNumber',
};

const PLACEHOLDER: Record<FieldKind, string> = {
  email: 'tu@correo.com',
  password: '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022',
  text: '',
  phone: '+57 300 000 0000',
};

/**
 * Auth input with a persistent label above the field.
 *
 * A placeholder-only field loses its label the moment you type, which is the
 * single most common accessibility failure in login forms — so the label
 * stays put and the placeholder only hints at format.
 *
 * Focus is animated rather than toggled so the border doesn't snap, and the
 * field is 58 tall with 16px text: 12px placeholders are below the platform
 * minimum for body copy.
 */
const AuthField = forwardRef<TextInput, AuthFieldProps>(function AuthField(
  {
    kind,
    label,
    value,
    onChangeText,
    error,
    editable = true,
    returnKeyType,
    onSubmitEditing,
    onFocus,
    onLayout,
  },
  ref
) {
  const [revealed, setRevealed] = useState(false);
  const [focused, setFocused] = useState(false);
  const focus = useSharedValue(0);
  const isPassword = kind === 'password';

  const setFocus = (next: boolean) => {
    setFocused(next);
    focus.value = withTiming(next ? 1 : 0, { duration: 160 });
  };

  const boxStyle = useAnimatedStyle(() => ({
    borderColor: error
      ? colors.error
      : interpolateColor(focus.value, [0, 1], [colors.surface, colors.ink]),
    backgroundColor: interpolateColor(focus.value, [0, 1], [colors.surface, colors.white]),
  }));

  const iconColor = error ? colors.error : focused ? colors.ink : colors.gray400;

  return (
    <View style={styles.wrapper} onLayout={onLayout}>
      <Text style={[styles.label, !!error && styles.labelError]}>{label}</Text>

      <Animated.View style={[styles.field, boxStyle, !editable && styles.fieldDisabled]}>
        <Feather name={LEADING_ICON[kind]} size={20} color={iconColor} />

        <TextInput
          ref={ref}
          style={styles.input}
          value={value || ''}
          onChangeText={(text) => onChangeText?.(text || '')}
          onFocus={() => {
            setFocus(true);
            onFocus?.();
          }}
          onBlur={() => setFocus(false)}
          placeholder={PLACEHOLDER[kind]}
          placeholderTextColor={colors.gray400}
          editable={editable}
          secureTextEntry={isPassword && !revealed}
          keyboardType={
            kind === 'email' ? 'email-address' : kind === 'phone' ? 'phone-pad' : 'default'
          }
          autoCapitalize={kind === 'text' ? 'words' : 'none'}
          autoCorrect={false}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          autoComplete={AUTOCOMPLETE[kind]}
          textContentType={TEXT_CONTENT[kind]}
          accessibilityLabel={label}
        />

        {isPassword && (
          <Pressable
            onPress={() => setRevealed((r) => !r)}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={revealed ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <Feather name={revealed ? 'eye' : 'eye-off'} size={20} color={iconColor} />
          </Pressable>
        )}
      </Animated.View>

      {!!error && (
        <View style={styles.errorRow}>
          <Feather name="alert-circle" size={14} color={colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
});

export default AuthField;

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    gap: 8,
  },
  label: {
    fontFamily: typography.fontFamily,
    fontSize: 13,
    fontWeight: typography.fontWeight.semiBold,
    letterSpacing: 0.2,
    color: colors.ink,
  },
  labelError: {
    color: colors.error,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: 58,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  fieldDisabled: {
    opacity: 0.55,
  },
  input: {
    flex: 1,
    padding: 0,
    fontFamily: typography.fontFamily,
    fontSize: 16,
    fontWeight: typography.fontWeight.medium,
    color: colors.ink,
    ...Platform.select({ android: { paddingVertical: 0 } }),
  },
  pressed: {
    opacity: 0.5,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  errorText: {
    flex: 1,
    fontFamily: typography.fontFamily,
    fontSize: 13,
    color: colors.error,
  },
});
