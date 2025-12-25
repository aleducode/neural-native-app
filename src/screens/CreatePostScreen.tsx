import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { colors, typography, spacing, borderRadius } from '../theme/colors';
import { communityApi } from '../api/community';

interface LastTraining {
  id: number;
  type: string;
  date: string;
  duration_minutes: number;
}

export default function CreatePostScreen() {
  const navigation = useNavigation();

  const [content, setContent] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedTraining, setSelectedTraining] = useState<LastTraining | null>(null);
  const [lastTraining, setLastTraining] = useState<LastTraining | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // TODO: Fetch last training from API
    // For now, we'll simulate it
    setLastTraining({
      id: 1,
      type: 'Funcional',
      date: new Date().toISOString().split('T')[0],
      duration_minutes: 45,
    });
  }, []);

  const handleClose = () => {
    navigation.goBack();
  };

  const handlePickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert('Permisos', 'Necesitamos acceso a tu galería para subir fotos.');
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
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
  };

  const handleToggleTraining = () => {
    if (selectedTraining) {
      setSelectedTraining(null);
    } else if (lastTraining) {
      setSelectedTraining(lastTraining);
      setSelectedImage(null); // Clear image if training is selected
    }
  };

  const handleSubmit = async () => {
    const trimmedContent = content.trim();

    if (!trimmedContent && !selectedImage && !selectedTraining) {
      Alert.alert('Error', 'Escribe algo o agrega una foto/entrenamiento.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (selectedImage) {
        // Upload with image
        const fileName = `post_${Date.now()}.jpg`;
        const { error } = await communityApi.createPostWithImage(
          trimmedContent,
          selectedImage,
          fileName
        );

        if (error) {
          throw new Error(error);
        }
      } else {
        // Create text/training post
        const { error } = await communityApi.createPost({
          content: trimmedContent,
          training_id: selectedTraining?.id,
        });

        if (error) {
          throw new Error(error);
        }
      }

      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'No se pudo crear la publicación. Intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = (content.trim().length > 0 || selectedImage || selectedTraining) && !isSubmitting;

  return (
    <View style={styles.container}>
      {/* Background Gradients */}
      <View style={styles.backgroundContainer}>
        <LinearGradient
          colors={['rgba(69, 255, 183, 0.15)', 'transparent']}
          style={styles.gradientTop}
        />
      </View>

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color={colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Nueva publicación</Text>
          <TouchableOpacity
            style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color={colors.textDark} />
            ) : (
              <Text style={[styles.submitButtonText, !canSubmit && styles.submitButtonTextDisabled]}>
                Publicar
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardView}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Text Input */}
            <TextInput
              style={styles.textInput}
              placeholder="¿Qué quieres compartir?"
              placeholderTextColor={colors.gray400}
              multiline
              maxLength={500}
              value={content}
              onChangeText={setContent}
              autoFocus
            />

            {/* Character count */}
            <Text style={styles.charCount}>{content.length}/500</Text>

            {/* Selected Image Preview */}
            {selectedImage && (
              <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: selectedImage }} style={styles.imagePreview} />
                <TouchableOpacity style={styles.removeImageButton} onPress={handleRemoveImage}>
                  <Ionicons name="close-circle" size={28} color={colors.white} />
                </TouchableOpacity>
              </View>
            )}

            {/* Selected Training Preview */}
            {selectedTraining && (
              <View style={styles.trainingPreview}>
                <View style={styles.trainingIcon}>
                  <Ionicons name="barbell" size={24} color={colors.primary} />
                </View>
                <View style={styles.trainingInfo}>
                  <Text style={styles.trainingType}>{selectedTraining.type}</Text>
                  <Text style={styles.trainingDetails}>
                    {selectedTraining.date} • {selectedTraining.duration_minutes} min
                  </Text>
                </View>
                <TouchableOpacity onPress={handleToggleTraining}>
                  <Ionicons name="close-circle" size={24} color={colors.gray400} />
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>

          {/* Bottom Actions */}
          <View style={styles.bottomActions}>
            <TouchableOpacity style={styles.actionButton} onPress={handlePickImage}>
              <Ionicons name="image-outline" size={24} color={colors.primary} />
              <Text style={styles.actionButtonText}>Foto</Text>
            </TouchableOpacity>

            {lastTraining && !selectedTraining && (
              <TouchableOpacity style={styles.actionButton} onPress={handleToggleTraining}>
                <Ionicons name="barbell-outline" size={24} color={colors.primary} />
                <Text style={styles.actionButtonText}>Entrenamiento</Text>
              </TouchableOpacity>
            )}
          </View>
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
  backgroundContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gradientTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 300,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray600,
  },
  closeButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.white,
  },
  submitButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  submitButtonDisabled: {
    backgroundColor: colors.gray600,
  },
  submitButtonText: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.textDark,
  },
  submitButtonTextDisabled: {
    color: colors.gray400,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  textInput: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.regular,
    color: colors.white,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily,
    color: colors.gray400,
    textAlign: 'right',
    marginTop: spacing.sm,
  },
  imagePreviewContainer: {
    marginTop: spacing.lg,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: borderRadius.lg,
  },
  removeImageButton: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
  },
  trainingPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardDark,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginTop: spacing.lg,
  },
  trainingIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.gray600,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trainingInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  trainingType: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.white,
  },
  trainingDetails: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily,
    color: colors.gray400,
    marginTop: 2,
  },
  bottomActions: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.gray600,
    gap: spacing.xl,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  actionButtonText: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.medium,
    color: colors.primary,
  },
});
