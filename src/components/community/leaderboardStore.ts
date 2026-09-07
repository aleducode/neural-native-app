import { fetchLeaderboard, RankedMember } from '../../services/leaderboard';

/**
 * A single, process-wide cache for `fetchLeaderboard()`.
 *
 * The leaderboard costs one request per member (see `services/leaderboard.ts`).
 * `CommunityScreen` needs it for the pulse strip and the full table; the
 * profile screen needs it too, just to know one member's weekly rank. Without
 * this, opening a profile after the feed would pay the whole roster cost
 * again. Every caller in this app should go through `getLeaderboard()` rather
 * than importing `fetchLeaderboard` directly, so the request only ever
 * happens once per session.
 *
 * There is no invalidation: a training logged mid-session won't move anyone
 * until the app restarts. Acceptable for now — nothing here reads live from a
 * socket, and the design has no refresh affordance for the board either.
 */
let cached: Promise<RankedMember[]> | null = null;

export function getLeaderboard(): Promise<RankedMember[]> {
  if (!cached) {
    cached = fetchLeaderboard();
  }
  return cached;
}
