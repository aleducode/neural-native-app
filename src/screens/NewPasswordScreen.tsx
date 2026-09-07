import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  TextInput,
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
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { colors, typography } from '../theme/colors';
import AuthField from '../components/AuthField';
import { authApi } from '../api/auth';
import { captureException, addBreadcrumb } from '../utils/sentry';
import { AuthStackParamList } from '../navigation/RootNavigator';

const { width: SCREEN_W } = Dimensions.get('window');

// The same brand shape the rest of the auth flow carries, so the last step of
// the recovery does not look like it belongs to another app.
const BLOB_VIEWBOX = '0 0 343 380.74';
const BLOB_PATH =
  'M0 142.78c0 0 0 152.29 0 152.29 0 0 47.64 0 47.64 0 5 0 9.96 0.99 14.58 2.9 4.63 1.91 8.83 4.72 12.37 8.25 3.54 3.54 6.34 7.74 8.26 12.36 1.91 4.62 2.9 9.57 2.9 14.57 0 0 0 47.59 0 47.59 0 0 114.33 0 114.33 0 0 0 142.92-142.78 142.92-142.78 0 0 0-152.29 0-152.29 0 0-47.64 0-47.64 0-5 0-9.96-0.99-14.58-2.9-4.63-1.92-8.83-4.72-12.37-8.26-3.54-3.53-6.34-7.73-8.26-12.35-1.91-4.62-2.9-9.57-2.9-14.57 0 0 0-47.59 0-47.59 0 0-114.33 0-114.33 0 0 0-142.92 142.78-142.92 142.78z m161.97 142.77c0 0-66.69 0-66.69 0 0 0 0-104.7 0-104.7 0 0 85.75-85.67 85.75-85.67 0 0 66.69 0 66.69 0 0 0 0 104.71 0 104.71 0 0-85.75 85.66-85.75 85.66z';

const DECOR_W = SCREEN_W * 0.95;
const DECOR_H = DECOR_W * (380.74 / 343);

const MIN_LENGTH = 8;

const CONNECTION_ERROR = 'Error de conexión. Verifica tu internet.';

/**
 * The token has one use and a short life, so a rejection here usually means the
 * member took too long between screens rather than that they typed something
 * wrong. Saying so is the difference between retrying and giving up.
 */
const TOKEN_SPENT =
  'Ese código ya venció. Pedí uno nuevo y volvé a intentar.';

type NewPasswordRouteProp = RouteProp<AuthStackParamList, 'NewPassword'>;

export default function NewPasswordScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<NewPasswordRouteProp>();
  const { resetToken, email } = route.params;

  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ password?: string; confirmation?: string }>({});
  const [error, setError] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [done, setDone] = useState(false);

  const confirmationRef = useRef<TextInput>(null);

  const intro = useSharedValue(0);
  React.useEffect(() => {
    intro.value = 1;
  }, [intro]);

  const headerStyle = useAnimatedStyle(() => ({
    opacity: withTiming(intro.value, { duration: 400 }),
    transform: [{ translateY: withTiming((1 - intro.value) * 14, { duration: 400 }) }],
  }));

  const bodyStyle = useAnimatedStyle(() => ({
    opacity: withDelay(80, withTiming(intro.value, { duration: 400 })),
    transform: [{ translateY: withDelay(80, withTiming((1 - intro.value) * 18, { duration: 400 })) }],
  }));

  const doneAnim = useSharedValue(0);
  const doneStyle = useAnimatedStyle(() => ({
    opacity: doneAnim.value,
    transform: [{ translateY: (1 - doneAnim.value) * 14 }],
  }));

  const backToLogin = () => {
    // The stack behind this screen is the recovery flow, and none of it is
    // worth returning to once the password is changed.
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  const submit = async () => {
    const next: { password?: string; confirmation?: string } = {};

    if (!password) next.password = 'Ingresa tu nueva contraseña';
    else if (password.length < MIN_LENGTH) {
      next.password = `Debe tener al menos ${MIN_LENGTH} caracteres`;
    }

    // Checked before the request so a typo costs nothing: the token is single
    // use, and spending it on a mismatch would send them back for a new code.
    if (!next.password && confirmation !== password) {
      next.confirmation = 'Las contraseñas no coinciden';
    }

    if (next.password || next.confirmation) {
      setFieldErrors(next);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    setFieldErrors({});
    setError(undefined);
    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    addBreadcrumb('Password reset confirm submitted', 'auth', {
      email: email?.toLowerCase(),
    });

    try {
      const { error: apiError } = await authApi.confirmPasswordReset(resetToken, password);
      setIsLoading(false);

      if (apiError) {
        if (apiError === CONNECTION_ERROR) {
          setError(apiError);
        } else if (/token|expir|inv[áa]lid/i.test(apiError)) {
          setError(TOKEN_SPENT);
        } else {
          // The backend validates the password too, and its complaint is more
          // specific than anything this screen could guess at.
          setFieldErrors({ password: apiError });
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }

      addBreadcrumb('Password reset completed', 'auth');
      setDone(true);
      doneAnim.value = withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic) });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      setIsLoading(false);
      captureException(err as Error, {
        context: 'handleConfirmPasswordReset',
        email: email?.toLowerCase(),
        errorMessage: (err as Error)?.message,
      });
      setError('Ocurrió un error inesperado. Inténtalo de nuevo.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      <View style={styles.decor} pointerEvents="none">
        <Svg width={DECOR_W} height={DECOR_H} viewBox={BLOB_VIEWBOX}>
          <Defs>
            <SvgGradient id="blob" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={colors.accent} />
              <Stop offset="1" stopColor={colors.accentDeep} />
            </SvgGradient>
          </Defs>
          <Path d={BLOB_PATH} fill="url(#blob)" />
        </Svg>
      </View>

      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {!done && (
              <Pressable
                onPress={() => navigation.goBack()}
                style={styles.back}
                accessibilityRole="button"
                accessibilityLabel="Volver"
                hitSlop={8}
              >
                <Feather name="arrow-left" size={20} color={colors.ink} />
              </Pressable>
            )}

            {done ? (
              <Animated.View style={[styles.done, doneStyle]}>
                <View style={styles.badge}>
                  <Feather name="check" size={32} color={colors.accentDeep} />
                </View>
                <Text style={styles.doneTitle}>Contraseña actualizada</Text>
                <Text style={styles.doneBody}>
                  Ya podés entrar con tu contraseña nueva.
                </Text>

                <Pressable
                  onPress={backToLogin}
                  style={({ pressed }) => [styles.cta, styles.doneCta, pressed && styles.ctaPressed]}
                  accessibilityRole="button"
                >
                  <Text style={styles.ctaLabel}>Iniciar sesión</Text>
                </Pressable>
              </Animated.View>
            ) : (
              <>
                <Animated.View style={[styles.header, headerStyle]}>
                  <Text style={styles.title}>Elegí tu nueva{'\n'}contraseña</Text>
                  <Text style={styles.subtitle}>
                    Al menos {MIN_LENGTH} caracteres. Que no sea una que ya hayas usado
                    en otro lado.
                  </Text>
                </Animated.View>

                <Animated.View style={[styles.form, bodyStyle]}>
                  <AuthField
                    kind="password"
                    label="Nueva contraseña"
                    value={password}
                    error={fieldErrors.password}
                    editable={!isLoading}
                    returnKeyType="next"
                    onSubmitEditing={() => confirmationRef.current?.focus()}
                    onChangeText={(text) => {
                      setPassword(text || '');
                      if (fieldErrors.password) setFieldErrors((f) => ({ ...f, password: undefined }));
                    }}
                  />

                  <AuthField
                    ref={confirmationRef}
                    kind="password"
                    label="Repetí la contraseña"
                    value={confirmation}
                    error={fieldErrors.confirmation}
                    editable={!isLoading}
                    returnKeyType="go"
                    onSubmitEditing={submit}
                    onChangeText={(text) => {
                      setConfirmation(text || '');
                      if (fieldErrors.confirmation) {
                        setFieldErrors((f) => ({ ...f, confirmation: undefined }));
                      }
                    }}
                  />

                  {!!error && (
                    <View style={styles.errorRow}>
                      <Feather name="alert-circle" size={16} color={colors.error} />
                      <Text style={styles.errorText}>{error}</Text>
                    </View>
                  )}

                  <Pressable
                    onPress={submit}
                    disabled={isLoading}
                    style={({ pressed }) => [
                      styles.cta,
                      pressed && styles.ctaPressed,
                      isLoading && styles.ctaLoading,
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: isLoading, busy: isLoading }}
                  >
                    {isLoading ? (
                      <ActivityIndicator color={colors.white} />
                    ) : (
                      <>
                        <Text style={styles.ctaLabel}>Guardar contraseña</Text>
                        <Feather name="arrow-right" size={18} color={colors.white} />
                      </>
                    )}
                  </Pressable>
                </Animated.View>
              </>
            )}
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
    marginTop: 40,
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
    color: colors.gray400,
  },
  form: {
    gap: 20,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  errorText: {
    flex: 1,
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
  ctaLoading: {
    opacity: 0.75,
  },
  ctaLabel: {
    fontFamily: typography.fontFamily,
    fontSize: 17,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.white,
    letterSpacing: 0.2,
  },
  done: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  badge: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentSoft,
    marginBottom: 8,
  },
  doneTitle: {
    fontFamily: typography.fontFamily,
    fontSize: 22,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: -0.4,
    color: colors.ink,
  },
  doneBody: {
    fontFamily: typography.fontFamily,
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
    color: colors.gray400,
  },
  doneCta: {
    alignSelf: 'stretch',
    marginTop: 24,
  },
});
