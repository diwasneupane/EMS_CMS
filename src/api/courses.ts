import apiClient from '../lib/axios';
import type { Course, PaginatedResponse, PaginationParams } from '../types';

export const coursesApi = {
  getAll: async (params?: PaginationParams): Promise<PaginatedResponse<Course>> => {
    const { data } = await apiClient.get('/courses', { params });
    return data;
  },

  getByDepartment: async (departmentId: string, params?: PaginationParams): Promise<PaginatedResponse<Course>> => {
    const { data } = await apiClient.get(`/courses/department/${departmentId}`, { params });
    return data;
  },

  getById: async (id: string): Promise<Course> => {
    const { data } = await apiClient.get(`/courses/${id}`);
    return data;
  },

  create: async (payload: {
    departmentId: string;
    code: string;
    name: string;
    description?: string;
    creditHour: number;
  }): Promise<Course> => {
    const { data } = await apiClient.post('/courses', payload);
    return data;
  },

  update: async (id: string, payload: Partial<{
    departmentId: string;
    code: string;
    name: string;
    description: string;
    creditHour: number;
  }>): Promise<Course> => {
    const { data } = await apiClient.patch(`/courses/${id}`, payload);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/courses/${id}`);
  },
};
