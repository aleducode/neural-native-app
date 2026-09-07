import api from './client';

export type LeaderboardMetric = 'trainings' | 'strike' | 'posts';
export type LeaderboardPeriod = 'week' | 'month' | 'all';

export interface LeaderboardEntry {
  position: number;
  user_id: number;
  /** Null when the member never set a name — do not fall back to the email. */
  name: string | null;
  photo_url: string | null;
  initials: string;
  value: number;
}

export interface LeaderboardStanding {
  position: number;
  value: number;
  /**
   * Trainings needed to reach the next strictly higher value — the number the
   * strip actually shows. `null` when the member is already first.
   */
  to_next: number | null;
  /**
   * The member directly above. Present when the server sends it; the copy for
   * a tie names them, and a tie is the common case rather than the exception.
   */
  next_up?: { name: string | null; value: number } | null;
}

export interface LeaderboardResponse {
  period: { start: string | null; end: string | null };
  metric: LeaderboardMetric;
  /**
   * The signed-in member's own standing, or `null` when they fall outside the
   * ranked set — staff, unverified, or not a client. The strip has to survive
   * that: it is the case for the owner's own account.
   */
  me: LeaderboardStanding | null;
  entries: LeaderboardEntry[];
  total: number;
}

export const leaderboardApi = {
  /**
   * The community ranking.
   *
   * `metric=strike` ignores `period` on the server: a streak is already its own
   * running total, so asking for "this week's streak" has no meaning.
   */
  async getLeaderboard(
    metric: LeaderboardMetric = 'trainings',
    period: LeaderboardPeriod = 'week',
    limit: number = 25
  ): Promise<{ data?: LeaderboardResponse; error?: string }> {
    return api.get<LeaderboardResponse>(
      `/community/leaderboard/?metric=${metric}&period=${period}&limit=${limit}`
    );
  },
};
