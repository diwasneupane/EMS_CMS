import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserCheck, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { usersApi } from '../../api/users';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { Table } from '../../components/ui/Table';
import type { Column } from '../../components/ui/Table';
import { Pagination } from '../../components/ui/Pagination';
import { SearchInput } from '../../components/ui/SearchInput';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { useDebounce } from '../../hooks/useDebounce';
import { formatDate, getInitials } from '../../lib/utils';
import type { User } from '../../types';

export default function PendingApprovalsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const debouncedSearch = useDebounce(search);

  const { data, isLoading } = useQuery({
    queryKey: ['pending-approvals', page, debouncedSearch],
    queryFn: () => usersApi.getPendingApprovals({ page, limit: 10, search: debouncedSearch }),
  });

  const approveMutation = useMutation({
    mutationFn: usersApi.approve,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['pending-count'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Student approved');
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message || 'Failed to approve student');
    },
  });

  const bulkApproveMutation = useMutation({
    mutationFn: (ids: string[]) => Promise.all(ids.map((id) => usersApi.approve(id))),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['pending-count'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success(`${selectedIds.length} students approved`);
      setSelectedIds([]);
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message || 'Failed to bulk approve');
    },
  });

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const toggleAll = () => {
    const allIds = (data?.items ?? []).map((u) => u.id);
    if (selectedIds.length === allIds.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(allIds);
    }
  };

  const columns: Column<User>[] = [
    {
      header: '', accessor: 'id', headerClassName: 'w-10',
      render: (_, row) => (
        <input
          type="checkbox"
          checked={selectedIds.includes(row.id)}
          onChange={() => toggleSelect(row.id)}
          className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
        />
      ),
    },
    {
      header: 'Student', accessor: 'firstName', render: (_, row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold">
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
      header: 'Registered', accessor: 'createdAt', render: (_, row) => (
        <span className="text-sm text-slate-500">{formatDate(row.createdAt)}</span>
      ),
    },
    {
      header: 'Status', accessor: 'isApproved', render: () => (
        <Badge variant="warning" dot>Pending Approval</Badge>
      ),
    },
    {
      header: 'Action', accessor: 'id', render: (_, row) => (
        <Button
          size="xs"
          variant="primary"
          leftIcon={<UserCheck className="w-3.5 h-3.5" />}
          onClick={() => approveMutation.mutate(row.id)}
          isLoading={approveMutation.isPending && approveMutation.variables === row.id}
        >
          Approve
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Pending Approvals"
        description={`${data?.meta?.total ?? 0} students awaiting approval`}
      />

      {selectedIds.length > 0 && (
        <div className="mb-4 p-4 rounded-xl bg-primary-50 border border-primary-200 flex items-center justify-between">
          <p className="text-sm font-medium text-primary-800">
            {selectedIds.length} student{selectedIds.length !== 1 ? 's' : ''} selected
          </p>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<UserCheck className="w-4 h-4" />}
            onClick={() => bulkApproveMutation.mutate(selectedIds)}
            isLoading={bulkApproveMutation.isPending}
          >
            Approve Selected
          </Button>
        </div>
      )}

      <Card padding="none">
        <div className="p-4 border-b border-slate-200 flex items-center gap-3">
          <input
            type="checkbox"
            checked={selectedIds.length === (data?.items?.length ?? 0) && (data?.items?.length ?? 0) > 0}
            onChange={toggleAll}
            className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
          />
          <SearchInput
            value={search}
            onChange={(v) => { setSearch(v); setPage(1); }}
            placeholder="Search pending students..."
            className="max-w-xs flex-1"
          />
        </div>
        <Table
          columns={columns}
          data={data?.items ?? []}
          loading={isLoading}
          emptyTitle="No pending approvals"
          emptyMessage="All student registrations have been reviewed."
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
    </div>
  );
}
