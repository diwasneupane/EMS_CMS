import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { usersApi } from '../../api/users';
import type { CreateUserPayload } from '../../api/users';
import { departmentsApi } from '../../api/departments';
import { programsApi } from '../../api/programs';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal, ConfirmDialog } from '../../components/ui/Modal';
import { Table } from '../../components/ui/Table';
import type { Column } from '../../components/ui/Table';
import { Pagination } from '../../components/ui/Pagination';
import { SearchInput } from '../../components/ui/SearchInput';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { useDebounce } from '../../hooks/useDebounce';
import { usePermission } from '../../hooks/usePermission';
import { formatDate, getInitials } from '../../lib/utils';
import type { User } from '../../types';

const schema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Min 6 characters').optional().or(z.literal('')),
  roleType: z.enum(['admin', 'teacher', 'student']),
  phoneNumber: z.string().optional(),
  departmentId: z.string().optional(),
  programId: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function UsersPage() {
  const queryClient = useQueryClient();
  const { can } = usePermission();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<User | null>(null);
  const debouncedSearch = useDebounce(search);

  const { data, isLoading } = useQuery({
    queryKey: ['users', page, debouncedSearch],
    queryFn: () => usersApi.getAll({ page, limit: 10, search: debouncedSearch }),
  });

  const { data: deptData } = useQuery({
    queryKey: ['departments-all'],
    queryFn: () => departmentsApi.getAll({ limit: 100 }),
  });

  const { data: programData } = useQuery({
    queryKey: ['programs-all'],
    queryFn: () => programsApi.getAll({ limit: 100 }),
  });

  const departmentOptions = (deptData?.items ?? []).map((d) => ({ value: d.id, label: d.name }));
  const programOptions = (programData?.items ?? []).map((p) => ({ value: p.id, label: `${p.code} – ${p.name}` }));

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const selectedRole = watch('roleType');

  const createMutation = useMutation({
    mutationFn: (payload: { roleType: 'admin' | 'teacher' | 'student' } & CreateUserPayload) => {
      const { roleType, ...rest } = payload;
      if (roleType === 'admin') return usersApi.createAdmin(rest);
      if (roleType === 'student') return usersApi.createStudent(rest);
      return usersApi.createTeacher(rest);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User created successfully');
      closeModal();
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message || 'Failed to create user');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateUserPayload> }) => usersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User updated');
      closeModal();
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message || 'Failed to update user');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: usersApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User deleted');
      setDeleteId(null);
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message || 'Failed to delete user');
    },
  });

  const openCreate = () => {
    setEditItem(null);
    reset({ firstName: '', lastName: '', email: '', password: '', roleType: 'admin', phoneNumber: '', departmentId: '', programId: '' });
    setModalOpen(true);
  };

  const openEdit = (item: User) => {
    setEditItem(item);
    const roles = item.userRoles?.map((ur) => ur.role.name) ?? [];
    const roleType = roles.includes('teacher') ? 'teacher' : 'admin';
    reset({
      firstName: item.firstName,
      lastName: item.lastName,
      email: item.email,
      password: '',
      roleType,
      phoneNumber: item.phoneNumber || '',
      departmentId: item.departmentId || '',
      programId: item.programId || '',
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditItem(null);
    reset();
  };

  const onSubmit = (formData: FormData) => {
    const { roleType, ...rest } = formData;
    const payload = { ...rest, password: rest.password || '' };
    if (!payload.password) {
      const { password: _pw, ...withoutPassword } = payload;
      if (editItem) {
        updateMutation.mutate({ id: editItem.id, data: withoutPassword });
      } else {
        toast.error('Password is required for new users');
      }
    } else {
      if (editItem) {
        updateMutation.mutate({ id: editItem.id, data: payload });
      } else {
        createMutation.mutate({ roleType, ...payload });
      }
    }
  };

  const getUserRoleName = (user: User): string => {
    const roles = user.userRoles?.map((ur) => ur.role.name) ?? [];
    if (roles.length > 0) return roles[0];
    return 'user';
  };

  const roleVariant = (role: string) => {
    if (role === 'admin') return 'error';
    if (role === 'teacher') return 'info';
    if (role === 'student') return 'success';
    return 'default';
  };

  const columns: Column<User>[] = [
    {
      header: 'User', accessor: 'firstName', render: (_, row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
            {getInitials(row.firstName, row.lastName)}
          </div>
          <div>
            <p className="text-sm font-medium text-slate-800">{row.firstName} {row.lastName}</p>
            <p className="text-xs text-slate-500">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Role', accessor: 'userRoles', render: (_, row) => {
        const role = getUserRoleName(row);
        return <Badge variant={roleVariant(role) as 'error' | 'info' | 'default'}>{role}</Badge>;
      },
    },
    {
      header: 'Department', accessor: 'department', render: (_, row) => (
        <span className="text-sm text-slate-600">{row.department?.name ?? '-'}</span>
      ),
    },
    {
      header: 'Status', accessor: 'isApproved', render: (_, row) => (
        <Badge variant={row.isApproved ? 'success' : 'warning'}>{row.isApproved ? 'Approved' : 'Pending'}</Badge>
      ),
    },
    {
      header: 'Joined', accessor: 'createdAt', render: (_, row) => (
        <span className="text-sm text-slate-500">{formatDate(row.createdAt)}</span>
      ),
    },
    ...(can('users', 'update') || can('users', 'delete') ? [{
      header: 'Actions',
      accessor: 'id' as keyof User,
      render: (_: unknown, row: User) => (
        <div className="flex items-center gap-1">
          {can('users', 'update') && (
            <button onClick={() => openEdit(row)} className="p-1.5 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50 transition-colors">
              <Pencil className="w-4 h-4" />
            </button>
          )}
          {can('users', 'delete') && (
            <button onClick={() => setDeleteId(row.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    }] : []),
  ];

  return (
    <div>
      <PageHeader
        title="All Users"
        description="Manage all users in the system"
        action={
          can('users', 'create') ? (
            <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={openCreate}>
              Add User
            </Button>
          ) : undefined
        }
      />

      <Card padding="none">
        <div className="p-4 border-b border-slate-200 flex flex-wrap gap-3">
          <SearchInput
            value={search}
            onChange={(v) => { setSearch(v); setPage(1); }}
            placeholder="Search users..."
            className="max-w-xs flex-1"
          />
        </div>
        <Table
          columns={columns}
          data={data?.items ?? []}
          loading={isLoading}
          emptyTitle="No users found"
          emptyMessage="No users match your search criteria."
          keyExtractor={(row) => row.id}
        />
        {data && (
          <Pagination
            currentPage={page}
            totalPages={data.meta.totalPages}
            total={data.meta.total}
            limit={10}
            onPageChange={setPage}
          />
        )}
      </Card>

      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editItem ? 'Edit User' : 'Add User'}
        onSubmit={handleSubmit(onSubmit)}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        submitLabel={editItem ? 'Update' : 'Create'}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="First Name" error={errors.firstName?.message} required {...register('firstName')} />
            <Input label="Last Name" error={errors.lastName?.message} required {...register('lastName')} />
          </div>
          <Input label="Email" type="email" error={errors.email?.message} required {...register('email')} />
          <Input
            label={editItem ? 'New Password (leave blank to keep current)' : 'Password'}
            type="password"
            error={errors.password?.message}
            required={!editItem}
            {...register('password')}
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Role"
              options={[
                { value: 'admin', label: 'Admin' },
                { value: 'teacher', label: 'Teacher' },
                { value: 'student', label: 'Student' },
              ]}
              error={errors.roleType?.message}
              required
              {...register('roleType')}
            />
            <Input label="Phone Number" error={errors.phoneNumber?.message} {...register('phoneNumber')} />
          </div>
          <Select
            label="Department"
            options={departmentOptions}
            placeholder="Select department (optional)"
            {...register('departmentId')}
          />
          {selectedRole === 'student' && (
            <Select
              label="Program"
              options={programOptions}
              placeholder="Select program (optional)"
              {...register('programId')}
            />
          )}
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title="Delete User"
        message="Are you sure you want to delete this user? All associated data will also be removed."
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
