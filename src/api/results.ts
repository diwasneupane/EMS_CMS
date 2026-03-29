import apiClient from '../lib/axios';
import type { Result, PaginatedResponse, PaginationParams } from '../types';

export const resultsApi = {
  getAll: async (params?: PaginationParams): Promise<PaginatedResponse<Result>> => {
    const { data } = await apiClient.get('/results', { params });
    return data;
  },

  getMyResults: async (params?: PaginationParams): Promise<PaginatedResponse<Result>> => {
    const { data } = await apiClient.get('/results/my-results', { params });
    return data;
  },

  getMyResultsBySemester: async (semesterId: string, params?: PaginationParams): Promise<PaginatedResponse<Result>> => {
    const { data } = await apiClient.get(`/results/my-results/semester/${semesterId}`, { params });
    return data;
  },

  getByCourseAndSemester: async (courseId: string, semesterId: string, params?: PaginationParams): Promise<PaginatedResponse<Result>> => {
    const { data } = await apiClient.get(`/results/course/${courseId}/semester/${semesterId}`, { params });
    return data;
  },

  getByStudent: async (studentId: string, params?: PaginationParams): Promise<PaginatedResponse<Result>> => {
    const { data } = await apiClient.get(`/results/student/${studentId}`, { params });
    return data;
  },

  getStudentGpa: async (studentId: string): Promise<{
    studentId: string;
    gpa: number;
    totalCredits: number;
    completedCourses: number;
  }> => {
    const { data } = await apiClient.get(`/results/student/${studentId}/gpa`);
    return data;
  },

  create: async (payload: {
    studentId: string;
    courseId: string;
    semesterId: string;
    enrollmentId?: string;
    academicMark: number;
    practicalMark: number;
    remarks?: string;
  }): Promise<Result> => {
    const { data } = await apiClient.post('/results', payload);
    return data;
  },

  update: async (id: string, payload: {
    academicMark?: number;
    practicalMark?: number;
    remarks?: string;
  }): Promise<Result> => {
    const { data } = await apiClient.patch(`/results/${id}`, payload);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/results/${id}`);
  },
};
