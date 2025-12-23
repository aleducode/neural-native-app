import api from './client';
import { AuthResponse, LoginRequest, RegisterRequest, User } from '../types';

export const authApi = {
  login: async (credentials: LoginRequest) => {
    return api.post<AuthResponse>('/auth/login/', credentials);
  },

  register: async (data: RegisterRequest) => {
    return api.post<AuthResponse>('/auth/register/', data);
  },

  logout: async () => {
    return api.post('/auth/logout/');
  },

  getMe: async () => {
    return api.get<User>('/auth/me/');
  },

  updateProfile: async (data: Partial<User>) => {
    return api.patch<User>('/auth/me/', data);
  },

  resetPassword: async (email: string) => {
    return api.post('/auth/password-reset/', { email });
  },
};

export default authApi;
