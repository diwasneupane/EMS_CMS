import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { UserCheck, Trash2, Pencil } from 'lucide-react';
import toast from 'react-hot-toast';
import { usersApi } from '../../api/users';
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

// Backend PATCH /api/users/:id does NOT accept email or password
const editSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phoneNumber: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.enum(['male', 'female', 'other', '']).optional(),
  address: z.string().optional(),
  departmentId: z.string().optional(),
  programId: z.string().optional(),
  guardianName: z.string().optional(),
  guardianPhone: z.string().optional(),
  guardianEmail: z.string().optional(),
  bloodGroup: z.string().optional(),
});

type EditFormData = z.infer<typeof editSchema>;

const GENDER_OPTIONS = [
  { value: '', label: 'Not specified' },
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

export default function StudentsPage() {
  const queryClient = useQueryClient();
  const { can } = usePermission();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [programFilter, setProgramFilter] = useState('');
  const [approvedFilter, setApprovedFilter] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<User | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const debouncedSearch = useDebounce(search);

  const { data, isLoading } = useQuery({
    queryKey: ['students', page, debouncedSearch, deptFilter, programFilter, approvedFilter],
    queryFn: () =>
      usersApi.getStudents({
        page,
        limit: 10,
        search: debouncedSearch,
        departmentId: deptFilter || undefined,
        programId: programFilter || undefined,
        isApproved: approvedFilter !== '' ? approvedFilter === 'true' : undefined,
      }),
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
  const programOptions = (programData?.items ?? []).map((p) => ({ value: p.id, label: p.name }));

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EditFormData>({ resolver: zodResolver(editSchema) });

  const approveMutation = useMutation({
    mutationFn: usersApi.approve,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['pending-count'] });
      toast.success('Student approved successfully');
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message || 'Failed to approve student');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof usersApi.update>[1] }) =>
      usersApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast.success('Student updated');
      closeModal();
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message || 'Failed to update student');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: usersApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast.success('Student deleted');
      setDeleteId(null);
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message || 'Failed to delete student');
    },
  });

  const openEdit = (student: User) => {
    setEditItem(student);
    reset({
      firstName: student.firstName,
      lastName: student.lastName,
      phoneNumber: student.phoneNumber ?? '',
      dateOfBirth: student.dateOfBirth?.split('T')[0] ?? '',
      gender: (student.gender as EditFormData['gender']) ?? '',
      address: student.address ?? '',
      departmentId: student.departmentId ?? '',
      programId: student.programId ?? '',
      guardianName: student.guardianName ?? '',
      guardianPhone: student.guardianPhone ?? '',
      guardianEmail: student.guardianEmail ?? '',
      bloodGroup: student.bloodGroup ?? '',
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditItem(null);
    reset();
  };

  const onSubmit = (formData: EditFormData) => {
    if (!editItem) return;
    // Strip empty strings → undefined so backend ignores them, and cast gender
    const payload = Object.fromEntries(
      Object.entries(formData).filter(([, v]) => v !== ''),
    ) as {
      firstName?: string; lastName?: string; phoneNumber?: string;
      dateOfBirth?: string; gender?: 'male' | 'female' | 'other';
      address?: string; departmentId?: string; programId?: string;
      guardianName?: string; guardianPhone?: string; guardianEmail?: string;
      bloodGroup?: string;
    };
    updateMutation.mutate({ id: editItem.id, payload });
  };

  const columns: Column<User>[] = [
    {
      header: 'Student', accessor: 'firstName', render: (_, row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
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
      header: 'Enrollment #', accessor: 'enrollmentNumber', render: (_, row) => (
        <span className="font-mono text-xs text-slate-600">{row.enrollmentNumber ?? '-'}</span>
      ),
    },
    {
      header: 'Program', accessor: 'program', render: (_, row) => (
        <span className="text-sm text-slate-600">{row.program?.name ?? '-'}</span>
      ),
    },
    {
      header: 'Department', accessor: 'department', render: (_, row) => (
        <span className="text-sm text-slate-600">{row.department?.name ?? '-'}</span>
      ),
    },
    {
      header: 'Status', accessor: 'isApproved', render: (_, row) => (
        <Badge variant={row.isApproved ? 'success' : 'warning'} dot>
          {row.isApproved ? 'Approved' : 'Pending'}
        </Badge>
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
        <div className="flex items-center gap-1.5">
          {can('users', 'update') && !row.isApproved && (
            <Button
              size="xs"
              variant="outline"
              leftIcon={<UserCheck className="w-3.5 h-3.5" />}
              onClick={() => approveMutation.mutate(row.id)}
              isLoading={approveMutation.isPending && approveMutation.variables === row.id}
            >
              Approve
            </Button>
          )}
          {can('users', 'update') && (
            <button
              onClick={() => openEdit(row)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
              title="Edit student"
            >
              <Pencil className="w-4 h-4" />
            </button>
          )}
          {can('users', 'delete') && (
            <button
              onClick={() => setDeleteId(row.id)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              title="Delete student"
            >
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
        title="Students"
        description={`Total ${data?.meta?.total ?? 0} students in the system`}
      />

      <Card padding="none">
        <div className="p-4 border-b border-slate-200 flex flex-wrap gap-3">
          <SearchInput
            value={search}
            onChange={(v) => { setSearch(v); setPage(1); }}
            placeholder="Search students..."
            className="min-w-[200px] flex-1"
          />
          <select
            value={deptFilter}
            onChange={(e) => { setDeptFilter(e.target.value); setPage(1); }}
            className="text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
          >
            <option value="">All Departments</option>
            {(deptData?.items ?? []).map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          <select
            value={programFilter}
            onChange={(e) => { setProgramFilter(e.target.value); setPage(1); }}
            className="text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
          >
            <option value="">All Programs</option>
            {(programData?.items ?? []).map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <select
            value={approvedFilter}
            onChange={(e) => { setApprovedFilter(e.target.value); setPage(1); }}
            className="text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
          >
            <option value="">All Status</option>
            <option value="true">Approved</option>
            <option value="false">Pending</option>
          </select>
        </div>
        <Table
          columns={columns}
          data={data?.items ?? []}
          loading={isLoading}
          emptyTitle="No students found"
          emptyMessage="No students match your search criteria."
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

      {/* Edit Modal — no email/password fields (backend rejects them) */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={`Edit Student: ${editItem?.firstName ?? ''} ${editItem?.lastName ?? ''}`}
        onSubmit={handleSubmit(onSubmit)}
        isSubmitting={updateMutation.isPending}
        submitLabel="Save Changes"
        size="xl"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="First Name"
              error={errors.firstName?.message}
              required
              {...register('firstName')}
            />
            <Input
              label="Last Name"
              error={errors.lastName?.message}
              required
              {...register('lastName')}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Phone Number"
              placeholder="+1 234 567 8900"
              {...register('phoneNumber')}
            />
            <Input
              label="Date of Birth"
              type="date"
              {...register('dateOfBirth')}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Gender"
              options={GENDER_OPTIONS}
              {...register('gender')}
            />
            <Input
              label="Blood Group"
              placeholder="e.g., A+"
              {...register('bloodGroup')}
            />
          </div>

          <Input
            label="Address"
            placeholder="Street, City, Country"
            {...register('address')}
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Department"
              options={[{ value: '', label: 'None' }, ...departmentOptions]}
              {...register('departmentId')}
            />
            <Select
              label="Program"
              options={[{ value: '', label: 'None' }, ...programOptions]}
              {...register('programId')}
            />
          </div>

          <div className="border-t border-slate-200 pt-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Guardian Information</p>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Guardian Name" placeholder="Full name" {...register('guardianName')} />
              <Input label="Guardian Phone" placeholder="+1 234 567 8900" {...register('guardianPhone')} />
            </div>
            <div className="mt-4">
              <Input label="Guardian Email" type="email" placeholder="guardian@example.com" {...register('guardianEmail')} />
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title="Delete Student"
        message="Are you sure you want to delete this student? All their data will be removed."
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
