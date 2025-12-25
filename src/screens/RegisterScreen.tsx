import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { colors, typography, spacing, borderRadius } from '../theme/colors';
import Input from '../components/Input';
import Button from '../components/Button';
import { useAuth } from '../context/AuthContext';

const CONTENT_PADDING = spacing.xxl;
const { height: SCREEN_HEIGHT } = Dimensions.get('window');

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

  const updateField = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.first_name.trim()) {
      newErrors.first_name = 'El nombre es requerido';
    }

    if (!formData.last_name.trim()) {
      newErrors.last_name = 'El apellido es requerido';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'El email es requerido';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }

    if (!formData.phone_number.trim()) {
      newErrors.phone_number = 'El teléfono es requerido';
    }

    if (!formData.password) {
      newErrors.password = 'La contraseña es requerida';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Mínimo 8 caracteres';
    }

    if (formData.password !== formData.password_confirmation) {
      newErrors.password_confirmation = 'Las contraseñas no coinciden';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    setErrors({});

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
  };

  const handleSignIn = () => {
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      {/* Subtle Background Gradients */}
      <View style={styles.backgroundContainer}>
        <LinearGradient
          colors={['rgba(69, 255, 183, 0.15)', 'transparent']}
          style={styles.gradientTop}
        />
        <LinearGradient
          colors={['rgba(69, 255, 183, 0.15)', 'transparent']}
          style={styles.gradientBottom}
        />
      </View>

      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.keyboardAvoid}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.centerContainer}>
              {/* Header Title */}
              <Text style={styles.headerTitle}>Registro</Text>

              {/* Premium Card */}
              <View style={styles.card}>
                {/* General Error */}
                {errors.general && (
                  <View style={styles.errorBanner}>
                    <Text style={styles.errorBannerText}>{errors.general}</Text>
                  </View>
                )}

                {/* Input Fields */}
                <View style={styles.inputsContainer}>
                  <View style={styles.nameRow}>
                    <View style={styles.nameInput}>
                      <Input
                        placeholder="Nombre"
                        value={formData.first_name}
                        onChangeText={(text) => updateField('first_name', text)}
                        autoCapitalize="words"
                        error={errors.first_name}
                        editable={!isLoading}
                      />
                    </View>
                    <View style={styles.nameInput}>
                      <Input
                        placeholder="Apellido"
                        value={formData.last_name}
                        onChangeText={(text) => updateField('last_name', text)}
                        autoCapitalize="words"
                        error={errors.last_name}
                        editable={!isLoading}
                      />
                    </View>
                  </View>

                  <Input
                    placeholder="Email"
                    value={formData.email}
                    onChangeText={(text) => updateField('email', text)}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    error={errors.email}
                    editable={!isLoading}
                  />

                  <Input
                    placeholder="Teléfono"
                    value={formData.phone_number}
                    onChangeText={(text) => updateField('phone_number', text)}
                    keyboardType="phone-pad"
                    error={errors.phone_number}
                    editable={!isLoading}
                  />

                  <Input
                    placeholder="Contraseña"
                    value={formData.password}
                    onChangeText={(text) => updateField('password', text)}
                    secureTextEntry
                    autoCapitalize="none"
                    error={errors.password}
                    editable={!isLoading}
                  />

                  <Input
                    placeholder="Confirmar contraseña"
                    value={formData.password_confirmation}
                    onChangeText={(text) => updateField('password_confirmation', text)}
                    secureTextEntry
                    autoCapitalize="none"
                    error={errors.password_confirmation}
                    editable={!isLoading}
                  />
                </View>

                {/* Register Button */}
                <View style={styles.buttonContainer}>
                  <Button
                    title="Registrarse"
                    onPress={handleRegister}
                    disabled={isLoading}
                    loading={isLoading}
                  />
                </View>

                {/* Sign In Link */}
                <TouchableOpacity
                  onPress={handleSignIn}
                  style={styles.signInContainer}
                  disabled={isLoading}
                >
                  <Text style={styles.signInText}>
                    ¿Ya tienes cuenta? <Text style={styles.signInLink}>Inicia sesión</Text>
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgDark,
  },
  safeArea: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: CONTENT_PADDING,
    justifyContent: 'center',
    minHeight: SCREEN_HEIGHT * 0.9,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 20,
  },
  backgroundContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gradientTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 300,
  },
  gradientBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 300,
    transform: [{ rotate: '180deg' }],
  },
  headerTitle: {
    fontSize: typography.fontSize.title1,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.bold,
    lineHeight: typography.lineHeight.xxxl,
    color: colors.white,
    marginBottom: spacing.xl,
    textAlign: 'center',
    letterSpacing: 1,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xxl,
    padding: spacing.xxl,
  },
  errorBanner: {
    backgroundColor: colors.gray200,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderLeftWidth: 3,
    borderLeftColor: colors.error,
  },
  errorBannerText: {
    color: colors.error,
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.medium,
    textAlign: 'left',
  },
  inputsContainer: {
    gap: spacing.lg,
  },
  nameRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  nameInput: {
    flex: 1,
  },
  buttonContainer: {
    marginTop: spacing.xxl,
  },
  signInContainer: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  signInText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.medium,
    color: colors.textDark,
  },
  signInLink: {
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
  },
});
