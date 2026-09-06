import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
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
import Card from '../components/ui/Card';
import PrimaryButton from '../components/ui/PrimaryButton';

type BookingConfirmationRouteParams = {
  BookingConfirmation: {
    trainingType: string;
    date: string;
    hourInit: string;
    hourEnd: string;
  };
};

export default function BookingConfirmationScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<BookingConfirmationRouteParams, 'BookingConfirmation'>>();
  const { trainingType, date, hourInit, hourEnd } = route.params;

  const formatDate = (dateStr: string) => {
    const dateObj = new Date(dateStr + 'T00:00:00');
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    return `${dayNames[dateObj.getDay()]} ${dateObj.getDate()} de ${monthNames[dateObj.getMonth()]}`;
  };

  const handleDone = () => {
    // Navigate back to main tabs (Home screen)
    // Since BookingConfirmation is in MainStack, we need to navigate to MainTabs
    navigation.navigate('MainTabs', { screen: 'Home' });
  };

  // The booking already succeeded by the time this screen mounts, so the
  // confirmation is worth feeling as well as reading.
  const intro = useSharedValue(0);
  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    intro.value = withTiming(1, { duration: 460, easing: Easing.out(Easing.cubic) });
  }, []);

  const markStyle = useAnimatedStyle(() => ({
    opacity: intro.value,
    transform: [{ scale: 0.86 + intro.value * 0.14 }],
  }));
  const textStyle = useAnimatedStyle(() => ({
    opacity: withDelay(90, withTiming(intro.value, { duration: 400 })),
    transform: [
      { translateY: withDelay(90, withTiming((1 - intro.value) * 14, { duration: 400 })) },
    ],
  }));
  const cardStyle = useAnimatedStyle(() => ({
    opacity: withDelay(170, withTiming(intro.value, { duration: 400 })),
    transform: [
      { translateY: withDelay(170, withTiming((1 - intro.value) * 14, { duration: 400 })) },
    ],
  }));
  const footerStyle = useAnimatedStyle(() => ({
    opacity: withDelay(250, withTiming(intro.value, { duration: 400 })),
  }));

  return (
    <Screen wash edges={['top', 'bottom']}>
      <View style={styles.content}>
        {/* Achievement is where the brand accent belongs. It sits as the mark
            inside an ink disc — lime on white would be 1.1:1 and vanish. */}
        <Animated.View style={[styles.halo, markStyle]}>
          <View style={styles.mark}>
            <Feather name="check" size={56} color={colors.accent} />
          </View>
        </Animated.View>

        <Animated.View style={[styles.titles, textStyle]}>
          <Text style={styles.title}>¡Ya te agendamos!</Text>
          <Text style={styles.trainingType}>{trainingType}</Text>
        </Animated.View>

        <Animated.View style={[styles.cardWrap, cardStyle]}>
          <Card>
            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <Feather name="calendar" size={18} color={colors.ink} />
              </View>
              <View style={styles.detailTexts}>
                <Text style={styles.detailLabel}>FECHA</Text>
                <Text style={styles.detailValue}>{formatDate(date)}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <Feather name="clock" size={18} color={colors.ink} />
              </View>
              <View style={styles.detailTexts}>
                <Text style={styles.detailLabel}>HORARIO</Text>
                <Text style={styles.detailValue}>
                  {hourInit} — {hourEnd}
                </Text>
              </View>
            </View>
          </Card>

          <Text style={styles.motivational}>¡Prepárate para dar lo mejor de ti!</Text>
        </Animated.View>
      </View>

      <Animated.View style={[styles.footer, footerStyle]}>
        <PrimaryButton label="Listo" onPress={handleDone} />
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  halo: {
    width: 148,
    height: 148,
    borderRadius: 74,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  mark: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titles: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 28,
  },
  title: {
    fontFamily: typography.fontFamily,
    fontSize: 34,
    fontWeight: typography.fontWeight.bold,
    lineHeight: 40,
    letterSpacing: -1,
    color: colors.ink,
    textAlign: 'center',
  },
  trainingType: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    // gray400 is 5.3:1 here; the design's #A5A5A5 would be 2.5:1.
    color: colors.gray400,
    textAlign: 'center',
  },
  cardWrap: {
    alignSelf: 'stretch',
    gap: 20,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailTexts: {
    flex: 1,
    gap: 2,
  },
  detailLabel: {
    fontFamily: typography.fontFamily,
    fontSize: 10,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: 1.2,
    color: colors.gray400,
  },
  detailValue: {
    fontFamily: typography.fontFamily,
    fontSize: 17,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.ink,
  },
  divider: {
    height: 1,
    backgroundColor: colors.surface,
    marginLeft: 54, // detailIcon width + gap
  },
  motivational: {
    fontFamily: typography.fontFamily,
    fontSize: 14,
    color: colors.gray400,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 12,
    paddingTop: 8,
  },
});
