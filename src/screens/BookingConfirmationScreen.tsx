import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../theme/colors';
import Button from '../components/Button';

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
    // Navigate back to main/calendar
    navigation.reset({
      index: 0,
      routes: [{ name: 'Main' }],
    });
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          {/* Success Icon */}
          <View style={styles.iconContainer}>
            <View style={styles.iconCircle}>
              <Ionicons name="checkmark" size={64} color={colors.textDark} />
            </View>
          </View>

          {/* Title */}
          <Text style={styles.title}>¡Ya te agendamos!</Text>
          <Text style={styles.subtitle}>{trainingType}</Text>

          {/* Details Card */}
          <View style={styles.detailsCard}>
            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <Ionicons name="calendar-outline" size={24} color={colors.primary} />
              </View>
              <Text style={styles.detailText}>{formatDate(date)}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <Ionicons name="time-outline" size={24} color={colors.primary} />
              </View>
              <Text style={styles.detailText}>{hourInit} - {hourEnd}</Text>
            </View>
          </View>

          {/* Motivational Text */}
          <Text style={styles.motivationalText}>
            ¡Prepárate para dar lo mejor de ti!
          </Text>
        </View>

        {/* Button */}
        <View style={styles.buttonContainer}>
          <Button title="Listo" onPress={handleDone} />
        </View>
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
  content: {
    flex: 1,
    paddingHorizontal: spacing.xxl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: spacing.xxl,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: typography.fontSize.title1,
    fontFamily: typography.fontFamily.bold,
    color: colors.white,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  subtitle: {
    fontSize: typography.fontSize.xxl,
    fontFamily: typography.fontFamily.semibold,
    color: colors.primary,
    textAlign: 'center',
    textTransform: 'uppercase',
    marginBottom: spacing.xxl,
  },
  detailsCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.xxl,
    width: '100%',
    marginBottom: spacing.xxl,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  detailIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(69, 255, 183, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailText: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.medium,
    color: colors.textDark,
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: colors.gray200,
    marginVertical: spacing.lg,
  },
  motivationalText: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.medium,
    color: colors.gray400,
    textAlign: 'center',
  },
  buttonContainer: {
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.xxl,
  },
});
