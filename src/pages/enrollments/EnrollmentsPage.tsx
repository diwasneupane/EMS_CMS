import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { enrollmentsApi } from '../../api/enrollments';
import { coursesApi } from '../../api/courses';
import { semestersApi } from '../../api/semesters';
import { usersApi } from '../../api/users';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { Modal, ConfirmDialog } from '../../components/ui/Modal';
import { Table } from '../../components/ui/Table';
import type { Column } from '../../components/ui/Table';
import { Pagination } from '../../components/ui/Pagination';
import { SearchInput } from '../../components/ui/SearchInput';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { useDebounce } from '../../hooks/useDebounce';
import { formatDate, getInitials } from '../../lib/utils';
import type { Enrollment } from '../../types';

const schema = z.object({
  studentId: z.string().min(1, 'Student is required'),
  courseId: z.string().min(1, 'Course is required'),
  semesterId: z.string().min(1, 'Semester is required'),
});

type FormData = z.infer<typeof schema>;

export default function EnrollmentsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [semesterFilter, setSemesterFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<Enrollment | null>(null);
  const debouncedSearch = useDebounce(search);

  const { data, isLoading } = useQuery({
    queryKey: ['enrollments', page],
    queryFn: () => enrollmentsApi.getAll({ page, limit: 10 }),
  });

  const { data: coursesData } = useQuery({ queryKey: ['courses-all'], queryFn: () => coursesApi.getAll({ limit: 100 }) });
  const { data: semestersData } = useQuery({ queryKey: ['semesters-all'], queryFn: () => semestersApi.getAll({ limit: 100 }) });
  const { data: studentsData } = useQuery({ queryKey: ['students-all'], queryFn: () => usersApi.getStudents({ limit: 200 }) });

  const courseOptions = (coursesData?.items ?? []).map((c) => ({ value: c.id, label: `${c.code} - ${c.name}` }));
  const semesterOptions = (semestersData?.items ?? []).map((s) => ({ value: s.id, label: s.name }));
  const studentOptions = (studentsData?.items ?? []).map((s) => ({ value: s.id, label: `${s.firstName} ${s.lastName} (${s.email})` }));

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const createMutation = useMutation({
    mutationFn: (payload: { studentIds: string[]; courseId: string; semesterId: string }) =>
      enrollmentsApi.bulkEnroll(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
      toast.success('Enrollment created');
      closeModal();
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message || 'Failed to create enrollment');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: enrollmentsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
      toast.success('Enrollment removed');
      setDeleteId(null);
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message || 'Failed to remove enrollment');
    },
  });

  const openCreate = () => {
    setEditItem(null);
    reset({ studentId: '', courseId: '', semesterId: '' });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditItem(null);
    reset();
  };

  const onSubmit = (formData: FormData) => {
    createMutation.mutate({
      studentIds: [formData.studentId],
      courseId: formData.courseId,
      semesterId: formData.semesterId,
    });
  };

  const statusVariant = (status: string) => {
    if (status === 'active') return 'success';
    if (status === 'completed') return 'info';
    return 'error';
  };

  const columns: Column<Enrollment>[] = [
    {
      header: 'Student', accessor: 'student', render: (_, row) => (
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">
            {row.student ? getInitials(row.student.firstName, row.student.lastName) : 'S'}
          </div>
          <div>
            <p className="text-sm font-medium text-slate-800">
              {row.student ? `${row.student.firstName} ${row.student.lastName}` : '-'}
            </p>
            <p className="text-xs text-slate-500">{row.student?.email}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Course', accessor: 'course', render: (_, row) => (
        <div>
          <p className="text-sm font-medium text-slate-800">{row.course?.name ?? '-'}</p>
          <p className="text-xs text-slate-500">{row.course?.code}</p>
        </div>
      ),
    },
    {
      header: 'Semester', accessor: 'semester', render: (_, row) => (
        <span className="text-sm text-slate-600">{row.semester?.name ?? '-'}</span>
      ),
    },
    {
      header: 'Status', accessor: 'status', render: (_, row) => (
        <Badge variant={statusVariant(row.status)}>{row.status}</Badge>
      ),
    },
    {
      header: 'Enrolled On', accessor: 'createdAt', render: (_, row) => (
        <span className="text-sm text-slate-500">{formatDate(row.createdAt)}</span>
      ),
    },
    {
      header: 'Actions', accessor: 'id', render: (_, row) => (
        <div className="flex items-center gap-1">
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
        title="Enrollments"
        description="Manage student course enrollments"
        action={
          <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={openCreate}>
            Add Enrollment
          </Button>
        }
      />

      <Card padding="none">
        <div className="p-4 border-b border-slate-200 flex flex-wrap gap-3">
          <SearchInput
            value={search}
            onChange={(v) => { setSearch(v); setPage(1); }}
            placeholder="Search enrollments..."
            className="min-w-[200px] flex-1"
          />
          <select
            value={courseFilter}
            onChange={(e) => { setCourseFilter(e.target.value); setPage(1); }}
            className="text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
          >
            <option value="">All Courses</option>
            {(coursesData?.items ?? []).map((c) => (
              <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
            ))}
          </select>
          <select
            value={semesterFilter}
            onChange={(e) => { setSemesterFilter(e.target.value); setPage(1); }}
            className="text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
          >
            <option value="">All Semesters</option>
            {(semestersData?.items ?? []).map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <Table
          columns={columns}
          data={(data?.items ?? []).filter((item) => {
            const student = item.student;
            const matchesSearch = !debouncedSearch ||
              (student ? `${student.firstName} ${student.lastName}`.toLowerCase().includes(debouncedSearch.toLowerCase()) : false) ||
              (item.course?.name ?? '').toLowerCase().includes(debouncedSearch.toLowerCase());
            const matchesCourse = !courseFilter || item.courseId === courseFilter;
            const matchesSemester = !semesterFilter || item.semesterId === semesterFilter;
            return matchesSearch && matchesCourse && matchesSemester;
          })}
          loading={isLoading}
          emptyTitle="No enrollments found"
          emptyMessage="Enroll students in courses to get started."
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
        title="Add Enrollment"
        onSubmit={handleSubmit(onSubmit)}
        isSubmitting={createMutation.isPending}
        submitLabel="Enroll"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Select label="Student" options={studentOptions} placeholder="Select student" error={errors.studentId?.message} required {...register('studentId')} />
          <Select label="Course" options={courseOptions} placeholder="Select course" error={errors.courseId?.message} required {...register('courseId')} />
          <Select label="Semester" options={semesterOptions} placeholder="Select semester" error={errors.semesterId?.message} required {...register('semesterId')} />
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title="Remove Enrollment"
        message="Are you sure you want to remove this enrollment?"
        confirmLabel="Remove"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
