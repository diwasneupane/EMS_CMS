import apiClient from '../lib/axios';
import type { User, Course } from '../types';

export const searchApi = {
  searchStudents: async (params: { q?: string; department?: string; program?: string }): Promise<User[]> => {
    const { data } = await apiClient.get('/search/students', { params });
    return data;
  },

  searchTeachers: async (params: { q?: string; department?: string }): Promise<User[]> => {
    const { data } = await apiClient.get('/search/teachers', { params });
    return data;
  },

  searchCourses: async (params: { q?: string; department?: string }): Promise<Course[]> => {
    const { data } = await apiClient.get('/search/courses', { params });
    return data;
  },
};
