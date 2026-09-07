import {
  leaderboardApi,
  type LeaderboardMetric,
  type LeaderboardPeriod,
  type LeaderboardEntry,
  type LeaderboardStanding,
} from '../api/leaderboard';
import { captureException } from '../utils/sentry';

/**
 * The community leaderboard.
 *
 * This used to be assembled on the phone — read the feed for a roster, then ask
 * each member for their totals — because no ranking endpoint existed. It cost
 * a request per member and could only rank people who post, which left out the
 * member who trains daily and never writes a word.
 *
 * `/community/leaderboard/` replaced all of it with one request over every
 * active member, and the derivation is gone.
 */

export type Metric = LeaderboardMetric;
export type Period = LeaderboardPeriod;

export interface RankedMember {
  id: number;
  position: number;
  name: string;
  photoUrl: string | null;
  initials: string;
  value: number;
}

export interface Standing {
  position: number;
  value: number;
  toNext: number | null;
}

export interface Leaderboard {
  metric: Metric;
  entries: RankedMember[];
  /** `null` when the signed-in account is not part of the ranked set. */
  me: Standing | null;
  total: number;
  /**
   * Nobody has done anything this period, so every value is 0 and the order is
   * alphabetical noise. A podium built on that is a lie with faces on it.
   */
  isEmpty: boolean;
}

export const METRICS: { key: Metric; label: string; unit: string }[] = [
  { key: 'trainings', label: 'Entrenos', unit: 'entrenos' },
  { key: 'strike', label: 'Racha', unit: 'semanas' },
  { key: 'posts', label: 'Publicaciones', unit: 'posts' },
];

export function unitFor(metric: Metric): string {
  return METRICS.find((m) => m.key === metric)?.unit ?? '';
}

function toMember(entry: LeaderboardEntry): RankedMember {
  return {
    id: entry.user_id,
    position: entry.position,
    name: entry.name,
    photoUrl: entry.photo_url,
    initials: entry.initials,
    value: entry.value,
  };
}

function toStanding(me: LeaderboardStanding | null): Standing | null {
  if (!me) return null;
  return { position: me.position, value: me.value, toNext: me.to_next };
}

const EMPTY: Leaderboard = {
  metric: 'trainings',
  entries: [],
  me: null,
  total: 0,
  isEmpty: true,
};

/**
 * One request. The server ranks, so switching metric refetches rather than
 * re-sorting — which is now cheap enough to be the simpler thing.
 *
 * A failure returns an empty board rather than throwing: the wall must keep
 * working when the ranking does not.
 */
export async function fetchLeaderboard(
  metric: Metric = 'trainings',
  period: Period = 'week'
): Promise<Leaderboard> {
  try {
    const { data } = await leaderboardApi.getLeaderboard(metric, period);
    if (!data) return { ...EMPTY, metric };

    const entries = (data.entries ?? []).map(toMember);

    return {
      metric: data.metric ?? metric,
      entries,
      me: toStanding(data.me),
      total: data.total ?? entries.length,
      // Everyone tied at zero is not a ranking, whatever the order says.
      isEmpty: entries.length === 0 || entries[0].value === 0,
    };
  } catch (error) {
    captureException(error as Error, { context: 'leaderboard.fetch' });
    return { ...EMPTY, metric };
  }
}

/**
 * What the strip says under the podium.
 *
 * The gap to the next place is the whole point: a position is a fact, the gap
 * is a reason to book.
 */
export function standingLabel(me: Standing | null, metric: Metric): string {
  if (!me) return 'Entrená esta semana para entrar en la tabla';
  if (me.toNext === null || me.toNext <= 0) return 'Vas primero. Sostenelo.';

  const unit = metric === 'strike' ? 'semanas' : metric === 'posts' ? 'publicaciones' : 'entrenos';
  const one = me.toNext === 1;
  const noun = one ? unit.replace(/s$/, '') : unit;
  return `Te falta${one ? '' : 'n'} ${me.toNext} ${noun} para el ${me.position - 1}.º`;
}
