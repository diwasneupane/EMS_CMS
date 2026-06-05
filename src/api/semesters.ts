import apiClient from '../lib/axios';
import type { Semester, SemesterCourses, SemesterGroup, PaginatedResponse, PaginationParams } from '../types';

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

  getGroupedByProgram: async (search?: string): Promise<SemesterGroup[]> => {
    const { data } = await apiClient.get('/semesters/by-program', {
      params: search ? { search } : undefined,
    });
    return data;
  },

  getCourses: async (id: string): Promise<SemesterCourses> => {
    const { data } = await apiClient.get(`/semesters/${id}/courses`);
    return data;
  },

  create: async (payload: {
    name: string;
    code: string;
    startDate: string;
    endDate: string;
    programId?: string;
    semesterNumber?: number;
  }): Promise<Semester> => {
    const { data } = await apiClient.post('/semesters', payload);
    return data;
  },

  update: async (id: string, payload: Partial<{
    name: string;
    code: string;
    startDate: string;
    endDate: string;
    programId: string;
    semesterNumber: number;
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

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/semesters/${id}`);
  },
};
