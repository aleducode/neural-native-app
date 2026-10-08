import api from './client';
import { API_URL } from '../constants/config';

/**
 * Where a video is hosted. Each one plays differently: `stream` is HLS from
 * Cloudflare, `url` is usually a YouTube link with its own embed, and `upload`
 * is an mp4 we host. The player has to branch on this.
 */
export type VideoSource = 'stream' | 'url' | 'upload';

/**
 * How a video has to be played, decided by the server.
 *
 * `hls` and `file` are manifests a native player opens; `youtube` is a web page
 * and no native player can take it, so those go out to the YouTube app.
 */
export type VideoPlayer = 'hls' | 'youtube' | 'file';

export interface PackageVideo {
  id: number;
  name: string;
  description: string;
  /**
   * What the trainer wrote for this video *inside this package* — "3 series de
   * 12". The same video in another package can carry a different note, which is
   * why it travels with the package item and not with the video.
   */
  notes: string;
  order: number;
  /** Seconds, as an integer. Formatting is ours. */
  duration: number;
  poster: string | null;
  playback: string;
  embed: string | null;
  source: VideoSource;
  /** Seconds this member has watched. Not global — theirs. */
  seconds: number;
  completed: boolean;
  /** What to play it with. Older rows may not carry it, hence the fallback. */
  player?: VideoPlayer;
}

export interface VideoPackage {
  id: number;
  name: string;
  description: string;
  /** Null for almost every package today, so the card cannot depend on it. */
  cover: string | null;
  kind: 'group' | 'individual';
  completed: number;
  total: number;
  videos: PackageVideo[];
  /**
   * When this module reached the member, ISO 8601. The most recent assignment
   * that makes it theirs, which is what "this is new" means to them.
   */
  assigned_at?: string | null;
  /**
   * Who assigned it, for signing the trainer's note. Null on everything
   * assigned before the panel started recording it.
   */
  assigned_by?: string | null;
}

interface PackagesResponse {
  packages: VideoPackage[];
}

export interface ProgressResponse {
  video_id: number;
  seconds: number;
  percent: number;
  completed: boolean;
}

/**
 * Media paths come back relative when the backend serves them off its own disk
 * and absolute when they come from S3. An `<Image>` handed a relative path
 * simply shows nothing, so every URL is made absolute once, here, rather than
 * at each of the six places that render one.
 */
function absolute(url: string | null): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

function normalize(pkg: VideoPackage): VideoPackage {
  return {
    ...pkg,
    cover: absolute(pkg.cover),
    videos: pkg.videos.map((video) => ({
      ...video,
      poster: absolute(video.poster),
      playback: absolute(video.playback) ?? video.playback,
    })),
  };
}

export const videosApi = {
  /** Only the published packages assigned to the caller, with their own progress. */
  getPackages: async () => {
    const response = await api.get<PackagesResponse>('/videos/packages/');
    if (response.data?.packages) {
      response.data.packages = response.data.packages.map(normalize);
    }
    return response;
  },

  /**
   * One module. A screen that shows a single module has no business pulling the
   * whole catalogue: with five modules of eight videos, opening one video used
   * to download thirty-nine others.
   *
   * A module that was never assigned to the caller answers 404, not the module.
   */
  getPackage: async (id: number) => {
    const response = await api.get<VideoPackage>(`/videos/packages/${id}/`);
    if (response.data) response.data = normalize(response.data);
    return response;
  },

  /**
   * Reports how far this member has watched. The server keeps the maximum, so
   * rewinding never erases what was already seen, and the call is idempotent —
   * sending it every few seconds while playing is the intended use.
   */
  reportProgress: async (videoId: number, seconds: number) => {
    return api.post<ProgressResponse>('/videos/progress/', {
      video_id: videoId,
      seconds: Math.floor(seconds),
    });
  },
};

/** A video counts as watched at 95%: nobody lands on the last second. */
export const COMPLETION_RATIO = 0.95;

/**
 * Whether a native player can open this video.
 *
 * The server says so outright now; the fallback only covers rows that predate
 * the field.
 */
export function playsNatively(video: PackageVideo): boolean {
  if (video.player) return video.player !== 'youtube';
  return video.source !== 'url';
}

export function isComplete(video: PackageVideo): boolean {
  return video.completed || video.seconds >= video.duration * COMPLETION_RATIO;
}

/** m:ss, which is how every duration in this feature is written in the design. */
export function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/** Whole minutes, for a package total — "17 min" rather than "17:04". */
export function formatMinutes(totalSeconds: number): number {
  return Math.round(totalSeconds / 60);
}

export function packageSeconds(pkg: VideoPackage): number {
  return pkg.videos.reduce((total, video) => total + video.duration, 0);
}

/**
 * The first video in order that is not finished — what the design calls
 * "te toca". Null once the whole package is done.
 */
export function nextVideo(pkg: VideoPackage): PackageVideo | null {
  const ordered = [...pkg.videos].sort((a, b) => a.order - b.order);
  return ordered.find((video) => !isComplete(video)) ?? null;
}

export function packagePercent(pkg: VideoPackage): number {
  if (pkg.total === 0) return 0;
  return Math.round((pkg.completed / pkg.total) * 100);
}

export default videosApi;
