import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  Image,
  Linking,
  StatusBar,
  useWindowDimensions,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useVideoPlayer, VideoView } from 'expo-video';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { colors, typography } from '../theme/colors';
import {
  videosApi,
  VideoPackage,
  PackageVideo,
  COMPLETION_RATIO,
  formatClock,
  isComplete,
  playsNatively,
} from '../api/videos';
import YouTubeSurface, {
  YouTubeHandle,
  youTubeEmbedAvailable,
} from '../components/videos/YouTubeSurface';
import { RootStackParamList } from '../navigation/RootNavigator';

const GREEN_TEXT = '#109D2F';

/** Same trophy the booking confirmation uses; the design asks for this one. */
const TROPHY = require('../../assets/trainings/trophy.png');

/**
 * `pointerEvents` is honoured in the style but not always as a prop on an
 * animated view, and a full-screen layer that quietly keeps capturing touches
 * is exactly what stops a hidden overlay from ever being summoned back.
 */
const untouchable = { pointerEvents: 'none' } as const;
const passThrough = { pointerEvents: 'box-none' } as const;

/** How often the position is pushed to the server while playing. */
const REPORT_EVERY_MS = 5000;

/** The controls fade out this long after the last touch, while playing. */
const HIDE_AFTER_MS = 3000;

/** The countdown before the next video opens by itself. */
const AUTONEXT_SECONDS = 5;

type Route = RouteProp<RootStackParamList, 'VideoPlayer'>;

/**
 * One way to watch: fullscreen, in whichever orientation the phone is held.
 *
 * There is no small player. The screen that pairs a video with its notes, its
 * progress and the rest of the sequence is the package detail; this one is the
 * exercise and nothing else, with controls that step out of the way after a
 * few seconds and come back on a tap.
 */
export default function VideoPlayerScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<Route>();
  const { packageId, videoId } = route.params;

  // The layout follows the real window, so the same screen serves both
  // orientations without a second implementation.
  const { width, height } = useWindowDimensions();
  const landscape = width > height;

  const [pkg, setPkg] = useState<VideoPackage | null>(null);
  const [video, setVideo] = useState<PackageVideo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [position, setPosition] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [askResume, setAskResume] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);
  const [countdown, setCountdown] = useState(AUTONEXT_SECONDS);
  const [chromeVisible, setChromeVisible] = useState(true);
  /** YouTube refused to play it here; the only way left is its own app. */
  const [embedRefused, setEmbedRefused] = useState(false);

  /** Where this member had already watched to when the screen opened. */
  const watchedBefore = useRef(0);
  /**
   * The position the screen opened at. Completion is only ever reached by
   * playing *past* it: a finished video restores a position that is already
   * over the threshold, and without this it would announce itself complete
   * before a single frame had run.
   */
  const openedAt = useRef(0);
  const reported = useRef(0);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // One shared value drives the fade, but each layer needs its own animated
  // style: a single useAnimatedStyle cannot be attached to several views.
  const chrome = useSharedValue(1);
  const scrimFade = useAnimatedStyle(() => ({ opacity: chrome.value }));
  const topFade = useAnimatedStyle(() => ({ opacity: chrome.value }));
  const centerFade = useAnimatedStyle(() => ({ opacity: chrome.value }));
  const bottomFade = useAnimatedStyle(() => ({ opacity: chrome.value }));

  const sheet = useSharedValue(0);
  const sheetStyle = useAnimatedStyle(() => ({
    opacity: sheet.value,
    transform: [{ translateY: (1 - sheet.value) * 40 }],
  }));

  /* ── Carga ───────────────────────────────────────────────────────── */
  useEffect(() => {
    let alive = true;
    videosApi.getPackage(packageId).then(({ data }) => {
      if (!alive) return;
      const found = data ?? null;
      const current = found?.videos.find((v) => v.id === videoId) ?? null;
      // A finished video is opened to be watched again, so it starts over.
      const start = current && isComplete(current) ? 0 : current?.seconds ?? 0;
      setPkg(found);
      setVideo(current);
      setPosition(start);
      openedAt.current = start;
      watchedBefore.current = current?.seconds ?? 0;
      reported.current = current?.seconds ?? 0;
      setIsLoading(false);

      // A video already under way asks before it decides for the member.
      if (current && current.seconds > 0 && !isComplete(current)) {
        setAskResume(true);
        sheet.value = withTiming(1, { duration: 280, easing: Easing.out(Easing.cubic) });
      }
    });
    return () => {
      alive = false;
    };
  }, [packageId, videoId, sheet]);

  /** Read inside the completion effect, which must not depend on the list. */
  const hasNext = useRef(false);

  const ordered = useMemo(
    () => (pkg ? [...pkg.videos].sort((a, b) => a.order - b.order) : []),
    [pkg]
  );
  const index = ordered.findIndex((v) => v.id === videoId);
  const previous = index > 0 ? ordered[index - 1] : null;
  const upNext = index >= 0 && index < ordered.length - 1 ? ordered[index + 1] : null;
  hasNext.current = upNext !== null;

  /* ── Reproducción ────────────────────────────────────────────────── */

  /**
   * Cloudflare and uploaded files are manifests a native player can open.
   * A YouTube link is a web page, so there is nothing to hand AVPlayer; the
   * screen offers to open it outside instead of faking an embed.
   */
  const nativeSource = video && playsNatively(video) ? video.playback : null;
  // Only an embeddable YouTube video counts as one. On a binary without the web
  // view it is treated as a link, so the screen degrades instead of crashing.
  const youtubeLink = video && !playsNatively(video) ? video.playback : null;
  const youtubeSource =
    youtubeLink && youTubeEmbedAvailable && !embedRefused ? youtubeLink : null;
  const youtube = useRef<YouTubeHandle>(null);

  // Holds the native player so the remote below does not have to be rebuilt
  // every time expo-video hands back a new instance.
  const playerRef = useRef<ReturnType<typeof useVideoPlayer> | null>(null);

  /**
   * One remote for both sources. YouTube runs inside a web view and expo-video
   * runs natively, but the controls, the scrubber and the completion rule are
   * the member's, not the provider's — they must not be able to tell which one
   * is behind the glass.
   */
  const controls = useMemo(
    () => ({
      play: () => (youtubeSource ? youtube.current?.play() : playerRef.current?.play()),
      pause: () => (youtubeSource ? youtube.current?.pause() : playerRef.current?.pause()),
      seekTo: (seconds: number) => {
        if (youtubeSource) youtube.current?.seekTo(seconds);
        else if (playerRef.current) playerRef.current.currentTime = seconds;
      },
      at: () => (youtubeSource ? position : playerRef.current?.currentTime ?? 0),
    }),
    // `position` is read through a closure on purpose: YouTube has no readable
    // clock from here, so the last reported tick is the only truth available.
    [youtubeSource, position]
  );

  const player = useVideoPlayer(nativeSource, (p) => {
    p.loop = false;
    // Twice a second: the head and the clock move with the video rather than
    // stepping once a second behind it.
    p.timeUpdateEventInterval = 0.5;
  });

  playerRef.current = player;

  useEffect(() => {
    if (!player || !nativeSource) return;
    const time = player.addListener('timeUpdate', (event) => setPosition(event.currentTime));
    const state = player.addListener('playingChange', (event) => setPlaying(event.isPlaying));
    return () => {
      time.remove();
      state.remove();
    };
  }, [player]);

  /**
   * A video opened on purpose starts on its own. The exception is a video with
   * progress behind it: that one waits for the resume sheet to be answered,
   * because starting it would decide for the member.
   */
  const started = useRef(false);
  useEffect(() => {
    if (!video || askResume || started.current) return;
    if (!nativeSource && !youtubeSource) return;
    started.current = true;
    controls.play();
  }, [video, askResume, nativeSource, youtubeSource, controls]);

  /* ── Reporte de avance ───────────────────────────────────────────── */
  const report = useCallback(
    (seconds: number) => {
      if (!video) return;
      // The server keeps the maximum, so sending a smaller number is harmless —
      // but not sending one at all is the only way to lose progress.
      if (seconds <= reported.current) return;
      reported.current = seconds;
      videosApi.reportProgress(video.id, seconds);
    },
    [video]
  );

  // Pushed on a timer rather than on every tick: the server keeps the maximum,
  // so one call every few seconds loses nothing and costs far less.
  useEffect(() => {
    if (!playing) return;
    const push = setInterval(() => report(position), REPORT_EVERY_MS);
    return () => clearInterval(push);
  }, [playing, position, report]);

  // Leaving the screen is the last chance to save what was watched.
  useEffect(() => () => report(position), [position, report]);

  /* ── Controles que se van solos ──────────────────────────────────── */
  const revealChrome = useCallback(() => {
    setChromeVisible(true);
    chrome.value = withTiming(1, { duration: 160 });
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      chrome.value = withTiming(0, { duration: 260, easing: Easing.out(Easing.quad) });
      setChromeVisible(false);
    }, HIDE_AFTER_MS);
  }, [chrome]);

  // Only while playing. A paused video with no controls looks like a frozen
  // app, so pausing brings them back and keeps them.
  useEffect(() => {
    if (playing) {
      revealChrome();
    } else {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      chrome.value = withTiming(1, { duration: 160 });
      setChromeVisible(true);
    }
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [playing, revealChrome, chrome]);

  /* ── Completado ──────────────────────────────────────────────────── */
  useEffect(() => {
    if (!video || justCompleted) return;
    if (position <= openedAt.current) return;
    if (position >= video.duration * COMPLETION_RATIO) {
      setJustCompleted(true);
      report(position);
      // The last video of a package has nothing to run into, so it stops
      // rather than playing on under the panel.
      if (!hasNext.current) controls.pause();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [position, video, justCompleted, report]);

  useEffect(() => {
    if (!justCompleted || countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [justCompleted, countdown]);

  /**
   * The celebration is a portrait screen — "vuelve a vertical para celebrar el
   * paquete completo". Nothing is playing any more, so there is no reason to
   * keep following how the phone is held.
   */
  useEffect(() => {
    if (justCompleted && !upNext) navigation.setOptions({ orientation: 'portrait' });
  }, [justCompleted, upNext, navigation]);

  useEffect(() => {
    if (justCompleted && countdown === 0 && upNext) {
      navigation.replace('VideoPlayer', { packageId, videoId: upNext.id });
    }
  }, [justCompleted, countdown, upNext, navigation, packageId]);

  /* ── Render ──────────────────────────────────────────────────────── */
  if (isLoading || !pkg || !video) {
    return (
      <View style={styles.blank}>
        <StatusBar barStyle="light-content" />
        {isLoading ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <>
            <Text style={styles.blankText}>No pudimos abrir este video</Text>
            <Pressable onPress={() => navigation.goBack()} style={styles.blankBack}>
              <Text style={styles.blankBackText}>Volver</Text>
            </Pressable>
          </>
        )}
      </View>
    );
  }

  const ratio = video.duration > 0 ? Math.min(position / video.duration, 1) : 0;
  const seenRatio = video.duration > 0 ? Math.min(watchedBefore.current / video.duration, 1) : 0;
  const completesAt = video.duration * COMPLETION_RATIO;
  const done = justCompleted || isComplete(video);
  /**
   * Only when the package is finished *here and now*. Reaching for an already
   * completed last video means the member wants to watch it again, and meeting
   * them with a congratulation instead of the exercise is not an answer.
   */
  const finished = justCompleted && !upNext;
  const sidePad = landscape ? 44 : 16;
  const barWidth = landscape ? width - sidePad * 2 - 120 : width - sidePad * 2;

  /**
   * The first touch on a hidden overlay only brings it back — it never also
   * fires the button underneath, which is how every native player behaves and
   * what stops an invisible control from being pressed by accident.
   */
  const guard = (action: () => void) => () => {
    if (!chromeVisible) {
      revealChrome();
      return;
    }
    action();
  };

  const seek = (delta: number) => {
    controls.seekTo(Math.max(0, Math.min(video.duration, controls.at() + delta)));
    revealChrome();
  };

  const go = (target: PackageVideo | null) => {
    if (!target) return;
    navigation.replace('VideoPlayer', { packageId: pkg.id, videoId: target.id });
  };

  const resumeAt = (seconds: number) => {
    setAskResume(false);
    setPosition(seconds);
    controls.seekTo(seconds);
    controls.play();
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" hidden={!chromeVisible} />

      {/* A 16:9 exercise held upright leaves bands above and below. The poster,
          blurred, fills them with the video's own colour instead of black —
          the exercise itself is never cropped to avoid them. */}
      {!landscape && !!video.poster && (
        <Image source={{ uri: video.poster }} style={styles.wash} blurRadius={30} />
      )}

      {nativeSource ? (
        <VideoView
          player={player}
          style={StyleSheet.absoluteFill}
          contentFit="contain"
          nativeControls={false}
          fullscreenOptions={{ enable: false }}
          allowsPictureInPicture
        />
      ) : youtubeSource ? (
        <YouTubeSurface
          ref={youtube}
          url={youtubeSource}
          onTime={setPosition}
          onPlayingChange={setPlaying}
          onEnded={() => setPosition(video.duration)}
          onUnavailable={() => setEmbedRefused(true)}
        />
      ) : youtubeLink ? (
        <View style={styles.outside}>
          {!!video.poster && (
            <Image source={{ uri: video.poster }} style={styles.outsidePoster} blurRadius={14} />
          )}
          <View style={styles.outsideScrim} />
          <Text style={styles.outsideName} numberOfLines={2}>
            {video.name}
          </Text>
          <Text style={styles.outsideText}>
            {embedRefused
              ? 'Quien subió este video no permite verlo dentro de otras apps.'
              : 'Este video está en YouTube y se ve con su reproductor.'}
          </Text>
          <Pressable
            onPress={() => Linking.openURL(youtubeLink)}
            style={({ pressed }) => [styles.outsideCta, pressed && styles.pressed]}
            accessibilityRole="button"
          >
            <Feather name="external-link" size={20} color={colors.ink} />
            <Text style={styles.outsideCtaText}>Ver en YouTube</Text>
          </Pressable>
          <Text style={styles.outsideNote}>Tu avance de este video no se registra solo</Text>
        </View>
      ) : (
        <View style={styles.outside}>
          <Text style={styles.outsideText}>No pudimos abrir este video</Text>
        </View>
      )}

      {/* Tapping anywhere brings the controls back — but only over a surface
          that is actually playing. Laid over the "opens outside" screen it
          swallowed the one tap that screen has. */}
      {(!!nativeSource || !!youtubeSource) && (
        <Pressable style={StyleSheet.absoluteFill} onPress={revealChrome} />
      )}

      {!finished && (
        <Animated.View style={[styles.scrim, scrimFade, untouchable]} pointerEvents="none">
          <LinearGradient
            colors={['#111111CC', '#11111100', '#11111100', '#111111E6']}
            locations={[0, 0.35, 0.6, 1]}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      )}

      <View
        style={StyleSheet.absoluteFill}
        pointerEvents={finished ? 'none' : 'box-none'}
      >
        {/* ── Barra superior ── */}
        <Animated.View
          style={[
            styles.top,
            { paddingHorizontal: sidePad, paddingTop: landscape ? 18 : 54 },
            topFade,
            chromeVisible ? passThrough : untouchable,
          ]}
        >
          <View style={styles.topLeft} pointerEvents="box-none">
            <Pressable
              onPress={() => navigation.goBack()}
              style={styles.round}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Volver al módulo"
            >
              <Feather name="chevron-down" size={22} color={colors.white} />
            </Pressable>
            <View style={styles.topTitles}>
              {landscape && (
                <Text style={styles.topName} numberOfLines={1}>
                  {video.name}
                </Text>
              )}
              <Text style={landscape ? styles.topPackage : styles.topPackageAlone} numberOfLines={1}>
                {pkg.name} · Video {video.order} de {pkg.total}
              </Text>
            </View>
          </View>

          <View style={styles.topRight} pointerEvents="box-none">
            {!!video.notes && landscape && (
              <View style={styles.notePill}>
                <Feather name="clipboard" size={16} color={colors.ink} />
                <Text style={styles.notePillText} numberOfLines={1}>
                  {video.notes}
                </Text>
              </View>
            )}
            <Pressable
              onPress={() => navigation.navigate('VideoPackage', { packageId: pkg.id })}
              style={styles.round}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Ver la secuencia del módulo"
            >
              <Feather name="list" size={22} color={colors.white} />
            </Pressable>
          </View>
        </Animated.View>

        {/* ── Controles centrales ── */}
        {(!!nativeSource || !!youtubeSource) && (
        <Animated.View
          style={[styles.center, { gap: landscape ? 44 : 28 }, centerFade, chromeVisible ? passThrough : untouchable]}
        >
          <Pressable onPress={guard(() => go(previous))} disabled={!previous} hitSlop={12}>
            <Feather
              name="skip-back"
              size={landscape ? 28 : 26}
              color={previous ? colors.white : 'rgba(255,255,255,0.3)'}
            />
          </Pressable>

          <Pressable onPress={guard(() => seek(-10))} hitSlop={12} accessibilityLabel="Atrás 10 segundos">
            <Feather name="rotate-ccw" size={landscape ? 34 : 32} color={colors.white} />
          </Pressable>

          <Pressable
            onPress={guard(() => {
              if (playing) controls.pause();
              else controls.play();
              revealChrome();
            })}
            style={styles.playPause}
            accessibilityRole="button"
            accessibilityLabel={playing ? 'Pausar' : 'Reproducir'}
          >
            <Feather name={playing ? 'pause' : 'play'} size={38} color={colors.ink} />
          </Pressable>

          <Pressable onPress={guard(() => seek(10))} hitSlop={12} accessibilityLabel="Adelante 10 segundos">
            <Feather name="rotate-cw" size={landscape ? 34 : 32} color={colors.white} />
          </Pressable>

          <Pressable onPress={guard(() => go(upNext))} disabled={!upNext} hitSlop={12}>
            <Feather
              name="skip-forward"
              size={landscape ? 28 : 26}
              color={upNext ? colors.white : 'rgba(255,255,255,0.3)'}
            />
          </Pressable>
        </Animated.View>

        )}

        {/* ── Bloque inferior ── */}
        {(!!nativeSource || !!youtubeSource) && (
        <Animated.View
          style={[styles.bottom, { paddingHorizontal: sidePad }, bottomFade, chromeVisible ? passThrough : untouchable]}
        >
          {!landscape && (
            <View style={styles.portraitTitles}>
              <Text style={styles.portraitName} numberOfLines={2}>
                {video.name}
              </Text>
            </View>
          )}

          <View style={styles.timeRow}>
            {landscape && <Text style={styles.timeNow}>{formatClock(position)}</Text>}

            <View style={[styles.track, { width: barWidth }]}>
              <View style={styles.trackBase} />
              {/* What was watched on earlier visits sits behind what is playing
                  now, so the member can see they are back over known ground. */}
              <View style={[styles.trackSeen, { width: barWidth * seenRatio }]} />
              <LinearGradient
                colors={[colors.accent, colors.accentDeep]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.trackPlayed, { width: barWidth * ratio }]}
              />
              <View style={[styles.mark95, { left: barWidth * COMPLETION_RATIO - 1 }]} />
              <View style={[styles.head, { left: barWidth * ratio - 8 }]} />
            </View>

            {landscape && <Text style={styles.timeTotal}>{formatClock(video.duration)}</Text>}
          </View>

          {!landscape && (
            <View style={styles.timesRow}>
              <Text style={styles.timeNow}>{formatClock(position)}</Text>
              <Text style={styles.timeTotal}>{formatClock(video.duration)}</Text>
            </View>
          )}

          <View style={landscape ? styles.infoRow : styles.infoColumn}>
            <View style={styles.state}>
              {done ? (
                <Feather name="check-circle" size={14} color={colors.accent} />
              ) : (
                <View style={styles.stateMark} />
              )}
              <Text style={styles.stateText} numberOfLines={1}>
                {done
                  ? 'Completado'
                  : `Se completa a los ${formatClock(completesAt)}${
                      watchedBefore.current > 0
                        ? ` · ya viste hasta ${formatClock(watchedBefore.current)}`
                        : ''
                    }`}
              </Text>
            </View>

            {!!upNext && landscape && (
              <Pressable onPress={() => go(upNext)} style={styles.nextChip} accessibilityRole="button">
                <Text style={styles.nextChipText} numberOfLines={1}>
                  Sigue: {upNext.order} · {upNext.name}
                </Text>
                <Feather name="skip-forward" size={18} color={colors.white} />
              </Pressable>
            )}
          </View>

          {!!upNext && !landscape && (
            <Pressable onPress={() => go(upNext)} style={styles.nextCard} accessibilityRole="button">
              <View style={styles.nextPoster}>
                {!!upNext.poster && (
                  <Image source={{ uri: upNext.poster }} style={styles.nextPosterImage} />
                )}
              </View>
              <View style={styles.nextTexts}>
                <Text style={styles.nextLabel}>SIGUE · VIDEO {upNext.order}</Text>
                <Text style={styles.nextName} numberOfLines={1}>
                  {upNext.name} · {formatClock(upNext.duration)}
                </Text>
              </View>
              <Feather name="skip-forward" size={22} color={colors.white} />
            </Pressable>
          )}
        </Animated.View>
        )}
      </View>

      {/* ── Reanudar ── */}
      {askResume && (
        <View style={styles.sheetWrap}>
          <Pressable
            style={styles.sheetScrim}
            onPress={() => resumeAt(watchedBefore.current)}
            accessibilityLabel="Continuar donde quedaste"
          />
          <Animated.View style={[styles.sheet, sheetStyle]}>
            <View style={styles.grabber} />

            <Text style={styles.sheetTitle}>
              Ya viste {formatClock(watchedBefore.current)} de {formatClock(video.duration)}
            </Text>
            <Text style={styles.sheetBody}>Retomá donde lo dejaste o empezá otra vez.</Text>

            <Pressable
              onPress={() => resumeAt(watchedBefore.current)}
              style={({ pressed }) => [styles.sheetCta, pressed && styles.pressed]}
              accessibilityRole="button"
            >
              <Feather name="play" size={20} color={colors.white} />
              <Text style={styles.sheetCtaText}>
                Continuá desde {formatClock(watchedBefore.current)}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => resumeAt(0)}
              style={({ pressed }) => [styles.sheetSecondary, pressed && styles.pressed]}
              accessibilityRole="button"
            >
              <Feather name="rotate-ccw" size={18} color={colors.ink} />
              <Text style={styles.sheetSecondaryText}>Empezar de nuevo</Text>
            </Pressable>

            {/* Starting over does not erase anything on the server, and saying
                so is what makes the second button safe to press. */}
            <View style={styles.sheetFoot}>
              <Feather name="check-circle" size={14} color={GREEN_TEXT} />
              <Text style={styles.sheetFootText}>Tu avance se mantiene</Text>
            </View>
          </Animated.View>
        </View>
      )}

      {/* ── Siguiente en 5 ── */}
      {justCompleted && !!upNext && countdown >= 0 && (
        <View style={[styles.autoNext, { left: sidePad, right: sidePad }]}>
          <View style={styles.autoRing}>
            <Text style={styles.autoCount}>{countdown}</Text>
          </View>
          <View style={styles.autoTexts}>
            <Text style={styles.autoLabel}>SIGUIENTE EN {countdown}</Text>
            <Text style={styles.autoName} numberOfLines={1}>
              {upNext.name}
            </Text>
            <Text style={styles.autoMeta}>
              Video {upNext.order} · {formatClock(upNext.duration)}
            </Text>
          </View>
          <View style={styles.autoButtons}>
            <Pressable onPress={() => go(upNext)} style={styles.autoPrimary} accessibilityRole="button">
              <Feather name="play" size={15} color={colors.ink} />
              <Text style={styles.autoPrimaryText}>Ver ahora</Text>
            </Pressable>
            <Pressable onPress={() => setCountdown(-1)} hitSlop={8} accessibilityRole="button">
              <Text style={styles.autoSecondaryText}>Quedarme acá</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* ── Paquete terminado ── */}
      {finished && (
        <View style={styles.finished}>
          <View style={styles.finishedHeader}>
            <Pressable
              onPress={() => navigation.popToTop()}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Cerrar"
            >
              <Feather name="x" size={24} color={colors.ink} />
            </Pressable>
          </View>

          <View style={styles.finishedCenter}>
            <View style={styles.finishedHero}>
              <Image
                source={TROPHY}
                style={styles.trophy}
                resizeMode="contain"
                accessible={false}
              />
              <View style={styles.finishedTexts}>
                <Text style={styles.finishedTitle}>
                  ¡Terminaste{'\n'}
                  {pkg.name}!
                </Text>
                <Text style={styles.finishedBody}>
                  Completaste todos los videos que te asignó tu gimnasio.
                </Text>
              </View>
            </View>

            <View style={styles.finishedSummary}>
              <View style={styles.stats}>
                <Stat icon="play-circle" label="Videos" value={String(pkg.total)} />
                <Stat
                  icon="clock"
                  label="Duración"
                  value={String(Math.round(ordered.reduce((t, v) => t + v.duration, 0) / 60))}
                  unit="min"
                />
                <Stat
                  icon="check-circle"
                  label="Completado"
                  value={String(pkg.total)}
                  unit={`de ${pkg.total}`}
                  tint={GREEN_TEXT}
                />
              </View>
              <View style={styles.finishedBar}>
                <View style={styles.finishedBarFill} />
              </View>
            </View>
          </View>

          <View style={styles.finishedActions}>
            <Pressable
              onPress={() => navigation.popToTop()}
              style={({ pressed }) => [styles.finishedPrimary, pressed && styles.pressed]}
              accessibilityRole="button"
            >
              <Text style={styles.finishedPrimaryText}>Volvé a Mis ejercicios</Text>
            </Pressable>

            <Pressable
              onPress={() => navigation.navigate('VideoPackage', { packageId: pkg.id })}
              style={({ pressed }) => [styles.finishedSecondary, pressed && styles.pressed]}
              accessibilityRole="button"
            >
              <Text style={styles.finishedSecondaryText}>Ver el módulo</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

function Stat({
  icon,
  label,
  value,
  unit,
  tint = colors.ink,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
  unit?: string;
  tint?: string;
}) {
  return (
    <View style={styles.stat}>
      <Feather name={icon} size={24} color={tint === colors.ink ? colors.ink : tint} />
      <Text style={styles.statLabel}>{label}</Text>
      <View style={styles.statValue}>
        <Text style={[styles.statNumber, { color: tint }]}>{value}</Text>
        {!!unit && <Text style={[styles.statUnit, { color: tint }]}>{unit}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000' },
  pressed: { opacity: 0.85 },

  blank: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    backgroundColor: '#000000',
  },
  blankText: {
    fontFamily: typography.fontFamily,
    fontSize: 17,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.white,
  },
  blankBack: {
    height: 44,
    paddingHorizontal: 24,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  blankBackText: { fontFamily: typography.fontFamily, fontSize: 15, color: colors.white },

  wash: {
    ...StyleSheet.absoluteFillObject,
    width: '130%',
    height: '130%',
    left: '-15%',
    top: '-15%',
    opacity: 0.55,
  },

  outside: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 10,
  },
  outsidePoster: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  outsideScrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(17,17,17,0.7)' },
  outsideName: {
    fontFamily: typography.fontFamily,
    fontSize: 24,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: -0.4,
    textAlign: 'center',
    color: colors.white,
  },
  outsideText: {
    marginBottom: 14,
    fontFamily: typography.fontFamily,
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
    color: 'rgba(255,255,255,0.7)',
  },
  outsideCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    paddingHorizontal: 28,
    borderRadius: 25,
    backgroundColor: colors.accent,
  },
  outsideCtaText: {
    fontFamily: typography.fontFamily,
    fontSize: 16,
    fontWeight: typography.fontWeight.bold,
    color: colors.ink,
  },
  outsideNote: {
    marginTop: 4,
    fontFamily: typography.fontFamily,
    fontSize: 12,
    textAlign: 'center',
    color: 'rgba(255,255,255,0.5)',
  },

  scrim: { ...StyleSheet.absoluteFillObject },

  /* Barra superior */
  top: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  topLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  topTitles: { flex: 1, gap: 2 },
  topName: {
    fontFamily: typography.fontFamily,
    fontSize: 18,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.white,
  },
  topPackage: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  topPackageAlone: {
    fontFamily: typography.fontFamily,
    fontSize: 14,
    fontWeight: typography.fontWeight.semiBold,
    color: 'rgba(255,255,255,0.85)',
  },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  round: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  notePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 100,
    backgroundColor: colors.accent,
    maxWidth: 240,
  },
  notePillText: {
    flexShrink: 1,
    fontFamily: typography.fontFamily,
    fontSize: 13,
    fontWeight: typography.fontWeight.bold,
    color: colors.ink,
  },

  /* Controles centrales */
  center: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    height: 72,
    marginTop: -36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playPause: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
  },

  /* Bloque inferior */
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 34, gap: 14 },
  portraitTitles: { gap: 10 },
  portraitName: {
    fontFamily: typography.fontFamily,
    fontSize: 26,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: -0.5,
    lineHeight: 31,
    color: colors.white,
  },

  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  track: { height: 16, justifyContent: 'center' },
  trackBase: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  trackSeen: {
    position: 'absolute',
    left: 0,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  trackPlayed: { position: 'absolute', left: 0, height: 4, borderRadius: 2 },
  mark95: {
    position: 'absolute',
    width: 2,
    height: 10,
    borderRadius: 1,
    backgroundColor: colors.accent,
  },
  head: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.white,
  },
  timesRow: { flexDirection: 'row', justifyContent: 'space-between' },
  timeNow: {
    minWidth: 44,
    fontFamily: typography.fontFamily,
    fontSize: 13,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.white,
  },
  timeTotal: {
    minWidth: 44,
    textAlign: 'right',
    fontFamily: typography.fontFamily,
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  infoColumn: { gap: 10 },
  state: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  stateMark: { width: 2, height: 10, borderRadius: 1, backgroundColor: colors.accent },
  stateText: {
    flexShrink: 1,
    fontFamily: typography.fontFamily,
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  nextChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingLeft: 14,
    paddingRight: 10,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.15)',
    maxWidth: 280,
  },
  nextChipText: {
    flexShrink: 1,
    fontFamily: typography.fontFamily,
    fontSize: 12,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.white,
  },

  nextCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  nextPoster: {
    width: 56,
    height: 36,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  nextPosterImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  nextTexts: { flex: 1, gap: 1 },
  nextLabel: {
    fontFamily: typography.fontFamily,
    fontSize: 10,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: 0.6,
    color: colors.accent,
  },
  nextName: {
    fontFamily: typography.fontFamily,
    fontSize: 13,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.white,
  },

  /* Reanudar */
  sheetWrap: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end' },
  sheetScrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(17,17,17,0.6)' },
  sheet: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: colors.white,
  },
  grabber: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#DEDEDE',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 22,
  },
  sheetTitle: {
    fontFamily: typography.fontFamily,
    fontSize: 26,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: -0.5,
    color: colors.ink,
  },
  sheetBody: {
    marginTop: 8,
    marginBottom: 28,
    fontFamily: typography.fontFamily,
    fontSize: 15,
    lineHeight: 21,
    color: colors.gray400,
  },
  sheetCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.ink,
  },
  sheetCtaText: {
    fontFamily: typography.fontFamily,
    fontSize: 16,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.white,
  },
  sheetSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 56,
    borderRadius: 28,
    marginTop: 10,
    backgroundColor: colors.white,
  },
  sheetSecondaryText: { fontFamily: typography.fontFamily, fontSize: 16, color: colors.ink },
  sheetFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
  },
  sheetFootText: { fontFamily: typography.fontFamily, fontSize: 12, color: colors.gray400 },

  /* Siguiente en 5 */
  autoNext: {
    position: 'absolute',
    bottom: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(17,17,17,0.92)',
  },
  autoRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.accent,
  },
  autoCount: {
    fontFamily: typography.fontFamily,
    fontSize: 20,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
  },
  autoTexts: { flex: 1, gap: 1 },
  autoLabel: {
    fontFamily: typography.fontFamily,
    fontSize: 10,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: 0.6,
    color: colors.accent,
  },
  autoName: {
    fontFamily: typography.fontFamily,
    fontSize: 15,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.white,
  },
  autoMeta: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
  },
  autoButtons: { alignItems: 'center', gap: 8 },
  autoPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 32,
    backgroundColor: colors.accent,
  },
  autoPrimaryText: {
    fontFamily: typography.fontFamily,
    fontSize: 13,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.ink,
  },
  autoSecondaryText: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },

  /* Módulo terminado · NcIJY */
  finished: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.surface,
    paddingTop: 42,
    paddingHorizontal: 16,
    paddingBottom: 32,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  finishedHeader: {
    width: '100%',
    height: 52,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  finishedCenter: { flex: 1, width: '100%', gap: 40, justifyContent: 'center', alignItems: 'center' },
  finishedHero: { width: '100%', gap: 28, alignItems: 'center' },
  trophy: { width: 247, height: 214 },
  finishedTexts: { width: 290, gap: 8, alignItems: 'center' },
  finishedTitle: {
    fontFamily: typography.fontFamily,
    fontSize: 24,
    fontWeight: typography.fontWeight.bold,
    lineHeight: 29,
    letterSpacing: -0.4,
    textAlign: 'center',
    color: colors.ink,
  },
  finishedBody: {
    fontFamily: typography.fontFamily,
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
    color: colors.gray400,
  },

  finishedSummary: { width: '100%', gap: 20, alignItems: 'center' },
  stats: { flexDirection: 'row', gap: 24 },
  stat: { width: 90, gap: 8, alignItems: 'center' },
  statLabel: { fontFamily: typography.fontFamily, fontSize: 14, color: colors.gray400 },
  statValue: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  statNumber: { fontFamily: typography.fontFamily, fontSize: 24, letterSpacing: -0.48 },
  statUnit: { fontFamily: typography.fontFamily, fontSize: 14, lineHeight: 22 },
  finishedBar: {
    width: 318,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    backgroundColor: '#E4E4E4',
  },
  finishedBarFill: { width: '100%', height: 6, borderRadius: 3, backgroundColor: colors.accentDeep },

  finishedActions: { width: '100%', gap: 8 },
  finishedPrimary: {
    height: 50,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentDeep,
    borderWidth: 1,
    borderColor: colors.ink,
  },
  finishedPrimaryText: {
    fontFamily: typography.fontFamily,
    fontSize: 16,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.ink,
  },
  finishedSecondary: {
    height: 50,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.ink,
  },
  finishedSecondaryText: {
    fontFamily: typography.fontFamily,
    fontSize: 16,
    color: colors.ink,
  },
});
