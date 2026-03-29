import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useQuery } from '@tanstack/react-query';
import { usersApi } from '../../api/users';
import { useAuth } from '../../hooks/useAuth';

export function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isAdmin } = useAuth();

  const { data: pendingData } = useQuery({
    queryKey: ['pending-count'],
    queryFn: () => usersApi.getPendingApprovals({ page: 1, limit: 1 }),
    enabled: isAdmin,
    staleTime: 1000 * 60 * 2,
  });

  const pendingCount = pendingData?.total ?? 0;

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        pendingCount={pendingCount}
      />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Header onMenuToggle={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
