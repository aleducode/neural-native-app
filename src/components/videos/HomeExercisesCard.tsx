import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Image, Pressable, Linking } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { colors, typography } from '../../theme/colors';
import { NEURAL_PHONE } from '../../constants/config';
import { useAuth } from '../../context/AuthContext';
import {
  videosApi,
  VideoPackage,
  formatClock,
  nextVideo,
  packagePercent,
} from '../../api/videos';

/** The gym's own photo stands in for the design's stock media. */
const HOME_MEDIA = require('../../../assets/trainings/hero-gym.jpg');

/**
 * The exercises card on the home screen, in its two states.
 *
 * The design keeps both on the same dark frame: a 176-high photo with the
 * chips floating on it, and a footer strip underneath. With a routine the
 * footer carries the trainer's note, the progress and "Ver todos"; without one
 * it sells the plan instead of apologising for an empty card.
 */
export default function HomeExercisesCard() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const [packages, setPackages] = useState<VideoPackage[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      videosApi
        .getPackages()
        .then(({ data }) => {
          if (alive) setPackages(data?.packages ?? []);
        })
        .catch(() => {
          if (alive) setPackages([]);
        });
      return () => {
        alive = false;
      };
    }, [])
  );

  // Nothing is drawn until there is an answer: a placeholder that resolves into
  // "you have no routines" is worse here than a card that simply appears.
  if (packages === null) return null;

  /**
   * Everything on this card opens the exercises tab inside "Mis entrenos".
   * The home screen is a doorway, not a second place to watch from — the tab
   * is where the member picks what to do.
   */
  const openList = () =>
    navigation.navigate('MainTabs', { screen: 'Trainings', params: { tab: 'ejercicios' } });

  /* ── Sin rutina · e1X1J ───────────────────────────────────────────── */
  if (packages.length === 0) {
    const askForPlan = () => {
      const name = [user?.first_name, user?.last_name].filter(Boolean).join(' ');
      const message = `Hola Neural, quiero mi plan en casa${name ? `, mi nombre es ${name}` : ''}.`;
      Linking.openURL(`https://wa.me/57${NEURAL_PHONE}?text=${encodeURIComponent(message)}`);
    };

    return (
      <View style={styles.card}>
        <View style={styles.media}>
          <Image source={HOME_MEDIA} style={styles.mediaImage} />
          <View style={styles.mediaScrim} />

          <View style={styles.mediaTop}>
            <View style={styles.chipLime}>
              <Feather name="home" size={14} color={colors.ink} />
              <Text style={styles.chipLimeText}>Entrená en casa</Text>
            </View>
          </View>

          <Text style={styles.emptyTitle}>Tu plan en casa, armado por tu entrenador</Text>
        </View>

        <View style={styles.emptyFoot}>
          <View style={styles.benefits}>
            <Benefit icon="play-circle" label="Videos cortos" />
            <Benefit icon="list" label="En orden" />
            <Benefit icon="trending-up" label="Tu avance" />
          </View>

          <Pressable
            onPress={askForPlan}
            style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
            accessibilityRole="button"
          >
            <Text style={styles.ctaText}>Quiero mi plan en casa</Text>
            <Feather name="arrow-right" size={18} color={colors.ink} />
          </Pressable>
        </View>
      </View>
    );
  }

  /* ── Con rutina · i5XLa ───────────────────────────────────────────── */

  // The package actually under way, falling back to the first with anything
  // left in it.
  const active =
    packages.find((p) => p.completed > 0 && p.completed < p.total) ??
    packages.find((p) => nextVideo(p) !== null) ??
    packages[0];
  const next = nextVideo(active);
  const percent = packagePercent(active);

  return (
    <View style={styles.card}>
      <Image
        source={next?.poster ? { uri: next.poster } : HOME_MEDIA}
        style={styles.mediaImage}
      />
      {/* The photo runs the whole card, so the footer sits on it too; the
          gradient is what keeps that text readable over any frame. */}
      <LinearGradient
        colors={['rgba(17,17,17,0.35)', 'rgba(17,17,17,0.55)', 'rgba(17,17,17,0.94)']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      <Pressable
        onPress={openList}
        style={({ pressed }) => [styles.media, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={
          next ? `Te toca el video ${next.order}, ${next.name}` : `Módulo ${active.name}`
        }
      >
        <View style={styles.mediaTop}>
          <View style={styles.chipDark}>
            <Feather name="play-circle" size={14} color={colors.accent} />
            <Text style={styles.chipDarkText}>Tus ejercicios</Text>
          </View>
          <View style={styles.chipDark}>
            <Text style={styles.chipDarkText}>
              {active.completed} de {active.total}
            </Text>
          </View>
        </View>

        <View style={styles.mediaBottom}>
          <View style={styles.mediaTexts}>
            {!!next && <Text style={styles.label}>TE TOCA · VIDEO {next.order}</Text>}
            <Text style={styles.videoName} numberOfLines={1}>
              {next ? next.name : active.name}
            </Text>
            <Text style={styles.sub} numberOfLines={1}>
              {active.name}
              {!!next && ` · quedan ${formatClock(next.duration - next.seconds)}`}
            </Text>
          </View>
          <View style={styles.play}>
            <Feather name="play" size={26} color={colors.ink} />
          </View>
        </View>
      </Pressable>

      <View style={styles.foot}>
        {!!next?.notes && (
          <View style={styles.note}>
            <Feather name="clipboard" size={13} color={colors.accent} />
            <Text style={styles.noteText} numberOfLines={1}>
              {next.notes}
            </Text>
          </View>
        )}

        <View style={styles.bar}>
          <LinearGradient
            colors={[colors.accent, colors.accentDeep]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.barFill, { width: `${percent}%` }]}
          />
        </View>

        <Pressable onPress={openList} style={styles.seeAll} hitSlop={8} accessibilityRole="button">
          <Text style={styles.seeAllText}>Ver todos</Text>
          <Feather name="chevron-right" size={16} color={colors.white} />
        </Pressable>
      </View>
    </View>
  );
}

function Benefit({ icon, label }: { icon: keyof typeof Feather.glyphMap; label: string }) {
  return (
    <View style={styles.benefit}>
      <Feather name={icon} size={16} color={colors.accent} />
      <Text style={styles.benefitText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.ink,
    borderRadius: 20,
    overflow: 'hidden',
    // The design frames this card with 20 either side, not the 12 the other
    // home cards use between them.
    marginTop: 20,
    marginBottom: 20,
  },
  pressed: { opacity: 0.9 },

  media: { height: 176, padding: 14, justifyContent: 'space-between' },
  // Nothing of its own behind the footer any more: the photo and its gradient
  // already cover the card, and a second fill would only mute them.
  // Sólo absoluteFill: sumarle width/height al 100% los resuelve contra la
  // caja de contenido del padre, así que con padding la imagen queda más
  // angosta que su caja y deja una franja a un costado.
  mediaImage: StyleSheet.absoluteFillObject,
  // The chips carry a background blur in the design. Without a blur view the
  // same colour at the same alpha keeps the text legible over any photo.
  mediaScrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(17,17,17,0.28)' },

  mediaTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chipDark: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 100,
    backgroundColor: 'rgba(17,17,17,0.7)',
  },
  chipDarkText: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.white,
  },
  chipLime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 100,
    backgroundColor: colors.accent,
    alignSelf: 'flex-start',
  },
  chipLimeText: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    fontWeight: typography.fontWeight.bold,
    color: colors.ink,
  },

  mediaBottom: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  mediaTexts: { flex: 1, gap: 3 },
  label: {
    fontFamily: typography.fontFamily,
    fontSize: 10,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: 0.5,
    color: colors.accent,
  },
  videoName: {
    fontFamily: typography.fontFamily,
    fontSize: 20,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: -0.3,
    color: colors.white,
  },
  sub: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  play: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
  },

  foot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'transparent',
    paddingTop: 12,
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.08)',
    maxWidth: 150,
  },
  noteText: {
    flexShrink: 1,
    fontFamily: typography.fontFamily,
    fontSize: 11,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.white,
  },
  bar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  barFill: { height: 4, borderRadius: 2 },
  seeAll: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  seeAllText: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.white,
  },

  emptyTitle: {
    maxWidth: 250,
    fontFamily: typography.fontFamily,
    fontSize: 21,
    fontWeight: typography.fontWeight.bold,
    lineHeight: 24,
    letterSpacing: -0.4,
    color: colors.white,
  },
  emptyFoot: { padding: 14, gap: 14 },
  benefits: { flexDirection: 'row', justifyContent: 'space-between' },
  benefit: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  benefitText: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.white,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.accent,
  },
  ctaText: {
    fontFamily: typography.fontFamily,
    fontSize: 15,
    fontWeight: typography.fontWeight.bold,
    color: colors.ink,
  },
});
