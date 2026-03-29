import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus,
  Pencil,
  Trash2,
  Clock,
  MapPin,
  User,
  CalendarDays,
} from "lucide-react";
import toast from "react-hot-toast";
import { classSchedulesApi } from "../../api/classSchedules";
import { coursesApi } from "../../api/courses";
import { semestersApi } from "../../api/semesters";
import { usersApi } from "../../api/users";
import { PageHeader } from "../../components/layout/PageHeader";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Modal, ConfirmDialog } from "../../components/ui/Modal";
import { Pagination } from "../../components/ui/Pagination";
import { usePermission } from "../../hooks/usePermission";
import { formatTime } from "../../lib/utils";
import type { ClassSchedule } from "../../types";

// ─── Constants ───────────────────────────────────────────────────────────────
// Always lowercase — matches backend DayOfWeek enum
const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

type Day = (typeof DAYS)[number];

const DAY_OPTIONS = DAYS.map((d) => ({
  value: d,
  label: d.charAt(0).toUpperCase() + d.slice(1),
}));

// ─── Schema ───────────────────────────────────────────────────────────────────
const schema = z.object({
  courseId: z.string().min(1, "Course is required"),
  teacherId: z.string().min(1, "Teacher is required"),
  semesterId: z.string().min(1, "Semester is required"),
  dayOfWeek: z.enum(DAYS, { required_error: "Day is required" }),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  roomNumber: z.string().optional(),
  building: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

// ─── Day config ───────────────────────────────────────────────────────────────
const DAY_CONFIG: Record<
  Day,
  { short: string; color: string; bg: string; border: string; dot: string }
> = {
  monday: {
    short: "MON",
    color: "text-indigo-700",
    bg: "bg-indigo-50",
    border: "border-indigo-200",
    dot: "bg-indigo-500",
  },
  tuesday: {
    short: "TUE",
    color: "text-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-200",
    dot: "bg-blue-500",
  },
  wednesday: {
    short: "WED",
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    dot: "bg-emerald-500",
  },
  thursday: {
    short: "THU",
    color: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
    dot: "bg-amber-500",
  },
  friday: {
    short: "FRI",
    color: "text-violet-700",
    bg: "bg-violet-50",
    border: "border-violet-200",
    dot: "bg-violet-500",
  },
  saturday: {
    short: "SAT",
    color: "text-rose-700",
    bg: "bg-rose-50",
    border: "border-rose-200",
    dot: "bg-rose-500",
  },
  sunday: {
    short: "SUN",
    color: "text-slate-600",
    bg: "bg-slate-50",
    border: "border-slate-200",
    dot: "bg-slate-400",
  },
};

// ─── Schedule Card ────────────────────────────────────────────────────────────
interface ScheduleCardProps {
  item: ClassSchedule;
  canUpdate: boolean;
  canDelete: boolean;
  onEdit: (item: ClassSchedule) => void;
  onDelete: (id: string) => void;
}

function ScheduleCard({
  item,
  canUpdate,
  canDelete,
  onEdit,
  onDelete,
}: ScheduleCardProps) {
  const day = (item.dayOfWeek?.toLowerCase() ?? "monday") as Day;
  const cfg = DAY_CONFIG[day] ?? DAY_CONFIG.monday;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 hover:shadow-md transition-all duration-200 overflow-hidden group">
      {/* Top color strip */}
      <div className={`h-1 w-full ${cfg.dot}`} />

      <div className="p-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2 mb-3">
          {/* Day badge */}
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold tracking-wide border ${cfg.bg} ${cfg.color} ${cfg.border}`}
          >
            {cfg.short}
          </span>

          {/* Actions */}
          {(canUpdate || canDelete) && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {canUpdate && (
                <button
                  onClick={() => onEdit(item)}
                  title="Edit"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )}
              {canDelete && (
                <button
                  onClick={() => onDelete(item.id)}
                  title="Delete"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Course name */}
        <h3 className="text-sm font-semibold text-slate-800 leading-snug mb-0.5">
          {item.course?.name ?? "—"}
        </h3>
        <p className="text-xs text-slate-400 font-mono mb-3">
          {item.course?.code}
        </p>

        {/* Details */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Clock className="w-3.5 h-3.5 shrink-0 text-slate-400" />
            <span className="font-medium text-slate-700 font-mono">
              {formatTime(item.startTime)} – {formatTime(item.endTime)}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <User className="w-3.5 h-3.5 shrink-0 text-slate-400" />
            <span>
              {item.teacher
                ? `${item.teacher.firstName} ${item.teacher.lastName}`
                : "—"}
            </span>
          </div>

          {(item.roomNumber || item.building) && (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />
              <span>
                {[item.roomNumber, item.building].filter(Boolean).join(", ")}
              </span>
            </div>
          )}

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <CalendarDays className="w-3.5 h-3.5 shrink-0 text-slate-400" />
            <span>{item.semester?.name ?? "—"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Timetable grouped view ───────────────────────────────────────────────────
function TimetableView({
  items,
  canUpdate,
  canDelete,
  onEdit,
  onDelete,
}: {
  items: ClassSchedule[];
  canUpdate: boolean;
  canDelete: boolean;
  onEdit: (item: ClassSchedule) => void;
  onDelete: (id: string) => void;
}) {
  const grouped = DAYS.reduce<Record<Day, ClassSchedule[]>>(
    (acc, day) => {
      acc[day] = items
        .filter((i) => i.dayOfWeek?.toLowerCase() === day)
        .sort((a, b) => a.startTime.localeCompare(b.startTime));
      return acc;
    },
    {} as Record<Day, ClassSchedule[]>,
  );

  const activeDays = DAYS.filter((d) => grouped[d].length > 0);

  if (activeDays.length === 0) return null;

  return (
    <div className="space-y-4">
      {activeDays.map((day) => {
        const cfg = DAY_CONFIG[day];
        return (
          <div key={day}>
            {/* Day header */}
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
              <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500">
                {day.charAt(0).toUpperCase() + day.slice(1)}
              </h4>
              <span className="text-xs text-slate-300">
                {grouped[day].length}{" "}
                {grouped[day].length === 1 ? "class" : "classes"}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {grouped[day].map((item) => (
                <ScheduleCard
                  key={item.id}
                  item={item}
                  canUpdate={canUpdate}
                  canDelete={canDelete}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Stats ────────────────────────────────────────────────────────────────────
function StatsBar({ items }: { items: ClassSchedule[] }) {
  const uniqueTeachers = new Set(items.map((i) => i.teacherId)).size;
  const uniqueCourses = new Set(items.map((i) => i.courseId)).size;
  const uniqueRooms = new Set(
    items.filter((i) => i.roomNumber).map((i) => i.roomNumber),
  ).size;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      {[
        {
          label: "Total Schedules",
          value: items.length,
          color: "text-slate-700",
          bg: "bg-slate-50 border-slate-200",
        },
        {
          label: "Courses",
          value: uniqueCourses,
          color: "text-indigo-700",
          bg: "bg-indigo-50 border-indigo-200",
        },
        {
          label: "Teachers",
          value: uniqueTeachers,
          color: "text-violet-700",
          bg: "bg-violet-50 border-violet-200",
        },
        {
          label: "Rooms Used",
          value: uniqueRooms,
          color: "text-emerald-700",
          bg: "bg-emerald-50 border-emerald-200",
        },
      ].map((stat) => (
        <div
          key={stat.label}
          className={`rounded-xl border px-4 py-3 ${stat.bg}`}
        >
          <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
          <p className="text-xs text-slate-500 mt-0.5">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SchedulesPage() {
  const queryClient = useQueryClient();
  const { can } = usePermission();
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<ClassSchedule | null>(null);
  const [viewMode, setViewMode] = useState<"timetable" | "grid">("timetable");
  const [dayFilter, setDayFilter] = useState("");
  const [semesterFilter, setSemesterFilter] = useState("");
  const [teacherFilter, setTeacherFilter] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["class-schedules", page, semesterFilter, teacherFilter],
    queryFn: () => {
      const params = { page, limit: 50 };
      if (semesterFilter) return classSchedulesApi.getBySemester(semesterFilter, params);
      if (teacherFilter) return classSchedulesApi.getByTeacher(teacherFilter, params);
      return classSchedulesApi.getAll(params);
    },
  });

  const { data: coursesData } = useQuery({
    queryKey: ["courses-all"],
    queryFn: () => coursesApi.getAll({ limit: 100 }),
  });

  const { data: semestersData } = useQuery({
    queryKey: ["semesters-all"],
    queryFn: () => semestersApi.getAll({ limit: 100 }),
  });

  const { data: teachersData } = useQuery({
    queryKey: ["teachers-all"],
    queryFn: () => usersApi.getTeachers({ limit: 100 }),
  });

  const courseOptions = (coursesData?.items ?? []).map((c) => ({
    value: c.id,
    label: `${c.code} — ${c.name}`,
  }));
  const semesterOptions = (semestersData?.items ?? []).map((s) => ({
    value: s.id,
    label: s.name,
  }));
  const teacherOptions = (teachersData?.items ?? []).map((t) => ({
    value: t.id,
    label: `${t.firstName} ${t.lastName}`,
  }));

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const createMutation = useMutation({
    mutationFn: classSchedulesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["class-schedules"] });
      toast.success("Schedule created");
      closeModal();
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message || "Failed to create schedule");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<FormData> }) =>
      classSchedulesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["class-schedules"] });
      toast.success("Schedule updated");
      closeModal();
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message || "Failed to update schedule");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: classSchedulesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["class-schedules"] });
      toast.success("Schedule deleted");
      setDeleteId(null);
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message || "Failed to delete schedule");
    },
  });

  const openCreate = () => {
    setEditItem(null);
    reset({
      courseId: "",
      teacherId: "",
      semesterId: "",
      dayOfWeek: undefined,
      startTime: "",
      endTime: "",
      roomNumber: "",
      building: "",
    });
    setModalOpen(true);
  };

  const openEdit = (item: ClassSchedule) => {
    setEditItem(item);
    reset({
      courseId: item.courseId,
      teacherId: item.teacherId,
      semesterId: item.semesterId,
      dayOfWeek: (item.dayOfWeek?.toLowerCase() ?? "monday") as Day,
      startTime: item.startTime,
      endTime: item.endTime,
      roomNumber: item.roomNumber || "",
      building: item.building || "",
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditItem(null);
    reset();
  };

  const onSubmit = (formData: FormData) => {
    // Ensure lowercase before sending
    const payload = {
      ...formData,
      dayOfWeek: formData.dayOfWeek.toLowerCase() as Day,
    };
    if (editItem) {
      updateMutation.mutate({ id: editItem.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const allItems = data?.items ?? [];
  const filteredItems = dayFilter
    ? allItems.filter((i) => i.dayOfWeek?.toLowerCase() === dayFilter)
    : allItems;

  return (
    <div>
      <PageHeader
        title="Class Schedules"
        description="Manage and view weekly class timetables"
        action={
          can("schedules", "create") ? (
            <Button
              variant="primary"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={openCreate}
            >
              Add Schedule
            </Button>
          ) : undefined
        }
      />

      {/* Stats */}
      {!isLoading && allItems.length > 0 && <StatsBar items={allItems} />}

      {/* Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-4 flex flex-wrap items-center gap-3">
        {/* Semester filter */}
        <select
          value={semesterFilter}
          onChange={(e) => { setSemesterFilter(e.target.value); setTeacherFilter(""); setPage(1); }}
          className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white text-slate-700 min-w-[160px]"
        >
          <option value="">All Semesters</option>
          {(semestersData?.items ?? []).map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>

        {/* Teacher filter */}
        <select
          value={teacherFilter}
          onChange={(e) => { setTeacherFilter(e.target.value); setSemesterFilter(""); setPage(1); }}
          className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white text-slate-700 min-w-[160px]"
        >
          <option value="">All Teachers</option>
          {(teachersData?.items ?? []).map((t) => (
            <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>
          ))}
        </select>

        {/* Day filter (client-side grouping) */}
        <select
          value={dayFilter}
          onChange={(e) => setDayFilter(e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white text-slate-700 min-w-[140px]"
        >
          <option value="">All Days</option>
          {DAYS.map((d) => (
            <option key={d} value={d}>
              {d.charAt(0).toUpperCase() + d.slice(1)}
            </option>
          ))}
        </select>

        {(semesterFilter || teacherFilter || dayFilter) && (
          <button
            onClick={() => { setSemesterFilter(""); setTeacherFilter(""); setDayFilter(""); setPage(1); }}
            className="text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2"
          >
            Clear filters
          </button>
        )}

        {/* View toggle */}
        <div className="ml-auto flex items-center gap-1 bg-slate-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode("timetable")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              viewMode === "timetable"
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            By Day
          </button>
          <button
            onClick={() => setViewMode("grid")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              viewMode === "grid"
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Grid
          </button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-slate-200 p-4 animate-pulse"
            >
              <div className="h-1 w-full bg-slate-100 rounded mb-3" />
              <div className="h-5 w-12 bg-slate-100 rounded mb-3" />
              <div className="h-4 bg-slate-100 rounded w-3/4 mb-1.5" />
              <div className="h-3 bg-slate-100 rounded w-1/3 mb-3" />
              <div className="space-y-1.5">
                <div className="h-3 bg-slate-100 rounded w-1/2" />
                <div className="h-3 bg-slate-100 rounded w-2/3" />
                <div className="h-3 bg-slate-100 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mb-4">
            <CalendarDays className="w-7 h-7 text-slate-400" />
          </div>
          <p className="text-slate-700 font-semibold text-base mb-1">
            No schedules found
          </p>
          <p className="text-slate-400 text-sm max-w-xs">
            {dayFilter
              ? `No classes scheduled for ${dayFilter.charAt(0).toUpperCase() + dayFilter.slice(1)}.`
              : "Add class schedules to organize your weekly timetable."}
          </p>
          {can("schedules", "create") && !dayFilter && (
            <button
              onClick={openCreate}
              className="mt-5 inline-flex items-center gap-2 text-sm text-primary-600 font-medium hover:underline"
            >
              <Plus className="w-4 h-4" />
              Add first schedule
            </button>
          )}
        </div>
      ) : viewMode === "timetable" ? (
        <TimetableView
          items={filteredItems}
          canUpdate={can("schedules", "update")}
          canDelete={can("schedules", "delete")}
          onEdit={openEdit}
          onDelete={setDeleteId}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredItems.map((item) => (
              <ScheduleCard
                key={item.id}
                item={item}
                canUpdate={can("schedules", "update")}
                canDelete={can("schedules", "delete")}
                onEdit={openEdit}
                onDelete={setDeleteId}
              />
            ))}
          </div>
          {data && data.meta.totalPages > 1 && (
            <div className="mt-5">
              <Pagination
                currentPage={page}
                totalPages={data.meta.totalPages}
                total={data.meta.total}
                limit={50}
                onPageChange={setPage}
              />
            </div>
          )}
        </>
      )}

      {/* Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editItem ? "Edit Schedule" : "Add Schedule"}
        onSubmit={handleSubmit(onSubmit)}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        submitLabel={editItem ? "Update" : "Create"}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Select
            label="Course"
            options={courseOptions}
            placeholder="Select course"
            error={errors.courseId?.message}
            required
            {...register("courseId")}
          />
          <Select
            label="Teacher"
            options={teacherOptions}
            placeholder="Select teacher"
            error={errors.teacherId?.message}
            required
            {...register("teacherId")}
          />
          <Select
            label="Semester"
            options={semesterOptions}
            placeholder="Select semester"
            error={errors.semesterId?.message}
            required
            {...register("semesterId")}
          />
          <div className="grid grid-cols-3 gap-4">
            <Select
              label="Day of Week"
              options={DAY_OPTIONS}
              placeholder="Select day"
              error={errors.dayOfWeek?.message}
              required
              {...register("dayOfWeek")}
            />
            <Input
              label="Start Time"
              type="time"
              error={errors.startTime?.message}
              required
              {...register("startTime")}
            />
            <Input
              label="End Time"
              type="time"
              error={errors.endTime?.message}
              required
              {...register("endTime")}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Room Number"
              placeholder="e.g., 201"
              {...register("roomNumber")}
            />
            <Input
              label="Building"
              placeholder="e.g., Main Block"
              {...register("building")}
            />
          </div>
        </form>
      </Modal>

      {/* Delete confirm */}
      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title="Delete Schedule"
        message="Are you sure you want to delete this schedule? This action cannot be undone."
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
