import React, { useState, useEffect } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import { colors, typography } from '../theme/colors';
import AuthField from '../components/AuthField';
import { authApi } from '../api/auth';
import { captureException, addBreadcrumb } from '../utils/sentry';

const { width: SCREEN_W } = Dimensions.get('window');

// Same brand shape as the splash and the login, bled off the top corner so the
// auth flow keeps one continuous backdrop instead of restarting on each screen.
const BLOB_VIEWBOX = '0 0 343 380.74';
const BLOB_PATH =
  'M0 142.78c0 0 0 152.29 0 152.29 0 0 47.64 0 47.64 0 5 0 9.96 0.99 14.58 2.9 4.63 1.91 8.83 4.72 12.37 8.25 3.54 3.54 6.34 7.74 8.26 12.36 1.91 4.62 2.9 9.57 2.9 14.57 0 0 0 47.59 0 47.59 0 0 114.33 0 114.33 0 0 0 142.92-142.78 142.92-142.78 0 0 0-152.29 0-152.29 0 0-47.64 0-47.64 0-5 0-9.96-0.99-14.58-2.9-4.63-1.92-8.83-4.72-12.37-8.26-3.54-3.53-6.34-7.73-8.26-12.35-1.91-4.62-2.9-9.57-2.9-14.57 0 0 0-47.59 0-47.59 0 0-114.33 0-114.33 0 0 0-142.92 142.78-142.92 142.78z m161.97 142.77c0 0-66.69 0-66.69 0 0 0 0-104.7 0-104.7 0 0 85.75-85.67 85.75-85.67 0 0 66.69 0 66.69 0 0 0 0 104.71 0 104.71 0 0-85.75 85.66-85.75 85.66z';

const DECOR_W = SCREEN_W * 0.95;
const DECOR_H = DECOR_W * (380.74 / 343);

// The client turns a failed fetch into exactly this string. It is the only
// outcome worth surfacing: every other backend answer, including "unknown
// email", has to look identical to a success.
const CONNECTION_ERROR = 'Error de conexión. Verifica tu internet.';

export default function ForgotPasswordScreen() {
  const navigation = useNavigation<any>();

  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  // Same short staggered entrance as the login. Anything longer reads as lag
  // on a screen the user only reaches when something already went wrong.
  const intro = useSharedValue(0);
  useEffect(() => {
    intro.value = withTiming(1, { duration: 460, easing: Easing.out(Easing.cubic) });
  }, []);

  const headerStyle = useAnimatedStyle(() => ({
    opacity: intro.value,
    transform: [{ translateY: (1 - intro.value) * 18 }],
  }));
  const bodyStyle = useAnimatedStyle(() => ({
    opacity: withDelay(80, withTiming(intro.value, { duration: 400 })),
    transform: [{ translateY: withDelay(80, withTiming((1 - intro.value) * 18, { duration: 400 })) }],
  }));

  const goBack = () => {
    if (navigation.canGoBack?.()) navigation.goBack();
    else navigation.navigate('Login');
  };

  const submit = async () => {
    const emailValue = email?.trim() || '';

    // Validation belongs beside the field that failed, not in a modal the user
    // has to dismiss before they can see what to fix.
    if (!emailValue) {
      setError('Ingresa tu correo');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    if (!/\S+@\S+\.\S+/.test(emailValue)) {
      setError('Ese correo no parece válido');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    setError(undefined);
    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    addBreadcrumb('Password reset requested', 'auth', {
      email: emailValue.toLowerCase(),
      emailLength: emailValue.length,
    });

    try {
      const { error: apiError } = await authApi.resetPassword(emailValue);
      setIsLoading(false);

      if (apiError === CONNECTION_ERROR) {
        // A request that never reached the server leaks nothing, so the user
        // can be told plainly to retry.
        setError(apiError);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }

      addBreadcrumb('Password reset request finished', 'auth');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Always, whether or not the address is registered. Sending only real
      // members onward would answer the question this screen exists not to
      // answer; an unregistered address simply never receives a code.
      navigation.navigate('VerificationCode', { email: emailValue });
    } catch (err) {
      setIsLoading(false);
      captureException(err as Error, {
        context: 'handleResetPassword',
        email: emailValue.toLowerCase(),
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
            <SvgGradient id="forgotBrand" x1="0" y1="1" x2="1" y2="0">
              <Stop offset="0" stopColor={colors.accent} stopOpacity={0.55} />
              <Stop offset="1" stopColor={colors.accentDeep} stopOpacity={0.35} />
            </SvgGradient>
          </Defs>
          <Path d={BLOB_PATH} fill="url(#forgotBrand)" fillRule="evenodd" />
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
                onPress={goBack}
                disabled={isLoading}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Volver"
                style={({ pressed }) => [styles.back, pressed && styles.pressed]}
              >
                <Feather name="arrow-left" size={20} color={colors.ink} />
              </Pressable>

              <View style={styles.header}>
                <Text style={styles.title}>Recupera tu{'\n'}contraseña</Text>
                <Text style={styles.subtitle}>
                  Ingresa tu correo y te enviamos un código de 6 dígitos para
                  restablecerla.
                </Text>
              </View>
            </Animated.View>

            <Animated.View style={[styles.form, bodyStyle]}>
              <AuthField
                kind="email"
                label="Correo electrónico"
                value={email}
                error={error}
                editable={!isLoading}
                returnKeyType="go"
                onSubmitEditing={submit}
                onChangeText={(text) => {
                  setEmail(text || '');
                  if (error) setError(undefined);
                }}
              />

              <Pressable
                onPress={submit}
                disabled={isLoading}
                accessibilityRole="button"
                accessibilityLabel="Enviar código"
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
                    <Text style={styles.ctaLabel}>Enviar código</Text>
                    <Feather name="arrow-right" size={19} color={colors.white} />
                  </>
                )}
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
    // Pulled far enough out that only the solid corner of the mark reads; the
    // shape is hollow through its middle and that hole looks like a rendering
    // fault when it lands inside the frame.
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
    // gray400 sits at 5.3:1 on white. The design's #9D9D9D is 2.7:1 and fails
    // AA, so the muted role is kept but that value is not.
    color: colors.gray400,
  },
  form: {
    gap: 20,
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
  pressed: {
    opacity: 0.7,
  },
});
