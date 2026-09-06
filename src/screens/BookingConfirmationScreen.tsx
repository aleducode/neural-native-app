import React, { useEffect } from 'react';
import { View, Text, Image, StyleSheet, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { colors, typography } from '../theme/colors';
import Screen from '../components/ui/Screen';

type BookingConfirmationRouteParams = {
  BookingConfirmation: {
    trainingType: string;
    date: string;
    hourInit: string;
    hourEnd: string;
  };
};

const SHORT_DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

/** "HH:MM AM/PM" -> minutes since midnight. */
function parseTimeToMinutes(time: string): number {
  const match = time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!match) return 0;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3]?.toUpperCase();

  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

/** One of the three columns under the trophy: icon, label, value. */
function Stat({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.stat}>
      <Feather name={icon} size={24} color={colors.ink} />
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

export default function BookingConfirmationScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<BookingConfirmationRouteParams, 'BookingConfirmation'>>();
  const { trainingType, date, hourInit, hourEnd } = route.params;

  const dateObj = new Date(date + 'T00:00:00');
  const shortDate = `${SHORT_DAYS[dateObj.getDay()]} ${dateObj.getDate()}`;
  const duration = parseTimeToMinutes(hourEnd) - parseTimeToMinutes(hourInit);

  const goHome = () => navigation.navigate('MainTabs', { screen: 'Home' });
  const goAgenda = () => navigation.navigate('MainTabs', { screen: 'Trainings' });

  // The booking already succeeded by the time this screen mounts, so the
  // confirmation is worth feeling as well as reading.
  const intro = useSharedValue(0);
  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    intro.value = withTiming(1, { duration: 460, easing: Easing.out(Easing.cubic) });
  }, []);

  const heroStyle = useAnimatedStyle(() => ({
    opacity: intro.value,
    transform: [{ scale: 0.9 + intro.value * 0.1 }],
  }));
  const statsStyle = useAnimatedStyle(() => ({
    opacity: withDelay(120, withTiming(intro.value, { duration: 400 })),
    transform: [
      { translateY: withDelay(120, withTiming((1 - intro.value) * 14, { duration: 400 })) },
    ],
  }));
  const footerStyle = useAnimatedStyle(() => ({
    opacity: withDelay(220, withTiming(intro.value, { duration: 400 })),
  }));

  return (
    <Screen wash edges={['top', 'bottom']}>
      <View style={styles.content}>
        <Animated.View style={[styles.hero, heroStyle]}>
          <Image
            source={require('../../assets/trainings/trophy.png')}
            style={styles.trophy}
            resizeMode="contain"
            accessible={false}
          />
          <View style={styles.titles}>
            <Text style={styles.title}>¡Ya te agendamos!</Text>
            <Text style={styles.subtitle}>Prepárate para dar lo mejor de ti.</Text>
          </View>
        </Animated.View>

        <Animated.View style={[styles.stats, statsStyle]}>
          <Stat icon="calendar" label="Fecha" value={shortDate} />
          {/* The design pairs "Hora" with a flame, left over from the template's
              calories column. A clock says what the number is. */}
          <Stat icon="clock" label="Hora" value={hourInit} />
          <Stat icon="watch" label="Duración" value={`${duration} min`} />
        </Animated.View>
      </View>

      <Animated.View style={[styles.footer, footerStyle]}>
        <Pressable
          onPress={goHome}
          style={({ pressed }) => [styles.button, styles.primary, pressed && styles.pressed]}
          accessibilityRole="button"
        >
          {/* The design puts white on #17DD42 — 2.0:1, unreadable. Ink on the
              same green is 10:1 and keeps the accent doing the work. */}
          <Text style={[styles.buttonLabel, styles.primaryLabel]}>Volver al inicio</Text>
        </Pressable>

        <Pressable
          onPress={goAgenda}
          style={({ pressed }) => [styles.button, styles.secondary, pressed && styles.pressed]}
          accessibilityRole="button"
        >
          <Text style={[styles.buttonLabel, styles.secondaryLabel]}>Ver mi agenda</Text>
        </Pressable>
      </Animated.View>

      <Text style={styles.trainingType} accessibilityLabel={`Entrenamiento ${trainingType}`}>
        {trainingType}
      </Text>
    </Screen>
  );
}

// Values from the design's "Reserva confirmada" node: a 247x214 trophy over a
// 32 gap, stats 24 apart in 98-wide columns, buttons 46 tall at radius 32.
const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 56,
  },
  hero: {
    width: 248,
    alignItems: 'center',
    gap: 32,
  },
  trophy: {
    width: 247,
    height: 214,
  },
  titles: {
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontFamily: typography.fontFamily,
    fontSize: 24,
    fontWeight: typography.fontWeight.bold,
    color: colors.ink,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: typography.fontFamily,
    fontSize: 16,
    // The design's #A5A5A5 is 2.5:1 here; gray400 holds the muted role at 5.3:1.
    color: colors.gray400,
    textAlign: 'center',
  },
  stats: {
    flexDirection: 'row',
    gap: 24,
  },
  stat: {
    width: 98,
    alignItems: 'center',
    gap: 8,
  },
  statLabel: {
    fontFamily: typography.fontFamily,
    fontSize: 16,
    color: colors.gray400,
  },
  statValue: {
    fontFamily: typography.fontFamily,
    fontSize: 24,
    letterSpacing: -0.48,
    color: colors.ink,
  },
  footer: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  button: {
    flex: 1,
    height: 46,
    borderRadius: 32,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: colors.accentDeep,
    borderColor: colors.ink,
  },
  secondary: {
    backgroundColor: colors.white,
    borderColor: colors.ink,
  },
  pressed: {
    opacity: 0.85,
  },
  buttonLabel: {
    fontFamily: typography.fontFamily,
    fontSize: 16,
  },
  primaryLabel: {
    color: colors.ink,
    fontWeight: typography.fontWeight.semiBold,
  },
  secondaryLabel: {
    color: colors.ink,
  },
  trainingType: {
    fontFamily: typography.fontFamily,
    fontSize: 13,
    color: colors.gray400,
    textAlign: 'center',
    paddingBottom: 12,
  },
});
