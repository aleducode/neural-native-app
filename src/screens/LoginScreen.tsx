import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Image,
  ActivityIndicator,
  Dimensions,
  type TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import Checkbox from 'expo-checkbox';
import Svg, { Path, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { colors, typography } from '../theme/colors';
import AuthField from '../components/AuthField';
import { captureException, addBreadcrumb } from '../utils/sentry';
import { testLoginFlowError, testSentryError, testBiometricPermissionDenied, testNotificationPermissionDenied } from '../utils/testSentry';

const { width: SCREEN_W } = Dimensions.get('window');

// Same brand shape as the splash, bled off the top corner so the screen keeps
// a trace of the intro instead of dropping to a blank sheet.
const BLOB_VIEWBOX = '0 0 343 380.74';
const BLOB_PATH =
  'M0 142.78c0 0 0 152.29 0 152.29 0 0 47.64 0 47.64 0 5 0 9.96 0.99 14.58 2.9 4.63 1.91 8.83 4.72 12.37 8.25 3.54 3.54 6.34 7.74 8.26 12.36 1.91 4.62 2.9 9.57 2.9 14.57 0 0 0 47.59 0 47.59 0 0 114.33 0 114.33 0 0 0 142.92-142.78 142.92-142.78 0 0 0-152.29 0-152.29 0 0-47.64 0-47.64 0-5 0-9.96-0.99-14.58-2.9-4.63-1.92-8.83-4.72-12.37-8.26-3.54-3.53-6.34-7.73-8.26-12.35-1.91-4.62-2.9-9.57-2.9-14.57 0 0 0-47.59 0-47.59 0 0-114.33 0-114.33 0 0 0-142.92 142.78-142.92 142.78z m161.97 142.77c0 0-66.69 0-66.69 0 0 0 0-104.7 0-104.7 0 0 85.75-85.67 85.75-85.67 0 0 66.69 0 66.69 0 0 0 0 104.71 0 104.71 0 0-85.75 85.66-85.75 85.66z';

const DECOR_W = SCREEN_W * 0.95;
const DECOR_H = DECOR_W * (380.74 / 343);

export default function LoginScreen() {
  const navigation = useNavigation<any>();
  const { login, biometricAvailable, biometricEnabled, biometricType, loginWithBiometric, enableBiometric, isAuthenticated } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [remember, setRemember] = useState(true);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  const passwordRef = useRef<TextInput>(null);

  // Short staggered entrance. Anything longer makes a login feel slow, which
  // is the opposite of premium.
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

  const handleBiometricLogin = React.useCallback(async () => {
    addBreadcrumb('Biometric login attempt', 'auth', {
      biometricType,
    });

    setIsLoading(true);

    try {
    const { success, error } = await loginWithBiometric();
    setIsLoading(false);

      if (success) {
        addBreadcrumb('Biometric login successful', 'auth');
      } else if (error) {
      // Don't show alert if user cancelled - it's expected behavior
      if (error !== 'Autenticación cancelada') {
          addBreadcrumb('Biometric login failed', 'auth', { error });
          // Track biometric errors that aren't cancellations
          captureException(new Error(error), {
            context: 'biometricLogin',
            biometricType,
            errorType: 'auth_failure',
          });
        Alert.alert('Error', error);
        }
      }
    } catch (error) {
      setIsLoading(false);
      captureException(error as Error, {
        context: 'handleBiometricLogin',
        biometricType,
      });
      Alert.alert('Error', 'Ocurrió un error al usar autenticación biométrica');
    }
  }, [loginWithBiometric, biometricType]);

  // Auto-trigger biometric login if enabled when screen loads (only if not authenticated)
  useEffect(() => {
    if (!isAuthenticated && biometricEnabled && biometricAvailable) {
      // Small delay to let the screen render first
      const timer = setTimeout(() => {
        handleBiometricLogin();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, biometricEnabled, biometricAvailable, handleBiometricLogin]);

  const handleLogin = async () => {
    // Safe email/password handling
    const emailValue = email?.trim() || '';
    const passwordValue = password?.trim() || '';

    // Validation belongs beside the field that failed, not in a modal the user
    // has to dismiss before they can see which one it was.
    const next: { email?: string; password?: string } = {};
    if (!emailValue) next.email = 'Ingresa tu correo';
    else if (!/\S+@\S+\.\S+/.test(emailValue)) next.email = 'Ese correo no parece válido';
    if (!passwordValue) next.password = 'Ingresa tu contraseña';

    if (Object.keys(next).length > 0) {
      setFieldErrors(next);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    setFieldErrors({});

    // Track login attempt
    try {
      addBreadcrumb('Login attempt started', 'auth', {
        email: emailValue.toLowerCase(),
        emailLength: emailValue.length,
        hasBiometric: biometricAvailable,
      });
    } catch (error) {
      captureException(error as Error, {
        context: 'handleLogin',
        action: 'addBreadcrumb',
      });
    }

    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const { success, error } = await login({ email: emailValue, password: passwordValue }, false);

    if (success) {
        try {
          addBreadcrumb('Login successful', 'auth', {
            email: emailValue.toLowerCase(),
          });
        } catch (err) {
          // Non-critical error in breadcrumb
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // After successful login, ask user if they want to enable biometric login
      // Only ask if biometric is available and not already enabled
      if (biometricAvailable && !biometricEnabled) {
        setIsLoading(false);
        Alert.alert(
          `¿Habilitar ${biometricType}?`,
          `¿Quieres usar ${biometricType} para iniciar sesión más rápido la próxima vez?`,
            Array.from([
            {
              text: 'No',
                style: 'cancel' as const,
            },
            {
              text: 'Sí',
              onPress: async () => {
                  try {
                    const enabled = await enableBiometric(emailValue, passwordValue);
                if (enabled) {
                  Alert.alert('Éxito', `${biometricType} habilitado correctamente`);
                      addBreadcrumb('Biometric enabled', 'auth');
                    }
                  } catch (err) {
                    captureException(err as Error, {
                      context: 'enableBiometric',
                      email: emailValue.toLowerCase(),
                    });
                }
              },
            },
            ])
        );
      } else {
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      if (error) {
          // Track login errors (but not as exceptions - these are expected)
          try {
            addBreadcrumb('Login failed', 'auth', {
              email: emailValue.toLowerCase(),
              error: error,
            });
          } catch (err) {
            // Non-critical error in breadcrumb
          }
        Alert.alert('Error', error);
        }
      }
    } catch (error) {
      setIsLoading(false);
      // Track unexpected errors during login
      captureException(error as Error, {
        context: 'handleLogin',
        email: emailValue.toLowerCase(),
        emailLength: emailValue.length,
        hasBiometric: biometricAvailable,
        errorMessage: (error as Error)?.message,
      });
      Alert.alert('Error', 'Ocurrió un error inesperado al iniciar sesión');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      <View style={styles.decor} pointerEvents="none">
        <Svg width={DECOR_W} height={DECOR_H} viewBox={BLOB_VIEWBOX}>
          <Defs>
            <SvgGradient id="loginBrand" x1="0" y1="1" x2="1" y2="0">
              <Stop offset="0" stopColor={colors.accent} stopOpacity={0.55} />
              <Stop offset="1" stopColor={colors.accentDeep} stopOpacity={0.35} />
            </SvgGradient>
          </Defs>
          <Path d={BLOB_PATH} fill="url(#loginBrand)" fillRule="evenodd" />
        </Svg>
      </View>

      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          // Both platforms need padding. The manifest still asks for
          // adjustResize, but this app is edge-to-edge, and from Android 15 on
          // those windows are not resized for the keyboard — nothing shrinks on
          // its own, so the compensation has to happen here.
          behavior="padding"
          style={styles.flex}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            <Animated.View style={[styles.header, headerStyle]}>
              <Image
                source={require('../../assets/neural.png')}
                style={styles.logo}
                resizeMode="contain"
              />
              <Text style={styles.title}>Hola de{'\n'}nuevo</Text>
              <Text style={styles.subtitle}>
                Entra para reservar tu próximo entrenamiento.
              </Text>
            </Animated.View>

            <Animated.View style={[styles.form, formStyle]}>
              <AuthField
                kind="email"
                label="Correo electrónico"
                value={email}
                error={fieldErrors.email}
                editable={!isLoading}
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                onChangeText={(text) => {
                  try {
                    // Ensure we always set a string, even if text is null/undefined
                    setEmail(text || '');
                    if (fieldErrors.email) setFieldErrors((e) => ({ ...e, email: undefined }));
                    addBreadcrumb('User typing email', 'user_action', {
                      emailLength: (text || '').length,
                    });
                  } catch (error) {
                    captureException(error as Error, {
                      context: 'emailInput',
                      action: 'onChangeText',
                      textType: typeof text,
                    });
                  }
                }}
              />

              <AuthField
                ref={passwordRef}
                kind="password"
                label="Contraseña"
                value={password}
                error={fieldErrors.password}
                editable={!isLoading}
                returnKeyType="go"
                onSubmitEditing={handleLogin}
                onChangeText={(text) => {
                  setPassword(text);
                  if (fieldErrors.password) setFieldErrors((e) => ({ ...e, password: undefined }));
                }}
              />

              <View style={styles.row}>
                <Pressable
                  style={styles.remember}
                  onPress={() => setRemember((r) => !r)}
                  disabled={isLoading}
                  hitSlop={8}
                >
                  <Checkbox
                    value={remember}
                    onValueChange={setRemember}
                    disabled={isLoading}
                    color={remember ? colors.ink : undefined}
                    style={styles.checkbox}
                  />
                  <Text style={styles.rememberText}>Mantener sesión</Text>
                </Pressable>

                <Pressable
                  onPress={() => navigation.navigate('ForgotPassword')}
                  disabled={isLoading}
                  hitSlop={8}
                >
                  {({ pressed }) => (
                    <Text style={[styles.forgot, pressed && styles.pressedText]}>
                      ¿Olvidaste tu contraseña?
                    </Text>
                  )}
                </Pressable>
              </View>

              <Pressable
                onPress={handleLogin}
                disabled={isLoading}
                accessibilityRole="button"
                accessibilityLabel="Ingresar"
                style={({ pressed }) => [
                  styles.cta,
                  pressed && styles.ctaPressed,
                  isLoading && styles.ctaLoading,
                ]}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <>
                    <Text style={styles.ctaLabel}>Ingresar</Text>
                    <Ionicons name="arrow-forward" size={19} color={colors.white} />
                  </>
                )}
              </Pressable>

              {biometricEnabled && (
                <Pressable
                  onPress={handleBiometricLogin}
                  disabled={isLoading}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.biometric, pressed && styles.pressed]}
                >
                  <Ionicons
                    name={biometricType === 'Face ID' ? 'scan-outline' : 'finger-print-outline'}
                    size={20}
                    color={colors.ink}
                  />
                  <Text style={styles.biometricText}>Entrar con {biometricType}</Text>
                </Pressable>
              )}
            </Animated.View>

            <Animated.View style={[styles.footer, footerStyle]}>
              <Text style={styles.footerText}>¿Todavía no tienes cuenta?</Text>
              <Pressable
                onPress={() => navigation.navigate('Register')}
                disabled={isLoading}
                hitSlop={8}
              >
                {({ pressed }) => (
                  <Text style={[styles.footerLink, pressed && styles.pressedText]}>Regístrate</Text>
                )}
              </Pressable>
            </Animated.View>

            {__DEV__ && (
              <Pressable
                style={styles.testButton}
                onPress={() => {
                  Alert.alert(
                    'Test Sentry',
                    '¿Qué error quieres simular?',
                    Array.from([
                      {
                        text: 'Error de Login',
                        onPress: () => {
                          testLoginFlowError();
                          Alert.alert('Enviado', 'Error de prueba enviado a Sentry.');
                        },
                      },
                      {
                        text: 'Permiso Biometría',
                        onPress: () => {
                          testBiometricPermissionDenied();
                          Alert.alert('Enviado', 'Error de permisos de biometría enviado a Sentry.');
                        },
                      },
                      {
                        text: 'Permiso Notificaciones',
                        onPress: () => {
                          testNotificationPermissionDenied();
                          Alert.alert('Enviado', 'Error de permisos de notificaciones enviado a Sentry.');
                        },
                      },
                      {
                        text: 'Error Simple',
                        onPress: () => {
                          testSentryError();
                          Alert.alert('Enviado', 'Error de prueba enviado a Sentry.');
                        },
                      },
                      {
                        text: 'Cancelar',
                        style: 'cancel' as const,
                      },
                    ])
                  );
                }}
                disabled={isLoading}
              >
                <Text style={styles.testButtonText}>🧪 Test Sentry</Text>
              </Pressable>
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
  header: {
    marginTop: 52,
    marginBottom: 40,
  },
  logo: {
    width: 132,
    height: 34,
    marginBottom: 36,
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
  form: {
    gap: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  remember: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderColor: colors.gray400,
  },
  rememberText: {
    fontFamily: typography.fontFamily,
    fontSize: 14,
    color: colors.ink,
  },
  forgot: {
    fontFamily: typography.fontFamily,
    fontSize: 14,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.ink,
    textDecorationLine: 'underline',
  },
  pressedText: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.7,
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
  biometric: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.surface,
  },
  biometricText: {
    fontFamily: typography.fontFamily,
    fontSize: 15,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.ink,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 'auto',
    paddingTop: 40,
  },
  footerText: {
    fontFamily: typography.fontFamily,
    fontSize: 14,
    color: colors.gray400,
  },
  footerLink: {
    fontFamily: typography.fontFamily,
    fontSize: 14,
    fontWeight: typography.fontWeight.bold,
    color: colors.ink,
  },
  testButton: {
    marginTop: 20,
    padding: 10,
    backgroundColor: colors.surface,
    borderRadius: 12,
    alignItems: 'center',
  },
  testButtonText: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    color: colors.gray400,
  },
});
