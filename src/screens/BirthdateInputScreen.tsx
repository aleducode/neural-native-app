import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { colors, typography } from '../theme/colors';
import { profileApi } from '../api/profile';
import Screen from '../components/ui/Screen';
import AppHeader from '../components/ui/AppHeader';
import PrimaryButton from '../components/ui/PrimaryButton';

const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

const DAY_WIDTH = 76;
const MONTH_WIDTH = 104;
const YEAR_WIDTH = 104;

const MONTHS = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
];

const MONTHS_FULL = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const currentYear = new Date().getFullYear();
const MIN_YEAR = 1940;
const MAX_YEAR = currentYear - 10; // At least 10 years old

interface WheelPickerProps {
  data: (string | number)[];
  selectedIndex: number;
  onValueChange: (index: number) => void;
  width: number;
  label: string;
}

function WheelPicker({ data, selectedIndex, onValueChange, width, label }: WheelPickerProps) {
  const scrollViewRef = useRef<ScrollView>(null);
  const lastHapticIndex = useRef(selectedIndex);

  useEffect(() => {
    // Scroll to selected index on mount
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({
        y: selectedIndex * ITEM_HEIGHT,
        animated: false,
      });
    }, 100);
  }, []);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / ITEM_HEIGHT);
    const clampedIndex = Math.max(0, Math.min(data.length - 1, index));

    if (clampedIndex !== lastHapticIndex.current) {
      Haptics.selectionAsync();
      lastHapticIndex.current = clampedIndex;
      onValueChange(clampedIndex);
    }
  };

  const handleScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / ITEM_HEIGHT);
    const clampedIndex = Math.max(0, Math.min(data.length - 1, index));

    // Snap to nearest item
    scrollViewRef.current?.scrollTo({
      y: clampedIndex * ITEM_HEIGHT,
      animated: true,
    });

    onValueChange(clampedIndex);
  };

  return (
    <View style={[styles.wheelColumn, { width }]}>
      <Text style={styles.wheelLabel}>{label}</Text>
      <View style={styles.wheelContainer}>
        <ScrollView
          ref={scrollViewRef}
          showsVerticalScrollIndicator={false}
          snapToInterval={ITEM_HEIGHT}
          decelerationRate="fast"
          onScroll={handleScroll}
          onMomentumScrollEnd={handleScrollEnd}
          onScrollEndDrag={handleScrollEnd}
          scrollEventThrottle={16}
          contentContainerStyle={{
            paddingVertical: ITEM_HEIGHT * 2,
          }}
        >
          {data.map((item, index) => {
            const distance = Math.abs(index - selectedIndex);
            const isSelected = distance === 0;
            return (
              <View key={index} style={styles.wheelItem}>
                <Text
                  style={[
                    styles.wheelItemText,
                    // The selected row has to win outright: everything either
                    // side steps back in size, weight and presence.
                    isSelected && styles.wheelItemTextSelected,
                    !isSelected && { opacity: distance === 1 ? 0.6 : 0.3 },
                  ]}
                >
                  {item}
                </Text>
              </View>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

export default function BirthdateInputScreen() {
  const navigation = useNavigation();

  const [selectedDay, setSelectedDay] = useState(14);
  const [selectedMonth, setSelectedMonth] = useState(0); // January = 0
  const [selectedYear, setSelectedYear] = useState(2000);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Generate arrays
  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const years = Array.from(
    { length: MAX_YEAR - MIN_YEAR + 1 },
    (_, i) => MAX_YEAR - i
  );

  const intro = useSharedValue(0);
  useEffect(() => {
    intro.value = withTiming(1, { duration: 460, easing: Easing.out(Easing.cubic) });
  }, []);

  const headerStyle = useAnimatedStyle(() => ({
    opacity: intro.value,
    transform: [{ translateY: (1 - intro.value) * 16 }],
  }));
  const valueStyle = useAnimatedStyle(() => ({
    opacity: withDelay(90, withTiming(intro.value, { duration: 400 })),
    transform: [{ translateY: withDelay(90, withTiming((1 - intro.value) * 16, { duration: 400 })) }],
  }));
  const footerStyle = useAnimatedStyle(() => ({
    opacity: withDelay(170, withTiming(intro.value, { duration: 400 })),
  }));

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const { data } = await profileApi.getProfile();
    if (data?.profile.birthdate) {
      const date = new Date(data.profile.birthdate);
      setSelectedDay(date.getDate());
      setSelectedMonth(date.getMonth());
      setSelectedYear(date.getFullYear());
    }
    setIsLoading(false);
  };

  const handleSave = async () => {
    setFormError(null);

    // Validate date
    const date = new Date(selectedYear, selectedMonth, selectedDay);
    if (date.getMonth() !== selectedMonth) {
      // Inline, beside the pickers that produced it.
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setFormError('Fecha inválida');
      return;
    }

    setIsSaving(true);
    const birthdate = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
    const { data, error } = await profileApi.updateProfile({ birthdate });
    setIsSaving(false);

    if (data) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSaved(true);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setFormError(error || 'No se pudo guardar la fecha de nacimiento');
    }
  };

  const handleSuccessClose = () => {
    setSaved(false);
    navigation.goBack();
  };

  const formatDisplayDate = () => {
    return `${selectedDay} ${MONTHS_FULL[selectedMonth]} ${selectedYear}`;
  };

  // Get max days for selected month/year
  const getMaxDays = () => {
    return new Date(selectedYear, selectedMonth + 1, 0).getDate();
  };

  // Adjust day if it exceeds max days for the month
  useEffect(() => {
    const maxDays = getMaxDays();
    if (selectedDay > maxDays) {
      setSelectedDay(maxDays);
    }
  }, [selectedMonth, selectedYear]);

  // Any change to the wheels makes a previous confirmation stale.
  useEffect(() => {
    setSaved(false);
    setFormError(null);
  }, [selectedDay, selectedMonth, selectedYear]);

  const getAge = () => {
    const today = new Date();
    let age = today.getFullYear() - selectedYear;
    const monthDiff = today.getMonth() - selectedMonth;
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < selectedDay)) {
      age -= 1;
    }
    return age;
  };

  if (isLoading) {
    return (
      <Screen tone="plain" wash edges={['top', 'bottom']}>
        <AppHeader title="Datos corporales" />
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.ink} />
        </View>
      </Screen>
    );
  }

  const displayDays = days.slice(0, getMaxDays());
  const age = getAge();

  return (
    <Screen tone="plain" wash edges={['top', 'bottom']}>
      <AppHeader title="Datos corporales" />

      <View style={styles.body}>
        <Animated.View style={[styles.head, headerStyle]}>
          <Text style={styles.title}>Tu fecha{'\n'}de nacimiento</Text>
          <Text style={styles.subtitle}>Desliza cada rueda hasta tu fecha.</Text>
        </Animated.View>

        <Animated.View style={[styles.stage, valueStyle]}>
          <View style={styles.valueBlock}>
            <Text
              style={styles.value}
              accessibilityRole="text"
              accessibilityLabel={`Fecha seleccionada: ${formatDisplayDate()}`}
            >
              {formatDisplayDate()}
            </Text>
            <Text style={styles.hint}>
              {age >= 0 ? `${age} ${age === 1 ? 'año' : 'años'}` : 'Fecha futura'}
            </Text>
          </View>

          <View style={styles.wheels}>
            {/* Selection band: the row under the band is the answer. */}
            <View style={styles.selectionBand} pointerEvents="none" />

            <View style={styles.pickersRow}>
              {/* Day Picker */}
              <WheelPicker
                data={displayDays}
                selectedIndex={selectedDay - 1}
                onValueChange={(index) => setSelectedDay(index + 1)}
                width={DAY_WIDTH}
                label="Día"
              />

              {/* Month Picker */}
              <WheelPicker
                data={MONTHS}
                selectedIndex={selectedMonth}
                onValueChange={setSelectedMonth}
                width={MONTH_WIDTH}
                label="Mes"
              />

              {/* Year Picker */}
              <WheelPicker
                data={years}
                selectedIndex={years.indexOf(selectedYear)}
                onValueChange={(index) => setSelectedYear(years[index])}
                width={YEAR_WIDTH}
                label="Año"
              />
            </View>
          </View>
        </Animated.View>

        <Animated.View style={[styles.footer, footerStyle]}>
          {!!formError && (
            <View style={styles.errorRow}>
              <Feather name="alert-circle" size={16} color={colors.error} />
              <Text style={styles.errorText}>{formError}</Text>
            </View>
          )}

          {saved && (
            <View style={styles.successRow}>
              <Feather name="check-circle" size={16} color={colors.accentDeep} />
              <Text style={styles.successText}>
                Guardado. Tu fecha quedó en {formatDisplayDate()}.
              </Text>
            </View>
          )}

          <PrimaryButton
            label={saved ? 'Listo' : 'Guardar'}
            onPress={saved ? handleSuccessClose : handleSave}
            loading={isSaving}
          />
        </Animated.View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  head: {
    marginTop: 8,
    gap: 8,
  },
  title: {
    fontFamily: typography.fontFamily,
    fontSize: 34,
    fontWeight: typography.fontWeight.bold,
    lineHeight: 38,
    letterSpacing: -1,
    color: colors.ink,
  },
  subtitle: {
    fontFamily: typography.fontFamily,
    fontSize: 15,
    lineHeight: 21,
    color: colors.gray400,
  },
  stage: {
    flex: 1,
    justifyContent: 'center',
    gap: 20,
  },
  valueBlock: {
    alignItems: 'center',
    gap: 4,
  },
  value: {
    fontFamily: typography.fontFamily,
    fontSize: 30,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: -0.8,
    color: colors.ink,
  },
  hint: {
    fontFamily: typography.fontFamily,
    fontSize: 13,
    color: colors.gray400,
  },
  wheels: {
    height: PICKER_HEIGHT + 24,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  selectionBand: {
    position: 'absolute',
    left: 0,
    right: 0,
    // Sits over the middle row of the wheels, which start below the labels.
    bottom: (PICKER_HEIGHT - ITEM_HEIGHT) / 2,
    height: ITEM_HEIGHT,
    borderRadius: 16,
    backgroundColor: colors.surface,
  },
  pickersRow: {
    flexDirection: 'row',
  },
  wheelColumn: {
    alignItems: 'center',
    gap: 8,
  },
  wheelLabel: {
    fontFamily: typography.fontFamily,
    fontSize: 10,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.gray400,
  },
  wheelContainer: {
    height: PICKER_HEIGHT,
    alignSelf: 'stretch',
    overflow: 'hidden',
  },
  wheelItem: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wheelItemText: {
    fontFamily: typography.fontFamily,
    fontSize: 17,
    fontWeight: typography.fontWeight.medium,
    color: colors.gray400,
  },
  wheelItemTextSelected: {
    fontSize: 22,
    fontWeight: typography.fontWeight.bold,
    color: colors.ink,
  },
  footer: {
    gap: 14,
    paddingTop: 8,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontFamily: typography.fontFamily,
    fontSize: 13,
    color: colors.error,
  },
  successRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: colors.accentSoft,
  },
  successText: {
    flex: 1,
    fontFamily: typography.fontFamily,
    fontSize: 13,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.ink,
  },
});
