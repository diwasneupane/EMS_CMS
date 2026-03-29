import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { courseAssignmentsApi } from '../../api/courseAssignments';
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
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { formatDate } from '../../lib/utils';
import { usePermission } from '../../hooks/usePermission';
import type { CourseAssignment } from '../../types';

const schema = z.object({
  courseId: z.string().min(1, 'Course is required'),
  teacherId: z.string().min(1, 'Teacher is required'),
  semesterId: z.string().min(1, 'Semester is required'),
});

type FormData = z.infer<typeof schema>;

export default function AssignmentsPage() {
  const queryClient = useQueryClient();
  const { can } = usePermission();
  const [page, setPage] = useState(1);
  const [semesterFilter, setSemesterFilter] = useState('');
  const [teacherFilter, setTeacherFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<CourseAssignment | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['course-assignments', page, semesterFilter, teacherFilter],
    queryFn: () => {
      const params = { page, limit: 10 };
      if (semesterFilter) return courseAssignmentsApi.getBySemester(semesterFilter, params);
      if (teacherFilter) return courseAssignmentsApi.getByTeacher(teacherFilter, params);
      return courseAssignmentsApi.getAll(params);
    },
  });

  const { data: coursesData } = useQuery({
    queryKey: ['courses-all'],
    queryFn: () => coursesApi.getAll({ limit: 100 }),
  });

  const { data: semestersData } = useQuery({
    queryKey: ['semesters-all'],
    queryFn: () => semestersApi.getAll({ limit: 100 }),
  });

  const { data: teachersData } = useQuery({
    queryKey: ['teachers-all'],
    queryFn: () => usersApi.getTeachers({ limit: 100 }),
  });

  const courseOptions = (coursesData?.items ?? []).map((c) => ({ value: c.id, label: `${c.code} - ${c.name}` }));
  const semesterOptions = (semestersData?.items ?? []).map((s) => ({ value: s.id, label: s.name }));
  const teacherOptions = (teachersData?.items ?? []).map((t) => ({ value: t.id, label: `${t.firstName} ${t.lastName}` }));

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const createMutation = useMutation({
    mutationFn: courseAssignmentsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-assignments'] });
      toast.success('Assignment created');
      closeModal();
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message || 'Failed to create assignment');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: courseAssignmentsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-assignments'] });
      toast.success('Assignment removed');
      setDeleteId(null);
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message || 'Failed to delete assignment');
    },
  });

  const openCreate = () => {
    setEditItem(null);
    reset({ courseId: '', teacherId: '', semesterId: '' });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditItem(null);
    reset();
  };

  const onSubmit = (formData: FormData) => {
    createMutation.mutate(formData);
  };

  const columns: Column<CourseAssignment>[] = [
    {
      header: 'Course', accessor: 'course', render: (_, row) => (
        <div>
          <p className="text-sm font-medium text-slate-800">{row.course?.name ?? '-'}</p>
          <p className="text-xs text-slate-500">{row.course?.code}</p>
        </div>
      ),
    },
    {
      header: 'Teacher', accessor: 'teacher', render: (_, row) => (
        <span className="text-sm text-slate-700">
          {row.teacher ? `${row.teacher.firstName} ${row.teacher.lastName}` : '-'}
        </span>
      ),
    },
    {
      header: 'Semester', accessor: 'semester', render: (_, row) => (
        <Badge variant="info">{row.semester?.name ?? '-'}</Badge>
      ),
    },
    {
      header: 'Students', accessor: 'studentsCount', render: (_, row) => (
        <span className="text-sm font-medium text-slate-700">{row.studentsCount ?? '-'}</span>
      ),
    },
    {
      header: 'Assigned On', accessor: 'createdAt', render: (_, row) => (
        <span className="text-sm text-slate-500">{formatDate(row.createdAt)}</span>
      ),
    },
    ...(can('assignments', 'delete') ? [{
      header: 'Actions',
      accessor: 'id' as keyof CourseAssignment,
      render: (_: unknown, row: CourseAssignment) => (
        <div className="flex items-center gap-1">
          <button onClick={() => setDeleteId(row.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    }] : []),
  ];

  return (
    <div>
      <PageHeader
        title="Course Assignments"
        description="Assign teachers to courses for each semester"
        action={
          can('assignments', 'create') ? (
            <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={openCreate}>
              Assign Course
            </Button>
          ) : undefined
        }
      />

      <Card padding="none">
        <div className="p-4 border-b border-slate-200 flex flex-wrap gap-3">
          <select
            value={semesterFilter}
            onChange={(e) => { setSemesterFilter(e.target.value); setTeacherFilter(''); setPage(1); }}
            className="text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
          >
            <option value="">All Semesters</option>
            {(semestersData?.items ?? []).map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <select
            value={teacherFilter}
            onChange={(e) => { setTeacherFilter(e.target.value); setSemesterFilter(''); setPage(1); }}
            className="text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
          >
            <option value="">All Teachers</option>
            {(teachersData?.items ?? []).map((t) => (
              <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>
            ))}
          </select>
          {(semesterFilter || teacherFilter) && (
            <button
              onClick={() => { setSemesterFilter(''); setTeacherFilter(''); setPage(1); }}
              className="text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2 self-center"
            >
              Clear filters
            </button>
          )}
        </div>
        <Table
          columns={columns}
          data={data?.items ?? []}
          loading={isLoading}
          emptyTitle="No assignments found"
          emptyMessage="Assign teachers to courses to get started."
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
        title="Assign Course"
        onSubmit={handleSubmit(onSubmit)}
        isSubmitting={createMutation.isPending}
        submitLabel="Assign"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Select label="Course" options={courseOptions} placeholder="Select course" error={errors.courseId?.message} required {...register('courseId')} />
          <Select label="Teacher" options={teacherOptions} placeholder="Select teacher" error={errors.teacherId?.message} required {...register('teacherId')} />
          <Select label="Semester" options={semesterOptions} placeholder="Select semester" error={errors.semesterId?.message} required {...register('semesterId')} />
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title="Remove Assignment"
        message="Are you sure you want to remove this course assignment?"
        confirmLabel="Remove"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
