import React, { useRef, useMemo, useImperativeHandle, forwardRef, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import type { WebView as WebViewType, WebViewMessageEvent } from 'react-native-webview';

/**
 * Resolved at runtime, not imported.
 *
 * The web view is a native module: a build that predates it throws on import
 * and takes the whole screen down with it. Asking for it this way lets an older
 * binary keep running and fall back to opening YouTube outside the app, which
 * is a worse experience but not a crash.
 */
let WebView: any = null;
try {
  WebView = require('react-native-webview').WebView;
} catch {
  WebView = null;
}

/**
 * The embed is off.
 *
 * The player works — the web view is linked and the API loads — but YouTube
 * answers error 152 for these videos from inside the app, and the videos
 * themselves are embeddable (checked three ways, and they belong to the gym's
 * own channel). Rather than keep every YouTube video paying for a failed embed
 * and a retry before falling back, Neural is moving to its own videos on
 * Cloudflare, where playback, progress and completion all work.
 *
 * Flip this to `!!WebView` to pick the investigation back up.
 */
export const youTubeEmbedAvailable = false;

export type YouTubeHandle = {
  play: () => void;
  pause: () => void;
  seekTo: (seconds: number) => void;
};

type Props = {
  /** The YouTube watch/share URL as the backend stores it. */
  url: string;
  onTime: (seconds: number) => void;
  onPlayingChange: (playing: boolean) => void;
  onEnded?: () => void;
  /**
   * The video cannot be played here at all — almost always because its owner
   * disabled embedding (codes 101 and 150), which no amount of parameters can
   * get around.
   */
  onUnavailable?: () => void;
};

/**
 * Every YouTube id shape the backend might hold: watch links, short links,
 * embeds, shorts, and a bare id pasted straight from the address bar.
 */
export function youTubeId(url: string): string | null {
  const patterns = [
    /[?&]v=([\w-]{11})/,
    /youtu\.be\/([\w-]{11})/,
    /\/embed\/([\w-]{11})/,
    /\/shorts\/([\w-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return /^[\w-]{11}$/.test(url.trim()) ? url.trim() : null;
}

/**
 * A YouTube video that behaves like the native player.
 *
 * The design says the three sources report alike, and the member should not be
 * able to tell them apart — so YouTube's own chrome is turned off and playback
 * is driven entirely from the app's controls. The page reports the position
 * twice a second, which is what feeds the scrubber, the 95% mark and the
 * progress the server keeps.
 *
 * A transparent veil sits over the iframe because, even with `controls=0`, a
 * tap on the video toggles play/pause inside YouTube and would desync it from
 * the controls the member can actually see.
 */
const YouTubeSurface = forwardRef<YouTubeHandle, Props>(function YouTubeSurface(
  { url, onTime, onPlayingChange, onEnded, onUnavailable },
  ref
) {
  const web = useRef<WebViewType | null>(null);
  const retried = useRef(false);
  const videoId = useMemo(() => youTubeId(url), [url]);

  const run = useCallback((js: string) => {
    web.current?.injectJavaScript(`${js}; true;`);
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      play: () => run('window.__play && window.__play()'),
      pause: () => run('window.__pause && window.__pause()'),
      seekTo: (seconds: number) => run(`window.__seek && window.__seek(${Math.max(0, seconds)})`),
    }),
    [run]
  );

  const html = useMemo(
    () => `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<style>
  html, body { margin:0; padding:0; height:100%; background:#000; overflow:hidden; }
  #player { position:absolute; inset:0; width:100%; height:100%; }
  /* Swallows taps so YouTube never toggles playback behind the app's back. */
  #veil { position:absolute; inset:0; background:transparent; }
</style>
</head>
<body>
<div id="player"></div>
<div id="veil"></div>
<script>
  var player, ticker, ready = false, pendingSeek = null, pendingPlay = false;
  function send(payload) {
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(payload));
  }
  function onYouTubeIframeAPIReady() {
    player = new YT.Player('player', {
      videoId: ${JSON.stringify(videoId ?? '')},
      // The privacy-enhanced host is the more permissive of the two in an
      // embedded context, and it also keeps YouTube from writing cookies for a
      // member who never asked to be tracked.
      host: 'https://www.youtube-nocookie.com',
      playerVars: {
        controls: 0, modestbranding: 1, playsinline: 1, rel: 0,
        disablekb: 1, fs: 0, iv_load_policy: 3, showinfo: 0,
        // A page loaded from an HTML string has an opaque origin, and YouTube
        // answers an origin it cannot verify with "this video is unavailable"
        // — which reads exactly like a video that refuses to be embedded.
        // Naming the origin explicitly is what separates the two.
        enablejsapi: 1,
        origin: 'https://www.youtube.com'
      },
      events: {
        onReady: function () {
          ready = true;
          // The resume sheet is answered before the iframe finishes loading
          // more often than not; without this the video would start from zero
          // after the member asked to continue from where they left off.
          if (pendingSeek !== null) { player.seekTo(pendingSeek, true); pendingSeek = null; }
          if (pendingPlay) { player.playVideo(); pendingPlay = false; }
          send({ type: 'ready', duration: player.getDuration() });
          ticker = setInterval(function () {
            if (player && player.getCurrentTime) send({ type: 'time', t: player.getCurrentTime() });
          }, 500);
        },
        onStateChange: function (e) { send({ type: 'state', state: e.data }); },
        onError: function (e) { send({ type: 'error', code: e.data }); }
      }
    });
  }
  window.__play = function () {
    if (ready && player && player.playVideo) player.playVideo();
    else pendingPlay = true;
  };
  window.__pause = function () {
    pendingPlay = false;
    if (ready && player && player.pauseVideo) player.pauseVideo();
  };
  window.__seek = function (s) {
    if (ready && player && player.seekTo) player.seekTo(s, true);
    else pendingSeek = s;
  };
</script>
<script src="https://www.youtube.com/iframe_api"></script>
</body>
</html>`,
    [videoId]
  );

  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      let payload: { type: string; t?: number; state?: number; code?: number; level?: string; text?: string };
      try {
        payload = JSON.parse(event.nativeEvent.data);
      } catch {
        return;
      }
      if (payload.type === 'time' && typeof payload.t === 'number') {
        onTime(payload.t);
        return;
      }
      if (payload.type === 'error') {
        // 101 and 150 are the owner's decision and will not change on a retry.
        // Anything else is worth one more attempt before giving up on the
        // embed and sending the member out of the app.
        const refused = payload.code === 101 || payload.code === 150;
        if (refused || retried.current) onUnavailable?.();
        else {
          retried.current = true;
          web.current?.reload();
        }
        return;
      }
      if (payload.type === 'state') {
        // 1 playing · 2 paused · 0 ended
        if (payload.state === 1) onPlayingChange(true);
        if (payload.state === 2) onPlayingChange(false);
        if (payload.state === 0) {
          onPlayingChange(false);
          onEnded?.();
        }
      }
    },
    [onTime, onPlayingChange, onEnded, onUnavailable]
  );

  if (!videoId) {
    // Nothing to load: treat it the same as a video that refuses to embed.
    onUnavailable?.();
    return <View style={styles.blank} />;
  }
  if (!WebView) return <View style={styles.blank} />;

  return (
    <WebView
      ref={web}
      source={{ html, baseUrl: 'https://www.youtube.com' }}
      style={styles.web}
      containerStyle={styles.web}
      originWhitelist={['*']}
      javaScriptEnabled
      domStorageEnabled
      // Without these the first play is refused: a browser only autoplays with
      // sound after a gesture inside the page, and every gesture here is a
      // native one the page never sees.
      mediaPlaybackRequiresUserAction={false}
      allowsInlineMediaPlayback
      onMessage={handleMessage}
      scrollEnabled={false}
      bounces={false}
      allowsFullscreenVideo={false}
      setSupportMultipleWindows={false}
    />
  );
});

const styles = StyleSheet.create({
  web: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000000' },
  blank: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000000' },
});

export default YouTubeSurface;
