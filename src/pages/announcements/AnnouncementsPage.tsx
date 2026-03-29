import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Megaphone,
  AlertTriangle,
  Info,
  ChevronUp,
  Users,
  GraduationCap,
  BookOpen,
  ShieldCheck,
  Clock,
  CalendarDays,
} from "lucide-react";
import toast from "react-hot-toast";
import { announcementsApi } from "../../api/announcements";
import { PageHeader } from "../../components/layout/PageHeader";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Textarea } from "../../components/ui/Textarea";
import { Modal, ConfirmDialog } from "../../components/ui/Modal";
import { Pagination } from "../../components/ui/Pagination";
import { SearchInput } from "../../components/ui/SearchInput";
import { useDebounce } from "../../hooks/useDebounce";
import { usePermission } from "../../hooks/usePermission";
import { formatDate, truncate } from "../../lib/utils";
import type { Announcement, AnnouncementPriority } from "../../types";

// ─── Schema ────────────────────────────────────────────────────────────────
const schema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  content: z.string().min(1, "Content is required"),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  targetRole: z.enum(["admin", "teacher", "student", ""]).optional(),
  expiresAt: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

// ─── Constants ──────────────────────────────────────────────────────────────
const PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

const TARGET_ROLE_OPTIONS = [
  { value: "", label: "All Users" },
  { value: "admin", label: "Admin Only" },
  { value: "teacher", label: "Teachers" },
  { value: "student", label: "Students" },
];

// ─── Helpers ────────────────────────────────────────────────────────────────
const isPublished = (item: Announcement): boolean => !!item.publishedAt;

const priorityConfig = (p: AnnouncementPriority) => {
  switch (p) {
    case "urgent":
      return {
        bg: "bg-red-50",
        text: "text-red-700",
        border: "border-red-200",
        dot: "bg-red-500",
        icon: <AlertTriangle className="w-3 h-3" />,
        label: "Urgent",
        barColor: "bg-red-500",
      };
    case "high":
      return {
        bg: "bg-amber-50",
        text: "text-amber-700",
        border: "border-amber-200",
        dot: "bg-amber-500",
        icon: <ChevronUp className="w-3 h-3" />,
        label: "High",
        barColor: "bg-amber-500",
      };
    case "medium":
      return {
        bg: "bg-blue-50",
        text: "text-blue-700",
        border: "border-blue-200",
        dot: "bg-blue-500",
        icon: <Info className="w-3 h-3" />,
        label: "Medium",
        barColor: "bg-blue-500",
      };
    default:
      return {
        bg: "bg-slate-50",
        text: "text-slate-600",
        border: "border-slate-200",
        dot: "bg-slate-400",
        icon: <Info className="w-3 h-3" />,
        label: "Low",
        barColor: "bg-slate-400",
      };
  }
};

const targetConfig = (role?: string | null) => {
  switch (role) {
    case "teacher":
      return {
        icon: <BookOpen className="w-3.5 h-3.5" />,
        label: "Teachers",
        color: "text-violet-600 bg-violet-50 border-violet-200",
      };
    case "student":
      return {
        icon: <GraduationCap className="w-3.5 h-3.5" />,
        label: "Students",
        color: "text-emerald-600 bg-emerald-50 border-emerald-200",
      };
    case "admin":
      return {
        icon: <ShieldCheck className="w-3.5 h-3.5" />,
        label: "Admin",
        color: "text-slate-600 bg-slate-50 border-slate-200",
      };
    default:
      return {
        icon: <Users className="w-3.5 h-3.5" />,
        label: "Everyone",
        color: "text-indigo-600 bg-indigo-50 border-indigo-200",
      };
  }
};

// ─── Announcement Card ───────────────────────────────────────────────────────
interface AnnouncementCardProps {
  item: Announcement;
  canUpdate: boolean;
  canDelete: boolean;
  onEdit: (item: Announcement) => void;
  onDelete: (id: string) => void;
  onTogglePublish: (id: string, publish: boolean) => void;
  isToggling: boolean;
}

function AnnouncementCard({
  item,
  canUpdate,
  canDelete,
  onEdit,
  onDelete,
  onTogglePublish,
  isToggling,
}: AnnouncementCardProps) {
  const published = isPublished(item);
  const priority = priorityConfig(item.priority);
  const target = targetConfig(item.targetRole);

  return (
    <div
      className={`relative bg-white rounded-2xl border transition-all duration-200 hover:shadow-md overflow-hidden group ${
        published
          ? "border-slate-200"
          : "border-dashed border-slate-300 opacity-75"
      }`}
    >
      {/* Priority color bar on left */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-1 ${priority.barColor}`}
      />

      <div className="pl-5 pr-4 py-4">
        {/* Top row: badges + actions */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Priority badge */}
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${priority.bg} ${priority.text} ${priority.border}`}
            >
              {priority.icon}
              {priority.label}
            </span>

            {/* Target badge */}
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${target.color}`}
            >
              {target.icon}
              {target.label}
            </span>

            {/* Published / Draft badge */}
            <span
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${
                published
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-slate-50 text-slate-500 border-slate-200"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${published ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`}
              />
              {published ? "Published" : "Draft"}
            </span>
          </div>

          {/* Action buttons */}
          {(canUpdate || canDelete) && (
            <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              {canUpdate && (
                <>
                  {/* Publish / Unpublish toggle */}
                  <button
                    onClick={() => onTogglePublish(item.id, !published)}
                    disabled={isToggling}
                    title={published ? "Unpublish" : "Publish"}
                    className={`p-1.5 rounded-lg transition-all duration-150 disabled:opacity-50 ${
                      published
                        ? "text-emerald-600 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-700"
                        : "text-slate-400 bg-slate-50 hover:bg-slate-100 hover:text-slate-600"
                    }`}
                  >
                    {published ? (
                      <Eye className="w-4 h-4" />
                    ) : (
                      <EyeOff className="w-4 h-4" />
                    )}
                  </button>

                  <button
                    onClick={() => onEdit(item)}
                    title="Edit"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50 transition-all duration-150"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                </>
              )}
              {canDelete && (
                <button
                  onClick={() => onDelete(item.id)}
                  title="Delete"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all duration-150"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Title */}
        <h3 className="text-sm font-semibold text-slate-800 leading-snug mb-1.5">
          {item.title}
        </h3>

        {/* Content preview */}
        <p className="text-sm text-slate-500 leading-relaxed mb-4">
          {truncate(item.content, 120)}
        </p>

        {/* Footer: dates */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="w-3.5 h-3.5" />
            Created {formatDate(item.createdAt)}
          </span>
          {item.publishedAt && (
            <span className="inline-flex items-center gap-1 text-emerald-600">
              <Eye className="w-3.5 h-3.5" />
              Published {formatDate(item.publishedAt)}
            </span>
          )}
          {item.expiresAt && (
            <span className="inline-flex items-center gap-1 text-amber-600">
              <Clock className="w-3.5 h-3.5" />
              Expires {formatDate(item.expiresAt)}
            </span>
          )}
          <span className="inline-flex items-center gap-1 ml-auto">
            by{" "}
            <span className="font-medium text-slate-500">
              {item.createdBy?.firstName} {item.createdBy?.lastName}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Stats Bar ───────────────────────────────────────────────────────────────
function StatsBar({ items }: { items: Announcement[] }) {
  const published = items.filter(isPublished).length;
  const draft = items.filter((i) => !isPublished(i)).length;
  const urgent = items.filter((i) => i.priority === "urgent").length;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      {[
        {
          label: "Total",
          value: items.length,
          color: "text-slate-700",
          bg: "bg-slate-50 border-slate-200",
        },
        {
          label: "Published",
          value: published,
          color: "text-emerald-700",
          bg: "bg-emerald-50 border-emerald-200",
        },
        {
          label: "Draft",
          value: draft,
          color: "text-slate-500",
          bg: "bg-slate-50 border-slate-200",
        },
        {
          label: "Urgent",
          value: urgent,
          color: "text-red-600",
          bg: "bg-red-50 border-red-200",
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

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function AnnouncementsPage() {
  const queryClient = useQueryClient();
  const { can } = usePermission();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [targetFilter, setTargetFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<Announcement | null>(null);
  const debouncedSearch = useDebounce(search);

  const { data, isLoading } = useQuery({
    queryKey: ["announcements", page],
    queryFn: () => announcementsApi.getAll({ page, limit: 20 }),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { priority: "medium", targetRole: "" },
  });

  const createMutation = useMutation({
    mutationFn: announcementsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      toast.success("Announcement created");
      closeModal();
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(
        e?.response?.data?.message || "Failed to create announcement",
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Announcement> }) =>
      announcementsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      toast.success("Announcement updated");
      closeModal();
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(
        e?.response?.data?.message || "Failed to update announcement",
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: announcementsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      toast.success("Announcement deleted");
      setDeleteId(null);
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(
        e?.response?.data?.message || "Failed to delete announcement",
      );
    },
  });

  const togglePublishMutation = useMutation({
    mutationFn: ({ id, publish }: { id: string; publish: boolean }) =>
      publish ? announcementsApi.publish(id) : announcementsApi.unpublish(id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      toast.success(
        variables.publish
          ? "Announcement published"
          : "Announcement unpublished",
      );
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(
        e?.response?.data?.message || "Failed to update publish state",
      );
    },
  });

  const openCreate = () => {
    setEditItem(null);
    reset({
      title: "",
      content: "",
      priority: "medium",
      targetRole: "",
      expiresAt: "",
    });
    setModalOpen(true);
  };

  const openEdit = (item: Announcement) => {
    setEditItem(item);
    reset({
      title: item.title,
      content: item.content,
      priority: item.priority,
      targetRole: (item.targetRole as FormData["targetRole"]) ?? "",
      expiresAt: item.expiresAt ? item.expiresAt.split("T")[0] : "",
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditItem(null);
    reset();
  };

  const onSubmit = (formData: FormData) => {
    const payload = {
      ...formData,
      targetRole: formData.targetRole || undefined,
      expiresAt: formData.expiresAt || undefined,
    };
    if (editItem) {
      updateMutation.mutate({ id: editItem.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  // Client-side filtering
  const allItems = data?.items ?? [];
  const filteredItems = allItems.filter((item) => {
    const matchesSearch =
      !debouncedSearch ||
      item.title.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      item.content.toLowerCase().includes(debouncedSearch.toLowerCase());
    const matchesPriority = !priorityFilter || item.priority === priorityFilter;
    const matchesStatus =
      !statusFilter ||
      (statusFilter === "published" ? isPublished(item) : !isPublished(item));
    const matchesTarget =
      !targetFilter ||
      (targetFilter === "all"
        ? !item.targetRole || item.targetRole === "all"
        : item.targetRole === targetFilter);
    return matchesSearch && matchesPriority && matchesStatus && matchesTarget;
  });

  return (
    <div>
      <PageHeader
        title="Announcements"
        description="Create and manage announcements for students, teachers, and admins"
        action={
          can("announcements", "create") ? (
            <Button
              variant="primary"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={openCreate}
            >
              New Announcement
            </Button>
          ) : undefined
        }
      />

      {/* Stats */}
      {!isLoading && allItems.length > 0 && <StatsBar items={allItems} />}

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-4 flex flex-wrap gap-3 items-center">
        <SearchInput
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder="Search announcements..."
          className="max-w-xs flex-1 min-w-[180px]"
        />

        {/* Priority filter */}
        <select
          value={priorityFilter}
          onChange={(e) => {
            setPriorityFilter(e.target.value);
            setPage(1);
          }}
          className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white text-slate-700 min-w-[130px]"
        >
          <option value="">All Priorities</option>
          <option value="urgent">🔴 Urgent</option>
          <option value="high">🟠 High</option>
          <option value="medium">🔵 Medium</option>
          <option value="low">⚪ Low</option>
        </select>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white text-slate-700 min-w-[130px]"
        >
          <option value="">All Status</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>

        {/* Target filter */}
        <select
          value={targetFilter}
          onChange={(e) => {
            setTargetFilter(e.target.value);
            setPage(1);
          }}
          className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white text-slate-700 min-w-[130px]"
        >
          <option value="">All Audience</option>
          <option value="all">Everyone</option>
          <option value="teacher">Teachers</option>
          <option value="student">Students</option>
          <option value="admin">Admin</option>
        </select>

        {(search || priorityFilter || statusFilter || targetFilter) && (
          <button
            onClick={() => {
              setSearch("");
              setPriorityFilter("");
              setStatusFilter("");
              setTargetFilter("");
            }}
            className="text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2 transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-slate-200 p-5 animate-pulse"
            >
              <div className="flex gap-2 mb-3">
                <div className="h-5 w-16 bg-slate-100 rounded-full" />
                <div className="h-5 w-20 bg-slate-100 rounded-full" />
                <div className="h-5 w-20 bg-slate-100 rounded-full" />
              </div>
              <div className="h-4 bg-slate-100 rounded w-3/4 mb-2" />
              <div className="h-3 bg-slate-100 rounded w-full mb-1" />
              <div className="h-3 bg-slate-100 rounded w-5/6" />
            </div>
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mb-4">
            <Megaphone className="w-7 h-7 text-slate-400" />
          </div>
          <p className="text-slate-700 font-semibold text-base mb-1">
            No announcements found
          </p>
          <p className="text-slate-400 text-sm max-w-xs">
            {search || priorityFilter || statusFilter || targetFilter
              ? "Try adjusting your filters or search term."
              : "Create your first announcement to notify users."}
          </p>
          {can("announcements", "create") && !search && !priorityFilter && (
            <button
              onClick={openCreate}
              className="mt-5 inline-flex items-center gap-2 text-sm text-primary-600 font-medium hover:underline"
            >
              <Plus className="w-4 h-4" />
              Create announcement
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredItems.map((item) => (
              <AnnouncementCard
                key={item.id}
                item={item}
                canUpdate={can("announcements", "update")}
                canDelete={can("announcements", "delete")}
                onEdit={openEdit}
                onDelete={setDeleteId}
                onTogglePublish={(id, publish) =>
                  togglePublishMutation.mutate({ id, publish })
                }
                isToggling={togglePublishMutation.isPending}
              />
            ))}
          </div>

          {data && data.meta.totalPages > 1 && (
            <div className="mt-5">
              <Pagination
                currentPage={page}
                totalPages={data.meta.totalPages}
                total={data.meta.total}
                limit={20}
                onPageChange={setPage}
              />
            </div>
          )}
        </>
      )}

      {/* Create / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editItem ? "Edit Announcement" : "New Announcement"}
        onSubmit={handleSubmit(onSubmit)}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        submitLabel={editItem ? "Update" : "Create"}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Title"
            placeholder="Announcement title..."
            error={errors.title?.message}
            required
            {...register("title")}
          />
          <Textarea
            label="Content"
            placeholder="Write your announcement content here..."
            error={errors.content?.message}
            required
            rows={5}
            {...register("content")}
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Priority"
              options={PRIORITY_OPTIONS}
              error={errors.priority?.message}
              required
              {...register("priority")}
            />
            <Select
              label="Target Audience"
              options={TARGET_ROLE_OPTIONS}
              {...register("targetRole")}
            />
          </div>
          <Input
            label="Expiry Date (optional)"
            type="date"
            {...register("expiresAt")}
          />
        </form>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title="Delete Announcement"
        message="Are you sure you want to delete this announcement? This action cannot be undone."
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
