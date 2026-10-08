import React from 'react';
import { View, Text, StyleSheet, Image, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { colors, typography } from '../../theme/colors';
import {
  PackageVideo,
  VideoPackage,
  formatClock,
  formatMinutes,
  isComplete,
  nextVideo,
  packagePercent,
  packageSeconds,
} from '../../api/videos';

/**
 * The shared pieces of Mis ejercicios, taken from the five components in the
 * design's section 11. Every size, radius and colour here is read from those
 * nodes rather than guessed.
 */

/**
 * The design writes progress green as #17DD42, which is 1.8:1 on white and
 * unreadable as text. The screens already built use #109D2F for the same role,
 * at 4.9:1, and this follows them rather than inventing a second answer.
 */
const GREEN_TEXT = '#109D2F';

/* ── Badge de modalidad ─────────────────────────────────────────────── */

export function ModalityBadge({ kind }: { kind: VideoPackage['kind'] }) {
  const isGroup = kind === 'group';
  return (
    <View style={styles.badge}>
      <Feather name={isGroup ? 'users' : 'user'} size={14} color={colors.ink} />
      <Text style={styles.badgeText}>{isGroup ? 'Grupal' : 'Individual'}</Text>
    </View>
  );
}

/* ── Barra de progreso ──────────────────────────────────────────────── */

export function ProgressBar({
  percent,
  track = '#EBEBEB',
  height = 6,
}: {
  percent: number;
  track?: string;
  height?: number;
}) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <View style={[styles.barTrack, { backgroundColor: track, height, borderRadius: height / 2 }]}>
      {/* The design fills the bar with a lime-to-green gradient, not a flat
          colour — a plain fill reads noticeably duller at small widths. */}
      <LinearGradient
        colors={clamped === 0 ? ['transparent', 'transparent'] : [colors.accent, colors.accentDeep]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[
          styles.barFill,
          { width: `${clamped}%`, height, borderRadius: height / 2 },
        ]}
      />
    </View>
  );
}

/* ── Tarjeta de paquete ─────────────────────────────────────────────── */

/**
 * The gym's own photo, already the hero of a slot's detail. The cut-out
 * athletes used by the training cards are tall transparent PNGs sized for a
 * small tile, so they cannot stand in for a full-width header.
 */
const DEFAULT_COVER = require('../../../assets/trainings/hero-gym.jpg');

/**
 * The picture at the top of a package card.
 *
 * `cover` is null for almost every package the gym has today, so the card falls
 * back to the bundled photo — a header that is empty most of the time is worse
 * than no header at all.
 */
function coverSource(pkg: VideoPackage) {
  return pkg.cover ? { uri: pkg.cover } : DEFAULT_COVER;
}

export function PackageCard({ pkg, onPress }: { pkg: VideoPackage; onPress: () => void }) {
  const percent = packagePercent(pkg);
  const next = nextVideo(pkg);
  const minutes = formatMinutes(packageSeconds(pkg));

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`Módulo ${pkg.name}, ${pkg.completed} de ${pkg.total} completados`}
    >
      <View style={styles.cardCoverGroup}>
        <Image source={coverSource(pkg)} style={styles.cardCover} resizeMode="cover" />
        <View style={styles.cardTop}>
          <ModalityBadge kind={pkg.kind} />
          <Text style={styles.cardMeta}>
            {pkg.total} {pkg.total === 1 ? 'video' : 'videos'} · {minutes} min
          </Text>
        </View>
      </View>

      <View style={styles.cardTexts}>
        <Text style={styles.cardName}>{pkg.name}</Text>
        {!!pkg.description && (
          <Text style={styles.cardDescription} numberOfLines={2}>
            {pkg.description}
          </Text>
        )}
      </View>

      <View style={styles.cardProgress}>
        <View style={styles.cardProgressRow}>
          <Text style={styles.cardCount}>
            {pkg.completed} de {pkg.total} completados
          </Text>
          <Text style={styles.cardPercent}>{percent}%</Text>
        </View>
        <ProgressBar percent={percent} />
      </View>

      {next ? (
        <View style={styles.resume}>
          <Feather name="play-circle" size={28} color={colors.ink} />
          <View style={styles.resumeTexts}>
            <Text style={styles.resumeLabel}>SEGUÍ CON · VIDEO {next.order}</Text>
            <Text style={styles.resumeVideo} numberOfLines={1}>
              {next.name}
            </Text>
          </View>
          <Feather name="chevron-right" size={20} color={colors.gray400} />
        </View>
      ) : (
        <View style={[styles.resume, styles.resumeDone]}>
          <Feather name="check-circle" size={28} color={GREEN_TEXT} />
          <View style={styles.resumeTexts}>
            <Text style={[styles.resumeLabel, styles.resumeLabelDone]}>COMPLETO</Text>
            <Text style={styles.resumeVideo} numberOfLines={1}>
              Podés repetirlo cuando quieras
            </Text>
          </View>
          <Feather name="chevron-right" size={20} color={GREEN_TEXT} />
        </View>
      )}
    </Pressable>
  );
}

/* ── Fila de video ──────────────────────────────────────────────────── */

export function VideoRow({
  video,
  onPress,
  dimmed = false,
}: {
  video: PackageVideo;
  onPress: () => void;
  dimmed?: boolean;
}) {
  const done = isComplete(video);
  const started = !done && video.seconds > 0;
  const percent = video.duration > 0 ? Math.round((video.seconds / video.duration) * 100) : 0;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, dimmed && styles.rowDimmed, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`Video ${video.order}, ${video.name}`}
    >
      <Text style={styles.rowOrder}>{String(video.order).padStart(2, '0')}</Text>

      <View style={styles.rowPoster}>
        {video.poster ? (
          <Image source={{ uri: video.poster }} style={styles.rowPosterImage} />
        ) : (
          <View style={[styles.rowPosterImage, styles.rowPosterFallback]}>
            <Feather name="play" size={18} color={colors.gray400} />
          </View>
        )}
        <View style={styles.rowDurationChip}>
          <Text style={styles.rowDurationText}>{formatClock(video.duration)}</Text>
        </View>
      </View>

      <View style={styles.rowInfo}>
        <Text style={styles.rowName} numberOfLines={1}>
          {video.name}
        </Text>

        <View style={styles.rowState}>
          <Feather
            name={done ? 'check-circle' : started ? 'play-circle' : 'clock'}
            size={14}
            color={done ? GREEN_TEXT : colors.gray400}
          />
          <Text style={[styles.rowStateText, done && styles.rowStateDone]}>
            {done ? 'Completado' : started ? `En progreso · ${percent}%` : 'Sin empezar'}
          </Text>
        </View>

        {!!video.notes && (
          <View style={styles.rowNote}>
            <Feather name="clipboard" size={12} color={colors.ink} />
            <Text style={styles.rowNoteText} numberOfLines={1}>
              {video.notes}
            </Text>
          </View>
        )}
      </View>

      <Feather
        name={done ? 'rotate-ccw' : 'play-circle'}
        size={28}
        color={done ? colors.gray400 : colors.ink}
      />
    </Pressable>
  );
}

/* ── Solapas Agenda / Ejercicios ────────────────────────────────────── */

export function Tabs({
  active,
  onChange,
  dot = false,
}: {
  active: 'agenda' | 'ejercicios';
  onChange: (tab: 'agenda' | 'ejercicios') => void;
  dot?: boolean;
}) {
  return (
    <View style={styles.tabs}>
      {(['agenda', 'ejercicios'] as const).map((tab) => {
        const on = tab === active;
        return (
          <Pressable
            key={tab}
            onPress={() => onChange(tab)}
            style={[styles.tab, on && styles.tabOn]}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
          >
            <Text style={[styles.tabText, on && styles.tabTextOn]}>
              {tab === 'agenda' ? 'Agenda' : 'Ejercicios'}
            </Text>
            {/* The dot says a package arrived. It rides the inactive tab too,
                which is the only place it can do any good. */}
            {tab === 'ejercicios' && dot && <View style={styles.tabDot} />}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.85 },

  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 100,
    backgroundColor: colors.surface,
  },
  badgeText: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.ink,
  },

  barTrack: {
    width: '100%',
    overflow: 'hidden',
  },
  barFill: {  },

  card: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 16,
    gap: 16,
  },
  cardCoverGroup: { gap: 16 },
  cardCover: {
    width: '100%',
    height: 150,
    borderRadius: 12,
    backgroundColor: colors.surface,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardMeta: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    color: colors.gray400,
  },
  cardTexts: { gap: 4 },
  cardName: {
    fontFamily: typography.fontFamily,
    fontSize: 20,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.ink,
  },
  cardDescription: {
    fontFamily: typography.fontFamily,
    fontSize: 14,
    lineHeight: 19,
    color: colors.gray400,
  },
  cardProgress: { gap: 8 },
  cardProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardCount: {
    fontFamily: typography.fontFamily,
    fontSize: 13,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.ink,
  },
  cardPercent: {
    fontFamily: typography.fontFamily,
    fontSize: 13,
    fontWeight: typography.fontWeight.semiBold,
    color: GREEN_TEXT,
  },

  resume: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: colors.surface,
  },
  resumeTexts: { flex: 1, gap: 2 },
  resumeDone: { backgroundColor: '#E8FCEC' },
  resumeLabel: {
    fontFamily: typography.fontFamily,
    fontSize: 10,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: 0.4,
    color: colors.gray400,
  },
  resumeLabelDone: { color: GREEN_TEXT },
  resumeVideo: {
    fontFamily: typography.fontFamily,
    fontSize: 14,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.ink,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 16,
    backgroundColor: colors.white,
  },
  // Finished videos step back so the one that is due reads first.
  rowDimmed: { opacity: 0.7 },
  rowOrder: {
    width: 20,
    fontFamily: typography.fontFamily,
    fontSize: 13,
    fontWeight: typography.fontWeight.bold,
    color: colors.gray400,
  },
  rowPoster: {
    width: 84,
    height: 60,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  rowPosterImage: { width: '100%', height: '100%' },
  rowPosterFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowDurationChip: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(17,17,17,0.8)',
  },
  rowDurationText: {
    fontFamily: typography.fontFamily,
    fontSize: 10,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.white,
  },
  rowInfo: { flex: 1, gap: 4 },
  rowName: {
    fontFamily: typography.fontFamily,
    fontSize: 15,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.ink,
  },
  rowState: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rowStateText: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    color: colors.gray400,
  },
  rowStateDone: { color: GREEN_TEXT },
  rowNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  rowNoteText: {
    fontFamily: typography.fontFamily,
    fontSize: 11,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.ink,
  },

  tabs: {
    flexDirection: 'row',
    borderRadius: 100,
    backgroundColor: colors.white,
    padding: 4,
  },
  tab: {
    flex: 1,
    height: 40,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  tabOn: { backgroundColor: colors.ink },
  tabText: {
    fontFamily: typography.fontFamily,
    fontSize: 14,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.gray400,
  },
  tabTextOn: { color: colors.white },
  tabDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.accentDeep,
  },
});
