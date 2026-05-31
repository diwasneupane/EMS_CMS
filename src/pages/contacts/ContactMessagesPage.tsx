import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Mail, Trash2, Eye, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { contactsApi } from '../../api/contacts';
import { PageHeader } from '../../components/layout/PageHeader';
import { Pagination } from '../../components/ui/Pagination';
import { SearchInput } from '../../components/ui/SearchInput';
import { Modal, ConfirmDialog } from '../../components/ui/Modal';
import { useDebounce } from '../../hooks/useDebounce';
import { formatDate } from '../../lib/utils';
import type { Contact, ContactStatus } from '../../types';

const STATUSES: { value: ContactStatus | ''; label: string }[] = [
  { value: '', label: 'All Status' },
  { value: 'new', label: 'New' },
  { value: 'read', label: 'Read' },
  { value: 'replied', label: 'Replied' },
];

function statusBadge(status: ContactStatus) {
  switch (status) {
    case 'new':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'read':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'replied':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  }
}

interface ViewModalProps {
  item: Contact;
  onClose: () => void;
  onStatusChange: (id: string, status: string) => void;
  isUpdating: boolean;
}

function ViewModal({ item, onClose, onStatusChange, isUpdating }: ViewModalProps) {
  return (
    <Modal isOpen title="Contact Message" onClose={onClose} size="lg">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize ${statusBadge(item.status)}`}>
            {item.status}
          </span>
          {item.inquiryType && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-slate-50 text-slate-700 border-slate-200">
              {item.inquiryType}
            </span>
          )}
          <span className="text-xs text-slate-400 ml-auto">{formatDate(item.createdAt)}</span>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs font-medium text-slate-500 mb-1">Name</p>
            <p className="text-slate-800 font-medium">{item.name}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 mb-1">Email</p>
            <a href={`mailto:${item.email}`} className="text-primary-600 hover:underline">{item.email}</a>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 mb-1">Phone</p>
            <a href={`tel:${item.phone}`} className="text-slate-800">{item.phone}</a>
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-slate-500 mb-2">Message</p>
          <p className="text-sm text-slate-700 bg-slate-50 rounded-xl p-4 border border-slate-200 whitespace-pre-wrap">{item.message}</p>
        </div>

        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
          <p className="text-xs font-medium text-slate-500 self-center mr-1">Mark as:</p>
          {(['new', 'read', 'replied'] as ContactStatus[]).map((s) => (
            <button
              key={s}
              disabled={item.status === s || isUpdating}
              onClick={() => onStatusChange(item.id, s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border capitalize transition-all disabled:opacity-40 ${
                item.status === s
                  ? `${statusBadge(s)} cursor-default`
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}

export default function ContactMessagesPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [viewItem, setViewItem] = useState<Contact | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const debouncedSearch = useDebounce(search);

  const { data, isLoading } = useQuery({
    queryKey: ['contacts', page, debouncedSearch, statusFilter],
    queryFn: () => contactsApi.getAll({
      page,
      limit: 20,
      search: debouncedSearch || undefined,
      status: statusFilter || undefined,
    }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      contactsApi.updateStatus(id, status),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      if (viewItem) setViewItem(updated);
      toast.success('Status updated');
    },
    onError: () => toast.error('Failed to update status'),
  });

  const deleteMutation = useMutation({
    mutationFn: contactsApi.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast.success('Message deleted');
      setDeleteId(null);
      if (viewItem?.id === deleteId) setViewItem(null);
    },
    onError: () => toast.error('Failed to delete message'),
  });

  const items = data?.items ?? [];

  return (
    <div>
      <PageHeader
        title="Contact Messages"
        description="Manage messages submitted through the contact form"
      />

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-4 flex flex-wrap gap-3 items-center">
        <SearchInput
          value={search}
          onChange={(v) => { setSearch(v); setPage(1); }}
          placeholder="Search by name or email..."
          className="max-w-xs flex-1 min-w-[180px]"
        />
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white text-slate-700 min-w-[130px]"
        >
          {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        {(search || statusFilter) && (
          <button
            onClick={() => { setSearch(''); setStatusFilter(''); }}
            className="text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 animate-pulse space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-slate-100 rounded-lg" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mb-4">
            <Mail className="w-7 h-7 text-slate-400" />
          </div>
          <p className="text-slate-700 font-semibold text-base mb-1">No messages found</p>
          <p className="text-slate-400 text-sm">
            {search || statusFilter
              ? 'Try adjusting your filters or search term.'
              : 'Contact messages will appear here once submitted.'}
          </p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Sender</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Phone</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Inquiry Type</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Message</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{item.name}</p>
                      <p className="text-xs text-slate-400">{item.email}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{item.phone}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{item.inquiryType ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-500 max-w-[200px] truncate">{item.message}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border capitalize ${statusBadge(item.status)}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{formatDate(item.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setViewItem(item)}
                          title="View"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50 transition-all"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {item.status === 'new' && (
                          <button
                            onClick={() => statusMutation.mutate({ id: item.id, status: 'read' })}
                            title="Mark as read"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-all"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => setDeleteId(item.id)}
                          title="Delete"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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

      {viewItem && (
        <ViewModal
          item={viewItem}
          onClose={() => setViewItem(null)}
          onStatusChange={(id, status) => statusMutation.mutate({ id, status })}
          isUpdating={statusMutation.isPending}
        />
      )}

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title="Delete Message"
        message="Are you sure you want to delete this contact message? This action cannot be undone."
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
