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
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { colors, typography } from '../theme/colors';
import Input from '../components/Input';
import Button from '../components/Button';
import { useAuth } from '../context/AuthContext';

const CONTENT_PADDING = 20;
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
    <View style={styles.container}>
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
              <Text style={styles.headerTitle}>REGISTRO</Text>

              {/* Card */}
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

                {/* Register Button */}
                <View style={styles.buttonContainer}>
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
    top: 50,
    left: -150,
    width: 250,
    height: 250,
    borderRadius: 125,
  },
  gradientBottom: {
    position: 'absolute',
    bottom: 80,
    right: -150,
    width: 250,
    height: 250,
    borderRadius: 125,
  },
  headerTitle: {
    fontSize: typography.fontSize.title1,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.bold,
    lineHeight: typography.lineHeight.title1,
    color: colors.white,
    textTransform: 'uppercase',
    marginBottom: 16,
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 26,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  errorBanner: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  errorBannerText: {
    color: colors.error,
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.medium,
    textAlign: 'center',
  },
  inputsContainer: {
    gap: 12,
  },
  nameRow: {
    flexDirection: 'row',
    gap: 12,
  },
  nameInput: {
    flex: 1,
  },
  buttonContainer: {
    marginTop: 24,
    justifyContent: 'center',
  },
  loadingIndicator: {
    position: 'absolute',
    alignSelf: 'center',
  },
  signInContainer: {
    marginTop: 16,
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
