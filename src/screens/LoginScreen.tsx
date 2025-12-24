import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Image,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { colors, typography, spacing, borderRadius } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';
import Input from '../components/Input';
import Button from '../components/Button';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const CONTENT_PADDING = spacing.xxl;

export default function LoginScreen() {
  const navigation = useNavigation<any>();
  const { login, biometricAvailable, biometricEnabled, biometricType, loginWithBiometric } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [rememberBiometric, setRememberBiometric] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Por favor ingresa tu correo y contraseña');
      return;
    }

    setIsLoading(true);
    const { success, error } = await login({ email, password }, rememberBiometric);
    setIsLoading(false);

    if (!success && error) {
      Alert.alert('Error', error);
    }
  };

  const handleBiometricLogin = async () => {
    setIsLoading(true);
    const { success, error } = await loginWithBiometric();
    setIsLoading(false);

    if (!success && error) {
      Alert.alert('Error', error);
    }
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
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.centerContainer}>
              {/* Header Title */}
              <Text style={styles.title}>INICIAR SESIÓN</Text>

              {/* Premium Card */}
              <View style={styles.card}>
                {/* Logo */}
                <View style={styles.logoContainer}>
                  <Image
                    source={require('../../assets/neural.png')}
                    style={styles.logo}
                    resizeMode="contain"
                  />
                </View>

                {/* Form */}
                <View style={styles.form}>
                  <Input
                    placeholder="Email"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    editable={!isLoading}
                  />

                  <Input
                    placeholder="Contraseña"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    autoCapitalize="none"
                    editable={!isLoading}
                  />

                  {/* Forgot Password */}
                  <TouchableOpacity
                    style={styles.forgotPassword}
                    onPress={() => {}}
                    disabled={isLoading}
                  >
                    <Text style={styles.forgotPasswordText}>¿Olvidaste tu contraseña?</Text>
                  </TouchableOpacity>
                </View>

                {/* Login Button */}
                <View style={styles.buttonContainer}>
                  <Button
                    title={isLoading ? '' : 'Ingresar'}
                    onPress={handleLogin}
                    disabled={isLoading}
                    loading={isLoading}
                  />
                </View>

                {/* Divider */}
                {biometricEnabled && (
                  <View style={styles.dividerContainer}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>o</Text>
                    <View style={styles.dividerLine} />
                  </View>
                )}

                {/* Biometric Checkbox */}
                {biometricAvailable && (
                  <TouchableOpacity
                    style={styles.biometricCheckbox}
                    onPress={() => setRememberBiometric(!rememberBiometric)}
                    disabled={isLoading}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.checkbox, rememberBiometric && styles.checkboxChecked]}>
                      {rememberBiometric && (
                        <Ionicons name="checkmark" size={12} color={colors.textDark} />
                      )}
                    </View>
                    <Text style={styles.biometricCheckboxText}>
                      Recordar con {biometricType}
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Biometric Login Button */}
                {biometricEnabled && (
                  <TouchableOpacity
                    style={styles.biometricButton}
                    onPress={handleBiometricLogin}
                    disabled={isLoading}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={biometricType === 'Face ID' ? 'scan-outline' : 'finger-print-outline'}
                      size={20}
                      color={colors.primary}
                    />
                    <Text style={styles.biometricButtonText}>
                      Ingresar con {biometricType}
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Register Link */}
                <View style={styles.registerContainer}>
                  <Text style={styles.registerText}>¿No tienes cuenta? </Text>
                  <TouchableOpacity
                    onPress={() => navigation.navigate('Register')}
                    disabled={isLoading}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.registerLink}>Regístrate</Text>
                  </TouchableOpacity>
                </View>
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
  keyboardView: {
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
    paddingVertical: spacing.xxl,
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
    top: 80,
    left: -120,
    width: 240,
    height: 240,
    borderRadius: 120,
  },
  gradientBottom: {
    position: 'absolute',
    bottom: 120,
    right: -120,
    width: 240,
    height: 240,
    borderRadius: 120,
  },
  title: {
    fontSize: 38,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.bold,
    lineHeight: 48,
    color: colors.white,
    textTransform: 'uppercase',
    marginBottom: spacing.xxl,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xxl,
    padding: spacing.xxl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 12,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
    paddingTop: spacing.md,
  },
  logo: {
    width: 120,
    height: 43,
  },
  form: {
    marginBottom: spacing.xl,
    gap: spacing.md,
  },
  forgotPassword: {
    alignItems: 'flex-end',
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  forgotPasswordText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.medium,
    color: colors.gray400,
  },
  buttonContainer: {
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.xl,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.gray200,
  },
  dividerText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.regular,
    color: colors.gray400,
    paddingHorizontal: spacing.lg,
  },
  biometricCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    paddingVertical: spacing.xs,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.gray400,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  biometricCheckboxText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.medium,
    color: colors.textDark,
  },
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  biometricButtonText: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.medium,
    color: colors.primary,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: spacing.md,
    marginTop: spacing.sm,
  },
  registerText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.medium,
    color: colors.textDark,
  },
  registerLink: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
  },
});
