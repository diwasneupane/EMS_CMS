import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { resultsApi } from '../../api/results';
import { coursesApi } from '../../api/courses';
import { semestersApi } from '../../api/semesters';
import { usersApi } from '../../api/users';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal, ConfirmDialog } from '../../components/ui/Modal';
import { Table } from '../../components/ui/Table';
import type { Column } from '../../components/ui/Table';
import { Pagination } from '../../components/ui/Pagination';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { usePermission } from '../../hooks/usePermission';
import { formatDate, calculateGrade, calculateGPA, getInitials } from '../../lib/utils';
import type { Result } from '../../types';

const schema = z.object({
  studentId: z.string().min(1, 'Student is required'),
  courseId: z.string().min(1, 'Course is required'),
  semesterId: z.string().min(1, 'Semester is required'),
  academicMark: z.number().min(0).max(80, 'Max 80'),
  practicalMark: z.number().min(0).max(20, 'Max 20'),
});

type FormData = z.infer<typeof schema>;

export default function ResultsPage() {
  const queryClient = useQueryClient();
  const { can } = usePermission();
  const [page, setPage] = useState(1);
  const [courseFilter, setCourseFilter] = useState('');
  const [semesterFilter, setSemesterFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<Result | null>(null);
  const [previewMarks, setPreviewMarks] = useState({ academic: 0, practical: 0 });

  const { data, isLoading } = useQuery({
    queryKey: ['results', page, courseFilter, semesterFilter],
    queryFn: () => {
      const params = { page, limit: 10 };
      if (courseFilter && semesterFilter)
        return resultsApi.getByCourseAndSemester(courseFilter, semesterFilter, params);
      if (courseFilter)
        return resultsApi.getByCourse(courseFilter, params);
      if (semesterFilter)
        return resultsApi.getBySemester(semesterFilter, params);
      return resultsApi.getAll(params);
    },
  });

  const { data: coursesData } = useQuery({ queryKey: ['courses-all'], queryFn: () => coursesApi.getAll({ limit: 100 }) });
  const { data: semestersData } = useQuery({ queryKey: ['semesters-all'], queryFn: () => semestersApi.getAll({ limit: 100 }) });
  const { data: studentsData } = useQuery({ queryKey: ['students-all'], queryFn: () => usersApi.getStudents({ limit: 200 }) });

  const courseOptions = (coursesData?.items ?? []).map((c) => ({ value: c.id, label: `${c.code} - ${c.name}` }));
  const semesterOptions = (semestersData?.items ?? []).map((s) => ({ value: s.id, label: s.name }));
  const studentOptions = (studentsData?.items ?? []).map((s) => ({ value: s.id, label: `${s.firstName} ${s.lastName}` }));

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const watchedAcademic = watch('academicMark') ?? 0;
  const watchedPractical = watch('practicalMark') ?? 0;
  const liveTotal = Number(watchedAcademic) + Number(watchedPractical);
  const liveGrade = calculateGrade(liveTotal);

  const createMutation = useMutation({
    mutationFn: resultsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['results'] });
      toast.success('Result added');
      closeModal();
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message || 'Failed to add result');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { academicMark?: number; practicalMark?: number; remarks?: string } }) => resultsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['results'] });
      toast.success('Result updated');
      closeModal();
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message || 'Failed to update result');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: resultsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['results'] });
      toast.success('Result deleted');
      setDeleteId(null);
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message || 'Failed to delete result');
    },
  });

  const openCreate = () => {
    setEditItem(null);
    reset({ studentId: '', courseId: '', semesterId: '', academicMark: 0, practicalMark: 0 });
    setModalOpen(true);
  };

  const openEdit = (item: Result) => {
    setEditItem(item);
    reset({
      studentId: item.studentId,
      courseId: item.courseId,
      semesterId: item.semesterId,
      academicMark: item.academicMark,
      practicalMark: item.practicalMark,
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

  const gradeVariant = (grade: string) => {
    if (grade === 'A+' || grade === 'A') return 'success';
    if (grade === 'B+' || grade === 'B') return 'info';
    if (grade === 'C+' || grade === 'C') return 'warning';
    if (grade === 'F') return 'error';
    return 'default';
  };

  const columns: Column<Result>[] = [
    {
      header: 'Student', accessor: 'student', render: (_, row) => (
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">
            {row.student ? getInitials(row.student.firstName, row.student.lastName) : 'S'}
          </div>
          <span className="text-sm font-medium text-slate-800">
            {row.student ? `${row.student.firstName} ${row.student.lastName}` : '-'}
          </span>
        </div>
      ),
    },
    {
      header: 'Course', accessor: 'course', render: (_, row) => (
        <span className="text-sm text-slate-700">{row.course?.name ?? '-'}</span>
      ),
    },
    {
      header: 'Semester', accessor: 'semester', render: (_, row) => (
        <span className="text-sm text-slate-600">{row.semester?.name ?? '-'}</span>
      ),
    },
    {
      header: 'Academic (80)', accessor: 'academicMark', render: (_, row) => (
        <span className="text-sm font-medium text-slate-700">{row.academicMark}</span>
      ),
    },
    {
      header: 'Practical (20)', accessor: 'practicalMark', render: (_, row) => (
        <span className="text-sm font-medium text-slate-700">{row.practicalMark}</span>
      ),
    },
    {
      header: 'Total', accessor: 'totalMark', render: (_, row) => {
        const total = (row.totalMark ?? row.academicMark + row.practicalMark);
        return <span className="text-sm font-bold text-slate-800">{total}/100</span>;
      },
    },
    {
      header: 'Grade', accessor: 'grade', render: (_, row) => {
        const total = row.totalMark ?? row.academicMark + row.practicalMark;
        const grade = row.grade ?? calculateGrade(total);
        return <Badge variant={gradeVariant(grade)}>{grade}</Badge>;
      },
    },
    {
      header: 'GPA', accessor: 'gpa', render: (_, row) => {
        const total = row.totalMark ?? row.academicMark + row.practicalMark;
        const gpa = row.gpa ?? calculateGPA(total);
        return <span className="text-sm font-medium text-slate-700">{gpa.toFixed(1)}</span>;
      },
    },
    ...(can('results', 'update') || can('results', 'delete') ? [{
      header: 'Actions',
      accessor: 'id' as keyof Result,
      render: (_: unknown, row: Result) => (
        <div className="flex items-center gap-1">
          {can('results', 'update') && (
            <button onClick={() => openEdit(row)} className="p-1.5 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50 transition-colors">
              <Pencil className="w-4 h-4" />
            </button>
          )}
          {can('results', 'delete') && (
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
        title="Results"
        description="Manage student academic results"
        action={
          can('results', 'create') ? (
            <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={openCreate}>
              Add Result
            </Button>
          ) : undefined
        }
      />

      <Card padding="none">
        <div className="p-4 border-b border-slate-200 flex flex-wrap gap-3">
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
          data={data?.items ?? []}
          loading={isLoading}
          emptyTitle="No results found"
          emptyMessage="Add student results to get started."
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
        title={editItem ? 'Edit Result' : 'Add Result'}
        onSubmit={handleSubmit(onSubmit)}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        submitLabel={editItem ? 'Update' : 'Save'}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Select label="Student" options={studentOptions} placeholder="Select student" error={errors.studentId?.message} required {...register('studentId')} />
          <Select label="Course" options={courseOptions} placeholder="Select course" error={errors.courseId?.message} required {...register('courseId')} />
          <Select label="Semester" options={semesterOptions} placeholder="Select semester" error={errors.semesterId?.message} required {...register('semesterId')} />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Academic Mark (out of 80)"
              type="number"
              min={0}
              max={80}
              error={errors.academicMark?.message}
              required
              {...register('academicMark', { valueAsNumber: true })}
            />
            <Input
              label="Practical Mark (out of 20)"
              type="number"
              min={0}
              max={20}
              error={errors.practicalMark?.message}
              required
              {...register('practicalMark', { valueAsNumber: true })}
            />
          </div>
          {/* Live preview */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <p className="text-sm font-medium text-slate-600 mb-3">Grade Preview</p>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-slate-900">{liveTotal}</p>
                <p className="text-xs text-slate-500">Total / 100</p>
              </div>
              <div className="text-center">
                <Badge variant={gradeVariant(liveGrade)} className="text-base px-3 py-1">{liveGrade}</Badge>
                <p className="text-xs text-slate-500 mt-1">Grade</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-slate-900">{calculateGPA(liveTotal).toFixed(1)}</p>
                <p className="text-xs text-slate-500">GPA</p>
              </div>
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title="Delete Result"
        message="Are you sure you want to delete this result?"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
