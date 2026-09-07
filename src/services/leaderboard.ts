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
  /**
   * How much more it takes to pass the member directly above. `null` means
   * there is nobody above; `0` means the values are already level and only the
   * tiebreak separates them.
   */
  toNext: number | null;
  /** Who is directly above, when the server says. */
  nextUp?: { name: string; value: number } | null;
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
  return {
    position: me.position,
    value: me.value,
    toNext: me.to_next,
    nextUp: me.next_up
      ? { name: me.next_up.name, value: me.next_up.value }
      : null,
  };
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
const PLURAL: Record<Metric, string> = {
  trainings: 'entrenos',
  strike: 'semanas',
  posts: 'publicaciones',
};

const SINGULAR: Record<Metric, string> = {
  trainings: 'entreno',
  strike: 'semana',
  posts: 'publicación',
};

/**
 * Just the first name, and only when it is one.
 *
 * A member who never filled in a name comes back as the local part of their
 * email. "Estás empatado con Jperez.94" is worse than not naming anyone, and
 * it also hands out half an address, so those fall back to the position.
 */
function firstNameOf(name: string): string | null {
  const raw = (name || '').trim();
  if (!raw) return null;
  if (raw.includes('@') || /[._\d]/.test(raw.split(/\s+/)[0] ?? '')) return null;

  const first = raw.split(/\s+/)[0] ?? '';
  if (first.length < 2) return null;
  if (first === first.toUpperCase()) return first[0] + first.slice(1).toLowerCase();
  return first;
}

/**
 * What the strip says under the podium.
 *
 * Three states, and the middle one is the common case rather than the edge:
 * positions are unique but values tie constantly — 92 of the first 99 pairs
 * share a number — so most members are level with the person above them and
 * separated only by the tiebreak. Telling them "te faltan 0" would say
 * nothing; telling them they are tied says exactly where they stand.
 */
export function standingLabel(me: Standing | null, metric: Metric): string {
  if (!me) return 'Entrená esta semana para entrar en la tabla';
  if (me.toNext === null) return 'Vas primero. Sostenelo.';

  const one = SINGULAR[metric];

  if (me.toNext === 0) {
    const rival = me.nextUp ? firstNameOf(me.nextUp.name) : null;
    return rival
      ? `Estás empatado con ${rival}. Un ${one} más y lo pasás.`
      : `Estás empatado con el ${me.position - 1}.º. Un ${one} más y lo pasás.`;
  }

  const isOne = me.toNext === 1;
  const noun = isOne ? one : PLURAL[metric];
  return `Te falta${isOne ? '' : 'n'} ${me.toNext} ${noun} para el ${me.position - 1}.º`;
}
