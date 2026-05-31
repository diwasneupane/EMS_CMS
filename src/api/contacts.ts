import apiClient from '../lib/axios';
import type { Contact, PaginatedResponse, PaginationParams } from '../types';

export const contactsApi = {
  getAll: async (params?: PaginationParams & {
    search?: string;
    status?: string;
  }): Promise<PaginatedResponse<Contact>> => {
    const { data } = await apiClient.get('/contacts', { params });
    return data;
  },

  getById: async (id: string): Promise<Contact> => {
    const { data } = await apiClient.get(`/contacts/${id}`);
    return data;
  },

  updateStatus: async (id: string, status: string): Promise<Contact> => {
    const { data } = await apiClient.patch(`/contacts/${id}/status`, { status });
    return data;
  },

  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/contacts/${id}`);
  },
};
