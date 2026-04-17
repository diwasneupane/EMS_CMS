import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus,
  ChevronRight,
  ArrowLeft,
  GraduationCap,
  BookOpen,
  TrendingUp,
  Pencil,
  Trash2,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import toast from "react-hot-toast";
import { resultsApi } from "../../api/results";
import type {
  ResultGroupedStudent,
  ResultStudentSemester,
} from "../../api/results";
import { coursesApi } from "../../api/courses";
import { semestersApi } from "../../api/semesters";
import { programsApi } from "../../api/programs";
import { departmentsApi } from "../../api/departments";
import { usersApi } from "../../api/users";
import { PageHeader } from "../../components/layout/PageHeader";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Modal, ConfirmDialog } from "../../components/ui/Modal";
import { Pagination } from "../../components/ui/Pagination";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Spinner } from "../../components/ui/Spinner";
import { usePermission } from "../../hooks/usePermission";
import { useDebounce } from "../../hooks/useDebounce";
import { calculateGrade, calculateGPA, getInitials } from "../../lib/utils";
import type { Result } from "../../types";

const schema = z.object({
  studentId: z.string().min(1, "Student is required"),
  courseId: z.string().min(1, "Course is required"),
  semesterId: z.string().min(1, "Semester is required"),
  academicMark: z.number().min(0).max(80, "Max 80"),
  practicalMark: z.number().min(0).max(20, "Max 20"),
});

type FormData = z.infer<typeof schema>;

function gradeVariant(
  grade: string,
): "success" | "info" | "warning" | "error" | "default" {
  if (grade === "A+" || grade === "A") return "success";
  if (grade === "B+" || grade === "B") return "info";
  if (grade === "C+" || grade === "C") return "warning";
  if (grade === "F") return "error";
  return "default";
}

function GPABadge({ gpa }: { gpa: number }) {
  const color =
    gpa >= 3.6
      ? "bg-emerald-100 text-emerald-700"
      : gpa >= 3.0
        ? "bg-blue-100 text-blue-700"
        : gpa >= 2.0
          ? "bg-amber-100 text-amber-700"
          : "bg-red-100 text-red-700";
  return (
    <span
      className={`inline-flex items-center gap-1 text-sm font-bold px-2.5 py-0.5 rounded-full ${color}`}
    >
      GPA {gpa.toFixed(2)}
    </span>
  );
}

// ─── Level 1: Student Cards ───────────────────────────────────────────────────
function StudentList({
  onSelect,
  onAddResult,
  canCreate,
}: {
  onSelect: (s: ResultGroupedStudent) => void;
  onAddResult: () => void;
  canCreate: boolean;
}) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [deptId, setDeptId] = useState('');
  const [programId, setProgramId] = useState('');
  const [semesterId, setSemesterId] = useState('');
  const debouncedSearch = useDebounce(search, 400);

  const { data: depts } = useQuery({
    queryKey: ['departments-all'],
    queryFn: () => departmentsApi.getAll({ limit: 100 }),
  });
  const { data: programs } = useQuery({
    queryKey: ['programs-by-dept', deptId],
    queryFn: () => programsApi.getAll({ limit: 100, departmentId: deptId || undefined }),
  });
  const { data: semesters } = useQuery({
    queryKey: ['semesters-all'],
    queryFn: () => semestersApi.getAll({ limit: 100 }),
  });

  const hasFilter = !!(debouncedSearch || deptId || programId || semesterId);

  const { data, isLoading } = useQuery({
    queryKey: ['results-grouped', page, debouncedSearch, deptId, programId, semesterId],
    queryFn: () => resultsApi.getGrouped({
      page,
      limit: 20,
      search: debouncedSearch || undefined,
      departmentId: deptId || undefined,
      programId: programId || undefined,
      semesterId: semesterId || undefined,
    }),
    enabled: hasFilter,
  });

  const clearFilters = () => {
    setSearch(''); setDeptId(''); setProgramId(''); setSemesterId(''); setPage(1);
  };

  const students = data?.items ?? [];

  const selectCls = "text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white";

  return (
    <div>
      {/* Filter bar */}
      <Card className="mb-5">
        <div className="flex flex-wrap gap-3 items-end">
          {/* Search */}
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs font-medium text-slate-600 mb-1">Search student</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Name or enrollment no."
                className="w-full pl-8 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
              />
            </div>
          </div>

          {/* Department */}
          <div className="min-w-[160px]">
            <label className="block text-xs font-medium text-slate-600 mb-1">Department</label>
            <select
              value={deptId}
              onChange={(e) => { setDeptId(e.target.value); setProgramId(''); setPage(1); }}
              className={selectCls}
            >
              <option value="">All Departments</option>
              {(depts?.items ?? []).map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          {/* Program — cascades from dept */}
          <div className="min-w-[160px]">
            <label className="block text-xs font-medium text-slate-600 mb-1">Program</label>
            <select
              value={programId}
              onChange={(e) => { setProgramId(e.target.value); setPage(1); }}
              className={selectCls}
              disabled={!deptId}
            >
              <option value="">{deptId ? 'All Programs' : 'Select dept first'}</option>
              {(programs?.items ?? []).map((p) => (
                <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
              ))}
            </select>
          </div>

          {/* Semester */}
          <div className="min-w-[150px]">
            <label className="block text-xs font-medium text-slate-600 mb-1">Semester</label>
            <select
              value={semesterId}
              onChange={(e) => { setSemesterId(e.target.value); setPage(1); }}
              className={selectCls}
            >
              <option value="">All Semesters</option>
              {(semesters?.items ?? []).map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-end gap-2">
            {hasFilter && (
              <button
                onClick={clearFilters}
                className="text-xs text-slate-500 hover:text-slate-800 underline underline-offset-2 whitespace-nowrap pb-2"
              >
                Clear
              </button>
            )}
            {canCreate && (
              <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={onAddResult}>
                Add Result
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Prompt when no filter applied */}
      {!hasFilter ? (
        <Card>
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <SlidersHorizontal className="w-10 h-10 text-slate-300 mb-3" />
            <p className="font-medium text-slate-600">Use filters to find students</p>
            <p className="text-sm text-slate-400 mt-1">
              Search by name, or filter by department, program, or semester.
            </p>
          </div>
        </Card>
      ) : isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Spinner size="lg" />
        </div>
      ) : students.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <GraduationCap className="w-12 h-12 text-slate-300 mb-3" />
            <p className="font-medium text-slate-500">No students match the selected filters</p>
            <p className="text-sm text-slate-400 mt-1">Try adjusting your search or filters.</p>
          </div>
        </Card>
      ) : (
        <>
          <p className="text-sm text-slate-500 mb-3">{data?.meta.total ?? 0} students found</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            {students.map((s) => (
              <button
                key={s.studentId}
                onClick={() => onSelect(s)}
                className="text-left bg-white rounded-xl border border-slate-200 p-4 hover:border-primary-300 hover:shadow-md transition-all group"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {getInitials(
                      s.studentName.split(" ")[0],
                      s.studentName.split(" ").slice(1).join(" "),
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-800 truncate group-hover:text-primary-700">
                      {s.studentName}
                    </p>
                    <p className="text-xs text-slate-500 truncate">{s.enrollmentNumber}</p>
                    <p className="text-xs text-slate-400 truncate">{s.programCode}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-primary-500 flex-shrink-0 mt-1 transition-colors" />
                </div>

                <div className="flex items-center justify-between">
                  <GPABadge gpa={Number(s.overallGPA)} />
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="text-emerald-600 font-medium">{s.passedCourses} passed</span>
                    {s.failedCourses > 0 && (
                      <span className="text-red-600 font-medium">{s.failedCourses} failed</span>
                    )}
                  </div>
                </div>

                <div className="mt-2.5 grid grid-cols-3 gap-2 pt-2.5 border-t border-slate-100 text-center">
                  <div>
                    <p className="text-sm font-bold text-slate-800">{s.totalSemesters}</p>
                    <p className="text-xs text-slate-400">Semesters</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{s.totalCourses}</p>
                    <p className="text-xs text-slate-400">Courses</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      {s.totalCourses > 0 ? Math.round((s.passedCourses / s.totalCourses) * 100) : 0}%
                    </p>
                    <p className="text-xs text-slate-400">Pass rate</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
          {data && (
            <Pagination
              currentPage={page}
              totalPages={data.meta.totalPages}
              total={data.meta.total}
              limit={20}
              onPageChange={setPage}
            />
          )}
        </>
      )}
    </div>
  );
}

// ─── Level 2: Semester Breakdown ─────────────────────────────────────────────
function SemesterList({
  student,
  onSelect,
  onBack,
}: {
  student: ResultGroupedStudent;
  onSelect: (sem: ResultStudentSemester) => void;
  onBack: () => void;
}) {
  const { data: semesters, isLoading } = useQuery({
    queryKey: ["results-student-semesters", student.studentId],
    queryFn: () => resultsApi.getStudentSemesters(student.studentId),
  });

  return (
    <div>
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 mb-5 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to students
      </button>

      <div className="flex items-center gap-3 bg-white rounded-xl border border-slate-200 p-4 mb-5">
        <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-base font-bold flex-shrink-0">
          {getInitials(
            student.studentName.split(" ")[0],
            student.studentName.split(" ").slice(1).join(" "),
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-800">{student.studentName}</p>
          <p className="text-sm text-slate-500">
            {student.enrollmentNumber} &bull; {student.programName}
          </p>
        </div>
        <GPABadge gpa={student.overallGPA} />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : (semesters ?? []).length === 0 ? (
        <Card>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <BookOpen className="w-10 h-10 text-slate-300 mb-3" />
            <p className="text-slate-500">No semester results found</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(semesters ?? []).map((sem) => (
            <button
              key={sem.semesterId}
              onClick={() => onSelect(sem)}
              className="text-left bg-white rounded-xl border border-slate-200 p-4 hover:border-primary-300 hover:shadow-md transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800 group-hover:text-primary-700">
                    {sem.semesterName}
                  </p>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    {sem.semesterCode}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge variant={sem.isCompleted ? "success" : "info"}>
                    {sem.isCompleted ? "Completed" : "Ongoing"}
                  </Badge>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-primary-500 transition-colors" />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <GPABadge gpa={sem.semesterGPA} />
                <div className="text-xs text-slate-500">
                  <span className="text-emerald-600 font-medium">
                    {sem.passedCourses}
                  </span>
                  <span className="text-slate-400">
                    {" "}
                    / {sem.totalCourses} passed
                  </span>
                  {sem.failedCourses > 0 && (
                    <span className="text-red-500 font-medium ml-1">
                      ({sem.failedCourses} failed)
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Level 3: Course Results ──────────────────────────────────────────────────
function CourseResultList({
  student,
  semester,
  onBack,
  canUpdate,
  canDelete,
}: {
  student: ResultGroupedStudent;
  semester: ResultStudentSemester;
  onBack: () => void;
  canUpdate: boolean;
  canDelete: boolean;
}) {
  const queryClient = useQueryClient();
  const [editItem, setEditItem] = useState<Result | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: [
      "results-student-semester",
      student.studentId,
      semester.semesterId,
    ],
    queryFn: () =>
      resultsApi.getStudentSemesterResults(
        student.studentId,
        semester.semesterId,
      ),
  });

  const { data: coursesData } = useQuery({
    queryKey: ["courses-all"],
    queryFn: () => coursesApi.getAll({ limit: 100 }),
  });

  const schema2 = z.object({
    academicMark: z.number().min(0).max(80, "Max 80"),
    practicalMark: z.number().min(0).max(20, "Max 20"),
    remarks: z.string().optional(),
  });
  type EditFormData = z.infer<typeof schema2>;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<EditFormData>({
    resolver: zodResolver(schema2),
  });
  const watchedAcademic = watch("academicMark") ?? 0;
  const watchedPractical = watch("practicalMark") ?? 0;
  const liveTotal = Number(watchedAcademic) + Number(watchedPractical);
  const liveGrade = calculateGrade(liveTotal);

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: EditFormData }) =>
      resultsApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [
          "results-student-semester",
          student.studentId,
          semester.semesterId,
        ],
      });
      queryClient.invalidateQueries({ queryKey: ["results-grouped"] });
      toast.success("Result updated");
      setModalOpen(false);
      setEditItem(null);
      reset();
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message || "Failed to update result");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => resultsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [
          "results-student-semester",
          student.studentId,
          semester.semesterId,
        ],
      });
      queryClient.invalidateQueries({ queryKey: ["results-grouped"] });
      toast.success("Result deleted");
      setDeleteId(null);
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message || "Failed to delete result");
    },
  });

  const openEdit = (r: Result) => {
    setEditItem(r);
    reset({
      academicMark: Number(r.academicMark),
      practicalMark: Number(r.practicalMark),
      remarks: r.remarks ?? "",
    });
    setModalOpen(true);
  };

  const openDelete = (r: Result) => {
    setDeleteId(r.id);
  };

  const items = data?.items ?? [];

  return (
    <div>
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 mb-5 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to semesters
      </button>

      {/* Context header */}
      <div className="flex items-center gap-3 bg-white rounded-xl border border-slate-200 p-4 mb-5 flex-wrap">
        <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-bold flex-shrink-0">
          {getInitials(
            student.studentName.split(" ")[0],
            student.studentName.split(" ").slice(1).join(" "),
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-800">{student.studentName}</p>
          <p className="text-sm text-slate-500">{student.enrollmentNumber}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-slate-700 bg-slate-100 px-3 py-1 rounded-full">
            {semester.semesterName}
          </span>
          <GPABadge gpa={semester.semesterGPA} />
          <Badge variant={semester.isCompleted ? "success" : "info"}>
            {semester.isCompleted ? "Completed" : "Ongoing"}
          </Badge>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : items.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <TrendingUp className="w-10 h-10 text-slate-300 mb-3" />
            <p className="text-slate-500">
              No course results for this semester
            </p>
          </div>
        </Card>
      ) : (
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  {[
                    "Course",
                    "Academic (80)",
                    "Practical (20)",
                    "Total",
                    "Grade",
                    "GPA",
                    "Attendance",
                    ...(canUpdate || canDelete ? ["Actions"] : []),
                  ].map((h) => (
                    <th
                      key={h}
                      className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((r) => (
                  <tr
                    key={r.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-slate-800">
                        {r.course?.name ?? "-"}
                      </p>
                      <p className="text-xs font-mono text-slate-400">
                        {r.course?.code}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {Number(r.academicMark)}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {Number(r.practicalMark)}
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-slate-800">
                      {Number(r.totalMark)}/100
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={gradeVariant(r.grade ?? "")}>
                        {r.grade ?? "-"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-700">
                      {r.gradePoint != null
                        ? Number(r.gradePoint).toFixed(1)
                        : "-"}
                    </td>
                    <td className="px-4 py-3">
                      {r.attendancePercentage != null ? (
                        <div className="flex items-center gap-2 min-w-[90px]">
                          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${Number(r.attendancePercentage) >= 75 ? "bg-emerald-500" : "bg-red-400"}`}
                              style={{
                                width: `${Math.min(Number(r.attendancePercentage), 100)}%`,
                              }}
                            />
                          </div>
                          <span className="text-xs font-medium text-slate-600 tabular-nums">
                            {Number(r.attendancePercentage).toFixed(1)}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    {(canUpdate || canDelete) && (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {canUpdate && (
                            <button
                              onClick={() => openEdit(r)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => openDelete(r)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Semester summary footer */}
          <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex flex-wrap gap-6 text-sm">
            <span className="text-slate-500">
              Courses:{" "}
              <strong className="text-slate-800">
                {semester.totalCourses}
              </strong>
            </span>
            <span className="text-slate-500">
              Passed:{" "}
              <strong className="text-emerald-700">
                {semester.passedCourses}
              </strong>
            </span>
            {semester.failedCourses > 0 && (
              <span className="text-slate-500">
                Failed:{" "}
                <strong className="text-red-600">
                  {semester.failedCourses}
                </strong>
              </span>
            )}
            <span className="text-slate-500">
              Semester GPA:{" "}
              <strong className="text-slate-800">
                {semester.semesterGPA.toFixed(2)}
              </strong>
            </span>
          </div>
        </Card>
      )}

      {/* Edit modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditItem(null);
          reset();
        }}
        title="Edit Result"
        onSubmit={handleSubmit(
          (d) =>
            editItem && updateMutation.mutate({ id: editItem.id, payload: d }),
        )}
        isSubmitting={updateMutation.isPending}
        submitLabel="Update"
      >
        <form className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Academic Mark (out of 80)"
              type="number"
              min={0}
              max={80}
              error={errors.academicMark?.message}
              required
              {...register("academicMark", { valueAsNumber: true })}
            />
            <Input
              label="Practical Mark (out of 20)"
              type="number"
              min={0}
              max={20}
              error={errors.practicalMark?.message}
              required
              {...register("practicalMark", { valueAsNumber: true })}
            />
          </div>
          <Input
            label="Remarks"
            placeholder="Optional remarks"
            {...register("remarks")}
          />
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <p className="text-sm font-medium text-slate-600 mb-3">
              Grade Preview
            </p>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-slate-900">{liveTotal}</p>
                <p className="text-xs text-slate-500">Total / 100</p>
              </div>
              <div className="text-center">
                <Badge
                  variant={gradeVariant(liveGrade)}
                  className="text-base px-3 py-1"
                >
                  {liveGrade}
                </Badge>
                <p className="text-xs text-slate-500 mt-1">Grade</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-slate-900">
                  {calculateGPA(liveTotal).toFixed(1)}
                </p>
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

// ─── Root Page ────────────────────────────────────────────────────────────────
export default function ResultsPage() {
  const queryClient = useQueryClient();
  const { can } = usePermission();
  const [selectedStudent, setSelectedStudent] =
    useState<ResultGroupedStudent | null>(null);
  const [selectedSemester, setSelectedSemester] =
    useState<ResultStudentSemester | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Data for Add Result form
  const { data: coursesData } = useQuery({
    queryKey: ["courses-all"],
    queryFn: () => coursesApi.getAll({ limit: 100 }),
  });
  const { data: semestersData } = useQuery({
    queryKey: ["semesters-all"],
    queryFn: () => semestersApi.getAll({ limit: 100 }),
  });
  const { data: studentsData } = useQuery({
    queryKey: ["students-all"],
    queryFn: () => usersApi.getStudents({ limit: 200 }),
  });

  const courseOptions = (coursesData?.items ?? []).map((c) => ({
    value: c.id,
    label: `${c.code} - ${c.name}`,
  }));
  const semesterOptions = (semestersData?.items ?? []).map((s) => ({
    value: s.id,
    label: s.name,
  }));
  const studentOptions = (studentsData?.items ?? []).map((s) => ({
    value: s.id,
    label: `${s.firstName} ${s.lastName}`,
  }));

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });
  const watchedAcademic = watch("academicMark") ?? 0;
  const watchedPractical = watch("practicalMark") ?? 0;
  const liveTotal = Number(watchedAcademic) + Number(watchedPractical);
  const liveGrade = calculateGrade(liveTotal);

  const createMutation = useMutation({
    mutationFn: resultsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["results-grouped"] });
      toast.success("Result added");
      setModalOpen(false);
      reset();
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message || "Failed to add result");
    },
  });

  // Breadcrumb
  const crumbs = [
    {
      label: "Results",
      onClick: () => {
        setSelectedStudent(null);
        setSelectedSemester(null);
      },
    },
    ...(selectedStudent
      ? [
          {
            label: selectedStudent.studentName,
            onClick: () => setSelectedSemester(null),
          },
        ]
      : []),
    ...(selectedSemester
      ? [{ label: selectedSemester.semesterName, onClick: undefined }]
      : []),
  ];

  return (
    <div>
      <PageHeader
        title="Results"
        description="Academic performance by student, semester and course"
      />

      {/* Breadcrumb */}
      {crumbs.length > 1 && (
        <nav className="flex items-center gap-1.5 text-sm mb-4 flex-wrap">
          {crumbs.map((crumb, i) => (
            <React.Fragment key={i}>
              {i > 0 && (
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              )}
              {crumb.onClick ? (
                <button
                  onClick={crumb.onClick}
                  className="text-primary-600 hover:underline font-medium"
                >
                  {crumb.label}
                </button>
              ) : (
                <span className="text-slate-700 font-medium">
                  {crumb.label}
                </span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}

      {/* Level routing */}
      {!selectedStudent && (
        <StudentList
          onSelect={setSelectedStudent}
          onAddResult={() => setModalOpen(true)}
          canCreate={can("results", "create")}
        />
      )}

      {selectedStudent && !selectedSemester && (
        <SemesterList
          student={selectedStudent}
          onSelect={setSelectedSemester}
          onBack={() => setSelectedStudent(null)}
        />
      )}

      {selectedStudent && selectedSemester && (
        <CourseResultList
          student={selectedStudent}
          semester={selectedSemester}
          onBack={() => setSelectedSemester(null)}
          canUpdate={can("results", "update")}
          canDelete={can("results", "delete")}
        />
      )}

      {/* Add Result Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          reset();
        }}
        title="Add Result"
        onSubmit={handleSubmit((d) => createMutation.mutate(d))}
        isSubmitting={createMutation.isPending}
        submitLabel="Save"
        size="lg"
      >
        <form className="space-y-4">
          <Select
            label="Student"
            options={studentOptions}
            placeholder="Select student"
            error={errors.studentId?.message}
            required
            {...register("studentId")}
          />
          <Select
            label="Course"
            options={courseOptions}
            placeholder="Select course"
            error={errors.courseId?.message}
            required
            {...register("courseId")}
          />
          <Select
            label="Semester"
            options={semesterOptions}
            placeholder="Select semester"
            error={errors.semesterId?.message}
            required
            {...register("semesterId")}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Academic Mark (out of 80)"
              type="number"
              min={0}
              max={80}
              error={errors.academicMark?.message}
              required
              {...register("academicMark", { valueAsNumber: true })}
            />
            <Input
              label="Practical Mark (out of 20)"
              type="number"
              min={0}
              max={20}
              error={errors.practicalMark?.message}
              required
              {...register("practicalMark", { valueAsNumber: true })}
            />
          </div>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <p className="text-sm font-medium text-slate-600 mb-3">
              Grade Preview
            </p>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-slate-900">{liveTotal}</p>
                <p className="text-xs text-slate-500">Total / 100</p>
              </div>
              <div className="text-center">
                <Badge
                  variant={gradeVariant(liveGrade)}
                  className="text-base px-3 py-1"
                >
                  {liveGrade}
                </Badge>
                <p className="text-xs text-slate-500 mt-1">Grade</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-slate-900">
                  {calculateGPA(liveTotal).toFixed(1)}
                </p>
                <p className="text-xs text-slate-500">GPA</p>
              </div>
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() =>
          deleteId &&
          resultsApi.delete(deleteId).then(() => {
            queryClient.invalidateQueries({ queryKey: ["results-grouped"] });
            setDeleteId(null);
          })
        }
        title="Delete Result"
        message="Are you sure you want to delete this result?"
        isLoading={false}
      />
    </div>
  );
}
