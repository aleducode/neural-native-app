// User types
export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  photo_url: string | null;
  is_verified: boolean;
  is_client: boolean;
}

// Auth types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  password: string;
  password_confirmation: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

// API Error
export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
}

// Membership types
export interface Plan {
  id: number;
  name: string;
  slug_name: string;
  description: string;
  price: number;
  duration: number;
}

export interface Membership {
  id: number;
  membership_type: string;
  plan: Plan;
  is_active: boolean;
  init_date: string;
  expiration_date: string;
  days_left: number;
}

// Training types
export interface TrainingType {
  id: number;
  name: string;
  slug_name: string;
  is_group: boolean;
}

export interface Slot {
  id: number;
  date: string;
  hour_init: string;
  hour_end: string;
  max_places: number;
  available_places: number;
  training_type: TrainingType;
}

export interface Training {
  id: number;
  slot: Slot;
  training_type: TrainingType;
  status: string;
  is_today: boolean;
  can_cancel: boolean;
}

export interface CalendarDay {
  date: string;
  day_name: string;
  has_slots: boolean;
}

// Dashboard types
export interface WeeklyStats {
  total_sessions: number;
  total_hours: number;
  total_calories: number;
}

export interface Strike {
  current: number;
  best: number;
}

export interface DashboardData {
  membership: Membership | null;
  today_training: Training | null;
  weekly_stats: WeeklyStats;
  strike: Strike;
}
