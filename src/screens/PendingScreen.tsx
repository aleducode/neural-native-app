import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Linking, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { colors, typography } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { NEURAL_PHONE } from '../constants/config';
import Screen from '../components/ui/Screen';
import PrimaryButton from '../components/ui/PrimaryButton';

export default function PendingScreen() {
  const { logout, user } = useAuth();

  const intro = useSharedValue(0);
  useEffect(() => {
    intro.value = withTiming(1, { duration: 460, easing: Easing.out(Easing.cubic) });
  }, []);

  const headStyle = useAnimatedStyle(() => ({
    opacity: intro.value,
    transform: [{ translateY: (1 - intro.value) * 16 }],
  }));
  const bodyStyle = useAnimatedStyle(() => ({
    opacity: withDelay(90, withTiming(intro.value, { duration: 400 })),
    transform: [{ translateY: withDelay(90, withTiming((1 - intro.value) * 16, { duration: 400 })) }],
  }));
  const actionsStyle = useAnimatedStyle(() => ({
    opacity: withDelay(170, withTiming(intro.value, { duration: 400 })),
  }));

  const handleContactWhatsApp = () => {
    // Use the same WhatsApp link format as Django backend
    // Format: https://wa.me/57{NEURAL_PHONE}?text=Hola+Neural+estoy+listo+para+iniciar+mis+entrenos+mi+nombre+es+{first_name}+{last_name}.
    const phone = `57${NEURAL_PHONE}`;
    const message = `Hola Neural estoy listo para iniciar mis entrenos mi nombre es ${user?.first_name} ${user?.last_name}.`;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

    Linking.openURL(url).catch((err) => {
      console.error('Error opening WhatsApp:', err);
      // Fallback to web version
      Linking.openURL(url);
    });
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <Screen tone="plain" wash edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={headStyle}>
          <View style={styles.icon}>
            <Feather name="clock" size={30} color={colors.accentDeep} />
          </View>

          <Text style={styles.title}>Estamos{'\n'}verificando tu cuenta</Text>
          <Text style={styles.message}>
            Tu cuenta está pendiente de verificación. Escríbenos y completamos el proceso contigo.
          </Text>
        </Animated.View>

        {user && (
          <Animated.View style={[styles.userCard, bodyStyle]}>
            <Text style={styles.userLabel}>TU REGISTRO</Text>
            <Text style={styles.userName}>
              {user.first_name} {user.last_name}
            </Text>
            <Text style={styles.userEmail}>{user.email}</Text>
          </Animated.View>
        )}

        <Animated.View style={[styles.actions, actionsStyle]}>
          <PrimaryButton
            label="Contactar por WhatsApp"
            icon="message-circle"
            onPress={handleContactWhatsApp}
          />
          <PrimaryButton
            label="Cerrar sesión"
            variant="secondary"
            onPress={handleLogout}
          />
        </Animated.View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  icon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  title: {
    fontFamily: typography.fontFamily,
    fontSize: 36,
    fontWeight: typography.fontWeight.bold,
    lineHeight: 41,
    letterSpacing: -1,
    color: colors.ink,
  },
  message: {
    marginTop: 14,
    fontFamily: typography.fontFamily,
    fontSize: 15,
    lineHeight: 22,
    color: colors.gray400,
  },
  userCard: {
    marginTop: 32,
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
  },
  userLabel: {
    fontFamily: typography.fontFamily,
    fontSize: 11,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: 1.2,
    color: colors.gray400,
    marginBottom: 8,
  },
  userName: {
    fontFamily: typography.fontFamily,
    fontSize: 20,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.ink,
  },
  userEmail: {
    marginTop: 2,
    fontFamily: typography.fontFamily,
    fontSize: 14,
    color: colors.gray400,
  },
  actions: {
    marginTop: 32,
    gap: 12,
  },
});
