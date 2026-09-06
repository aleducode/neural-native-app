import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  PanResponder,
  Dimensions,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  runOnJS,
  Easing,
  type SharedValue,
} from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { colors, typography } from '../theme/colors';

const { height: SCREEN_H } = Dimensions.get('window');

export type MissingField = 'weight' | 'height' | 'birthdate';

interface FieldSpec {
  label: string;
  hint: string;
  route: string;
  render: (color: string) => React.ReactNode;
}

const FIELDS: Record<MissingField, FieldSpec> = {
  weight: {
    label: 'Tu peso',
    hint: 'Para seguir tu progreso',
    route: 'WeightInput',
    // Feather has neither a scale nor a height glyph; these two come from MDI.
    render: (color) => <MaterialCommunityIcons name="scale-bathroom" size={22} color={color} />,
  },
  height: {
    label: 'Tu altura',
    hint: 'Para calcular tus métricas',
    route: 'HeightInput',
    render: (color) => (
      <MaterialCommunityIcons name="human-male-height" size={22} color={color} />
    ),
  },
  birthdate: {
    label: 'Tu fecha de nacimiento',
    hint: 'Para adaptar la intensidad',
    route: 'BirthdateInput',
    render: (color) => <Feather name="calendar" size={22} color={color} />,
  },
};

const ORDER: MissingField[] = ['weight', 'height', 'birthdate'];

interface ProfileSetupSheetProps {
  visible: boolean;
  missing: MissingField[];
  /** Closed without finishing — the caller decides how long to wait before asking again. */
  onLater: () => void;
  /** Closed by acting on a field; the sheet is done for this session either way. */
  onClose: () => void;
}

/**
 * Bottom sheet that asks for the profile data the gym is missing.
 *
 * Built on PanResponder rather than react-native-gesture-handler: the app root
 * mounts no GestureHandlerRootView, and adding one to make a sheet draggable
 * would change how every gesture in the app is delivered.
 */

/**
 * One field, staggered in behind the sheet.
 *
 * It owns its own animated style rather than the parent building one per row
 * in a loop: the list shrinks as fields get filled, and a hook count that
 * changes between renders is a crash waiting for the second visit.
 */
function FieldRow({
  field,
  index,
  progress,
  onPress,
}: {
  field: FieldSpec;
  index: number;
  progress: SharedValue<number>;
  onPress: () => void;
}) {
  const style = useAnimatedStyle(() => {
    const delay = 120 + index * 70;
    return {
      opacity: withDelay(delay, withTiming(progress.value, { duration: 260 })),
      transform: [
        { translateY: withDelay(delay, withTiming((1 - progress.value) * 18, { duration: 260 })) },
      ],
    };
  });

  return (
    <Animated.View style={style}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        accessibilityRole="button"
        accessibilityLabel={`${field.label}. ${field.hint}`}
      >
        <View style={styles.rowIcon}>{field.render(colors.ink)}</View>
        <View style={styles.rowTexts}>
          <Text style={styles.rowLabel}>{field.label}</Text>
          <Text style={styles.rowHint}>{field.hint}</Text>
        </View>
        <Feather name="chevron-right" size={20} color={colors.gray400} />
      </Pressable>
    </Animated.View>
  );
}

export default function ProfileSetupSheet({
  visible,
  missing,
  onLater,
  onClose,
}: ProfileSetupSheetProps) {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  // 0 is offscreen, 1 is settled. The drag writes straight into `drag`, so a
  // finger moving the sheet never fights the spring that brought it up.
  const progress = useSharedValue(0);
  const drag = useSharedValue(0);
  const closing = useRef(false);

  const fields = ORDER.filter((f) => missing.includes(f));

  useEffect(() => {
    if (!visible) return;
    closing.current = false;
    drag.value = 0;
    progress.value = withSpring(1, { damping: 20, stiffness: 170, mass: 0.9 });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [visible]);

  const dismiss = (after: () => void) => {
    if (closing.current) return;
    closing.current = true;
    drag.value = withTiming(0, { duration: 180 });
    progress.value = withTiming(0, { duration: 220, easing: Easing.in(Easing.cubic) }, (done) => {
      if (done) runOnJS(after)();
    });
  };

  const openField = (route: string) => {
    Haptics.selectionAsync();
    dismiss(() => {
      onClose();
      navigation.navigate(route);
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => {
        drag.value = Math.max(g.dy, 0);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 130 || g.vy > 0.9) {
          Haptics.selectionAsync();
          dismiss(onLater);
        } else {
          drag.value = withSpring(0, { damping: 22, stiffness: 220 });
        }
      },
    })
  ).current;

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - progress.value) * SCREEN_H * 0.6 + drag.value }],
  }));

  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      animationType="none"
      onRequestClose={() => dismiss(onLater)}
    >
      <View style={styles.root}>
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => dismiss(onLater)}
            accessibilityRole="button"
            accessibilityLabel="Cerrar"
          />
        </Animated.View>

        <Animated.View
          style={[styles.sheet, { paddingBottom: insets.bottom + 20 }, sheetStyle]}
        >
          <View {...panResponder.panHandlers} style={styles.grabArea}>
            <View style={styles.grabber} />
          </View>

          <LinearGradient
            colors={[colors.accent, colors.accentDeep]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.mark}
          >
            <Feather name="user-check" size={28} color={colors.ink} />
          </LinearGradient>

          <View style={styles.titles}>
            <Text style={styles.title}>Queremos conocerte</Text>
            <Text style={styles.subtitle}>
              {fields.length === 1
                ? 'Falta un dato para ajustar tus entrenamientos a tu medida.'
                : `Faltan ${fields.length} datos para ajustar tus entrenamientos a tu medida.`}
            </Text>
          </View>

          <View style={styles.rows}>
            {fields.map((key, index) => (
              <FieldRow
                key={key}
                field={FIELDS[key]}
                index={index}
                progress={progress}
                onPress={() => openField(FIELDS[key].route)}
              />
            ))}
          </View>

          <Pressable
            onPress={() => fields[0] && openField(FIELDS[fields[0]].route)}
            style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
            accessibilityRole="button"
          >
            <Text style={styles.ctaLabel}>Empezar</Text>
            <Ionicons name="arrow-forward" size={19} color={colors.white} />
          </Pressable>

          <Pressable
            onPress={() => dismiss(onLater)}
            style={({ pressed }) => [styles.later, pressed && styles.rowPressed]}
            accessibilityRole="button"
            accessibilityLabel="Recordármelo más adelante"
          >
            <Text style={styles.laterLabel}>Más tarde</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(17, 17, 17, 0.6)',
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    gap: 20,
    ...Platform.select({
      ios: {
        shadowColor: colors.ink,
        shadowOffset: { width: 0, height: -8 },
        shadowOpacity: 0.18,
        shadowRadius: 28,
      },
      android: { elevation: 24 },
    }),
  },
  grabArea: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 6,
    marginHorizontal: -24,
  },
  grabber: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#DEDEDE',
  },
  mark: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titles: {
    gap: 8,
    marginTop: -4,
  },
  title: {
    fontFamily: typography.fontFamily,
    fontSize: 28,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: -0.6,
    color: colors.ink,
  },
  subtitle: {
    fontFamily: typography.fontFamily,
    fontSize: 15,
    lineHeight: 21,
    color: colors.gray400,
  },
  rows: {
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.surface,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  rowPressed: {
    opacity: 0.65,
  },
  rowIcon: {
    width: 26,
    alignItems: 'center',
  },
  rowTexts: {
    flex: 1,
    gap: 2,
  },
  rowLabel: {
    fontFamily: typography.fontFamily,
    fontSize: 15,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.ink,
  },
  rowHint: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    color: colors.gray400,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.ink,
    ...Platform.select({
      ios: {
        shadowColor: colors.ink,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.22,
        shadowRadius: 18,
      },
      android: { elevation: 8 },
    }),
  },
  ctaPressed: {
    transform: [{ scale: 0.98 }],
  },
  ctaLabel: {
    fontFamily: typography.fontFamily,
    fontSize: 16,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.white,
  },
  later: {
    alignSelf: 'center',
    paddingVertical: 4,
  },
  laterLabel: {
    fontFamily: typography.fontFamily,
    fontSize: 14,
    fontWeight: typography.fontWeight.medium,
    color: colors.gray400,
  },
});
