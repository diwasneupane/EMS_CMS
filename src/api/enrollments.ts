import apiClient from '../lib/axios';
import type { Enrollment, PaginatedResponse, PaginationParams } from '../types';

export const enrollmentsApi = {
  getAll: async (params?: PaginationParams & { search?: string; courseId?: string; semesterId?: string }): Promise<PaginatedResponse<Enrollment>> => {
    const { data } = await apiClient.get('/enrollments', { params });
    return data;
  },

  getMyEnrollments: async (params?: PaginationParams): Promise<PaginatedResponse<Enrollment>> => {
    const { data } = await apiClient.get('/enrollments/my-enrollments', { params });
    return data;
  },

  getByCourseAndSemester: async (courseId: string, semesterId: string, params?: PaginationParams): Promise<PaginatedResponse<Enrollment>> => {
    const { data } = await apiClient.get(`/enrollments/course/${courseId}/semester/${semesterId}`, { params });
    return data;
  },

  getByStudent: async (studentId: string, params?: PaginationParams): Promise<PaginatedResponse<Enrollment>> => {
    const { data } = await apiClient.get(`/enrollments/student/${studentId}`, { params });
    return data;
  },

  getById: async (id: string): Promise<Enrollment> => {
    const { data } = await apiClient.get(`/enrollments/${id}`);
    return data;
  },

  // Enrolls the currently logged-in student
  create: async (payload: { courseId: string; semesterId: string }): Promise<Enrollment> => {
    const { data } = await apiClient.post('/enrollments', payload);
    return data;
  },

  // Admin/Teacher bulk enroll multiple students
  bulkEnroll: async (payload: {
    studentIds: string[];
    courseId: string;
    semesterId: string;
  }): Promise<Enrollment[]> => {
    const { data } = await apiClient.post('/enrollments/bulk', payload);
    return data;
  },

  drop: async (id: string): Promise<Enrollment> => {
    const { data } = await apiClient.patch(`/enrollments/${id}/drop`);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/enrollments/${id}`);
  },
};
