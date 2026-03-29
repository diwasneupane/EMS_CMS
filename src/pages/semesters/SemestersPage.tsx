import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { semestersApi } from '../../api/semesters';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal, ConfirmDialog } from '../../components/ui/Modal';
import { Table } from '../../components/ui/Table';
import type { Column } from '../../components/ui/Table';
import { Pagination } from '../../components/ui/Pagination';
import { SearchInput } from '../../components/ui/SearchInput';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { useDebounce } from '../../hooks/useDebounce';
import { formatDate } from '../../lib/utils';
import type { Semester } from '../../types';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().min(1, 'Code is required'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
}).refine((data) => new Date(data.endDate) > new Date(data.startDate), {
  message: 'End date must be after start date',
  path: ['endDate'],
});

type FormData = z.infer<typeof schema>;

export default function SemestersPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<Semester | null>(null);
  const debouncedSearch = useDebounce(search);

  const { data, isLoading } = useQuery({
    queryKey: ['semesters', page],
    queryFn: () => semestersApi.getAll({ page, limit: 10 }),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const createMutation = useMutation({
    mutationFn: semestersApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['semesters'] });
      toast.success('Semester created');
      closeModal();
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message || 'Failed to create semester');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<{ name: string; code: string; startDate: string; endDate: string }> }) =>
      semestersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['semesters'] });
      toast.success('Semester updated');
      closeModal();
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message || 'Failed to update semester');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: semestersApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['semesters'] });
      toast.success('Semester deleted');
      setDeleteId(null);
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message || 'Failed to delete semester');
    },
  });

  const getSemesterStatus = (start: string, end: string) => {
    const now = new Date();
    const s = new Date(start);
    const e = new Date(end);
    if (now < s) return 'upcoming';
    if (now > e) return 'ended';
    return 'active';
  };

  const openCreate = () => {
    setEditItem(null);
    reset({ name: '', code: '', startDate: '', endDate: '' });
    setModalOpen(true);
  };

  const openEdit = (item: Semester) => {
    setEditItem(item);
    reset({
      name: item.name,
      code: item.code,
      startDate: item.startDate.split('T')[0],
      endDate: item.endDate.split('T')[0],
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

  const columns: Column<Semester>[] = [
    {
      header: 'Name', accessor: 'name', render: (_, row) => (
        <span className="font-medium text-slate-800">{row.name}</span>
      ),
    },
    {
      header: 'Code', accessor: 'code', render: (_, row) => (
        <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded">{row.code}</span>
      ),
    },
    {
      header: 'Start Date', accessor: 'startDate', render: (_, row) => (
        <span className="text-sm text-slate-600">{formatDate(row.startDate)}</span>
      ),
    },
    {
      header: 'End Date', accessor: 'endDate', render: (_, row) => (
        <span className="text-sm text-slate-600">{formatDate(row.endDate)}</span>
      ),
    },
    {
      header: 'Status', accessor: 'isActive', render: (_, row) => {
        const status = getSemesterStatus(row.startDate, row.endDate);
        return (
          <Badge
            variant={status === 'active' ? 'success' : status === 'upcoming' ? 'info' : 'default'}
            dot
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
        );
      },
    },
    {
      header: 'Actions', accessor: 'id', render: (_, row) => (
        <div className="flex items-center gap-1">
          <button onClick={() => openEdit(row)} className="p-1.5 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50 transition-colors">
            <Pencil className="w-4 h-4" />
          </button>
          <button onClick={() => setDeleteId(row.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Semesters"
        description="Manage academic semesters and their date ranges"
        action={
          <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={openCreate}>
            Add Semester
          </Button>
        }
      />

      <Card padding="none">
        <div className="p-4 border-b border-slate-200">
          <SearchInput
            value={search}
            onChange={(v) => { setSearch(v); setPage(1); }}
            placeholder="Search semesters..."
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
          emptyTitle="No semesters found"
          emptyMessage="Create your first semester to get started."
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
        title={editItem ? 'Edit Semester' : 'Add Semester'}
        onSubmit={handleSubmit(onSubmit)}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        submitLabel={editItem ? 'Update' : 'Create'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Semester Name" placeholder="e.g., Fall 2024" error={errors.name?.message} required {...register('name')} />
          <Input label="Code" placeholder="e.g., FALL-2024" error={errors.code?.message} required {...register('code')} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Start Date" type="date" error={errors.startDate?.message} required {...register('startDate')} />
            <Input label="End Date" type="date" error={errors.endDate?.message} required {...register('endDate')} />
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title="Delete Semester"
        message="Are you sure you want to delete this semester? This may affect enrollments and schedules."
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
