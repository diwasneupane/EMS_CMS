import React, { useState, useRef, useEffect } from 'react';
import { Menu, LogOut, User, Bell, ChevronDown, Shield, BookOpen, Users, Megaphone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { announcementsApi } from '../../api/announcements';
import { getInitials, cn } from '../../lib/utils';
import { formatDate } from '../../lib/utils';

interface HeaderProps {
  onMenuToggle: () => void;
}

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  admin: { label: 'Administrator', color: 'bg-purple-100 text-purple-700' },
  teacher: { label: 'Teacher', color: 'bg-blue-100 text-blue-700' },
  student: { label: 'Student', color: 'bg-emerald-100 text-emerald-700' },
};

const PRIORITY_COLOR: Record<string, string> = {
  urgent: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-slate-100 text-slate-600',
};

export function Header({ onMenuToggle }: HeaderProps) {
  const { user, logout, isAdmin, isTeacher } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLDivElement>(null);

  const { data: notifData } = useQuery({
    queryKey: ['my-announcements-bell'],
    queryFn: () => announcementsApi.getMyAnnouncements({ limit: 10 }),
    refetchInterval: 60000,
  });

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const announcements = notifData?.items ?? [];
  const unreadCount = announcements.length;

  // Derive primary role from roles array (from login response)
  const primaryRole = user?.roles?.[0] ?? (isAdmin ? 'admin' : isTeacher ? 'teacher' : 'student');
  const roleInfo = ROLE_LABELS[primaryRole] ?? { label: primaryRole, color: 'bg-slate-100 text-slate-600' };

  const initials = user ? getInitials(user.firstName, user.lastName) : 'U';
  const fullName = user ? `${user.firstName} ${user.lastName}` : 'User';

  const handleNav = (path: string) => {
    setDropdownOpen(false);
    navigate(path);
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-6 flex-shrink-0">
      <button
        onClick={onMenuToggle}
        className="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 lg:hidden transition-colors"
        aria-label="Toggle menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      <div className="flex-1 lg:flex-none" />

      <div className="flex items-center gap-2">
        {/* Notifications */}
        <div className="relative" ref={bellRef}>
          <button
            onClick={() => setBellOpen(!bellOpen)}
            className="relative p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {bellOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-80 bg-white rounded-xl border border-slate-200 shadow-lg z-50">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Megaphone className="w-4 h-4 text-slate-500" />
                  <span className="text-sm font-semibold text-slate-800">Announcements</span>
                </div>
                {unreadCount > 0 && (
                  <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">{unreadCount} new</span>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
                {announcements.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <Bell className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">No announcements</p>
                  </div>
                ) : (
                  announcements.map((a) => (
                    <div key={a.id} className="px-4 py-3 hover:bg-slate-50 transition-colors">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="text-sm font-medium text-slate-800 leading-snug">{a.title}</p>
                        <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full whitespace-nowrap flex-shrink-0', PRIORITY_COLOR[a.priority] ?? PRIORITY_COLOR.low)}>
                          {a.priority}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-2">{a.content}</p>
                      <p className="text-[10px] text-slate-400 mt-1">{formatDate(a.createdAt)}</p>
                    </div>
                  ))
                )}
              </div>

              {announcements.length > 0 && (
                <div className="px-4 py-2.5 border-t border-slate-100">
                  <button
                    onClick={() => { setBellOpen(false); navigate('/announcements'); }}
                    className="text-xs text-primary-600 hover:text-primary-700 font-medium w-full text-center"
                  >
                    View all announcements →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* User Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2.5 pl-1 pr-2 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {initials}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium text-slate-800 leading-none">{fullName}</p>
              <p className={cn('text-xs mt-0.5 px-1.5 py-0.5 rounded-full font-medium inline-block', roleInfo.color)}>
                {roleInfo.label}
              </p>
            </div>
            <ChevronDown
              className={cn(
                'w-4 h-4 text-slate-400 transition-transform hidden sm:block',
                dropdownOpen && 'rotate-180',
              )}
            />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-60 bg-white rounded-xl border border-slate-200 shadow-lg py-1 z-50">
              {/* User info header */}
              <div className="px-4 py-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{fullName}</p>
                    <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                    <span className={cn('text-xs px-1.5 py-0.5 rounded-full font-medium mt-0.5 inline-block', roleInfo.color)}>
                      {roleInfo.label}
                    </span>
                  </div>
                </div>
              </div>

              {/* All roles */}
              {(user?.roles ?? []).length > 1 && (
                <div className="px-4 py-2 border-b border-slate-100">
                  <p className="text-xs text-slate-400 mb-1.5">Roles</p>
                  <div className="flex flex-wrap gap-1">
                    {(user?.roles ?? []).map((r) => {
                      const ri = ROLE_LABELS[r] ?? { label: r, color: 'bg-slate-100 text-slate-600' };
                      return (
                        <span key={r} className={cn('text-xs px-1.5 py-0.5 rounded-full font-medium', ri.color)}>
                          {ri.label}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Nav items */}
              <div className="py-1">
                <button
                  onClick={() => handleNav('/profile')}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <User className="w-4 h-4 text-slate-400" />
                  My Profile
                </button>
                {isAdmin && (
                  <>
                    <button
                      onClick={() => handleNav('/users')}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <Users className="w-4 h-4 text-slate-400" />
                      All Users
                    </button>
                    <button
                      onClick={() => handleNav('/users/pending')}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <User className="w-4 h-4 text-slate-400" />
                      Pending Approvals
                    </button>
                    <button
                      onClick={() => handleNav('/roles')}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <Shield className="w-4 h-4 text-slate-400" />
                      Roles & Permissions
                    </button>
                  </>
                )}
                {isTeacher && (
                  <button
                    onClick={() => handleNav('/assignments')}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <BookOpen className="w-4 h-4 text-slate-400" />
                    My Courses
                  </button>
                )}
              </div>

              <div className="border-t border-slate-100">
                <button
                  onClick={() => { setDropdownOpen(false); logout(); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
