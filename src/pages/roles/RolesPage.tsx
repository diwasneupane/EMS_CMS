import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2, Shield, Users, ChevronDown, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { rolesApi } from '../../api/roles';
import { usersApi } from '../../api/users';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Modal, ConfirmDialog } from '../../components/ui/Modal';
import { Table } from '../../components/ui/Table';
import type { Column } from '../../components/ui/Table';
import { Card, CardHeader } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { formatDate, cn } from '../../lib/utils';
import { usePermission } from '../../hooks/usePermission';
import type { Role, Permission, RolePermission } from '../../types';

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(50),
  description: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

/** Derive a display label from a permission */
const permLabel = (p: Permission) => `${p.resource}:${p.action}`;

/** Group permissions by resource */
function groupByResource(permissions: Permission[]) {
  return permissions.reduce<Record<string, Permission[]>>((acc, p) => {
    if (!acc[p.resource]) acc[p.resource] = [];
    acc[p.resource].push(p);
    return acc;
  }, {});
}

const RESOURCE_COLORS: Record<string, string> = {
  users: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  departments: 'bg-blue-50 text-blue-700 border-blue-200',
  programs: 'bg-purple-50 text-purple-700 border-purple-200',
  courses: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  semesters: 'bg-amber-50 text-amber-700 border-amber-200',
  schedules: 'bg-rose-50 text-rose-700 border-rose-200',
  enrollments: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  attendance: 'bg-teal-50 text-teal-700 border-teal-200',
  results: 'bg-orange-50 text-orange-700 border-orange-200',
  announcements: 'bg-pink-50 text-pink-700 border-pink-200',
  analytics: 'bg-violet-50 text-violet-700 border-violet-200',
  reports: 'bg-slate-50 text-slate-700 border-slate-200',
  exports: 'bg-green-50 text-green-700 border-green-200',
  search: 'bg-sky-50 text-sky-700 border-sky-200',
};

export default function RolesPage() {
  const queryClient = useQueryClient();
  const { can } = usePermission();
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<Role | null>(null);
  const [assignModal, setAssignModal] = useState(false);
  const [assignRoleId, setAssignRoleId] = useState('');
  const [assignUserId, setAssignUserId] = useState('');
  const [selectedPermIds, setSelectedPermIds] = useState<string[]>([]);
  const [expandedRole, setExpandedRole] = useState<string | null>(null);

  // Load roles
  const { data: roles = [], isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: rolesApi.getAll,
  });

  // Load all available permissions from API
  const { data: allPermissions = [] } = useQuery({
    queryKey: ['permissions'],
    queryFn: rolesApi.getAllPermissions,
  });

  // Load users for assign modal
  const { data: usersData } = useQuery({
    queryKey: ['users-all'],
    queryFn: () => usersApi.getAll({ limit: 100 }),
    enabled: assignModal,
  });

  const grouped = groupByResource(allPermissions);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const createMutation = useMutation({
    mutationFn: (payload: { name: string; description?: string }) => rolesApi.create(payload),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['roles'] }); toast.success('Role created'); closeModal(); },
    onError: (err: unknown) => { const e = err as { response?: { data?: { message?: string } } }; toast.error(e?.response?.data?.message || 'Failed to create role'); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; description?: string } }) => rolesApi.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['roles'] }); toast.success('Role updated'); closeModal(); },
    onError: (err: unknown) => { const e = err as { response?: { data?: { message?: string } } }; toast.error(e?.response?.data?.message || 'Failed to update role'); },
  });

  const deleteMutation = useMutation({
    mutationFn: rolesApi.delete,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['roles'] }); toast.success('Role deleted'); setDeleteId(null); },
    onError: (err: unknown) => { const e = err as { response?: { data?: { message?: string } } }; toast.error(e?.response?.data?.message || 'Failed to delete role'); },
  });

  const assignPermsMutation = useMutation({
    mutationFn: ({ roleId, permissionIds }: { roleId: string; permissionIds: string[] }) =>
      rolesApi.assignPermissionsToRole(roleId, permissionIds),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['roles'] }); toast.success('Permissions updated'); closeModal(); },
    onError: (err: unknown) => { const e = err as { response?: { data?: { message?: string } } }; toast.error(e?.response?.data?.message || 'Failed to update permissions'); },
  });

  const assignRoleMutation = useMutation({
    mutationFn: ({ userId, roleId }: { userId: string; roleId: string }) => usersApi.assignRole(userId, roleId),
    onSuccess: () => { toast.success('Role assigned to user'); setAssignModal(false); setAssignRoleId(''); setAssignUserId(''); },
    onError: (err: unknown) => { const e = err as { response?: { data?: { message?: string } } }; toast.error(e?.response?.data?.message || 'Failed to assign role'); },
  });

  const openCreate = () => {
    setEditItem(null);
    setSelectedPermIds([]);
    reset({ name: '', description: '' });
    setModalOpen(true);
  };

  const openEdit = (item: Role) => {
    setEditItem(item);
    const currentPermIds = (item.rolePermissions ?? []).map((rp) => rp.permissionId);
    setSelectedPermIds(currentPermIds);
    reset({ name: item.name, description: item.description || '' });
    setModalOpen(true);
  };

  const closeModal = () => { setModalOpen(false); setEditItem(null); setSelectedPermIds([]); reset(); };

  const togglePerm = (permId: string) => {
    setSelectedPermIds((prev) =>
      prev.includes(permId) ? prev.filter((id) => id !== permId) : [...prev, permId],
    );
  };

  const toggleGroup = (perms: Permission[]) => {
    const ids = perms.map((p) => p.id);
    const allSelected = ids.every((id) => selectedPermIds.includes(id));
    if (allSelected) {
      setSelectedPermIds((prev) => prev.filter((id) => !ids.includes(id)));
    } else {
      setSelectedPermIds((prev) => Array.from(new Set([...prev, ...ids])));
    }
  };

  const onSubmit = (formData: FormData) => {
    const payload = { name: formData.name, description: formData.description };
    if (editItem) {
      // Update name/description first, then sync permissions
      updateMutation.mutate(
        { id: editItem.id, data: payload },
        {
          onSuccess: () => {
            if (selectedPermIds.length > 0) {
              assignPermsMutation.mutate({ roleId: editItem.id, permissionIds: selectedPermIds });
            }
          },
        },
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: (newRole) => {
          if (selectedPermIds.length > 0) {
            assignPermsMutation.mutate({ roleId: newRole.id, permissionIds: selectedPermIds });
          }
        },
      });
    }
  };

  const columns: Column<Role>[] = [
    {
      header: 'Role', accessor: 'name', render: (_, row) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
            <Shield className="w-4 h-4 text-purple-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800 capitalize">{row.name}</p>
            <p className="text-xs text-slate-500">{row.description ?? 'No description'}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Permissions', accessor: 'rolePermissions', render: (_, row) => {
        const rps: RolePermission[] = row.rolePermissions ?? [];
        const shown = rps.slice(0, 3);
        return (
          <div className="flex flex-wrap gap-1">
            {shown.map((rp) => {
              const colorClass = RESOURCE_COLORS[rp.permission.resource] ?? 'bg-slate-50 text-slate-600 border-slate-200';
              return (
                <span key={rp.id} className={cn('text-xs px-1.5 py-0.5 rounded border font-mono', colorClass)}>
                  {rp.permission.resource}:{rp.permission.action}
                </span>
              );
            })}
            {rps.length > 3 && (
              <span className="text-xs px-1.5 py-0.5 rounded border bg-slate-50 text-slate-500 border-slate-200">
                +{rps.length - 3} more
              </span>
            )}
            {rps.length === 0 && <span className="text-xs text-slate-400">No permissions</span>}
          </div>
        );
      },
    },
    {
      header: 'Total Perms', accessor: 'id', render: (_, row) => (
        <span className="text-sm font-semibold text-slate-700">{(row.rolePermissions ?? []).length}</span>
      ),
    },
    {
      header: 'Created', accessor: 'createdAt', render: (_, row) => (
        <span className="text-xs text-slate-500">{formatDate(row.createdAt)}</span>
      ),
    },
    {
      header: 'Actions', accessor: 'updatedAt', render: (_, row) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => setExpandedRole(expandedRole === row.id ? null : row.id)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            title="View all permissions"
          >
            <ChevronDown className={cn('w-4 h-4 transition-transform', expandedRole === row.id && 'rotate-180')} />
          </button>
          {can('roles', 'update') && (
            <button onClick={() => openEdit(row)} className="p-1.5 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50 transition-colors">
              <Pencil className="w-4 h-4" />
            </button>
          )}
          {can('roles', 'delete') && (
            <button onClick={() => setDeleteId(row.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Roles & Permissions"
        description="Manage system roles and their permission sets"
        action={
          (can('roles', 'create') || can('roles', 'update')) ? (
            <div className="flex gap-2">
              {can('roles', 'update') && (
                <Button variant="secondary" leftIcon={<Users className="w-4 h-4" />} onClick={() => setAssignModal(true)}>
                  Assign Role
                </Button>
              )}
              {can('roles', 'create') && (
                <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={openCreate}>
                  Create Role
                </Button>
              )}
            </div>
          ) : undefined
        }
      />

      <Card padding="none">
        {isLoading ? (
          <div className="flex items-center justify-center h-40"><Spinner /></div>
        ) : (
          <div>
            <Table
              columns={columns}
              data={roles}
              loading={false}
              emptyTitle="No roles found"
              emptyMessage="Create your first role to manage permissions."
              keyExtractor={(row) => row.id}
            />
            {/* Expandable permission detail rows */}
            {roles.map((role) =>
              expandedRole === role.id ? (
                <div key={`expand-${role.id}`} className="border-t border-slate-100 bg-slate-50 px-6 py-4">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                    All permissions for <span className="capitalize text-slate-700">{role.name}</span> ({(role.rolePermissions ?? []).length})
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(groupByResource((role.rolePermissions ?? []).map((rp) => rp.permission))).map(([resource, perms]) => (
                      <div key={resource} className="flex items-center gap-1 flex-wrap">
                        <span className="text-xs font-semibold text-slate-400 mr-0.5">{resource}:</span>
                        {perms.map((p) => {
                          const colorClass = RESOURCE_COLORS[p.resource] ?? 'bg-slate-50 text-slate-600 border-slate-200';
                          return (
                            <span key={p.id} className={cn('text-xs px-1.5 py-0.5 rounded border', colorClass)}>
                              {p.action}
                            </span>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null,
            )}
          </div>
        )}
      </Card>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editItem ? `Edit Role: ${editItem.name}` : 'Create Role'}
        onSubmit={handleSubmit(onSubmit)}
        isSubmitting={createMutation.isPending || updateMutation.isPending || assignPermsMutation.isPending}
        submitLabel={editItem ? 'Save Changes' : 'Create Role'}
        size="xl"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Role Name" placeholder="e.g., moderator" error={errors.name?.message} required {...register('name')} />
            <Textarea label="Description" placeholder="Brief description…" rows={1} {...register('description')} />
          </div>

          {/* Permission picker — loaded from API */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-slate-700">Permissions</p>
              <span className="text-xs text-slate-400">{selectedPermIds.length} / {allPermissions.length} selected</span>
            </div>
            {allPermissions.length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">Loading permissions…</p>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                {Object.entries(grouped).map(([resource, perms]) => {
                  const allSelected = perms.every((p) => selectedPermIds.includes(p.id));
                  const colorClass = RESOURCE_COLORS[resource] ?? 'bg-slate-50 text-slate-600';
                  return (
                    <div key={resource} className="border-b border-slate-100 last:border-0">
                      <div className="px-4 py-2 bg-slate-50 flex items-center justify-between">
                        <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full capitalize', colorClass)}>
                          {resource}
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleGroup(perms)}
                          className="text-xs text-primary-600 hover:text-primary-800 font-medium"
                        >
                          {allSelected ? 'Deselect all' : 'Select all'}
                        </button>
                      </div>
                      <div className="px-4 py-2 flex flex-wrap gap-2">
                        {perms.map((perm) => (
                          <label key={perm.id} className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedPermIds.includes(perm.id)}
                              onChange={() => togglePerm(perm.id)}
                              className="rounded border-slate-300 text-primary-600 focus:ring-primary-500 w-3.5 h-3.5"
                            />
                            <span className="text-xs text-slate-600">{perm.action}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </form>
      </Modal>

      {/* Assign Role to User Modal */}
      <Modal
        isOpen={assignModal}
        onClose={() => { setAssignModal(false); setAssignRoleId(''); setAssignUserId(''); }}
        title="Assign Role to User"
        onSubmit={() => {
          if (!assignUserId || !assignRoleId) { toast.error('Please select both user and role'); return; }
          assignRoleMutation.mutate({ userId: assignUserId, roleId: assignRoleId });
        }}
        isSubmitting={assignRoleMutation.isPending}
        submitLabel="Assign Role"
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">User</label>
            <select
              value={assignUserId}
              onChange={(e) => setAssignUserId(e.target.value)}
              className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
            >
              <option value="">Select user…</option>
              {(usersData?.items ?? []).map((u) => (
                <option key={u.id} value={u.id}>{u.firstName} {u.lastName} ({u.email})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Role</label>
            <select
              value={assignRoleId}
              onChange={(e) => setAssignRoleId(e.target.value)}
              className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
            >
              <option value="">Select role…</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title="Delete Role"
        message="Are you sure you want to delete this role? Users with this role will lose their permissions."
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
