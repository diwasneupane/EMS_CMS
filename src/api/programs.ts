import apiClient from '../lib/axios';
import type { Program, PaginatedResponse, PaginationParams } from '../types';

export const programsApi = {
  getAll: async (params?: PaginationParams): Promise<PaginatedResponse<Program>> => {
    const { data } = await apiClient.get('/programs', { params });
    return data;
  },

  getByDepartment: async (departmentId: string, params?: PaginationParams): Promise<PaginatedResponse<Program>> => {
    const { data } = await apiClient.get(`/programs/department/${departmentId}`, { params });
    return data;
  },

  getById: async (id: string): Promise<Program> => {
    const { data } = await apiClient.get(`/programs/${id}`);
    return data;
  },

  create: async (payload: {
    departmentId: string;
    name: string;
    code: string;
    description?: string;
    durationYears: number;
    totalCreditsRequired: number;
  }): Promise<Program> => {
    const { data } = await apiClient.post('/programs', payload);
    return data;
  },

  update: async (id: string, payload: Partial<{
    departmentId: string;
    name: string;
    code: string;
    description: string;
    durationYears: number;
    totalCreditsRequired: number;
  }>): Promise<Program> => {
    const { data } = await apiClient.patch(`/programs/${id}`, payload);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/programs/${id}`);
  },
};
