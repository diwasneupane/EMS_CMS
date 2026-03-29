import apiClient from '../lib/axios';
import type { Department, PaginatedResponse, PaginationParams } from '../types';

export const departmentsApi = {
  getAll: async (params?: PaginationParams): Promise<PaginatedResponse<Department>> => {
    const { data } = await apiClient.get('/departments', { params });
    return data;
  },

  getById: async (id: string): Promise<Department> => {
    const { data } = await apiClient.get(`/departments/${id}`);
    return data;
  },

  create: async (payload: {
    name: string;
    code: string;
    description?: string;
    headTeacherId?: string;
  }): Promise<Department> => {
    const { data } = await apiClient.post('/departments', payload);
    return data;
  },

  update: async (id: string, payload: {
    name?: string;
    code?: string;
    description?: string;
  }): Promise<Department> => {
    const { data } = await apiClient.patch(`/departments/${id}`, payload);
    return data;
  },

  assignHead: async (id: string, headTeacherId: string): Promise<Department> => {
    const { data } = await apiClient.patch(`/departments/${id}/head`, { headTeacherId });
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/departments/${id}`);
  },
};
