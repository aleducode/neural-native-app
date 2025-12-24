import api from './client';

interface DashboardStats {
  trainings: number;
  calories: number;
  hours: number;
}

interface DashboardStrike {
  weeks: number;
  is_current: boolean;
}

interface DashboardNextTraining {
  id: number;
  day_name: string;
  hour: string;
  training_type: string;
  message: string;
}

interface DashboardMembership {
  plan_name: string;
  days_left: number;
  is_active: boolean;
  expiration_date: string | null;
}

interface DashboardUser {
  first_name: string;
  photo: string | null;
}

export interface DashboardResponse {
  user: DashboardUser;
  next_training: DashboardNextTraining | null;
  strike: DashboardStrike;
  stats: DashboardStats;
  membership: DashboardMembership | null;
  has_year_review: boolean;
}

export const dashboardApi = {
  async getDashboard(): Promise<{ data?: DashboardResponse; error?: string }> {
    const response = await api.get<DashboardResponse>('/dashboard/');

    if (response.error) {
      return { error: response.error };
    }

    return { data: response.data };
  },
};
