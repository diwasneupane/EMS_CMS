import apiClient from '../lib/axios';
import type { Inquiry, PaginatedResponse, PaginationParams } from '../types';

export const inquiriesApi = {
  getAll: async (params?: PaginationParams & {
    search?: string;
    program?: string;
    status?: string;
  }): Promise<PaginatedResponse<Inquiry>> => {
    const { data } = await apiClient.get('/inquiries', { params });
    return data;
  },

  getById: async (id: string): Promise<Inquiry> => {
    const { data } = await apiClient.get(`/inquiries/${id}`);
    return data;
  },

  updateStatus: async (id: string, status: string): Promise<Inquiry> => {
    const { data } = await apiClient.patch(`/inquiries/${id}/status`, { status });
    return data;
  },

  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/inquiries/${id}`);
  },
};
