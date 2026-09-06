import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, typography } from '../theme/colors';

export type MissingField = 'weight' | 'height' | 'birthdate';

interface FieldSpec {
  label: string;
  hint: string;
  route: string;
  /** Feather has no scale and no height glyph, so those two come from MDI. */
  render: (color: string) => React.ReactNode;
}

const FIELDS: Record<MissingField, FieldSpec> = {
  weight: {
    label: 'Tu peso',
    hint: 'Para seguir tu progreso',
    route: 'WeightInput',
    render: (color) => <MaterialCommunityIcons name="scale-bathroom" size={20} color={color} />,
  },
  height: {
    label: 'Tu altura',
    hint: 'Para calcular tus métricas',
    route: 'HeightInput',
    render: (color) => (
      <MaterialCommunityIcons name="human-male-height" size={20} color={color} />
    ),
  },
  birthdate: {
    label: 'Tu fecha de nacimiento',
    hint: 'Para adaptar la intensidad',
    route: 'BirthdateInput',
    render: (color) => <Feather name="calendar" size={20} color={color} />,
  },
};

interface ProfileNudgeProps {
  missing: MissingField[];
  onDismiss: () => void;
}

/**
 * Asks for the profile data the gym needs, on the home screen, once the user
 * has an account and is missing some of it.
 *
 * It is a card and not an Alert on purpose. A modal on every launch would be
 * the first thing between a member and the button they opened the app to
 * press, and it can only be dismissed — a card can be acted on, one field at a
 * time, and it disappears on its own as the fields fill in.
 */
export default function ProfileNudge({ missing, onDismiss }: ProfileNudgeProps) {
  const navigation = useNavigation<any>();

  if (missing.length === 0) return null;

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={styles.badge}>
          <Feather name="user-check" size={18} color={colors.ink} />
        </View>
        <View style={styles.headTexts}>
          <Text style={styles.title}>Queremos conocerte</Text>
          <Text style={styles.subtitle}>
            {missing.length === 1
              ? 'Nos falta un dato para ajustar tus entrenamientos.'
              : `Nos faltan ${missing.length} datos para ajustar tus entrenamientos.`}
          </Text>
        </View>
      </View>

      <View style={styles.rows}>
        {missing.map((key) => {
          const field = FIELDS[key];
          return (
            <Pressable
              key={key}
              onPress={() => navigation.navigate(field.route)}
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              accessibilityRole="button"
              accessibilityLabel={`${field.label}. ${field.hint}`}
            >
              <View style={styles.rowIcon}>{field.render(colors.ink)}</View>
              <View style={styles.rowTexts}>
                <Text style={styles.rowLabel}>{field.label}</Text>
                <Text style={styles.rowHint}>{field.hint}</Text>
              </View>
              <Feather name="chevron-right" size={18} color={colors.gray400} />
            </Pressable>
          );
        })}
      </View>

      <Pressable
        onPress={onDismiss}
        style={({ pressed }) => [styles.later, pressed && styles.rowPressed]}
        accessibilityRole="button"
        accessibilityLabel="Recordármelo más adelante"
      >
        <Text style={styles.laterLabel}>Ahora no</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 16,
    gap: 16,
  },
  head: {
    flexDirection: 'row',
    gap: 12,
  },
  badge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headTexts: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontFamily: typography.fontFamily,
    fontSize: 20,
    fontWeight: typography.fontWeight.semiBold,
    letterSpacing: -0.2,
    color: colors.ink,
  },
  subtitle: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    lineHeight: 17,
    color: colors.gray400,
  },
  rows: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  rowPressed: {
    opacity: 0.7,
  },
  rowIcon: {
    width: 24,
    alignItems: 'center',
  },
  rowTexts: {
    flex: 1,
    gap: 2,
  },
  rowLabel: {
    fontFamily: typography.fontFamily,
    fontSize: 14,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.ink,
  },
  rowHint: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    color: colors.gray400,
  },
  later: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  laterLabel: {
    fontFamily: typography.fontFamily,
    fontSize: 13,
    fontWeight: typography.fontWeight.medium,
    color: colors.gray400,
    textDecorationLine: 'underline',
  },
});
