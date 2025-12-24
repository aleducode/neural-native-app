import api from './client';

export interface Profile {
  id: number;
  height: number | null;
  birthdate: string | null;
  age: number | null;
  address: string | null;
  emergency_contact: string | null;
  emergency_contact_phone: string | null;
  profession: string | null;
  instagram: string | null;
}

export interface UserWeight {
  id: number;
  weight: number;
  date: string;
  created: string;
}

export interface ProfileResponse {
  profile: Profile;
  latest_weight: UserWeight | null;
}

export interface WeightListResponse {
  weights: UserWeight[];
  stats: {
    current: number | null;
    min: number | null;
    max: number | null;
    total_entries: number;
    change: number;
  };
}

export const profileApi = {
  /**
   * Get user profile and latest weight
   */
  async getProfile(): Promise<{ data?: ProfileResponse; error?: string }> {
    return api.get<ProfileResponse>('/profile/');
  },

  /**
   * Update user profile
   */
  async updateProfile(data: Partial<Profile>): Promise<{ data?: { profile: Profile }; error?: string }> {
    return api.patch<{ profile: Profile }>('/profile/', data);
  },

  /**
   * Get weight history
   */
  async getWeights(): Promise<{ data?: WeightListResponse; error?: string }> {
    return api.get<WeightListResponse>('/profile/weights/');
  },

  /**
   * Create new weight entry
   */
  async createWeight(weight: number): Promise<{ data?: { weight: UserWeight; message: string }; error?: string }> {
    return api.post('/profile/weights/create/', { weight });
  },
};

export default profileApi;
