import apiClient from '../lib/axios';
import type { User, PaginatedResponse, UserFilterParams } from '../types';

export interface CreateUserPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other';
  address?: string;
  departmentId?: string;
  programId?: string;
  guardianName?: string;
  guardianPhone?: string;
  guardianEmail?: string;
  bloodGroup?: string;
}

export const usersApi = {
  getAll: async (params?: UserFilterParams): Promise<PaginatedResponse<User>> => {
    const { data } = await apiClient.get('/users', { params });
    return data;
  },

  getStudents: async (params?: UserFilterParams): Promise<PaginatedResponse<User>> => {
    const { data } = await apiClient.get('/users/students', { params });
    return data;
  },

  getTeachers: async (params?: UserFilterParams): Promise<PaginatedResponse<User>> => {
    const { data } = await apiClient.get('/users/teachers', { params });
    return data;
  },

  getPendingApprovals: async (params?: UserFilterParams): Promise<PaginatedResponse<User>> => {
    const { data } = await apiClient.get('/users/pending', { params });
    return data;
  },

  getById: async (id: string): Promise<User> => {
    const { data } = await apiClient.get(`/users/${id}`);
    return data;
  },

  getProfile: async (): Promise<User> => {
    const { data } = await apiClient.get('/users/profile');
    return data;
  },

  createAdmin: async (payload: CreateUserPayload): Promise<User> => {
    const { data } = await apiClient.post('/users/admin', payload);
    return data;
  },

  createTeacher: async (payload: CreateUserPayload): Promise<User> => {
    const { data } = await apiClient.post('/users/teacher', payload);
    return data;
  },

  createStudent: async (payload: CreateUserPayload): Promise<User> => {
    const { data } = await apiClient.post('/users/student', payload);
    return data;
  },

  update: async (id: string, payload: Partial<CreateUserPayload>): Promise<User> => {
    const { data } = await apiClient.patch(`/users/${id}`, payload);
    return data;
  },

  updateProfile: async (payload: Partial<CreateUserPayload>): Promise<User> => {
    const { data } = await apiClient.patch('/users/profile', payload);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/users/${id}`);
  },

  approve: async (id: string): Promise<User> => {
    const { data } = await apiClient.patch(`/users/${id}/approve`);
    return data;
  },

  assignRole: async (userId: string, roleId: string): Promise<void> => {
    await apiClient.post(`/users/${userId}/roles`, { roleId });
  },

  removeRole: async (userId: string, roleId: string): Promise<void> => {
    await apiClient.delete(`/users/${userId}/roles/${roleId}`);
  },
};
