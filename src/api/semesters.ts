import apiClient from '../lib/axios';
import type { Semester, PaginatedResponse, PaginationParams } from '../types';

export const semestersApi = {
  getAll: async (params?: PaginationParams & { search?: string }): Promise<PaginatedResponse<Semester>> => {
    const { data } = await apiClient.get('/semesters', { params });
    return data;
  },

  getCurrent: async (): Promise<Semester> => {
    const { data } = await apiClient.get('/semesters/current');
    return data;
  },

  getById: async (id: string): Promise<Semester> => {
    const { data } = await apiClient.get(`/semesters/${id}`);
    return data;
  },

  create: async (payload: {
    name: string;
    code: string;
    startDate: string;
    endDate: string;
  }): Promise<Semester> => {
    const { data } = await apiClient.post('/semesters', payload);
    return data;
  },

  update: async (id: string, payload: Partial<{
    name: string;
    code: string;
    startDate: string;
    endDate: string;
  }>): Promise<Semester> => {
    const { data } = await apiClient.patch(`/semesters/${id}`, payload);
    return data;
  },

  setCurrent: async (id: string): Promise<Semester> => {
    const { data } = await apiClient.patch(`/semesters/${id}/set-current`);
    return data;
  },

  complete: async (id: string): Promise<Semester> => {
    const { data } = await apiClient.patch(`/semesters/${id}/complete`);
    return data;
  },
};
