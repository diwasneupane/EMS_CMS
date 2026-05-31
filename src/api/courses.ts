import apiClient from '../lib/axios';
import type { Course, PaginatedResponse, PaginationParams, ProgramCurriculum } from '../types';

export const coursesApi = {
  getAll: async (params?: PaginationParams & { search?: string; departmentId?: string }): Promise<PaginatedResponse<Course>> => {
    const { data } = await apiClient.get('/courses', { params });
    return data;
  },

  getByDepartment: async (departmentId: string, params?: PaginationParams): Promise<PaginatedResponse<Course>> => {
    const { data } = await apiClient.get(`/courses/department/${departmentId}`, { params });
    return data;
  },

  getByProgram: async (programId: string): Promise<ProgramCurriculum> => {
    const { data } = await apiClient.get(`/courses/program/${programId}`);
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
    programId?: string;
    semesterNumber?: number;
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
    programId: string;
    semesterNumber: number;
  }>): Promise<Course> => {
    const { data } = await apiClient.patch(`/courses/${id}`, payload);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/courses/${id}`);
  },
};
