import apiClient from '../lib/axios';
import type { CourseAssignment, PaginatedResponse, PaginationParams } from '../types';

export const courseAssignmentsApi = {
  getAll: async (params?: PaginationParams): Promise<PaginatedResponse<CourseAssignment>> => {
    const { data } = await apiClient.get('/course-assignments', { params });
    return data;
  },

  getMyCourses: async (params?: PaginationParams): Promise<PaginatedResponse<CourseAssignment>> => {
    const { data } = await apiClient.get('/course-assignments/my-courses', { params });
    return data;
  },

  getBySemester: async (semesterId: string, params?: PaginationParams): Promise<PaginatedResponse<CourseAssignment>> => {
    const { data } = await apiClient.get(`/course-assignments/semester/${semesterId}`, { params });
    return data;
  },

  getByTeacher: async (teacherId: string, params?: PaginationParams): Promise<PaginatedResponse<CourseAssignment>> => {
    const { data } = await apiClient.get(`/course-assignments/teacher/${teacherId}`, { params });
    return data;
  },

  create: async (payload: {
    courseId: string;
    teacherId: string;
    semesterId: string;
  }): Promise<CourseAssignment> => {
    const { data } = await apiClient.post('/course-assignments', payload);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/course-assignments/${id}`);
  },
};
