import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus, Pencil, Trash2, BookOpen,
  ChevronDown, ChevronRight, GraduationCap,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { semestersApi } from '../../api/semesters';
import { programsApi } from '../../api/programs';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal, ConfirmDialog } from '../../components/ui/Modal';
import { SearchInput } from '../../components/ui/SearchInput';
import { Badge } from '../../components/ui/Badge';
import { useDebounce } from '../../hooks/useDebounce';
import { usePermission } from '../../hooks/usePermission';
import { formatDate } from '../../lib/utils';
import type { Semester, SemesterCourses, SemesterGroup } from '../../types';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().min(1, 'Code is required'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  programId: z.string().min(1, 'Program is required'),
  semesterNumber: z.number().min(1, 'Min 1').max(8, 'Max 8'),
}).refine((d) => new Date(d.endDate) > new Date(d.startDate), {
  message: 'End date must be after start date',
  path: ['endDate'],
});

type FormData = z.infer<typeof schema>;

function getSemesterStatus(start: string, end: string) {
  const now = new Date();
  if (now < new Date(start)) return 'upcoming';
  if (now > new Date(end)) return 'ended';
  return 'active';
}

// ─── Semester row inside an expanded program ────────────────────────────────
interface SemRowProps {
  sem: Semester;
  canUpdate: boolean;
  canDelete: boolean;
  onEdit: (s: Semester) => void;
  onDelete: (id: string) => void;
  onViewCourses: (s: Semester) => void;
}

function SemesterRow({ sem, canUpdate, canDelete, onEdit, onDelete, onViewCourses }: SemRowProps) {
  const status = getSemesterStatus(sem.startDate, sem.endDate);
  return (
    <tr className="hover:bg-slate-50 border-b border-slate-100 last:border-0">
      <td className="px-4 py-3 w-20">
        {sem.semesterNumber
          ? <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-1 rounded">Sem {sem.semesterNumber}</span>
          : <span className="text-xs text-slate-400">—</span>}
      </td>
      <td className="px-4 py-3">
        <span className="text-sm font-medium text-slate-800">{sem.name}</span>
        <span className="ml-2 font-mono text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{sem.code}</span>
      </td>
      <td className="px-4 py-3 text-sm text-slate-500 whitespace-nowrap">
        {formatDate(sem.startDate)} — {formatDate(sem.endDate)}
      </td>
      <td className="px-4 py-3">
        {sem.courseCount != null ? (
          <div className="flex items-center gap-1.5">
            <span className="text-xs bg-emerald-50 text-emerald-700 font-medium px-2 py-0.5 rounded">{sem.courseCount} courses</span>
            <span className="text-xs bg-amber-50 text-amber-700 font-medium px-2 py-0.5 rounded">{sem.totalCredits} cr</span>
          </div>
        ) : <span className="text-xs text-slate-400">—</span>}
      </td>
      <td className="px-4 py-3">
        <Badge
          variant={status === 'active' ? 'success' : status === 'upcoming' ? 'info' : 'default'}
          dot
        >
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </Badge>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          <button
            onClick={() => onViewCourses(sem)}
            title="View linked courses"
            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
          >
            <BookOpen className="w-4 h-4" />
          </button>
          {canUpdate && (
            <button
              onClick={() => onEdit(sem)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
            >
              <Pencil className="w-4 h-4" />
            </button>
          )}
          {canDelete && (
            <button
              onClick={() => onDelete(sem.id)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

// ─── Program accordion section ───────────────────────────────────────────────
interface ProgramSectionProps {
  group: SemesterGroup;
  isOpen: boolean;
  onToggle: () => void;
  canUpdate: boolean;
  canDelete: boolean;
  onEdit: (s: Semester) => void;
  onDelete: (id: string) => void;
  onViewCourses: (s: Semester) => void;
}

function ProgramSection({
  group, isOpen, onToggle,
  canUpdate, canDelete, onEdit, onDelete, onViewCourses,
}: ProgramSectionProps) {
  const { program, semesters, totalCourses, totalCredits } = group;
  const activeSem = semesters.find((s) => getSemesterStatus(s.startDate, s.endDate) === 'active');

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      {/* Header — clickable to expand/collapse */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 bg-white hover:bg-slate-50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 rounded-lg">
            <GraduationCap className="w-4 h-4 text-indigo-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              {program ? (
                <>
                  <span className="font-mono text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                    {program.code}
                  </span>
                  <span className="font-semibold text-slate-800 text-sm">{program.name}</span>
                </>
              ) : (
                <span className="font-semibold text-slate-500 text-sm">Unassigned</span>
              )}
              {activeSem && (
                <Badge variant="success" dot>Active</Badge>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {semesters.length} semester{semesters.length !== 1 ? 's' : ''}
              {totalCourses > 0 && <> · {totalCourses} courses · {totalCredits} total credits</>}
              {program && <> · {program.durationYears} yr program</>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex gap-2">
            {semesters.map((s) => {
              const st = getSemesterStatus(s.startDate, s.endDate);
              return (
                <span
                  key={s.id}
                  title={`Sem ${s.semesterNumber}: ${st}`}
                  className={`w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold
                    ${st === 'active' ? 'bg-emerald-500 text-white' :
                      st === 'upcoming' ? 'bg-blue-200 text-blue-700' :
                      'bg-slate-200 text-slate-500'}`}
                >
                  {s.semesterNumber}
                </span>
              );
            })}
          </div>
          {isOpen
            ? <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
            : <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />}
        </div>
      </button>

      {/* Semesters table */}
      {isOpen && (
        <div className="border-t border-slate-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left text-xs text-slate-500 uppercase tracking-wide">
                <th className="px-4 py-2 font-medium">Sem #</th>
                <th className="px-4 py-2 font-medium">Name / Code</th>
                <th className="px-4 py-2 font-medium">Date Range</th>
                <th className="px-4 py-2 font-medium">Courses / Credits</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {semesters
                .slice()
                .sort((a, b) => (a.semesterNumber ?? 0) - (b.semesterNumber ?? 0))
                .map((sem) => (
                  <SemesterRow
                    key={sem.id}
                    sem={sem}
                    canUpdate={canUpdate}
                    canDelete={canDelete}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onViewCourses={onViewCourses}
                  />
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────
export default function SemestersPage() {
  const queryClient = useQueryClient();
  const { can } = usePermission();

  const [search, setSearch] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<Semester | null>(null);
  const [coursesSemester, setCoursesSemester] = useState<Semester | null>(null);

  const debouncedSearch = useDebounce(search);

  // Single API call — server groups by program and computes stats
  const { data: grouped = [], isLoading } = useQuery({
    queryKey: ['semesters-by-program', debouncedSearch],
    queryFn: () => semestersApi.getGroupedByProgram(debouncedSearch || undefined),
  });

  // For the create/edit form: need flat program list for the select
  const { data: programData } = useQuery({
    queryKey: ['programs-all'],
    queryFn: () => programsApi.getAll({ limit: 100 }),
  });

  const { data: semesterCoursesData, isLoading: coursesLoading } = useQuery({
    queryKey: ['semester-courses', coursesSemester?.id],
    queryFn: () => semestersApi.getCourses(coursesSemester!.id),
    enabled: !!coursesSemester,
  });

  const programOptions = (programData?.items ?? []).map((p) => ({ value: p.id, label: `${p.code} – ${p.name}` }));

  const totalSemesters = grouped.reduce((sum, g) => sum + g.totalSemesters, 0);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const isExpanded = (id: string) => expandedIds.has(id);

  // ── Mutations ─────────────────────────────────────────────────────────────
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const createMutation = useMutation({
    mutationFn: semestersApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['semesters-by-program'] });
      toast.success('Semester created');
      closeModal();
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message || 'Failed to create semester');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<{ name: string; code: string; startDate: string; endDate: string; programId: string; semesterNumber: number }> }) =>
      semestersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['semesters-by-program'] });
      toast.success('Semester updated');
      closeModal();
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message || 'Failed to update semester');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => semestersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['semesters-by-program'] });
      toast.success('Semester deleted');
      setDeleteId(null);
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message || 'Failed to delete semester');
    },
  });

  const openCreate = () => {
    setEditItem(null);
    reset({ name: '', code: '', startDate: '', endDate: '', programId: '', semesterNumber: undefined as unknown as number });
    setModalOpen(true);
  };

  const openEdit = (item: Semester) => {
    setEditItem(item);
    reset({
      name: item.name,
      code: item.code,
      startDate: item.startDate.split('T')[0],
      endDate: item.endDate.split('T')[0],
      programId: item.programId ?? '',
      semesterNumber: item.semesterNumber ?? undefined,
    });
    setModalOpen(true);
  };

  const closeModal = () => { setModalOpen(false); setEditItem(null); reset(); };

  const onSubmit = (formData: FormData) => {
    if (editItem) updateMutation.mutate({ id: editItem.id, data: formData });
    else createMutation.mutate(formData);
  };


  return (
    <div>
      <PageHeader
        title="Semesters"
        description="Academic semesters organised by program"
        action={
          can('semesters', 'create') ? (
            <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={openCreate}>
              Add Semester
            </Button>
          ) : undefined
        }
      />

      {/* Search + summary bar */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchInput
          value={search}
          onChange={(v) => setSearch(v)}
          placeholder="Search programs or semesters..."
          className="max-w-sm flex-1"
        />
        {!isLoading && (
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <span><strong className="text-slate-700">{grouped.length}</strong> programs</span>
            <span className="text-slate-300">·</span>
            <span><strong className="text-slate-700">{totalSemesters}</strong> semesters</span>
            {debouncedSearch && (
              <>
                <span className="text-slate-300">·</span>
                <span className="text-indigo-600">{grouped.length} matching</span>
              </>
            )}
          </div>
        )}
        {debouncedSearch && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="text-xs text-slate-400 hover:text-slate-600 underline"
          >
            Clear
          </button>
        )}
      </div>

      {/* Expand / Collapse all */}
      {!isLoading && grouped.length > 0 && (
        <div className="flex gap-2 mb-3">
          <button
            type="button"
            onClick={() => setExpandedIds(new Set(grouped.map((g) => g.program?.id ?? 'unassigned')))}
            className="text-xs text-slate-500 hover:text-slate-700 underline"
          >
            Expand all
          </button>
          <span className="text-slate-300">·</span>
          <button
            type="button"
            onClick={() => setExpandedIds(new Set())}
            className="text-xs text-slate-500 hover:text-slate-700 underline"
          >
            Collapse all
          </button>
        </div>
      )}

      {/* Accordion list */}
      {isLoading ? (
        <div className="py-12 text-center text-sm text-slate-400">Loading semesters...</div>
      ) : grouped.length === 0 ? (
        <div className="py-12 text-center text-sm text-slate-400">
          {debouncedSearch ? `No semesters match "${debouncedSearch}"` : 'No semesters found. Add your first semester to get started.'}
        </div>
      ) : (
        <div className="space-y-3">
          {grouped.map((group) => {
            const key = group.program?.id ?? 'unassigned';
            return (
              <ProgramSection
                key={key}
                group={group}
                isOpen={isExpanded(key)}
                onToggle={() => toggleExpand(key)}
                canUpdate={can('semesters', 'update')}
                canDelete={can('semesters', 'delete')}
                onEdit={openEdit}
                onDelete={(id) => setDeleteId(id)}
                onViewCourses={setCoursesSemester}
              />
            );
          })}
        </div>
      )}

      {/* Create / Edit modal */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editItem ? 'Edit Semester' : 'Add Semester'}
        onSubmit={handleSubmit(onSubmit)}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        submitLabel={editItem ? 'Update' : 'Create'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Semester Name" placeholder="e.g., BIT Semester 3" error={errors.name?.message} required {...register('name')} />
          <Input label="Code" placeholder="e.g., BIT-S3" error={errors.code?.message} required {...register('code')} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Start Date" type="date" error={errors.startDate?.message} required {...register('startDate')} />
            <Input label="End Date" type="date" error={errors.endDate?.message} required {...register('endDate')} />
          </div>
          <Select
            label="Program"
            options={programOptions}
            placeholder="Select program"
            error={errors.programId?.message}
            required
            {...register('programId')}
          />
          <Input
            label="Semester Number"
            type="number"
            min={1}
            max={8}
            placeholder="e.g., 3"
            hint="Links only this program's Semester N courses"
            error={errors.semesterNumber?.message}
            required
            {...register('semesterNumber', { setValueAs: (v) => (v === '' || v === null || isNaN(Number(v)) ? undefined : Number(v)) })}
          />
        </form>
      </Modal>

      {/* Delete confirm */}
      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title="Delete Semester"
        message="Are you sure you want to delete this semester? This may affect enrollments and schedules."
        isLoading={deleteMutation.isPending}
      />

      {/* Courses modal */}
      <Modal
        isOpen={!!coursesSemester}
        onClose={() => setCoursesSemester(null)}
        title={coursesSemester ? `${coursesSemester.name} — Linked Courses` : 'Linked Courses'}
        size="xl"
        hideFooter
      >
        {!coursesSemester?.semesterNumber && (
          <div className="py-6 text-center">
            <p className="text-sm text-slate-500 mb-1">No semester number assigned.</p>
            <p className="text-xs text-slate-400">Edit this semester and set a Semester Number (1–8) to auto-link curriculum courses.</p>
          </div>
        )}
        {coursesSemester?.semesterNumber && coursesLoading && (
          <div className="py-8 text-center text-sm text-slate-500">Loading courses...</div>
        )}
        {coursesSemester?.semesterNumber && !coursesLoading && semesterCoursesData && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-4 py-3 text-center">
                <p className="text-2xl font-bold text-indigo-700">{semesterCoursesData.totalCourses}</p>
                <p className="text-xs text-indigo-500 mt-0.5">Total Courses</p>
              </div>
              <div className="bg-amber-50 border border-amber-100 rounded-lg px-4 py-3 text-center">
                <p className="text-2xl font-bold text-amber-700">{semesterCoursesData.totalCredits}</p>
                <p className="text-xs text-amber-500 mt-0.5">Total Credit Hours</p>
              </div>
              <div className="bg-emerald-50 border border-emerald-100 rounded-lg px-4 py-3 text-center">
                <p className="text-2xl font-bold text-emerald-700">
                  {semesterCoursesData.totalCourses > 0
                    ? (semesterCoursesData.totalCredits / semesterCoursesData.totalCourses).toFixed(1)
                    : '—'}
                </p>
                <p className="text-xs text-emerald-500 mt-0.5">Avg Credits / Course</p>
              </div>
            </div>
            {semesterCoursesData.stats && semesterCoursesData.stats.byDepartment.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {semesterCoursesData.stats.byDepartment.map((dept) => (
                  <span key={dept.code} className="text-xs bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
                    {dept.code}: {dept.courses} courses · {dept.credits} cr
                  </span>
                ))}
              </div>
            )}
            {semesterCoursesData.totalCourses === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">No courses found for semester {coursesSemester.semesterNumber}.</p>
            ) : (
              <div className="max-h-[45vh] overflow-y-auto border border-slate-200 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr className="text-left text-xs text-slate-500 uppercase tracking-wide border-b border-slate-200">
                      <th className="px-4 py-2 font-medium">Code</th>
                      <th className="px-4 py-2 font-medium">Course Name</th>
                      <th className="px-4 py-2 font-medium">Dept</th>
                      <th className="px-4 py-2 font-medium text-right">Credits</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {semesterCoursesData.courses.map((course) => (
                      <tr key={course.id} className="hover:bg-slate-50">
                        <td className="px-4 py-2">
                          <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded">{course.code}</span>
                        </td>
                        <td className="px-4 py-2 text-slate-700">{course.name}</td>
                        <td className="px-4 py-2 text-slate-500 text-xs">{course.departmentCode ?? '—'}</td>
                        <td className="px-4 py-2 text-right font-medium text-slate-600">{course.creditHour}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 border-t border-slate-200">
                    <tr>
                      <td colSpan={3} className="px-4 py-2 text-xs font-semibold text-slate-600 text-right">Total</td>
                      <td className="px-4 py-2 text-right font-bold text-slate-800">{semesterCoursesData.totalCredits}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
