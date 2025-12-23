import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography } from '../theme/colors';
import Button from '../components/Button';
import { useAuth } from '../context/AuthContext';

export default function PendingScreen() {
  const { logout, user } = useAuth();

  const handleContactWhatsApp = () => {
    const phone = '573001234567'; // Replace with actual support number
    const message = `Hola, soy ${user?.first_name} ${user?.last_name} y necesito verificar mi cuenta en Neural.`;
    const url = `whatsapp://send?phone=${phone}&text=${encodeURIComponent(message)}`;
    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`);
    });
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
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

      <View style={styles.content}>
        {/* Icon */}
        <View style={styles.iconContainer}>
          <Ionicons name="time-outline" size={80} color={colors.primary} />
        </View>

        {/* Title */}
        <Text style={styles.title}>Verificación Pendiente</Text>

        {/* Message */}
        <Text style={styles.message}>
          Tu cuenta está pendiente de verificación. Por favor contacta a soporte para completar el proceso.
        </Text>

        {/* User Info */}
        {user && (
          <View style={styles.userInfo}>
            <Text style={styles.userInfoText}>
              {user.first_name} {user.last_name}
            </Text>
            <Text style={styles.userEmail}>{user.email}</Text>
          </View>
        )}

        {/* Buttons */}
        <View style={styles.buttonsContainer}>
          <Button
            title="Contactar por WhatsApp"
            onPress={handleContactWhatsApp}
          />

          <Button
            title="Cerrar sesión"
            onPress={handleLogout}
            variant="outline"
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgDark,
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
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  iconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(69, 255, 183, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: typography.fontSize.xxxl,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
    textAlign: 'center',
    marginBottom: 16,
  },
  message: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  userInfo: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginBottom: 32,
    width: '100%',
  },
  userInfoText: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  buttonsContainer: {
    width: '100%',
    gap: 16,
  },
});
