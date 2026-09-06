import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { colors, typography } from '../theme/colors';
import { communityApi } from '../api/community';
import { slotsApi } from '../api/slots';
import { Training } from '../types';
import Screen from '../components/ui/Screen';
import PrimaryButton from '../components/ui/PrimaryButton';
import { captureException } from '../utils/sentry';

interface LastTraining {
  id: number;
  type: string;
  date: string;
  duration_minutes: number;
}

/**
 * Slot hours arrive either as "18:00" or as "6:00 PM", depending on the
 * endpoint, so both shapes have to parse before we can measure a session.
 */
function toMinutes(time: string): number | null {
  if (!time) return null;
  const isPm = /PM/i.test(time);
  const isAm = /AM/i.test(time);
  const [rawHours, rawMinutes] = time.replace(/\s*(AM|PM)/i, '').trim().split(':');
  const hours = Number(rawHours);
  const minutes = Number(rawMinutes ?? 0);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;

  let hours24 = hours;
  if (isPm && hours !== 12) hours24 = hours + 12;
  if (isAm && hours === 12) hours24 = 0;

  return hours24 * 60 + minutes;
}

function durationMinutes(training: Training): number {
  const start = toMinutes(training.slot?.hour_init);
  const end = toMinutes(training.slot?.hour_end);
  if (start === null || end === null || end <= start) return 60;
  return end - start;
}

/** Local end-of-session timestamp, used to pick the most recent one. */
function endedAt(training: Training): number {
  const [year, month, day] = (training.slot?.date ?? '').split('-').map(Number);
  if (!year || !month || !day) return 0;
  const end = toMinutes(training.slot?.hour_end) ?? 0;
  return new Date(year, month - 1, day, Math.floor(end / 60), end % 60).getTime();
}

export default function CreatePostScreen() {
  const navigation = useNavigation<any>();

  const [content, setContent] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedTraining, setSelectedTraining] = useState<LastTraining | null>(null);
  const [lastTraining, setLastTraining] = useState<LastTraining | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const intro = useSharedValue(0);
  useEffect(() => {
    intro.value = withTiming(1, { duration: 460, easing: Easing.out(Easing.cubic) });
  }, []);
  const headerStyle = useAnimatedStyle(() => ({
    opacity: intro.value,
    transform: [{ translateY: (1 - intro.value) * 16 }],
  }));
  const bodyStyle = useAnimatedStyle(() => ({
    opacity: withDelay(80, withTiming(intro.value, { duration: 400 })),
    transform: [{ translateY: withDelay(80, withTiming((1 - intro.value) * 16, { duration: 400 })) }],
  }));

  // The last session you actually attended, straight from the trainings
  // endpoint. Attaching one used to send a hardcoded id 1, which credited a
  // stranger's session to your post; with no finished training the option
  // simply isn't offered.
  useEffect(() => {
    let cancelled = false;

    const fetchLastTraining = async () => {
      const { data, error: trainingsError } = await slotsApi.getMyTrainings(true, 20, 0);

      if (cancelled) return;

      if (trainingsError || !data) {
        if (trainingsError) {
          captureException(new Error(trainingsError), { context: 'createPostLastTraining' });
        }
        return;
      }

      const now = Date.now();
      const finished = data
        .filter((training) => {
          const status = (training.status ?? '').toLowerCase();
          if (status.startsWith('cancel')) return false;
          const ended = endedAt(training);
          return ended > 0 && ended <= now;
        })
        .sort((a, b) => endedAt(b) - endedAt(a));

      const last = finished[0];
      if (!last) return;

      setLastTraining({
        id: last.id,
        type: last.training_type?.name ?? last.slot?.training_type?.name ?? 'Entrenamiento',
        date: last.slot.date,
        duration_minutes: durationMinutes(last),
      });
    };

    fetchLastTraining();

    return () => {
      cancelled = true;
    };
  }, []);

  /** Back always resolves somewhere, even opened with nothing behind it. */
  const goBack = () => {
    if (navigation.canGoBack?.()) navigation.goBack();
    else navigation.navigate('MainTabs');
  };

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    goBack();
  };

  const handlePickImage = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      setError('Necesitamos acceso a tu galería para subir fotos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
      setSelectedTraining(null); // Clear training if image is selected
      setError(null);
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
  };

  const handleToggleTraining = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (selectedTraining) {
      setSelectedTraining(null);
    } else if (lastTraining) {
      setSelectedTraining(lastTraining);
      setSelectedImage(null); // Clear image if training is selected
      setError(null);
    }
  };

  const handleSubmit = async () => {
    const trimmedContent = content.trim();

    if (!trimmedContent && !selectedImage && !selectedTraining) {
      setError('Escribe algo o agrega una foto o un entrenamiento.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      if (selectedImage) {
        // Upload with image
        const fileName = `post_${Date.now()}.jpg`;
        const { error: uploadError } = await communityApi.createPostWithImage(
          trimmedContent,
          selectedImage,
          fileName
        );

        if (uploadError) {
          throw new Error(uploadError);
        }
      } else {
        // Create text/training post
        const { error: createError } = await communityApi.createPost({
          content: trimmedContent,
          training_id: selectedTraining?.id,
        });

        if (createError) {
          throw new Error(createError);
        }
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      goBack();
    } catch (submitError) {
      captureException(submitError as Error, { context: 'createPost' });
      setError('No se pudo crear la publicación. Intenta de nuevo.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit =
    (content.trim().length > 0 || !!selectedImage || !!selectedTraining) && !isSubmitting;

  return (
    <Screen tone="plain" edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <Animated.View style={[styles.header, headerStyle]}>
          <Pressable
            onPress={handleClose}
            style={({ pressed }) => [styles.close, pressed && styles.pressed]}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Cerrar"
          >
            <Feather name="x" size={20} color={colors.ink} />
          </Pressable>
          <Text style={styles.title}>Nueva{'\n'}publicación</Text>
        </Animated.View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View style={bodyStyle}>
            <TextInput
              style={styles.input}
              placeholder="¿Qué quieres compartir?"
              placeholderTextColor={colors.gray400}
              multiline
              maxLength={500}
              value={content}
              onChangeText={(text) => {
                setContent(text);
                if (error) setError(null);
              }}
              autoFocus
              editable={!isSubmitting}
            />

            <Text style={styles.charCount}>{content.length}/500</Text>

            {!!error && <Text style={styles.error}>{error}</Text>}

            {selectedImage && (
              <View style={styles.imageWrap}>
                <Image source={{ uri: selectedImage }} style={styles.image} />
                <Pressable
                  style={({ pressed }) => [styles.removeImage, pressed && styles.pressed]}
                  onPress={handleRemoveImage}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Quitar la foto"
                >
                  <Feather name="x" size={18} color={colors.white} />
                </Pressable>
              </View>
            )}

            {selectedTraining && (
              <View style={styles.trainingCard}>
                <View style={styles.trainingIcon}>
                  <Feather name="activity" size={20} color={colors.accentDeep} />
                </View>
                <View style={styles.trainingText}>
                  <Text style={styles.trainingType}>{selectedTraining.type}</Text>
                  <Text style={styles.trainingDetails}>
                    {selectedTraining.date} • {selectedTraining.duration_minutes} min
                  </Text>
                </View>
                <Pressable
                  onPress={handleToggleTraining}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Quitar el entrenamiento"
                >
                  <Feather name="x" size={18} color={colors.gray400} />
                </Pressable>
              </View>
            )}
          </Animated.View>
        </ScrollView>

        <View style={styles.footer}>
          <View style={styles.attachments}>
            <Pressable
              style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
              onPress={handlePickImage}
              disabled={isSubmitting}
              accessibilityRole="button"
              accessibilityLabel="Agregar una foto"
            >
              <Feather name="image" size={16} color={colors.ink} />
              <Text style={styles.chipLabel}>Foto</Text>
            </Pressable>

            {lastTraining && !selectedTraining && (
              <Pressable
                style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
                onPress={handleToggleTraining}
                disabled={isSubmitting}
                accessibilityRole="button"
                accessibilityLabel="Adjuntar tu último entrenamiento"
              >
                <Feather name="activity" size={16} color={colors.ink} />
                <Text style={styles.chipLabel}>Entrenamiento</Text>
              </Pressable>
            )}
          </View>

          <PrimaryButton
            label="Publicar"
            onPress={handleSubmit}
            loading={isSubmitting}
            disabled={!canSubmit}
            icon="arrow-right"
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 8,
    gap: 20,
  },
  close: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: typography.fontFamily,
    fontSize: 34,
    fontWeight: typography.fontWeight.bold,
    lineHeight: 38,
    letterSpacing: -1,
    color: colors.ink,
  },
  pressed: {
    opacity: 0.7,
  },
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 24,
  },
  input: {
    fontFamily: typography.fontFamily,
    fontSize: 17,
    lineHeight: 24,
    color: colors.ink,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  charCount: {
    marginTop: 8,
    fontFamily: typography.fontFamily,
    fontSize: 12,
    color: colors.gray400,
    textAlign: 'right',
  },
  error: {
    marginTop: 12,
    fontFamily: typography.fontFamily,
    fontSize: 13,
    color: colors.error,
  },
  imageWrap: {
    marginTop: 20,
    borderRadius: 20,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 220,
  },
  removeImage: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(17, 17, 17, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trainingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 20,
    padding: 12,
    borderRadius: 16,
    backgroundColor: colors.accentSoft,
  },
  trainingIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trainingText: {
    flex: 1,
    gap: 2,
  },
  trainingType: {
    fontFamily: typography.fontFamily,
    fontSize: 15,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.ink,
  },
  trainingDetails: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    color: colors.gray400,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 12,
    gap: 16,
  },
  attachments: {
    flexDirection: 'row',
    gap: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: colors.surface,
  },
  chipLabel: {
    fontFamily: typography.fontFamily,
    fontSize: 14,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.ink,
  },
});
