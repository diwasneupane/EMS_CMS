import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { departmentsApi } from '../../api/departments';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Modal, ConfirmDialog } from '../../components/ui/Modal';
import { Table } from '../../components/ui/Table';
import type { Column } from '../../components/ui/Table';
import { Pagination } from '../../components/ui/Pagination';
import { SearchInput } from '../../components/ui/SearchInput';
import { Card } from '../../components/ui/Card';
import { useDebounce } from '../../hooks/useDebounce';
import { usePermission } from '../../hooks/usePermission';
import { formatDate } from '../../lib/utils';
import type { Department } from '../../types';

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  code: z
    .string()
    .min(1, 'Code is required')
    .max(20)
    .transform((v) => v.toUpperCase()),
  description: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function DepartmentsPage() {
  const queryClient = useQueryClient();
  const { can } = usePermission();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<Department | null>(null);
  const debouncedSearch = useDebounce(search);

  const { data, isLoading } = useQuery({
    queryKey: ['departments', page, debouncedSearch],
    queryFn: () => departmentsApi.getAll({ page, limit: 10, search: debouncedSearch || undefined }),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const createMutation = useMutation({
    mutationFn: departmentsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      toast.success('Department created successfully');
      closeModal();
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message || 'Failed to create department');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; code?: string; description?: string } }) =>
      departmentsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      toast.success('Department updated successfully');
      closeModal();
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message || 'Failed to update department');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: departmentsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      toast.success('Department deleted successfully');
      setDeleteId(null);
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message || 'Failed to delete department');
    },
  });

  const openCreate = () => {
    setEditItem(null);
    reset({ name: '', code: '', description: '' });
    setModalOpen(true);
  };

  const openEdit = (item: Department) => {
    setEditItem(item);
    reset({ name: item.name, code: item.code, description: item.description || '' });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditItem(null);
    reset();
  };

  const onSubmit = (formData: FormData) => {
    if (editItem) {
      updateMutation.mutate({ id: editItem.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const columns: Column<Department>[] = [
    { header: 'Name', accessor: 'name', render: (_, row) => (
      <span className="font-medium text-slate-800">{row.name}</span>
    )},
    { header: 'Code', accessor: 'code', render: (_, row) => (
      <span className="font-mono text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded">{row.code}</span>
    )},
    { header: 'Description', accessor: 'description', render: (_, row) => (
      <span className="text-slate-500 text-sm">{row.description || '-'}</span>
    )},
    { header: 'Created', accessor: 'createdAt', render: (_, row) => (
      <span className="text-slate-500 text-sm">{formatDate(row.createdAt)}</span>
    )},
    ...(can('departments', 'update') || can('departments', 'delete') ? [{
      header: 'Actions',
      accessor: 'id' as keyof Department,
      render: (_: unknown, row: Department) => (
        <div className="flex items-center gap-1">
          {can('departments', 'update') && (
            <button
              onClick={() => openEdit(row)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
            >
              <Pencil className="w-4 h-4" />
            </button>
          )}
          {can('departments', 'delete') && (
            <button
              onClick={() => setDeleteId(row.id)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    }] : []),
  ];

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div>
      <PageHeader
        title="Departments"
        description="Manage academic departments in the system"
        action={
          can('departments', 'create') ? (
            <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={openCreate}>
              Add Department
            </Button>
          ) : undefined
        }
      />

      <Card padding="none">
        <div className="p-4 border-b border-slate-200">
          <SearchInput
            value={search}
            onChange={(v) => { setSearch(v); setPage(1); }}
            placeholder="Search departments..."
            className="max-w-xs"
          />
        </div>

        <Table
          columns={columns}
          data={data?.items ?? []}
          loading={isLoading}
          emptyTitle="No departments found"
          emptyMessage="Create your first department to get started."
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

      {/* Create/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editItem ? 'Edit Department' : 'Add Department'}
        onSubmit={handleSubmit(onSubmit)}
        isSubmitting={isSubmitting}
        submitLabel={editItem ? 'Update' : 'Create'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Department Name"
            placeholder="e.g., Computer Science"
            error={errors.name?.message}
            required
            {...register('name')}
          />
          <Input
            label="Department Code"
            placeholder="e.g., CS"
            error={errors.code?.message}
            required
            {...register('code')}
          />
          <Textarea
            label="Description"
            placeholder="Brief description of the department..."
            {...register('description')}
          />
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title="Delete Department"
        message="Are you sure you want to delete this department? This action cannot be undone and may affect related programs and courses."
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
