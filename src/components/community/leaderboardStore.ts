import { fetchLeaderboard, Metric, Leaderboard } from '../../services/leaderboard';

/**
 * A per-metric cache for `fetchLeaderboard()`.
 *
 * The old version of this comment said the leaderboard cost one request per
 * member — that was true when the phone derived the ranking from the feed.
 * `/community/leaderboard/` replaced that: the server ranks, so this is now
 * one request per metric. `CommunityScreen` needs the `trainings` board for
 * the pulse strip; `Ranking` fetches whichever metric chip is active; the
 * profile screen needs `trainings` too, just to know one member's weekly
 * rank. Every caller in this app should go through `getLeaderboard()` rather
 * than importing `fetchLeaderboard` directly, so a given metric is only ever
 * requested once per session.
 *
 * There is no invalidation: a training logged mid-session won't move anyone
 * until the app restarts. Acceptable for now — nothing here reads live from a
 * socket, and the design has no refresh affordance for the board either.
 */
const cache = new Map<Metric, Promise<Leaderboard>>();

export function getLeaderboard(metric: Metric = 'trainings'): Promise<Leaderboard> {
  let entry = cache.get(metric);
  if (!entry) {
    entry = fetchLeaderboard(metric);
    cache.set(metric, entry);
  }
  return entry;
}
