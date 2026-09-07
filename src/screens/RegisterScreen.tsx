import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  ActivityIndicator,
  Dimensions,
  type TextInput,
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
import { Ionicons, Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { colors, typography } from '../theme/colors';
import AuthField from '../components/AuthField';

const { width: SCREEN_W } = Dimensions.get('window');

// Same brand shape as the splash and the login screen, bled off the top
// corner so the auth pair reads as one continuous surface.
const BLOB_VIEWBOX = '0 0 343 380.74';
const BLOB_PATH =
  'M0 142.78c0 0 0 152.29 0 152.29 0 0 47.64 0 47.64 0 5 0 9.96 0.99 14.58 2.9 4.63 1.91 8.83 4.72 12.37 8.25 3.54 3.54 6.34 7.74 8.26 12.36 1.91 4.62 2.9 9.57 2.9 14.57 0 0 0 47.59 0 47.59 0 0 114.33 0 114.33 0 0 0 142.92-142.78 142.92-142.78 0 0 0-152.29 0-152.29 0 0-47.64 0-47.64 0-5 0-9.96-0.99-14.58-2.9-4.63-1.92-8.83-4.72-12.37-8.26-3.54-3.53-6.34-7.73-8.26-12.35-1.91-4.62-2.9-9.57-2.9-14.57 0 0 0-47.59 0-47.59 0 0-114.33 0-114.33 0 0 0-142.92 142.78-142.92 142.78z m161.97 142.77c0 0-66.69 0-66.69 0 0 0 0-104.7 0-104.7 0 0 85.75-85.67 85.75-85.67 0 0 66.69 0 66.69 0 0 0 0 104.71 0 104.71 0 0-85.75 85.66-85.75 85.66z';

const DECOR_W = SCREEN_W * 0.95;
const DECOR_H = DECOR_W * (380.74 / 343);

interface FormErrors {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone_number?: string;
  password?: string;
  password_confirmation?: string;
  general?: string;
}

export default function RegisterScreen() {
  const navigation = useNavigation<any>();
  const { register } = useAuth();

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    password: '',
    password_confirmation: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  // Six fields is a long walk on a phone keyboard, so every return key hands
  // off to the next input and the last one submits.
  const lastNameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  // Short staggered entrance, matching the login screen. Anything longer
  // makes the form feel heavier than it already is.
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

  const updateField = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.first_name.trim()) {
      newErrors.first_name = 'Ingresa tu nombre';
    }

    if (!formData.last_name.trim()) {
      newErrors.last_name = 'Ingresa tu apellido';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Ingresa tu correo';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Ese correo no parece válido';
    }

    if (!formData.phone_number.trim()) {
      newErrors.phone_number = 'Ingresa tu teléfono';
    }

    if (!formData.password) {
      newErrors.password = 'Ingresa una contraseña';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Usa al menos 8 caracteres';
    }

    if (formData.password !== formData.password_confirmation) {
      newErrors.password_confirmation = 'Las contraseñas no coinciden';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validateForm()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    setIsLoading(true);
    setErrors({});
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const { success, error, errors: apiErrors } = await register({
      first_name: formData.first_name.trim(),
      last_name: formData.last_name.trim(),
      email: formData.email.trim(),
      phone_number: formData.phone_number.trim(),
      password: formData.password,
      password_confirmation: formData.password_confirmation,
    });

    setIsLoading(false);

    if (success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Registration successful - navigate to login
      // In web, Alert might not work well, so navigate directly after a brief delay
      setTimeout(() => {
        navigation.navigate('Login');
      }, 500);
      return;
    }

    // Handle registration errors
    const newErrors: FormErrors = {};

    // Map API field errors to form errors first
    if (apiErrors && Object.keys(apiErrors).length > 0) {
      Object.keys(apiErrors).forEach((field) => {
        const fieldErrors = apiErrors[field];

        if (fieldErrors && Array.isArray(fieldErrors) && fieldErrors.length > 0) {
          // Map API field names to form field names
          const formFieldMap: Record<string, keyof FormErrors> = {
            email: 'email',
            password: 'password',
            first_name: 'first_name',
            last_name: 'last_name',
            phone_number: 'phone_number',
            password_confirmation: 'password_confirmation',
          };

          const formField = formFieldMap[field];
          if (formField) {
            // Join multiple errors with ". " (period and space)
            newErrors[formField] = fieldErrors.join('. ');
          }
        }
      });
    }

    // Set general error only if no field-specific errors exist
    if (error && Object.keys(newErrors).length === 0) {
      newErrors.general = error;
    }

    setErrors(newErrors);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  };

  const handleSignIn = () => {
    if (navigation.canGoBack?.()) navigation.goBack();
    else navigation.navigate('Login');
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      <View style={styles.decor} pointerEvents="none">
        <Svg width={DECOR_W} height={DECOR_H} viewBox={BLOB_VIEWBOX}>
          <Defs>
            <SvgGradient id="registerBrand" x1="0" y1="1" x2="1" y2="0">
              <Stop offset="0" stopColor={colors.accent} stopOpacity={0.55} />
              <Stop offset="1" stopColor={colors.accentDeep} stopOpacity={0.35} />
            </SvgGradient>
          </Defs>
          <Path d={BLOB_PATH} fill="url(#registerBrand)" fillRule="evenodd" />
        </Svg>
      </View>

      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          // Android resizes the window itself (adjustResize in the manifest),
          // so a behavior here shrinks the layout a second time and the field
          // it was meant to reveal ends up hidden anyway.
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
              <Text style={styles.title}>Crea tu{'\n'}cuenta</Text>
              <Text style={styles.subtitle}>
                Unos datos y ya puedes reservar tu primer entrenamiento.
              </Text>
            </Animated.View>

            <Animated.View style={[styles.form, formStyle]}>
              {!!errors.general && (
                <View style={styles.banner}>
                  <Feather name="alert-circle" size={16} color={colors.error} />
                  <Text style={styles.bannerText}>{errors.general}</Text>
                </View>
              )}

              <View style={styles.nameRow}>
                <View style={styles.nameCell}>
                  <AuthField
                    kind="text"
                    label="Nombre"
                    value={formData.first_name}
                    error={errors.first_name}
                    editable={!isLoading}
                    returnKeyType="next"
                    onSubmitEditing={() => lastNameRef.current?.focus()}
                    onChangeText={(text) => updateField('first_name', text)}
                  />
                </View>
                <View style={styles.nameCell}>
                  <AuthField
                    ref={lastNameRef}
                    kind="text"
                    label="Apellido"
                    value={formData.last_name}
                    error={errors.last_name}
                    editable={!isLoading}
                    returnKeyType="next"
                    onSubmitEditing={() => emailRef.current?.focus()}
                    onChangeText={(text) => updateField('last_name', text)}
                  />
                </View>
              </View>

              <AuthField
                ref={emailRef}
                kind="email"
                label="Correo electrónico"
                value={formData.email}
                error={errors.email}
                editable={!isLoading}
                returnKeyType="next"
                onSubmitEditing={() => phoneRef.current?.focus()}
                onChangeText={(text) => updateField('email', text)}
              />

              <AuthField
                ref={phoneRef}
                kind="phone"
                label="Teléfono"
                value={formData.phone_number}
                error={errors.phone_number}
                editable={!isLoading}
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                onChangeText={(text) => updateField('phone_number', text)}
              />

              <AuthField
                ref={passwordRef}
                kind="password"
                label="Contraseña"
                value={formData.password}
                error={errors.password}
                editable={!isLoading}
                returnKeyType="next"
                onSubmitEditing={() => confirmRef.current?.focus()}
                onChangeText={(text) => updateField('password', text)}
              />

              <AuthField
                ref={confirmRef}
                kind="password"
                label="Confirmar contraseña"
                value={formData.password_confirmation}
                error={errors.password_confirmation}
                editable={!isLoading}
                returnKeyType="go"
                onSubmitEditing={handleRegister}
                onChangeText={(text) => updateField('password_confirmation', text)}
              />

              <Pressable
                onPress={handleRegister}
                disabled={isLoading}
                accessibilityRole="button"
                accessibilityLabel="Crear cuenta"
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
                    <Text style={styles.ctaLabel}>Crear cuenta</Text>
                    <Ionicons name="arrow-forward" size={19} color={colors.white} />
                  </>
                )}
              </Pressable>
            </Animated.View>

            <Animated.View style={[styles.footer, footerStyle]}>
              <Text style={styles.footerText}>¿Ya tienes cuenta?</Text>
              <Pressable onPress={handleSignIn} disabled={isLoading} hitSlop={8}>
                {({ pressed }) => (
                  <Text style={[styles.footerLink, pressed && styles.pressedText]}>
                    Inicia sesión
                  </Text>
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
    marginTop: 40,
    marginBottom: 32,
  },
  logo: {
    width: 132,
    height: 34,
    marginBottom: 28,
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
    gap: 18,
  },
  // The backend can reject the whole submission without naming a field, and
  // that message has nowhere else to live.
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderLeftWidth: 3,
    borderLeftColor: colors.error,
  },
  bannerText: {
    flex: 1,
    fontFamily: typography.fontFamily,
    fontSize: 14,
    lineHeight: 19,
    color: colors.error,
  },
  nameRow: {
    flexDirection: 'row',
    gap: 12,
    // Errors under one of the two make it taller than its neighbour; top
    // alignment keeps both labels on the same line.
    alignItems: 'flex-start',
  },
  nameCell: {
    flex: 1,
  },
  pressedText: {
    opacity: 0.5,
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
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 'auto',
    paddingTop: 36,
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
});
