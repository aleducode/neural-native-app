import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { colors, typography, spacing, borderRadius } from '../theme/colors';
import { profileApi } from '../api/profile';
import ConfirmModal from '../components/ConfirmModal';

const SCREEN_WIDTH = Dimensions.get('window').width;
const ITEM_HEIGHT = 40;
const VISIBLE_ITEMS = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

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
}

function WheelPicker({ data, selectedIndex, onValueChange, width }: WheelPickerProps) {
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
    <View style={[styles.wheelContainer, { width }]}>
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
          const isSelected = index === selectedIndex;
          return (
            <View key={index} style={styles.wheelItem}>
              <Text
                style={[
                  styles.wheelItemText,
                  isSelected && styles.wheelItemTextSelected,
                ]}
              >
                {item}
              </Text>
            </View>
          );
        })}
      </ScrollView>
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
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Generate arrays
  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const years = Array.from(
    { length: MAX_YEAR - MIN_YEAR + 1 },
    (_, i) => MAX_YEAR - i
  );

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

  const handleBack = () => {
    navigation.goBack();
  };

  const handleSave = async () => {
    // Validate date
    const date = new Date(selectedYear, selectedMonth, selectedDay);
    if (date.getMonth() !== selectedMonth) {
      Alert.alert('Error', 'Fecha inválida');
      return;
    }

    setIsSaving(true);
    const birthdate = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
    const { data, error } = await profileApi.updateProfile({ birthdate });
    setIsSaving(false);

    if (data) {
      setShowSuccessModal(true);
    } else {
      Alert.alert('Error', error || 'No se pudo guardar la fecha de nacimiento');
    }
  };

  const handleSuccessClose = () => {
    setShowSuccessModal(false);
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

  if (isLoading) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const displayDays = days.slice(0, getMaxDays());

  return (
    <View style={styles.container}>
      {/* Background Gradients */}
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

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name="chevron-back" size={24} color={colors.textDark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Fecha de Nacimiento</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Current Date Display */}
        <View style={styles.currentValueContainer}>
          <Text style={styles.currentValue}>{formatDisplayDate()}</Text>
          <View style={styles.underline} />
        </View>

        {/* Date Picker */}
        <View style={styles.pickerContainer}>
          {/* Selection Highlight */}
          <View style={styles.selectionHighlight} />

          <View style={styles.pickersRow}>
            {/* Day Picker */}
            <WheelPicker
              data={displayDays}
              selectedIndex={selectedDay - 1}
              onValueChange={(index) => setSelectedDay(index + 1)}
              width={80}
            />

            {/* Month Picker */}
            <WheelPicker
              data={MONTHS}
              selectedIndex={selectedMonth}
              onValueChange={setSelectedMonth}
              width={100}
            />

            {/* Year Picker */}
            <WheelPicker
              data={years}
              selectedIndex={years.indexOf(selectedYear)}
              onValueChange={(index) => setSelectedYear(years[index])}
              width={100}
            />
          </View>
        </View>

        {/* Save Button */}
        <View style={styles.bottomButtonContainer}>
          <TouchableOpacity
            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={isSaving}
            activeOpacity={0.8}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={colors.textDark} />
            ) : (
              <Text style={styles.saveButtonText}>Guardar</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Success Modal */}
        <ConfirmModal
          visible={showSuccessModal}
          title="Guardado"
          message="Tu fecha de nacimiento ha sido actualizada correctamente."
          confirmText="OK"
          onConfirm={handleSuccessClose}
          onCancel={handleSuccessClose}
          singleButton
        />
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bold,
    color: colors.white,
    textTransform: 'uppercase',
  },
  headerSpacer: {
    width: 48,
  },
  currentValueContainer: {
    alignItems: 'center',
    marginTop: spacing.xxl * 2,
    marginBottom: spacing.xxl * 2,
  },
  currentValue: {
    fontSize: 30,
    fontFamily: typography.fontFamily.bold,
    color: colors.white,
    textTransform: 'uppercase',
  },
  underline: {
    width: 200,
    height: 2,
    backgroundColor: colors.primary,
    marginTop: spacing.md,
  },
  pickerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectionHighlight: {
    position: 'absolute',
    width: SCREEN_WIDTH - spacing.lg * 2,
    height: ITEM_HEIGHT,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    zIndex: 0,
  },
  pickersRow: {
    flexDirection: 'row',
    height: PICKER_HEIGHT,
    zIndex: 1,
  },
  wheelContainer: {
    height: PICKER_HEIGHT,
    overflow: 'hidden',
  },
  wheelItem: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wheelItemText: {
    fontSize: typography.fontSize.xxl,
    fontFamily: typography.fontFamily.medium,
    color: colors.white,
  },
  wheelItemTextSelected: {
    fontFamily: typography.fontFamily.bold,
    color: colors.textDark,
  },
  bottomButtonContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    paddingTop: spacing.lg,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 1000,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.semibold,
    color: colors.textDark,
    textTransform: 'uppercase',
  },
});
