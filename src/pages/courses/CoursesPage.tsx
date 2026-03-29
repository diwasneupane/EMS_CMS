import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { coursesApi } from '../../api/courses';
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
import { formatDate } from '../../lib/utils';
import type { Course } from '../../types';

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  code: z.string().min(1, 'Code is required').max(20),
  departmentId: z.string().min(1, 'Department is required'),
  creditHour: z.number().min(1).max(6),
});

type FormData = z.infer<typeof schema>;

export default function CoursesPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<Course | null>(null);
  const debouncedSearch = useDebounce(search);

  const { data, isLoading } = useQuery({
    queryKey: ['courses', page],
    queryFn: () => coursesApi.getAll({ page, limit: 10 }),
  });

  const { data: deptData } = useQuery({
    queryKey: ['departments-all'],
    queryFn: () => departmentsApi.getAll({ limit: 100 }),
  });

  const departmentOptions = (deptData?.items ?? []).map((d) => ({ value: d.id, label: d.name }));

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const createMutation = useMutation({
    mutationFn: coursesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      toast.success('Course created');
      closeModal();
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message || 'Failed to create course');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<{ departmentId: string; code: string; name: string; description: string; creditHour: number }> }) =>
      coursesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      toast.success('Course updated');
      closeModal();
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message || 'Failed to update course');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: coursesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      toast.success('Course deleted');
      setDeleteId(null);
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message || 'Failed to delete course');
    },
  });

  const openCreate = () => {
    setEditItem(null);
    reset({ name: '', code: '', departmentId: '', creditHour: 3 });
    setModalOpen(true);
  };

  const openEdit = (item: Course) => {
    setEditItem(item);
    reset({ name: item.name, code: item.code, departmentId: item.departmentId, creditHour: item.creditHour });
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

  const columns: Column<Course>[] = [
    {
      header: 'Course Name', accessor: 'name', render: (_, row) => (
        <span className="font-medium text-slate-800">{row.name}</span>
      ),
    },
    {
      header: 'Code', accessor: 'code', render: (_, row) => (
        <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded">{row.code}</span>
      ),
    },
    {
      header: 'Department', accessor: 'department', render: (_, row) => (
        <span className="text-sm text-slate-600">{row.department?.name ?? '-'}</span>
      ),
    },
    {
      header: 'Credit Hours', accessor: 'creditHour', render: (_, row) => (
        <span className="text-sm font-medium text-slate-700">{row.creditHour} hr{row.creditHour !== 1 ? 's' : ''}</span>
      ),
    },
    {
      header: 'Created', accessor: 'createdAt', render: (_, row) => (
        <span className="text-sm text-slate-500">{formatDate(row.createdAt)}</span>
      ),
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
        title="Courses"
        description="Manage courses across all departments"
        action={
          <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={openCreate}>
            Add Course
          </Button>
        }
      />

      <Card padding="none">
        <div className="p-4 border-b border-slate-200 flex flex-wrap gap-3">
          <SearchInput
            value={search}
            onChange={(v) => { setSearch(v); setPage(1); }}
            placeholder="Search courses..."
            className="max-w-xs flex-1"
          />
          <select
            value={filterDept}
            onChange={(e) => { setFilterDept(e.target.value); setPage(1); }}
            className="text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
          >
            <option value="">All Departments</option>
            {departmentOptions.map((d) => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
        </div>
        <Table
          columns={columns}
          data={(data?.items ?? []).filter((item) => {
            const matchesSearch = !debouncedSearch ||
              item.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
              item.code.toLowerCase().includes(debouncedSearch.toLowerCase());
            const matchesDept = !filterDept || item.departmentId === filterDept;
            return matchesSearch && matchesDept;
          })}
          loading={isLoading}
          emptyTitle="No courses found"
          emptyMessage="Create your first course to get started."
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
        title={editItem ? 'Edit Course' : 'Add Course'}
        onSubmit={handleSubmit(onSubmit)}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        submitLabel={editItem ? 'Update' : 'Create'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Course Name" placeholder="e.g., Introduction to Programming" error={errors.name?.message} required {...register('name')} />
          <Input label="Course Code" placeholder="e.g., CS101" error={errors.code?.message} required {...register('code')} />
          <Select
            label="Department"
            options={departmentOptions}
            placeholder="Select department"
            error={errors.departmentId?.message}
            required
            {...register('departmentId')}
          />
          <Input
            label="Credit Hours"
            type="number"
            min={1}
            max={6}
            error={errors.creditHour?.message}
            hint="Enter credit hours between 1 and 6"
            required
            {...register('creditHour', { valueAsNumber: true })}
          />
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title="Delete Course"
        message="Are you sure you want to delete this course? This action cannot be undone."
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
