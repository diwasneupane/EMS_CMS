import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { classSchedulesApi } from '../../api/classSchedules';
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
import { formatTime } from '../../lib/utils';
import type { ClassSchedule } from '../../types';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const schema = z.object({
  courseId: z.string().min(1, 'Course is required'),
  teacherId: z.string().min(1, 'Teacher is required'),
  semesterId: z.string().min(1, 'Semester is required'),
  dayOfWeek: z.string().min(1, 'Day is required'),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  roomNumber: z.string().optional(),
  building: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function SchedulesPage() {
  const queryClient = useQueryClient();
  const { can } = usePermission();
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<ClassSchedule | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['class-schedules', page],
    queryFn: () => classSchedulesApi.getAll({ page, limit: 10 }),
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
  const dayOptions = DAYS.map((d) => ({ value: d, label: d }));

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const createMutation = useMutation({
    mutationFn: classSchedulesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-schedules'] });
      toast.success('Schedule created');
      closeModal();
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message || 'Failed to create schedule');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<{ courseId: string; teacherId: string; semesterId: string; dayOfWeek: string; startTime: string; endTime: string; roomNumber: string; building: string }> }) =>
      classSchedulesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-schedules'] });
      toast.success('Schedule updated');
      closeModal();
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message || 'Failed to update schedule');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: classSchedulesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-schedules'] });
      toast.success('Schedule deleted');
      setDeleteId(null);
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message || 'Failed to delete schedule');
    },
  });

  const openCreate = () => {
    setEditItem(null);
    reset({ courseId: '', teacherId: '', semesterId: '', dayOfWeek: '', startTime: '', endTime: '', roomNumber: '', building: '' });
    setModalOpen(true);
  };

  const openEdit = (item: ClassSchedule) => {
    setEditItem(item);
    reset({
      courseId: item.courseId,
      teacherId: item.teacherId,
      semesterId: item.semesterId,
      dayOfWeek: item.dayOfWeek,
      startTime: item.startTime,
      endTime: item.endTime,
      roomNumber: item.roomNumber || '',
      building: item.building || '',
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

  const dayBadgeColor = (day: string) => {
    const colors = ['indigo', 'blue', 'emerald', 'amber', 'purple', 'rose', 'default'] as const;
    return colors[DAYS.indexOf(day) % colors.length];
  };

  const columns: Column<ClassSchedule>[] = [
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
        <span className="text-sm text-slate-600">{row.semester?.name ?? '-'}</span>
      ),
    },
    {
      header: 'Day', accessor: 'dayOfWeek', render: (_, row) => (
        <Badge variant={dayBadgeColor(row.dayOfWeek) as 'info'}>{row.dayOfWeek}</Badge>
      ),
    },
    {
      header: 'Time', accessor: 'startTime', render: (_, row) => (
        <span className="text-sm text-slate-700 font-mono">
          {formatTime(row.startTime)} - {formatTime(row.endTime)}
        </span>
      ),
    },
    {
      header: 'Room', accessor: 'roomNumber', render: (_, row) => (
        <span className="text-sm text-slate-600">
          {row.roomNumber ? `${row.roomNumber}${row.building ? ` (${row.building})` : ''}` : '-'}
        </span>
      ),
    },
    ...(can('schedules', 'update') || can('schedules', 'delete') ? [{
      header: 'Actions',
      accessor: 'id' as keyof ClassSchedule,
      render: (_: unknown, row: ClassSchedule) => (
        <div className="flex items-center gap-1">
          {can('schedules', 'update') && (
            <button onClick={() => openEdit(row)} className="p-1.5 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50 transition-colors">
              <Pencil className="w-4 h-4" />
            </button>
          )}
          {can('schedules', 'delete') && (
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
        title="Class Schedules"
        description="Manage weekly class timetables"
        action={
          can('schedules', 'create') ? (
            <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={openCreate}>
              Add Schedule
            </Button>
          ) : undefined
        }
      />

      <Card padding="none">
        <Table
          columns={columns}
          data={data?.items ?? []}
          loading={isLoading}
          emptyTitle="No schedules found"
          emptyMessage="Create class schedules to organize your timetable."
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
        title={editItem ? 'Edit Schedule' : 'Add Schedule'}
        onSubmit={handleSubmit(onSubmit)}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        submitLabel={editItem ? 'Update' : 'Create'}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Select label="Course" options={courseOptions} placeholder="Select course" error={errors.courseId?.message} required {...register('courseId')} />
          <Select label="Teacher" options={teacherOptions} placeholder="Select teacher" error={errors.teacherId?.message} required {...register('teacherId')} />
          <Select label="Semester" options={semesterOptions} placeholder="Select semester" error={errors.semesterId?.message} required {...register('semesterId')} />
          <div className="grid grid-cols-3 gap-4">
            <Select label="Day of Week" options={dayOptions} placeholder="Select day" error={errors.dayOfWeek?.message} required {...register('dayOfWeek')} />
            <Input label="Start Time" type="time" error={errors.startTime?.message} required {...register('startTime')} />
            <Input label="End Time" type="time" error={errors.endTime?.message} required {...register('endTime')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Room Number" placeholder="e.g., 201" {...register('roomNumber')} />
            <Input label="Building" placeholder="e.g., Main Block" {...register('building')} />
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title="Delete Schedule"
        message="Are you sure you want to delete this schedule?"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
