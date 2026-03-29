import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserCheck, Trash2, Eye, Filter } from 'lucide-react';
import toast from 'react-hot-toast';
import { usersApi } from '../../api/users';
import { departmentsApi } from '../../api/departments';
import { programsApi } from '../../api/programs';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { Table } from '../../components/ui/Table';
import type { Column } from '../../components/ui/Table';
import { Pagination } from '../../components/ui/Pagination';
import { SearchInput } from '../../components/ui/SearchInput';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { ConfirmDialog } from '../../components/ui/Modal';
import { useDebounce } from '../../hooks/useDebounce';
import { formatDate, getInitials } from '../../lib/utils';
import type { User } from '../../types';

export default function StudentsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [programFilter, setProgramFilter] = useState('');
  const [approvedFilter, setApprovedFilter] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
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
    {
      header: 'Actions', accessor: 'id', render: (_, row) => (
        <div className="flex items-center gap-1">
          {!row.isApproved && (
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
          <button
            onClick={() => setDeleteId(row.id)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
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
