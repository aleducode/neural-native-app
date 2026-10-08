import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
  Image,
  RefreshControl,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { colors, typography } from '../theme/colors';
import {
  videosApi,
  VideoPackage,
  PackageVideo,
  formatClock,
  nextVideo,
} from '../api/videos';
import { PackageCard, ProgressBar } from '../components/videos/Pieces';

const GREEN_TEXT = '#109D2F';

/** What the member is owed when nothing is assigned yet. */
const PROMISES = [
  { icon: 'play-circle' as const, text: 'Un video corto por cada ejercicio' },
  { icon: 'list' as const, text: 'En el orden que eligió tu entrenador' },
  { icon: 'check-circle' as const, text: 'Tu avance se guarda solo' },
];

type Phase = 'loading' | 'ready' | 'offline';

/**
 * Mis ejercicios. Lives as a tab inside Mis entrenos rather than a sixth
 * pestaña: the agenda says when you come, the exercises say what you do.
 */
export default function VideosScreen() {
  const navigation = useNavigation<any>();
  const [phase, setPhase] = useState<Phase>('loading');
  const [packages, setPackages] = useState<VideoPackage[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const intro = useSharedValue(0);
  const bodyStyle = useAnimatedStyle(() => ({
    opacity: withTiming(intro.value, { duration: 320 }),
  }));

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setPhase('loading');
    const { data, error } = await videosApi.getPackages();

    if (error || !data) {
      setPhase('offline');
      intro.value = 1;
      return;
    }

    setPackages(data.packages ?? []);
    setPhase('ready');
    intro.value = 1;
  }, [intro]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load(true);
    setRefreshing(false);
  };

  /* ── Cargando ────────────────────────────────────────────────────── */
  if (phase === 'loading') {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.ink} />
      </View>
    );
  }

  /* ── Sin conexión ────────────────────────────────────────────────── */
  if (phase === 'offline') {
    return (
      <Animated.View style={[styles.centered, bodyStyle]}>
        <View style={styles.offlineIcon}>
          <Feather name="wifi-off" size={28} color={colors.ink} />
        </View>
        <Text style={styles.stateTitle}>Se cortó la conexión</Text>
        <Text style={styles.stateBody}>
          No pudimos traer tus rutinas, pero tu avance sigue guardado. Probá de nuevo en un
          momento.
        </Text>
        <Pressable
          onPress={() => load()}
          style={({ pressed }) => [styles.retry, pressed && styles.pressed]}
          accessibilityRole="button"
        >
          <Feather name="refresh-cw" size={16} color={colors.white} />
          <Text style={styles.retryText}>Reintentar</Text>
        </Pressable>
      </Animated.View>
    );
  }

  /* ── Vacío ───────────────────────────────────────────────────────── */
  if (packages.length === 0) {
    return (
      <Animated.View style={[styles.empty, bodyStyle]}>
        <View style={styles.emptyMark}>
          <Feather name="film" size={30} color={colors.ink} />
        </View>

        <Text style={styles.stateTitle}>Todavía no te asignaron rutinas</Text>
        <Text style={styles.stateBody}>
          Cuando tu entrenador arme tus rutinas en video, las vas a encontrar acá.
        </Text>

        <View style={styles.promises}>
          {PROMISES.map((p) => (
            <View key={p.text} style={styles.promise}>
              <Feather name={p.icon} size={18} color={colors.ink} />
              <Text style={styles.promiseText}>{p.text}</Text>
            </View>
          ))}
        </View>

        {/* An empty screen that only says "nothing here" is a dead end. This
            sends them somewhere real while they wait. */}
        <Pressable
          onPress={() => navigation.navigate('Calendar')}
          style={({ pressed }) => [styles.emptyCta, pressed && styles.pressed]}
          accessibilityRole="button"
        >
          <Text style={styles.emptyCtaText}>Mientras tanto, reservá tu próximo entreno</Text>
          <Feather name="chevron-right" size={18} color={colors.ink} />
        </Pressable>
      </Animated.View>
    );
  }

  /* ── Con paquetes ────────────────────────────────────────────────── */
  const resumeFrom = findResume(packages);

  return (
    <Animated.View style={[styles.flex, bodyStyle]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.ink} />
        }
      >
        <View style={styles.head}>
          <Text style={styles.title}>Tus ejercicios</Text>
          <Text style={styles.subtitle}>Rutinas en video que te armó tu entrenador</Text>
        </View>

        {!!resumeFrom && (
          <ResumeCard
            pkg={resumeFrom.pkg}
            video={resumeFrom.video}
            onPress={() =>
              navigation.navigate('VideoPlayer', {
                packageId: resumeFrom.pkg.id,
                videoId: resumeFrom.video.id,
              })
            }
          />
        )}

        <View style={styles.listHead}>
          <Text style={styles.listLabel}>TUS MÓDULOS</Text>
          <Text style={styles.listCount}>
            {packages.length} {packages.length === 1 ? 'asignado' : 'asignados'}
          </Text>
        </View>

        <View style={styles.list}>
          {packages.map((pkg) => (
            <PackageCard
              key={pkg.id}
              pkg={pkg}
              onPress={() => navigation.navigate('VideoPackage', { packageId: pkg.id })}
            />
          ))}
        </View>
      </ScrollView>
    </Animated.View>
  );
}

/**
 * The first unfinished video of the first package that has one. Only a video
 * already started earns the hero: offering to "continue" something never opened
 * would be a lie.
 */
function findResume(packages: VideoPackage[]): { pkg: VideoPackage; video: PackageVideo } | null {
  for (const pkg of packages) {
    const video = nextVideo(pkg);
    if (video && video.seconds > 0) return { pkg, video };
  }
  return null;
}

function ResumeCard({
  pkg,
  video,
  onPress,
}: {
  pkg: VideoPackage;
  video: PackageVideo;
  onPress: () => void;
}) {
  const percent = video.duration > 0 ? Math.round((video.seconds / video.duration) * 100) : 0;
  const left = Math.max(0, video.duration - video.seconds);

  return (
    <View style={styles.hero}>
      <Text style={styles.heroLabel}>CONTINUÁ DONDE QUEDASTE</Text>

      <Pressable onPress={onPress} style={({ pressed }) => [styles.heroPoster, pressed && styles.pressed]}>
        {video.poster ? (
          <Image source={{ uri: video.poster }} style={styles.heroImage} />
        ) : (
          <View style={[styles.heroImage, styles.heroFallback]} />
        )}
        <View style={styles.heroPlay}>
          <Feather name="play" size={26} color={colors.ink} />
        </View>
        <View style={styles.heroChip}>
          <Text style={styles.heroChipText}>{formatClock(video.duration)}</Text>
        </View>
      </Pressable>

      <View style={styles.heroInfo}>
        <Text style={styles.heroVideo} numberOfLines={1}>
          {video.name}
        </Text>
        <Text style={styles.heroPackage} numberOfLines={1}>
          {pkg.name} · Video {video.order} de {pkg.total}
        </Text>
      </View>

      <View style={styles.heroProgress}>
        <ProgressBar percent={percent} track="#2A2A2A" />
        <View style={styles.heroTimes}>
          <Text style={styles.heroLeft}>Te faltan {formatClock(left)}</Text>
          <Text style={styles.heroWatched}>
            {formatClock(video.seconds)} de {formatClock(video.duration)}
          </Text>
        </View>
      </View>

      {!!video.notes && (
        <View style={styles.heroNote}>
          <Feather name="clipboard" size={14} color={colors.accent} />
          <Text style={styles.heroNoteText} numberOfLines={1}>
            {/* Signed when the panel recorded who assigned it; everything
                assigned before that is simply "tu entrenador". */}
            {pkg.assigned_by || 'Tu entrenador'}: {video.notes}
          </Text>
        </View>
      )}

      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.heroCta, pressed && styles.pressed]}
        accessibilityRole="button"
      >
        <Text style={styles.heroCtaText}>Continuá el video</Text>
        <Feather name="play" size={16} color={colors.ink} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  // The screen's 16 of side padding, the same the rest of the app uses. It
  // lives here because this body is rendered inside Mis entrenos, which pads
  // only its own header.
  scroll: { paddingHorizontal: 16, paddingBottom: 120 },

  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 10,
  },

  stateTitle: {
    fontFamily: typography.fontFamily,
    fontSize: 20,
    fontWeight: typography.fontWeight.bold,
    color: colors.ink,
    textAlign: 'center',
  },
  stateBody: {
    fontFamily: typography.fontFamily,
    fontSize: 14,
    lineHeight: 20,
    color: colors.gray400,
    textAlign: 'center',
  },

  offlineIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    marginBottom: 6,
  },
  retry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    height: 46,
    paddingHorizontal: 22,
    borderRadius: 32,
    backgroundColor: colors.ink,
  },
  retryText: {
    fontFamily: typography.fontFamily,
    fontSize: 15,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.white,
  },

  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 10,
  },
  emptyMark: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentSoft,
    marginBottom: 8,
  },
  promises: {
    alignSelf: 'stretch',
    gap: 12,
    marginTop: 22,
    padding: 16,
    borderRadius: 20,
    backgroundColor: colors.white,
  },
  promise: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  promiseText: {
    flex: 1,
    fontFamily: typography.fontFamily,
    fontSize: 14,
    color: colors.ink,
  },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 24,
  },
  emptyCtaText: {
    fontFamily: typography.fontFamily,
    fontSize: 14,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.ink,
  },

  head: { gap: 4, marginBottom: 20 },
  title: {
    fontFamily: typography.fontFamily,
    fontSize: 32,
    fontWeight: typography.fontWeight.bold,
    lineHeight: 38,
    letterSpacing: -1,
    color: colors.ink,
  },
  subtitle: {
    fontFamily: typography.fontFamily,
    fontSize: 14,
    color: colors.gray400,
  },

  hero: {
    backgroundColor: colors.ink,
    borderRadius: 20,
    padding: 16,
    gap: 16,
  },
  heroLabel: {
    fontFamily: typography.fontFamily,
    fontSize: 11,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: 1.2,
    color: '#8A8A8A',
  },
  heroPoster: {
    height: 172,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#2A2A2A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Sólo absoluteFill: sumarle width/height al 100% los resuelve contra la
  // caja de contenido del padre, así que con padding la imagen queda más
  // angosta que su caja y deja una franja a un costado.
  heroImage: StyleSheet.absoluteFillObject,
  heroFallback: { backgroundColor: '#2A2A2A' },
  heroPlay: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
  },
  heroChip: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(17,17,17,0.8)',
  },
  heroChipText: {
    fontFamily: typography.fontFamily,
    fontSize: 10,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.white,
  },
  heroInfo: { gap: 4 },
  heroVideo: {
    fontFamily: typography.fontFamily,
    fontSize: 20,
    fontWeight: typography.fontWeight.semiBold,
    letterSpacing: -0.2,
    color: colors.white,
  },
  heroPackage: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    color: '#8A8A8A',
  },
  heroProgress: { gap: 8 },
  heroTimes: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroLeft: {
    fontFamily: typography.fontFamily,
    fontSize: 13,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.accent,
  },
  heroWatched: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    color: '#8A8A8A',
  },
  heroNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#1E1E1E',
  },
  heroNoteText: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.white,
  },
  heroCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderRadius: 32,
    backgroundColor: colors.accent,
  },
  heroCtaText: {
    fontFamily: typography.fontFamily,
    fontSize: 14,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.ink,
  },

  listHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 28,
    marginBottom: 10,
  },
  listLabel: {
    fontFamily: typography.fontFamily,
    fontSize: 11,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: 0.8,
    color: colors.gray400,
  },
  listCount: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    color: colors.gray400,
  },
  list: { gap: 12 },

  pressed: { opacity: 0.85 },
});
