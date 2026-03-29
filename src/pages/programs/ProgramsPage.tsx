import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { programsApi } from '../../api/programs';
import { departmentsApi } from '../../api/departments';
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
import { useDebounce } from '../../hooks/useDebounce';
import { usePermission } from '../../hooks/usePermission';
import { formatDate } from '../../lib/utils';
import type { Program } from '../../types';

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  code: z.string().min(1, 'Code is required').max(20),
  departmentId: z.string().min(1, 'Department is required'),
  durationYears: z
    .number()
    .min(1, 'Duration must be at least 1 year')
    .max(10, 'Duration cannot exceed 10 years'),
  totalCreditsRequired: z
    .number()
    .min(1, 'Credits must be at least 1')
    .max(300, 'Credits cannot exceed 300'),
});

type FormData = z.infer<typeof schema>;

export default function ProgramsPage() {
  const queryClient = useQueryClient();
  const { can } = usePermission();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<Program | null>(null);
  const debouncedSearch = useDebounce(search);

  const { data, isLoading } = useQuery({
    queryKey: ['programs', page],
    queryFn: () => programsApi.getAll({ page, limit: 10 }),
  });

  const { data: deptData } = useQuery({
    queryKey: ['departments-all'],
    queryFn: () => departmentsApi.getAll({ limit: 100 }),
  });

  const departmentOptions = (deptData?.items ?? []).map((d) => ({
    value: d.id,
    label: d.name,
  }));

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const createMutation = useMutation({
    mutationFn: programsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programs'] });
      toast.success('Program created successfully');
      closeModal();
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message || 'Failed to create program');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<{ departmentId: string; name: string; code: string; description: string; durationYears: number; totalCreditsRequired: number }> }) =>
      programsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programs'] });
      toast.success('Program updated successfully');
      closeModal();
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message || 'Failed to update program');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: programsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programs'] });
      toast.success('Program deleted');
      setDeleteId(null);
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message || 'Failed to delete program');
    },
  });

  const openCreate = () => {
    setEditItem(null);
    reset({ name: '', code: '', departmentId: '', durationYears: 4, totalCreditsRequired: 120 });
    setModalOpen(true);
  };

  const openEdit = (item: Program) => {
    setEditItem(item);
    reset({
      name: item.name,
      code: item.code,
      departmentId: item.departmentId,
      durationYears: item.durationYears,
      totalCreditsRequired: item.totalCreditsRequired,
    });
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

  const columns: Column<Program>[] = [
    {
      header: 'Name', accessor: 'name', render: (_, row) => (
        <span className="font-medium text-slate-800">{row.name}</span>
      ),
    },
    {
      header: 'Code', accessor: 'code', render: (_, row) => (
        <span className="font-mono text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded">{row.code}</span>
      ),
    },
    {
      header: 'Department', accessor: 'department', render: (_, row) => (
        <span className="text-sm text-slate-600">{row.department?.name ?? '-'}</span>
      ),
    },
    {
      header: 'Duration', accessor: 'durationYears', render: (_, row) => (
        <span className="text-sm text-slate-600">{row.durationYears} yr{row.durationYears !== 1 ? 's' : ''}</span>
      ),
    },
    {
      header: 'Credits', accessor: 'totalCreditsRequired', render: (_, row) => (
        <span className="text-sm text-slate-600">{row.totalCreditsRequired}</span>
      ),
    },
    {
      header: 'Created', accessor: 'createdAt', render: (_, row) => (
        <span className="text-sm text-slate-500">{formatDate(row.createdAt)}</span>
      ),
    },
    ...(can('programs', 'update') || can('programs', 'delete') ? [{
      header: 'Actions',
      accessor: 'id' as keyof Program,
      render: (_: unknown, row: Program) => (
        <div className="flex items-center gap-1">
          {can('programs', 'update') && (
            <button onClick={() => openEdit(row)} className="p-1.5 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50 transition-colors">
              <Pencil className="w-4 h-4" />
            </button>
          )}
          {can('programs', 'delete') && (
            <button onClick={() => setDeleteId(row.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
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
        title="Programs"
        description="Manage academic programs offered by departments"
        action={
          can('programs', 'create') ? (
            <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={openCreate}>
              Add Program
            </Button>
          ) : undefined
        }
      />

      <Card padding="none">
        <div className="p-4 border-b border-slate-200">
          <SearchInput
            value={search}
            onChange={(v) => { setSearch(v); setPage(1); }}
            placeholder="Search programs..."
            className="max-w-xs"
          />
        </div>
        <Table
          columns={columns}
          data={(data?.items ?? []).filter((item) =>
            !debouncedSearch ||
            item.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
            item.code.toLowerCase().includes(debouncedSearch.toLowerCase())
          )}
          loading={isLoading}
          emptyTitle="No programs found"
          emptyMessage="Add your first program to get started."
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
        title={editItem ? 'Edit Program' : 'Add Program'}
        onSubmit={handleSubmit(onSubmit)}
        isSubmitting={isSubmitting}
        submitLabel={editItem ? 'Update' : 'Create'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Program Name" placeholder="e.g., Bachelor of Computer Science" error={errors.name?.message} required {...register('name')} />
          <Input label="Program Code" placeholder="e.g., BCS" error={errors.code?.message} required {...register('code')} />
          <Select
            label="Department"
            options={departmentOptions}
            placeholder="Select department"
            error={errors.departmentId?.message}
            required
            {...register('departmentId')}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Duration (Years)" type="number" min={1} max={10} error={errors.durationYears?.message} required {...register('durationYears', { valueAsNumber: true })} />
            <Input label="Total Credits Required" type="number" min={1} max={300} error={errors.totalCreditsRequired?.message} required {...register('totalCreditsRequired', { valueAsNumber: true })} />
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title="Delete Program"
        message="Are you sure you want to delete this program? This action cannot be undone."
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
