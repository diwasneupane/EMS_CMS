import apiClient from '../lib/axios';
import type { Announcement, PaginatedResponse, PaginationParams } from '../types';

export const announcementsApi = {
  getAll: async (params?: PaginationParams & { search?: string; priority?: string; targetRole?: string }): Promise<PaginatedResponse<Announcement>> => {
    const { data } = await apiClient.get('/announcements', { params });
    return data;
  },

  getMyAnnouncements: async (params?: PaginationParams): Promise<PaginatedResponse<Announcement>> => {
    const { data } = await apiClient.get('/announcements/my-announcements', { params });
    return data;
  },

  getById: async (id: string): Promise<Announcement> => {
    const { data } = await apiClient.get(`/announcements/${id}`);
    return data;
  },

  create: async (payload: {
    title: string;
    content: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    targetRole?: 'all' | 'student' | 'teacher' | 'admin';
    targetSemesterId?: string;
    targetCourseId?: string;
    targetDepartmentId?: string;
    expiresAt?: string;
  }): Promise<Announcement> => {
    const { data } = await apiClient.post('/announcements', payload);
    return data;
  },

  update: async (id: string, payload: Partial<{
    title: string;
    content: string;
    priority: string;
    targetRole: string;
    targetSemesterId: string;
    targetCourseId: string;
    targetDepartmentId: string;
    expiresAt: string;
  }>): Promise<Announcement> => {
    const { data } = await apiClient.patch(`/announcements/${id}`, payload);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/announcements/${id}`);
  },

  publish: async (id: string): Promise<Announcement> => {
    const { data } = await apiClient.patch(`/announcements/${id}/publish`);
    return data;
  },

  unpublish: async (id: string): Promise<Announcement> => {
    const { data } = await apiClient.patch(`/announcements/${id}/unpublish`);
    return data;
  },
};
