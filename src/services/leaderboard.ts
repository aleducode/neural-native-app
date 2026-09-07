import { communityApi } from '../api/community';
import type { PostAuthor } from '../types/community';
import { captureException } from '../utils/sentry';

/**
 * The community leaderboard, assembled on the phone.
 *
 * There is no ranking endpoint. What exists is a feed, which names the people
 * taking part, and a public profile per person, which carries their totals. So
 * the board is built by reading the feed for the roster and then asking each
 * member for their own numbers.
 *
 * That shapes the product as much as the code: this ranks the people who show
 * up in the community, not every member of the gym. The screen says so out
 * loud rather than implying a completeness it cannot deliver.
 *
 * A `/community/leaderboard/` endpoint would replace all of this with one
 * request, and should — the cost here is one call per member.
 */

export type Metric = 'trainings' | 'strike' | 'posts';

export interface RankedMember {
  id: number;
  name: string;
  photoUrl: string | null;
  initials: string;
  trainings: number;
  strike: number;
  posts: number;
}

/** How many people the board asks about. Each one costs a request. */
const ROSTER_LIMIT = 18;
/** Feed pages read to find them. */
const PAGES = 2;
/** Requests in flight at once, so a big roster does not stampede the API. */
const CONCURRENCY = 4;

export const METRICS: { key: Metric; label: string; unit: string }[] = [
  { key: 'trainings', label: 'Entrenos', unit: 'entrenos' },
  { key: 'strike', label: 'Racha', unit: 'semanas' },
  { key: 'posts', label: 'Publicaciones', unit: 'posts' },
];

export function valueOf(member: RankedMember, metric: Metric): number {
  if (metric === 'strike') return member.strike;
  if (metric === 'posts') return member.posts;
  return member.trainings;
}

/** Runs `task` over `items`, at most `limit` at a time. */
async function pooled<T, R>(
  items: T[],
  limit: number,
  task: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  let cursor = 0;

  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await task(items[index]);
    }
  });

  await Promise.all(workers);
  return results;
}

/** Everyone who has posted recently, most recent first, without repeats. */
async function readRoster(): Promise<PostAuthor[]> {
  const seen = new Map<number, PostAuthor>();

  for (let page = 1; page <= PAGES; page++) {
    const { data } = await communityApi.getFeed(page);
    if (!data) break;

    for (const post of data.posts) {
      if (post.author && !seen.has(post.author.id)) seen.set(post.author.id, post.author);
    }
    if (!data.has_more) break;
  }

  return [...seen.values()].slice(0, ROSTER_LIMIT);
}

/**
 * The board, unsorted — the screen sorts it by whichever metric is on show, so
 * switching metrics costs nothing and never refetches.
 *
 * A member whose profile fails to load is left out rather than shown at zero:
 * a false last place is worse than an absence.
 */
export async function fetchLeaderboard(): Promise<RankedMember[]> {
  try {
    const roster = await readRoster();
    if (roster.length === 0) return [];

    const rows = await pooled(roster, CONCURRENCY, async (author) => {
      const { data } = await communityApi.getUserProfile(author.id);
      if (!data) return null;

      return {
        id: author.id,
        name: data.name || author.name,
        photoUrl: data.photo_url ?? author.photo_url,
        initials: author.initials,
        trainings: data.stats?.total_trainings ?? 0,
        strike: data.stats?.current_strike ?? 0,
        posts: data.stats?.posts_count ?? 0,
      } as RankedMember;
    });

    return rows.filter((row): row is RankedMember => row !== null);
  } catch (error) {
    captureException(error as Error, { context: 'leaderboard.fetch' });
    return [];
  }
}

/** Highest first, with a stable tiebreak so equal scores never jitter. */
export function rankBy(members: RankedMember[], metric: Metric): RankedMember[] {
  return [...members].sort((a, b) => {
    const diff = valueOf(b, metric) - valueOf(a, metric);
    if (diff !== 0) return diff;
    return a.name.localeCompare(b.name, 'es');
  });
}
