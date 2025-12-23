import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { colors, typography } from '../theme/colors';
import Input from '../components/Input';
import Button from '../components/Button';
import { useAuth } from '../context/AuthContext';

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

    const { success, error } = await register({
      first_name: formData.first_name.trim(),
      last_name: formData.last_name.trim(),
      email: formData.email.trim(),
      phone_number: formData.phone_number.trim(),
      password: formData.password,
      password_confirmation: formData.password_confirmation,
    });

    setIsLoading(false);

    if (!success) {
      setErrors({ general: error });
    }
  };

  const handleSignIn = () => {
    navigation.goBack();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* Background Decorative Elements */}
        <View style={styles.backgroundContainer}>
          <LinearGradient
            colors={['rgba(69, 255, 183, 0.4)', 'transparent']}
            style={styles.gradientTop}
          />
          <LinearGradient
            colors={['rgba(69, 255, 183, 0.4)', 'transparent']}
            style={styles.gradientBottom}
          />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Title */}
          <Text style={styles.headerTitle}>REGISTRO</Text>

          {/* Main Container */}
          <View style={styles.mainContainer}>
            {/* Card Background */}
            <View style={styles.card} />

            {/* Form Container */}
            <View style={styles.formContainer}>
              {/* General Error */}
              {errors.general && (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorBannerText}>{errors.general}</Text>
                </View>
              )}

              {/* Input Fields Container */}
              <View style={styles.inputsContainer}>
                <View style={styles.nameRow}>
                  <View style={styles.nameInput}>
                    <Input
                      label="Nombre"
                      placeholder="Juan"
                      value={formData.first_name}
                      onChangeText={(text) => updateField('first_name', text)}
                      autoCapitalize="words"
                      error={errors.first_name}
                      editable={!isLoading}
                    />
                  </View>
                  <View style={styles.nameInput}>
                    <Input
                      label="Apellido"
                      placeholder="Pérez"
                      value={formData.last_name}
                      onChangeText={(text) => updateField('last_name', text)}
                      autoCapitalize="words"
                      error={errors.last_name}
                      editable={!isLoading}
                    />
                  </View>
                </View>

                <Input
                  label="Email"
                  placeholder="juan@email.com"
                  value={formData.email}
                  onChangeText={(text) => updateField('email', text)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  error={errors.email}
                  editable={!isLoading}
                />

                <Input
                  label="Teléfono"
                  placeholder="+57 300 123 4567"
                  value={formData.phone_number}
                  onChangeText={(text) => updateField('phone_number', text)}
                  keyboardType="phone-pad"
                  error={errors.phone_number}
                  editable={!isLoading}
                />

                <Input
                  label="Contraseña"
                  placeholder="Mínimo 8 caracteres"
                  value={formData.password}
                  onChangeText={(text) => updateField('password', text)}
                  secureTextEntry
                  autoCapitalize="none"
                  error={errors.password}
                  editable={!isLoading}
                />

                <Input
                  label="Confirmar contraseña"
                  placeholder="Repite tu contraseña"
                  value={formData.password_confirmation}
                  onChangeText={(text) => updateField('password_confirmation', text)}
                  secureTextEntry
                  autoCapitalize="none"
                  error={errors.password_confirmation}
                  editable={!isLoading}
                />
              </View>
            </View>

            {/* Register Button */}
            <View style={styles.registerButtonContainer}>
              <Button
                title={isLoading ? '' : 'Registrarse'}
                onPress={handleRegister}
                disabled={isLoading}
              />
              {isLoading && (
                <ActivityIndicator
                  style={styles.loadingIndicator}
                  color={colors.textDark}
                  size="small"
                />
              )}
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
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const CARD_LEFT_OFFSET = 20;
const CARD_WIDTH = 388;
const CONTENT_WIDTH = 364;
const CONTENT_CENTER_X = 32;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgDark,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    width: 428,
    minHeight: '100%',
    paddingBottom: 40,
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
    top: 74,
    left: -240,
    width: 336,
    height: 336,
    borderRadius: 168,
  },
  gradientBottom: {
    position: 'absolute',
    top: 555,
    right: -240,
    width: 336,
    height: 336,
    borderRadius: 168,
  },
  headerTitle: {
    fontSize: typography.fontSize.xxxl,
    fontWeight: typography.fontWeight.bold,
    lineHeight: typography.lineHeight.xxxl,
    color: colors.white,
    textTransform: 'uppercase',
    position: 'absolute',
    left: 61,
    top: 80,
    fontFamily: typography.fontFamily.bold,
  },
  mainContainer: {
    position: 'absolute',
    left: 0,
    top: 140,
    width: 428,
    height: 620,
  },
  card: {
    position: 'absolute',
    left: CARD_LEFT_OFFSET,
    top: 0,
    width: CARD_WIDTH,
    height: 620,
    backgroundColor: colors.white,
    borderRadius: 26,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  formContainer: {
    position: 'absolute',
    left: 32,
    top: 24,
    width: CONTENT_WIDTH,
    gap: 4,
  },
  errorBanner: {
    width: '100%',
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  errorBannerText: {
    color: '#FF3B30',
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
  },
  inputsContainer: {
    width: '100%',
    alignItems: 'flex-start',
    gap: 10,
  },
  nameRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  nameInput: {
    flex: 1,
  },
  registerButtonContainer: {
    position: 'absolute',
    left: CONTENT_CENTER_X,
    top: 500,
    width: CONTENT_WIDTH,
    justifyContent: 'center',
  },
  loadingIndicator: {
    position: 'absolute',
    alignSelf: 'center',
  },
  signInContainer: {
    position: 'absolute',
    left: CONTENT_CENTER_X,
    top: 570,
    width: CONTENT_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signInText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    lineHeight: typography.lineHeight.md,
    color: colors.textDark,
    fontFamily: typography.fontFamily.medium,
  },
  signInLink: {
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamily.bold,
    color: colors.primary,
  },
});
