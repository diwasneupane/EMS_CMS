import apiClient from '../lib/axios';
import type { ClassSchedule, PaginatedResponse, PaginationParams } from '../types';

export const classSchedulesApi = {
  getAll: async (params?: PaginationParams): Promise<PaginatedResponse<ClassSchedule>> => {
    const { data } = await apiClient.get('/class-schedules', { params });
    return data;
  },

  getMySchedule: async (params?: PaginationParams): Promise<PaginatedResponse<ClassSchedule>> => {
    const { data } = await apiClient.get('/class-schedules/my-schedule', { params });
    return data;
  },

  getBySemester: async (semesterId: string, params?: PaginationParams): Promise<PaginatedResponse<ClassSchedule>> => {
    const { data } = await apiClient.get(`/class-schedules/semester/${semesterId}`, { params });
    return data;
  },

  getByTeacher: async (teacherId: string, params?: PaginationParams): Promise<PaginatedResponse<ClassSchedule>> => {
    const { data } = await apiClient.get(`/class-schedules/teacher/${teacherId}`, { params });
    return data;
  },

  getByCourse: async (courseId: string, params?: PaginationParams): Promise<PaginatedResponse<ClassSchedule>> => {
    const { data } = await apiClient.get(`/class-schedules/course/${courseId}`, { params });
    return data;
  },

  getById: async (id: string): Promise<ClassSchedule> => {
    const { data } = await apiClient.get(`/class-schedules/${id}`);
    return data;
  },

  create: async (payload: {
    courseId: string;
    teacherId: string;
    semesterId: string;
    dayOfWeek: string;
    startTime: string;
    endTime: string;
    roomNumber?: string;
    building?: string;
  }): Promise<ClassSchedule> => {
    const { data } = await apiClient.post('/class-schedules', payload);
    return data;
  },

  update: async (id: string, payload: Partial<{
    courseId: string;
    teacherId: string;
    semesterId: string;
    dayOfWeek: string;
    startTime: string;
    endTime: string;
    roomNumber: string;
    building: string;
  }>): Promise<ClassSchedule> => {
    const { data } = await apiClient.patch(`/class-schedules/${id}`, payload);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/class-schedules/${id}`);
  },
};
