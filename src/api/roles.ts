import apiClient from '../lib/axios';
import type { Role, Permission } from '../types';

export const rolesApi = {
  getAll: async (): Promise<Role[]> => {
    const { data } = await apiClient.get('/roles');
    return data;
  },

  getById: async (id: string): Promise<Role> => {
    const { data } = await apiClient.get(`/roles/${id}`);
    return data;
  },

  create: async (payload: { name: string; description?: string }): Promise<Role> => {
    const { data } = await apiClient.post('/roles', payload);
    return data;
  },

  update: async (id: string, payload: { name?: string; description?: string }): Promise<Role> => {
    const { data } = await apiClient.patch(`/roles/${id}`, payload);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/roles/${id}`);
  },

  // Permissions — actual shape: { resource, action }
  getAllPermissions: async (): Promise<Permission[]> => {
    const { data } = await apiClient.get('/permissions');
    return data;
  },

  createPermission: async (payload: {
    resource: string;
    action: string;
    description?: string;
  }): Promise<Permission> => {
    const { data } = await apiClient.post('/permissions', payload);
    return data;
  },

  deletePermission: async (permId: string): Promise<void> => {
    await apiClient.delete(`/permissions/${permId}`);
  },

  assignPermissionsToRole: async (roleId: string, permissionIds: string[]): Promise<void> => {
    await apiClient.post(`/roles/${roleId}/permissions`, { permissionIds });
  },

  removePermissionFromRole: async (roleId: string, permId: string): Promise<void> => {
    await apiClient.delete(`/roles/${roleId}/permissions/${permId}`);
  },
};
