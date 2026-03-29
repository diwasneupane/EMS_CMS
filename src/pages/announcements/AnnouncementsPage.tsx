import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { announcementsApi } from '../../api/announcements';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import { Modal, ConfirmDialog } from '../../components/ui/Modal';
import { Table } from '../../components/ui/Table';
import type { Column } from '../../components/ui/Table';
import { Pagination } from '../../components/ui/Pagination';
import { SearchInput } from '../../components/ui/SearchInput';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { useDebounce } from '../../hooks/useDebounce';
import { formatDate, truncate } from '../../lib/utils';
import type { Announcement, AnnouncementPriority } from '../../types';

const schema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  content: z.string().min(1, 'Content is required'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  targetRole: z.enum(['admin', 'teacher', 'student', '']).optional(),
  expiresAt: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

const TARGET_ROLE_OPTIONS = [
  { value: '', label: 'All Users' },
  { value: 'admin', label: 'Admin Only' },
  { value: 'teacher', label: 'Teachers' },
  { value: 'student', label: 'Students' },
];

export default function AnnouncementsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<Announcement | null>(null);
  const debouncedSearch = useDebounce(search);

  const { data, isLoading } = useQuery({
    queryKey: ['announcements', page],
    queryFn: () =>
      announcementsApi.getAll({
        page,
        limit: 10,
      }),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { priority: 'medium', targetRole: '' },
  });

  const createMutation = useMutation({
    mutationFn: announcementsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      toast.success('Announcement created');
      closeModal();
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message || 'Failed to create announcement');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Announcement> }) =>
      announcementsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      toast.success('Announcement updated');
      closeModal();
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message || 'Failed to update announcement');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: announcementsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      toast.success('Announcement deleted');
      setDeleteId(null);
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message || 'Failed to delete announcement');
    },
  });

  const togglePublishMutation = useMutation({
    mutationFn: ({ id, isPublished }: { id: string; isPublished: boolean }) =>
      isPublished ? announcementsApi.publish(id) : announcementsApi.unpublish(id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      toast.success(variables.isPublished ? 'Announcement published' : 'Announcement unpublished');
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message || 'Failed to toggle publish state');
    },
  });

  const openCreate = () => {
    setEditItem(null);
    reset({ title: '', content: '', priority: 'medium', targetRole: '', expiresAt: '' });
    setModalOpen(true);
  };

  const openEdit = (item: Announcement) => {
    setEditItem(item);
    reset({
      title: item.title,
      content: item.content,
      priority: item.priority,
      targetRole: (item.targetRole as FormData['targetRole']) ?? '',
      expiresAt: item.expiresAt ? item.expiresAt.split('T')[0] : '',
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

  const priorityVariant = (p: AnnouncementPriority) => {
    if (p === 'urgent') return 'error';
    if (p === 'high') return 'warning';
    if (p === 'medium') return 'info';
    return 'default';
  };

  const columns: Column<Announcement>[] = [
    {
      header: 'Title', accessor: 'title', render: (_, row) => (
        <div>
          <p className="text-sm font-medium text-slate-800">{truncate(row.title, 50)}</p>
          <p className="text-xs text-slate-500 mt-0.5">{truncate(row.content, 60)}</p>
        </div>
      ),
    },
    {
      header: 'Priority', accessor: 'priority', render: (_, row) => (
        <Badge variant={priorityVariant(row.priority)}>{row.priority}</Badge>
      ),
    },
    {
      header: 'Target', accessor: 'targetRole', render: (_, row) => (
        <span className="text-sm text-slate-600">{row.targetRole ?? 'All'}</span>
      ),
    },
    {
      header: 'Status', accessor: 'isPublished', render: (_, row) => (
        <Badge variant={row.isPublished ? 'success' : 'default'} dot>
          {row.isPublished ? 'Published' : 'Draft'}
        </Badge>
      ),
    },
    {
      header: 'Expires', accessor: 'expiresAt', render: (_, row) => (
        <span className="text-sm text-slate-500">
          {row.expiresAt ? formatDate(row.expiresAt) : 'Never'}
        </span>
      ),
    },
    {
      header: 'Created', accessor: 'createdAt', render: (_, row) => (
        <span className="text-sm text-slate-500">{formatDate(row.createdAt)}</span>
      ),
    },
    {
      header: 'Actions', accessor: 'id', render: (_, row) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => togglePublishMutation.mutate({ id: row.id, isPublished: !row.isPublished })}
            className={`p-1.5 rounded-lg transition-colors ${
              row.isPublished
                ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
                : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
            }`}
            title={row.isPublished ? 'Unpublish' : 'Publish'}
          >
            {row.isPublished ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
          <button onClick={() => openEdit(row)} className="p-1.5 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50 transition-colors">
            <Pencil className="w-4 h-4" />
          </button>
          <button onClick={() => setDeleteId(row.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Announcements"
        description="Create and manage announcements for users"
        action={
          <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={openCreate}>
            New Announcement
          </Button>
        }
      />

      <Card padding="none">
        <div className="p-4 border-b border-slate-200 flex flex-wrap gap-3">
          <SearchInput
            value={search}
            onChange={(v) => { setSearch(v); setPage(1); }}
            placeholder="Search announcements..."
            className="max-w-xs flex-1"
          />
          <select
            value={priorityFilter}
            onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}
            className="text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
          >
            <option value="">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
        <Table
          columns={columns}
          data={(data?.items ?? []).filter((item) => {
            const matchesSearch = !debouncedSearch || item.title.toLowerCase().includes(debouncedSearch.toLowerCase()) || item.content.toLowerCase().includes(debouncedSearch.toLowerCase());
            const matchesPriority = !priorityFilter || item.priority === priorityFilter;
            return matchesSearch && matchesPriority;
          })}
          loading={isLoading}
          emptyTitle="No announcements"
          emptyMessage="Create your first announcement to notify users."
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
        title={editItem ? 'Edit Announcement' : 'New Announcement'}
        onSubmit={handleSubmit(onSubmit)}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        submitLabel={editItem ? 'Update' : 'Create'}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Title" placeholder="Announcement title..." error={errors.title?.message} required {...register('title')} />
          <Textarea
            label="Content"
            placeholder="Write your announcement content here..."
            error={errors.content?.message}
            required
            rows={5}
            {...register('content')}
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Priority"
              options={PRIORITY_OPTIONS}
              error={errors.priority?.message}
              required
              {...register('priority')}
            />
            <Select
              label="Target Audience"
              options={TARGET_ROLE_OPTIONS}
              {...register('targetRole')}
            />
          </div>
          <Input label="Expiry Date (optional)" type="date" {...register('expiresAt')} />
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title="Delete Announcement"
        message="Are you sure you want to delete this announcement?"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
