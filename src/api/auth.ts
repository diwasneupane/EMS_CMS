import apiClient from '../lib/axios';
import type { AuthResponse, LoginCredentials } from '../types';

export const authApi = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const { data } = await apiClient.post<{ data: AuthResponse }>('/auth/login', credentials);
    return data as unknown as AuthResponse;
  },

  register: async (payload: Record<string, unknown>) => {
    const { data } = await apiClient.post('/auth/register', payload);
    return data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout');
  },

  getMe: async () => {
    const { data } = await apiClient.get('/auth/me');
    return data;
  },

  changePassword: async (payload: { currentPassword: string; newPassword: string }) => {
    const { data } = await apiClient.post('/auth/change-password', payload);
    return data;
  },

  refreshToken: async (refreshToken: string) => {
    // refreshToken refresh: send refresh token as Bearer, returns { accessToken }
    const { data } = await apiClient.post(
      '/auth/refresh',
      { refreshToken },
      { headers: { Authorization: `Bearer ${refreshToken}` } },
    );
    return data as { accessToken: string };
  },
};
