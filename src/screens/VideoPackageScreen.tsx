import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
  Image,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect, RouteProp } from '@react-navigation/native';
import { colors, typography } from '../theme/colors';
import {
  videosApi,
  VideoPackage,
  PackageVideo,
  formatClock,
  formatMinutes,
  isComplete,
  nextVideo,
  packagePercent,
  packageSeconds,
} from '../api/videos';
import { ModalityBadge, ProgressBar, VideoRow } from '../components/videos/Pieces';
import Screen from '../components/ui/Screen';
import AppHeader from '../components/ui/AppHeader';
import { RootStackParamList } from '../navigation/RootNavigator';

const GREEN_TEXT = '#109D2F';

type Route = RouteProp<RootStackParamList, 'VideoPackage'>;

export default function VideoPackageScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<Route>();
  const { packageId } = route.params;

  const [pkg, setPkg] = useState<VideoPackage | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await videosApi.getPackage(packageId);
    setPkg(data ?? null);
    setIsLoading(false);
  }, [packageId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (isLoading) {
    return (
      <Screen wash>
        <AppHeader title="Módulo" />
        <View style={styles.centered}>
          <ActivityIndicator color={colors.ink} />
        </View>
      </Screen>
    );
  }

  if (!pkg) {
    return (
      <Screen wash>
        <AppHeader title="Módulo" />
        <View style={styles.centered}>
          <Text style={styles.emptyTitle}>No pudimos abrir este módulo</Text>
        </View>
      </Screen>
    );
  }

  const ordered = [...pkg.videos].sort((a, b) => a.order - b.order);
  const percent = packagePercent(pkg);
  const due = nextVideo(pkg);
  const totalMinutes = formatMinutes(packageSeconds(pkg));
  const leftSeconds = ordered
    .filter((v) => !isComplete(v))
    .reduce((total, v) => total + (v.duration - v.seconds), 0);
  const finished = due === null;

  const open = (video: PackageVideo) =>
    navigation.navigate('VideoPlayer', { packageId: pkg.id, videoId: video.id });

  return (
    <Screen wash>
      <AppHeader title="Módulo" />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.head}>
          <ModalityBadge kind={pkg.kind} />
          <View style={styles.titles}>
            <Text style={styles.name}>{pkg.name}</Text>
            {!!pkg.description && <Text style={styles.description}>{pkg.description}</Text>}
          </View>

          <View style={styles.progressCard}>
            <View style={styles.progressTop}>
              <View style={styles.progressValue}>
                <Text style={styles.progressLabel}>Tu avance</Text>
                <View style={styles.progressRow}>
                  <Text style={styles.progressDone}>{pkg.completed}</Text>
                  <Text style={styles.progressTotal}>de {pkg.total} videos</Text>
                </View>
              </View>
              <View style={styles.progressPill}>
                <Text style={styles.progressPillText}>{percent}%</Text>
              </View>
            </View>

            <ProgressBar percent={percent} />

            <View style={styles.progressFooter}>
              <View style={styles.progressLeft}>
                <Feather name="clock" size={14} color={colors.ink} />
                <Text style={styles.progressLeftText}>
                  {finished ? 'Lo terminaste' : `Te quedan ${formatMinutes(leftSeconds)} min`}
                </Text>
              </View>
              <Text style={styles.progressTotalTime}>{totalMinutes} min en total</Text>
            </View>
          </View>
        </View>

        {!!due && <DueCard pkg={pkg} video={due} onPress={() => open(due)} />}

        <View style={styles.sequence}>
          <Text style={styles.sequenceLabel}>LA SECUENCIA</Text>

          {ordered.map((video, index) => {
            const done = isComplete(video);
            const isDue = due?.id === video.id;
            const last = index === ordered.length - 1;

            return (
              <View key={video.id} style={styles.step}>
                {/* The rail is what makes this read as a sequence rather than a
                    list: the line above is green once you have passed it. */}
                <View style={styles.rail}>
                  <View
                    style={[
                      styles.railSegment,
                      { backgroundColor: index === 0 ? 'transparent' : done || isDue ? colors.accentDeep : '#DEDEDE' },
                    ]}
                  />
                  <View
                    style={[
                      styles.node,
                      done && styles.nodeDone,
                      isDue && styles.nodeDue,
                    ]}
                  >
                    {done ? (
                      <Feather name="check" size={14} color={GREEN_TEXT} />
                    ) : (
                      <Text style={[styles.nodeNumber, isDue && styles.nodeNumberDue]}>
                        {video.order}
                      </Text>
                    )}
                  </View>
                  <View
                    style={[
                      styles.railSegmentGrow,
                      { backgroundColor: last ? 'transparent' : done ? colors.accentDeep : '#DEDEDE' },
                    ]}
                  />
                </View>

                <View style={styles.stepBody}>
                  <VideoRow video={video} onPress={() => open(video)} dimmed={done} />
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </Screen>
  );
}

/** The "te toca" block: the one video the member should open now. */
function DueCard({
  pkg,
  video,
  onPress,
}: {
  pkg: VideoPackage;
  video: PackageVideo;
  onPress: () => void;
}) {
  const started = video.seconds > 0;
  const percent = video.duration > 0 ? Math.round((video.seconds / video.duration) * 100) : 0;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.due, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`Te toca: ${video.name}`}
    >
      <View style={styles.duePoster}>
        {video.poster ? (
          <Image source={{ uri: video.poster }} style={styles.duePosterImage} />
        ) : (
          <View style={[styles.duePosterImage, styles.duePosterFallback]} />
        )}

        <View style={styles.duePosition}>
          <Text style={styles.duePositionText}>
            Video {video.order} de {pkg.total}
          </Text>
        </View>

        <View style={styles.duePlay}>
          <Feather name="play" size={30} color={colors.ink} />
        </View>

        {started && (
          <>
            <Text style={styles.dueTime}>
              {formatClock(video.seconds)} / {formatClock(video.duration)}
            </Text>
            <View style={styles.dueTrack}>
              <View style={[styles.dueTrackFill, { width: `${percent}%` }]} />
            </View>
          </>
        )}
      </View>

      <View style={styles.dueInfo}>
        <View style={styles.dueTitles}>
          <View style={styles.dueEyebrow}>
            <View style={styles.dueDot} />
            <Text style={styles.dueLabel}>{started ? 'SEGUÍ CON' : 'TE TOCA'}</Text>
          </View>

          <Text style={styles.dueName} numberOfLines={2}>
            {video.name}
          </Text>

          <View style={styles.dueMeta}>
            <Text style={styles.dueState}>
              {started ? `En progreso · ${percent}%` : 'Sin empezar'}
            </Text>
            <View style={styles.dueLeft}>
              <Feather name="clock" size={14} color={colors.gray400} />
              <Text style={styles.dueLeftText}>
                Quedan {formatClock(Math.max(0, video.duration - video.seconds))}
              </Text>
            </View>
          </View>
        </View>

        {!!video.notes && (
          <View style={styles.dueNote}>
            <View style={styles.dueNoteMark}>
              <Feather name="clipboard" size={20} color={colors.ink} />
            </View>
            <View style={styles.dueNoteTexts}>
              <Text style={styles.dueNoteLabel}>
                {pkg.assigned_by ? `Nota de ${pkg.assigned_by}` : 'Nota de tu entrenador'}
              </Text>
              <Text style={styles.dueNoteText} numberOfLines={2}>
                {video.notes}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.dueCta}>
          <Feather name="play" size={20} color={colors.white} />
          <Text style={styles.dueCtaText}>{started ? 'Continuá' : 'Empezá'}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32, gap: 28 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyTitle: {
    fontFamily: typography.fontFamily,
    fontSize: 17,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.ink,
  },
  pressed: { opacity: 0.9 },

  head: { gap: 12 },
  titles: { gap: 6 },
  name: {
    fontFamily: typography.fontFamily,
    fontSize: 32,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: -1,
    lineHeight: 38,
    color: colors.ink,
  },
  description: {
    fontFamily: typography.fontFamily,
    fontSize: 14,
    lineHeight: 20,
    color: colors.gray400,
  },

  progressCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 16,
    gap: 14,
  },
  progressTop: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  progressValue: { gap: 6 },
  progressLabel: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    color: colors.gray400,
  },
  progressRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  progressDone: {
    fontFamily: typography.fontFamily,
    fontSize: 36,
    lineHeight: 36,
    letterSpacing: -0.36,
    color: colors.ink,
  },
  progressTotal: {
    fontFamily: typography.fontFamily,
    fontSize: 16,
    color: colors.gray400,
  },
  progressPill: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 100,
    backgroundColor: colors.accentSoft,
  },
  progressPillText: {
    fontFamily: typography.fontFamily,
    fontSize: 13,
    fontWeight: typography.fontWeight.bold,
    color: GREEN_TEXT,
  },
  progressFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressLeft: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  progressLeftText: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.ink,
  },
  progressTotalTime: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    color: colors.gray400,
  },

  due: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 8,
    gap: 10,
  },
  duePoster: {
    height: 184,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  duePosterImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  duePosterFallback: { backgroundColor: '#DEDEDE' },
  duePosition: {
    position: 'absolute',
    top: 10,
    left: 10,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 100,
    backgroundColor: 'rgba(17,17,17,0.8)',
  },
  duePositionText: {
    fontFamily: typography.fontFamily,
    fontSize: 11,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.white,
  },
  duePlay: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
  },
  dueTime: {
    position: 'absolute',
    right: 10,
    bottom: 12,
    fontFamily: typography.fontFamily,
    fontSize: 12,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.white,
  },
  dueTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  dueTrackFill: { height: 4, backgroundColor: colors.accent },
  dueInfo: { paddingTop: 16, paddingHorizontal: 8, paddingBottom: 8, gap: 16 },
  dueTitles: { gap: 6 },
  dueEyebrow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dueDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accentDeep },
  dueLabel: {
    fontFamily: typography.fontFamily,
    fontSize: 11,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: 1.2,
    color: GREEN_TEXT,
  },
  dueName: {
    fontFamily: typography.fontFamily,
    fontSize: 22,
    fontWeight: typography.fontWeight.semiBold,
    letterSpacing: -0.4,
    color: colors.ink,
  },
  dueMeta: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dueState: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.ink,
  },
  dueLeft: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dueLeftText: { fontFamily: typography.fontFamily, fontSize: 12, color: colors.gray400 },

  dueNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: colors.surface,
  },
  dueNoteMark: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
  },
  dueNoteTexts: { flex: 1, gap: 2 },
  dueNoteLabel: { fontFamily: typography.fontFamily, fontSize: 12, color: colors.gray400 },
  dueNoteText: {
    fontFamily: typography.fontFamily,
    fontSize: 16,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.ink,
  },
  dueCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 32,
    backgroundColor: colors.ink,
  },
  dueCtaText: {
    fontFamily: typography.fontFamily,
    fontSize: 15,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.white,
  },

  sequence: { gap: 0 },
  sequenceLabel: {
    fontFamily: typography.fontFamily,
    fontSize: 11,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: 0.8,
    color: colors.gray400,
    marginBottom: 12,
  },
  step: { flexDirection: 'row', gap: 10 },
  rail: { width: 24, alignItems: 'center' },
  railSegment: { width: 2, height: 30 },
  railSegmentGrow: { width: 2, flex: 1 },
  node: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  nodeDone: { backgroundColor: colors.accentSoft },
  nodeDue: { backgroundColor: colors.ink },
  nodeNumber: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    fontWeight: typography.fontWeight.bold,
    color: colors.gray400,
  },
  nodeNumberDue: { color: colors.accent },
  stepBody: { flex: 1, paddingBottom: 10 },
});
