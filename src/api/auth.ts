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

  uploadPhoto: async (imageUri: string, fileName?: string, mimeType?: string) => {
    const name = fileName || imageUri.split('/').pop() || `photo_${Date.now()}.jpg`;
    const type = mimeType || 'image/jpeg';

    return api.uploadFile<User>('/auth/me/', imageUri, name, type);
  },

  /**
   * Asks for a recovery code. The answer is deliberately the same whether or
   * not the address is registered — a reset form that says "no such account"
   * is a free way to find out who is a member — and the same again when the
   * rate limiter steps in, since a different answer there would enumerate too.
   *
   * The older /password-reset/ still mails a link, on purpose: the builds
   * already in closed testing show "check your mail and tap the link", and a
   * code would leave those testers holding a number with nowhere to type it.
   * That route goes away once this build has replaced them everywhere.
   */
  requestResetCode: async (email: string) => {
    return api.post('/auth/password-reset/code/', { email });
  },

  /**
   * Exchanges the emailed code for a short-lived token that authorises exactly
   * one password change. The code itself never travels again after this.
   */
  verifyResetCode: async (email: string, code: string) => {
    return api.post<ResetVerifyResponse>('/auth/password-reset/verify/', { email, code });
  },

  /** Spends the token from `verifyResetCode` on the new password. */
  confirmPasswordReset: async (resetToken: string, newPassword: string) => {
    return api.post('/auth/password-reset/confirm/', {
      reset_token: resetToken,
      new_password: newPassword,
    });
  },
};

export interface ResetVerifyResponse {
  reset_token: string;
}

export default authApi;
