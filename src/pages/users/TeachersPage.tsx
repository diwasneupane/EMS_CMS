import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { usersApi } from "../../api/users";
import { departmentsApi } from "../../api/departments";
import { PageHeader } from "../../components/layout/PageHeader";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Modal, ConfirmDialog } from "../../components/ui/Modal";
import { Table } from "../../components/ui/Table";
import type { Column } from "../../components/ui/Table";
import { Pagination } from "../../components/ui/Pagination";
import { SearchInput } from "../../components/ui/SearchInput";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { useDebounce } from "../../hooks/useDebounce";
import { usePermission } from "../../hooks/usePermission";
import { formatDate, getInitials } from "../../lib/utils";
import type { User } from "../../types";

const schema = z.object({
  firstName: z.string().min(1, "Required"),
  lastName: z.string().min(1, "Required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Min 6 chars").optional().or(z.literal("")),
  phoneNumber: z.string().optional(),
  departmentId: z.string().min(1, "Department is required"),
});

type FormData = z.infer<typeof schema>;

export default function TeachersPage() {
  const queryClient = useQueryClient();
  const { can } = usePermission();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<User | null>(null);
  const debouncedSearch = useDebounce(search);

  const { data, isLoading } = useQuery({
    queryKey: ["teachers", page, debouncedSearch, deptFilter],
    queryFn: () =>
      usersApi.getTeachers({
        page,
        limit: 10,
        search: debouncedSearch,
        departmentId: deptFilter || undefined,
      }),
  });

  const { data: deptData } = useQuery({
    queryKey: ["departments-all"],
    queryFn: () => departmentsApi.getAll({ limit: 100 }),
  });

  const departmentOptions = (deptData?.items ?? []).map((d) => ({
    value: d.id,
    label: d.name,
  }));

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const createMutation = useMutation({
    mutationFn: (payload: Parameters<typeof usersApi.createTeacher>[0]) =>
      usersApi.createTeacher(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
      toast.success("Teacher created");
      closeModal();
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message || "Failed to create teacher");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Parameters<typeof usersApi.update>[1];
    }) => usersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
      toast.success("Teacher updated");
      closeModal();
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message || "Failed to update teacher");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: usersApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
      toast.success("Teacher deleted");
      setDeleteId(null);
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message || "Failed to delete teacher");
    },
  });

  const openCreate = () => {
    setEditItem(null);
    reset({
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      phoneNumber: "",
      departmentId: "",
    });
    setModalOpen(true);
  };

  const openEdit = (item: User) => {
    setEditItem(item);
    reset({
      firstName: item.firstName,
      lastName: item.lastName,
      email: item.email,
      password: "",
      phoneNumber: item.phoneNumber || "",
      departmentId: item.departmentId || "",
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
      const { password, ...rest } = formData;
      const updatePayload = password ? { ...rest, password } : rest;
      updateMutation.mutate({ id: editItem.id, data: updatePayload });
    } else {
      createMutation.mutate({ ...formData, password: formData.password ?? '' });
    }
  };

  const columns: Column<User>[] = [
    {
      header: "Teacher",
      accessor: "firstName",
      render: (_, row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">
            {getInitials(row.firstName, row.lastName)}
          </div>
          <div>
            <p className="text-sm font-medium text-slate-800">
              {row.firstName} {row.lastName}
            </p>
            <p className="text-xs text-slate-500">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      header: "Department",
      accessor: "department",
      render: (_, row) => (
        <span className="text-sm text-slate-600">
          {row.department?.name ?? "-"}
        </span>
      ),
    },
    {
      header: "Phone",
      accessor: "phoneNumber",
      render: (_, row) => (
        <span className="text-sm text-slate-600">{row.phoneNumber ?? "-"}</span>
      ),
    },
    {
      header: "Status",
      accessor: "isActive",
      render: (_, row) => (
        <Badge variant={row.isActive ? "success" : "error"} dot>
          {row.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      header: "Joined",
      accessor: "createdAt",
      render: (_, row) => (
        <span className="text-sm text-slate-500">
          {formatDate(row.createdAt)}
        </span>
      ),
    },
    ...(can("users", "update") || can("users", "delete")
      ? [
          {
            header: "Actions",
            accessor: "id" as keyof User,
            render: (_: unknown, row: User) => (
              <div className="flex items-center gap-1">
                {can("users", "update") && (
                  <button
                    onClick={() => openEdit(row)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                )}
                {can("users", "delete") && (
                  <button
                    onClick={() => setDeleteId(row.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <div>
      <PageHeader
        title="Teachers"
        description={`${data?.meta?.total ?? 0} teachers in the system`}
        action={
          can("users", "create") ? (
            <Button
              variant="primary"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={openCreate}
            >
              Add Teacher
            </Button>
          ) : undefined
        }
      />

      <Card padding="none">
        <div className="p-4 border-b border-slate-200 flex flex-wrap gap-3">
          <SearchInput
            value={search}
            onChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
            placeholder="Search teachers..."
            className="max-w-xs flex-1"
          />
          <select
            value={deptFilter}
            onChange={(e) => {
              setDeptFilter(e.target.value);
              setPage(1);
            }}
            className="text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
          >
            <option value="">All Departments</option>
            {departmentOptions.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
        <Table
          columns={columns}
          data={data?.items ?? []}
          loading={isLoading}
          emptyTitle="No teachers found"
          emptyMessage="Add your first teacher to get started."
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
        title={editItem ? "Edit Teacher" : "Add Teacher"}
        onSubmit={handleSubmit(onSubmit)}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        submitLabel={editItem ? "Update" : "Create"}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="First Name"
              error={errors.firstName?.message}
              required
              {...register("firstName")}
            />
            <Input
              label="Last Name"
              error={errors.lastName?.message}
              required
              {...register("lastName")}
            />
          </div>
          <Input
            label="Email"
            type="email"
            error={errors.email?.message}
            required
            {...register("email")}
          />
          <Input
            label={editItem ? "New Password (leave blank to keep)" : "Password"}
            type="password"
            error={errors.password?.message}
            required={!editItem}
            {...register("password")}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Phone Number" {...register("phoneNumber")} />
            <Select
              label="Department"
              options={departmentOptions}
              placeholder="Select department"
              error={errors.departmentId?.message}
              required
              {...register("departmentId")}
            />
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title="Delete Teacher"
        message="Are you sure you want to delete this teacher?"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
