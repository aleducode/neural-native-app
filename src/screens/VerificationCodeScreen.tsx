import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import Svg, { Path, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { colors, typography } from '../theme/colors';
import { captureException, addBreadcrumb } from '../utils/sentry';

const { width: SCREEN_W } = Dimensions.get('window');

// Same brand shape as the splash and the login, bled off the top corner so the
// flow keeps one continuous mark across its screens.
const BLOB_VIEWBOX = '0 0 343 380.74';
const BLOB_PATH =
  'M0 142.78c0 0 0 152.29 0 152.29 0 0 47.64 0 47.64 0 5 0 9.96 0.99 14.58 2.9 4.63 1.91 8.83 4.72 12.37 8.25 3.54 3.54 6.34 7.74 8.26 12.36 1.91 4.62 2.9 9.57 2.9 14.57 0 0 0 47.59 0 47.59 0 0 114.33 0 114.33 0 0 0 142.92-142.78 142.92-142.78 0 0 0-152.29 0-152.29 0 0-47.64 0-47.64 0-5 0-9.96-0.99-14.58-2.9-4.63-1.92-8.83-4.72-12.37-8.26-3.54-3.53-6.34-7.73-8.26-12.35-1.91-4.62-2.9-9.57-2.9-14.57 0 0 0-47.59 0-47.59 0 0-114.33 0-114.33 0 0 0-142.92 142.78-142.92 142.78z m161.97 142.77c0 0-66.69 0-66.69 0 0 0 0-104.7 0-104.7 0 0 85.75-85.67 85.75-85.67 0 0 66.69 0 66.69 0 0 0 0 104.71 0 104.71 0 0-85.75 85.66-85.75 85.66z';

const DECOR_W = SCREEN_W * 0.95;
const DECOR_H = DECOR_W * (380.74 / 343);

const CODE_LENGTH = 6;
const RESEND_SECONDS = 60;

export type VerificationResult = { ok: boolean; error?: string };

type Props = {
  /** Email the code was sent to. Shown in the subtitle. */
  email?: string;
  /**
   * Real verification call. There is no code-verification endpoint in src/api
   * yet, so this is injected from the outside once the backend exists.
   */
  onVerify?: (code: string) => Promise<VerificationResult>;
  /** Resend call, same reasoning as onVerify. */
  onResend?: () => Promise<void>;
  /** Called after a code verifies, so the navigator decides where to go next. */
  onVerified?: (code: string) => void;
};

/**
 * TODO: there is no verification endpoint in src/api yet. Until one exists this
 * simulates the round trip so the screen is testable end to end. Wire the real
 * call by passing `onVerify` from the navigator; do NOT call authApi here with
 * a method that does not exist.
 */
async function simulateVerify(code: string): Promise<VerificationResult> {
  await new Promise((resolve) => setTimeout(resolve, 900));
  // Placeholder rule so both paths are reachable while the backend is missing.
  return code === '123456'
    ? { ok: true }
    : { ok: false, error: 'El código no es correcto. Revisa e intenta de nuevo.' };
}

/** TODO: same as above — no resend endpoint exists yet. */
async function simulateResend(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 600));
}

export default function VerificationCodeScreen({
  email: emailProp,
  onVerify,
  onResend,
  onVerified,
}: Props) {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  // The screen is not wired to the navigator yet, so params are a fallback and
  // never assumed to be there.
  const email: string = emailProp ?? route.params?.email ?? '';

  const [code, setCode] = useState('');
  const [focused, setFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);

  const inputRef = useRef<TextInput>(null);
  // Guards the auto-submit so a re-render on the sixth digit can't fire twice.
  const submittingRef = useRef(false);

  // Short staggered entrance, matching the login. Anything longer makes an
  // auth step feel slow, which is the opposite of premium.
  const intro = useSharedValue(0);
  useEffect(() => {
    intro.value = withTiming(1, { duration: 460, easing: Easing.out(Easing.cubic) });
  }, []);

  const headerStyle = useAnimatedStyle(() => ({
    opacity: intro.value,
    transform: [{ translateY: (1 - intro.value) * 18 }],
  }));
  const formStyle = useAnimatedStyle(() => ({
    opacity: withDelay(80, withTiming(intro.value, { duration: 400 })),
    transform: [{ translateY: withDelay(80, withTiming((1 - intro.value) * 18, { duration: 400 })) }],
  }));
  const footerStyle = useAnimatedStyle(() => ({
    opacity: withDelay(160, withTiming(intro.value, { duration: 400 })),
  }));

  // Resend countdown. Restarted every time a code goes out again.
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  // The keyboard should already be up: the only thing to do here is type.
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 420);
    return () => clearTimeout(timer);
  }, []);

  const countdownLabel = useMemo(
    () => `Reenviar en 00:${String(secondsLeft).padStart(2, '0')}`,
    [secondsLeft]
  );

  const handleVerify = useCallback(
    async (value: string) => {
      if (submittingRef.current) return;
      submittingRef.current = true;

      setIsLoading(true);
      setError(null);
      Keyboard.dismiss();

      addBreadcrumb('Verification code submitted', 'auth', {
        email: email.toLowerCase(),
        codeLength: value.length,
        simulated: !onVerify,
      });

      try {
        const result = onVerify ? await onVerify(value) : await simulateVerify(value);

        setIsLoading(false);
        submittingRef.current = false;

        if (result.ok) {
          addBreadcrumb('Verification code accepted', 'auth', { email: email.toLowerCase() });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          onVerified?.(value);
          return;
        }

        addBreadcrumb('Verification code rejected', 'auth', {
          email: email.toLowerCase(),
          error: result.error,
        });
        // A wrong code is expected traffic, not an exception. It belongs under
        // the boxes, not in a modal the user has to dismiss to retype.
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setError(result.error ?? 'El código no es correcto. Revisa e intenta de nuevo.');
        setCode('');
        inputRef.current?.focus();
      } catch (err) {
        setIsLoading(false);
        submittingRef.current = false;
        captureException(err as Error, {
          context: 'handleVerify',
          email: email.toLowerCase(),
          codeLength: value.length,
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setError('Ocurrió un error inesperado al verificar el código.');
        setCode('');
        inputRef.current?.focus();
      }
    },
    [email, onVerify, onVerified]
  );

  const handleChange = useCallback(
    (raw: string) => {
      // Paste and SMS autofill both arrive here in one shot, so strip anything
      // that isn't a digit instead of trusting the keyboard type.
      const digits = (raw || '').replace(/[^0-9]/g, '').slice(0, CODE_LENGTH);
      if (digits === code) return;

      setCode(digits);
      if (error) setError(null);

      if (digits.length > code.length) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      // Six digits is the whole intent. Making the user reach for the button
      // afterwards is a step that carries no information.
      if (digits.length === CODE_LENGTH) {
        handleVerify(digits);
      }
    },
    [code, error, handleVerify]
  );

  const handleResend = useCallback(async () => {
    if (secondsLeft > 0 || isResending || isLoading) return;

    setIsResending(true);
    setError(null);
    setCode('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    addBreadcrumb('Verification code resend requested', 'auth', {
      email: email.toLowerCase(),
      simulated: !onResend,
    });

    try {
      if (onResend) await onResend();
      else await simulateResend();
      setSecondsLeft(RESEND_SECONDS);
      inputRef.current?.focus();
    } catch (err) {
      captureException(err as Error, {
        context: 'handleResend',
        email: email.toLowerCase(),
      });
      setError('No pudimos reenviar el código. Intenta de nuevo.');
    } finally {
      setIsResending(false);
    }
  }, [secondsLeft, isResending, isLoading, email, onResend]);

  const digits = code.split('');
  const canResend = secondsLeft <= 0 && !isResending && !isLoading;

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      <View style={styles.decor} pointerEvents="none">
        <Svg width={DECOR_W} height={DECOR_H} viewBox={BLOB_VIEWBOX}>
          <Defs>
            <SvgGradient id="verifyBrand" x1="0" y1="1" x2="1" y2="0">
              <Stop offset="0" stopColor={colors.accent} stopOpacity={0.55} />
              <Stop offset="1" stopColor={colors.accentDeep} stopOpacity={0.35} />
            </SvgGradient>
          </Defs>
          <Path d={BLOB_PATH} fill="url(#verifyBrand)" fillRule="evenodd" />
        </Svg>
      </View>

      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.flex}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            <Animated.View style={headerStyle}>
              <Pressable
                onPress={() => navigation.goBack()}
                accessibilityRole="button"
                accessibilityLabel="Volver"
                hitSlop={8}
                style={({ pressed }) => [styles.back, pressed && styles.pressed]}
              >
                <Feather name="arrow-left" size={20} color={colors.ink} />
              </Pressable>

              <View style={styles.header}>
                <Text style={styles.title}>Ingresa el{'\n'}código</Text>
                <Text style={styles.subtitle}>
                  Enviamos un código de 6 dígitos a{' '}
                  <Text style={styles.subtitleStrong}>{email}</Text>.
                </Text>
              </View>
            </Animated.View>

            <Animated.View style={[styles.form, formStyle]}>
              <Pressable
                onPress={() => inputRef.current?.focus()}
                accessibilityRole="none"
                style={styles.boxesWrap}
              >
                <View style={styles.boxes}>
                  {Array.from({ length: CODE_LENGTH }).map((_, index) => {
                    const digit = digits[index];
                    const filled = digit !== undefined;
                    // The active box is the one the next digit lands in, which
                    // stays on the last box once the code is complete.
                    const active =
                      focused &&
                      !error &&
                      index === Math.min(code.length, CODE_LENGTH - 1) &&
                      (code.length < CODE_LENGTH || index === CODE_LENGTH - 1);

                    return (
                      <View
                        key={index}
                        style={[
                          styles.box,
                          filled && styles.boxFilled,
                          active && styles.boxActive,
                          !!error && styles.boxError,
                        ]}
                      >
                        <Text style={styles.boxDigit}>{digit ?? ''}</Text>
                      </View>
                    );
                  })}
                </View>

                {/*
                  One invisible input laid over the six boxes. Six real inputs
                  means chasing focus on every keystroke and backspace, and the
                  system SMS autofill only ever targets a single field.
                */}
                <TextInput
                  ref={inputRef}
                  value={code}
                  onChangeText={handleChange}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  editable={!isLoading}
                  keyboardType="number-pad"
                  inputMode="numeric"
                  returnKeyType="done"
                  maxLength={CODE_LENGTH}
                  textContentType="oneTimeCode"
                  autoComplete={Platform.OS === 'android' ? 'sms-otp' : 'one-time-code'}
                  autoFocus={false}
                  caretHidden
                  // Android draws a selection handle even at zero opacity.
                  contextMenuHidden
                  accessibilityLabel="Código de verificación de 6 dígitos"
                  style={styles.hiddenInput}
                />
              </Pressable>

              {!!error && (
                <Text style={styles.error} accessibilityRole="alert">
                  {error}
                </Text>
              )}

              <Pressable
                onPress={() => handleVerify(code)}
                disabled={isLoading || code.length < CODE_LENGTH}
                accessibilityRole="button"
                accessibilityLabel="Verificar"
                style={({ pressed }) => [
                  styles.cta,
                  pressed && styles.ctaPressed,
                  (isLoading || code.length < CODE_LENGTH) && styles.ctaDisabled,
                ]}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={styles.ctaLabel}>Verificar</Text>
                )}
              </Pressable>
            </Animated.View>

            <Animated.View style={[styles.footer, footerStyle]}>
              <Pressable
                onPress={handleResend}
                disabled={!canResend}
                accessibilityRole="button"
                accessibilityLabel={canResend ? 'Reenviar código' : countdownLabel}
                hitSlop={8}
              >
                {({ pressed }) =>
                  isResending ? (
                    <ActivityIndicator size="small" color={colors.ink} />
                  ) : (
                    <Text
                      style={[
                        canResend ? styles.resend : styles.resendWaiting,
                        pressed && canResend && styles.pressedText,
                      ]}
                    >
                      {canResend ? 'Reenviar código' : countdownLabel}
                    </Text>
                  )
                }
              </Pressable>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  flex: {
    flex: 1,
  },
  decor: {
    position: 'absolute',
    // Pulled far enough out that only the solid corner of the mark reads;
    // the shape is hollow through its middle and that hole looks like a
    // rendering fault when it lands inside the frame.
    top: -DECOR_H * 0.62,
    right: -DECOR_W * 0.52,
  },
  safeArea: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 24,
  },
  back: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    marginTop: 8,
  },
  header: {
    marginTop: 36,
    marginBottom: 40,
  },
  title: {
    fontFamily: typography.fontFamily,
    fontSize: 40,
    fontWeight: typography.fontWeight.bold,
    lineHeight: 44,
    letterSpacing: -1,
    color: colors.ink,
  },
  subtitle: {
    marginTop: 12,
    fontFamily: typography.fontFamily,
    fontSize: 15,
    lineHeight: 21,
    // gray400 sits at 5.3:1 on white. The design's #9D9D9D is 2.7:1 and fails
    // AA, so the muted role is kept but that value is not.
    color: colors.gray400,
  },
  subtitleStrong: {
    fontWeight: typography.fontWeight.semiBold,
    color: colors.ink,
  },
  form: {
    gap: 20,
  },
  boxesWrap: {
    position: 'relative',
  },
  boxes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  box: {
    flex: 1,
    height: 62,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxFilled: {
    backgroundColor: colors.surface,
    borderColor: colors.surface,
  },
  boxActive: {
    borderColor: colors.ink,
    backgroundColor: colors.white,
  },
  boxError: {
    borderColor: colors.error,
    backgroundColor: colors.white,
  },
  boxDigit: {
    fontFamily: typography.fontFamily,
    fontSize: 24,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.ink,
  },
  hiddenInput: {
    ...StyleSheet.absoluteFillObject,
    // Invisible but still the real field: it keeps the caret, the keyboard and
    // the system OTP autofill, while the boxes above are only paint.
    opacity: 0,
    color: 'transparent',
    fontSize: 24,
  },
  error: {
    marginTop: -8,
    fontFamily: typography.fontFamily,
    fontSize: 13,
    lineHeight: 18,
    color: colors.error,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.ink,
    marginTop: 8,
    // A primary action should look pressable before it is pressed.
    ...Platform.select({
      ios: {
        shadowColor: colors.ink,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.22,
        shadowRadius: 20,
      },
      android: { elevation: 6 },
    }),
  },
  ctaPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.92,
  },
  ctaDisabled: {
    opacity: 0.45,
  },
  ctaLabel: {
    fontFamily: typography.fontFamily,
    fontSize: 17,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.white,
    letterSpacing: 0.2,
  },
  pressed: {
    opacity: 0.7,
  },
  pressedText: {
    opacity: 0.5,
  },
  footer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 'auto',
    paddingTop: 40,
    minHeight: 20,
  },
  resend: {
    fontFamily: typography.fontFamily,
    fontSize: 14,
    fontWeight: typography.fontWeight.bold,
    color: colors.ink,
    textDecorationLine: 'underline',
  },
  resendWaiting: {
    fontFamily: typography.fontFamily,
    fontSize: 14,
    color: colors.gray400,
  },
});
