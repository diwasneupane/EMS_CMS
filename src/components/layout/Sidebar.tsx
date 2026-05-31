import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  GraduationCap,
  BookOpen,
  Calendar,
  Clock,
  ClipboardList,
  Users,
  UserCheck,
  Briefcase,
  UserPlus,
  BookMarked,
  CheckSquare,
  BarChart3,
  Bell,
  FileText,
  Shield,
  X,
  GraduationCap as Logo,
  Inbox,
  Mail,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { usePermission } from '../../hooks/usePermission';
import { Badge } from '../ui/Badge';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
  permission?: [string, string];
  badgeCount?: number;
}

interface NavGroup {
  title: string;
  items: NavItem[];
  adminOnly?: boolean;
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  pendingCount?: number;
}

export function Sidebar({ isOpen, onClose, pendingCount = 0 }: SidebarProps) {
  const { can, isAdmin } = usePermission();
  const location = useLocation();

  const navGroups: NavGroup[] = [
    {
      title: 'OVERVIEW',
      items: [
        {
          label: 'Dashboard',
          path: '/dashboard',
          icon: <LayoutDashboard className="w-4 h-4" />,
        },
      ],
    },
    {
      title: 'ACADEMIC',
      items: [
        {
          label: 'Departments',
          path: '/departments',
          icon: <Building2 className="w-4 h-4" />,
          permission: ['departments', 'read'],
        },
        {
          label: 'Programs',
          path: '/programs',
          icon: <GraduationCap className="w-4 h-4" />,
          permission: ['programs', 'read'],
        },
        {
          label: 'Courses',
          path: '/courses',
          icon: <BookOpen className="w-4 h-4" />,
          permission: ['courses', 'read'],
        },
        {
          label: 'Semesters',
          path: '/semesters',
          icon: <Calendar className="w-4 h-4" />,
          permission: ['semesters', 'read'],
        },
      ],
    },
    {
      title: 'SCHEDULING',
      items: [
        {
          label: 'Class Schedules',
          path: '/schedules',
          icon: <Clock className="w-4 h-4" />,
          permission: ['schedules', 'read'],
        },
        {
          label: 'Course Assignments',
          path: '/assignments',
          icon: <ClipboardList className="w-4 h-4" />,
          permission: ['assignments', 'read'],
        },
      ],
    },
    {
      title: 'PEOPLE',
      items: [
        {
          label: 'All Users',
          path: '/users',
          icon: <Users className="w-4 h-4" />,
          adminOnly: true,
        },
        {
          label: 'Students',
          path: '/users/students',
          icon: <UserCheck className="w-4 h-4" />,
          permission: ['users', 'read'],
        },
        {
          label: 'Teachers',
          path: '/users/teachers',
          icon: <Briefcase className="w-4 h-4" />,
          permission: ['users', 'read'],
        },
        {
          label: 'Pending Approvals',
          path: '/users/pending',
          icon: <UserPlus className="w-4 h-4" />,
          adminOnly: true,
          badgeCount: pendingCount,
        },
      ],
    },
    {
      title: 'LEARNING',
      items: [
        {
          label: 'Enrollments',
          path: '/enrollments',
          icon: <BookMarked className="w-4 h-4" />,
          permission: ['enrollments', 'read'],
        },
        {
          label: 'Attendance',
          path: '/attendance',
          icon: <CheckSquare className="w-4 h-4" />,
          permission: ['attendance', 'read'],
        },
        {
          label: 'Results',
          path: '/results',
          icon: <BarChart3 className="w-4 h-4" />,
          permission: ['results', 'read'],
        },
      ],
    },
    {
      title: 'COMMUNICATION',
      items: [
        {
          label: 'Announcements',
          path: '/announcements',
          icon: <Bell className="w-4 h-4" />,
          permission: ['announcements', 'read'],
        },
      ],
    },
    {
      title: 'INQUIRIES',
      adminOnly: true,
      items: [
        {
          label: 'Admission Inquiries',
          path: '/inquiries',
          icon: <Inbox className="w-4 h-4" />,
          adminOnly: true,
        },
        {
          label: 'Contact Messages',
          path: '/contacts',
          icon: <Mail className="w-4 h-4" />,
          adminOnly: true,
        },
      ],
    },
    {
      title: 'REPORTS',
      items: [
        {
          label: 'Reports & Analytics',
          path: '/reports',
          icon: <FileText className="w-4 h-4" />,
        },
      ],
    },
    {
      title: 'SETTINGS',
      adminOnly: true,
      items: [
        {
          label: 'Roles & Permissions',
          path: '/roles',
          icon: <Shield className="w-4 h-4" />,
          adminOnly: true,
        },
      ],
    },
  ];

  const isActive = (path: string) => {
    if (path === '/users') {
      return location.pathname === '/users';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 h-full z-40 flex flex-col',
          'w-64 bg-[#0F172A] transition-transform duration-300',
          'lg:translate-x-0 lg:static lg:z-auto',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 h-16 border-b border-slate-700/50 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center">
              <Logo className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-white leading-none">EMS Admin</p>
              <p className="text-xs text-slate-400 mt-0.5">Education Portal</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 scrollbar-thin">
          {navGroups.map((group) => {
            if (group.adminOnly && !isAdmin) return null;
            const visibleItems = group.items.filter((item) => {
              if (item.adminOnly && !isAdmin) return false;
              if (item.permission) return can(item.permission[0], item.permission[1]);
              return true;
            });
            if (visibleItems.length === 0) return null;

            return (
              <div key={group.title} className="mb-1">
                <p className="px-5 py-2 text-xs font-semibold tracking-widest text-slate-500 uppercase">
                  {group.title}
                </p>
                {visibleItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => {
                      if (window.innerWidth < 1024) onClose();
                    }}
                    className={cn(
                      'flex items-center gap-3 px-5 py-2.5 mx-2 rounded-lg text-sm font-medium transition-all duration-150',
                      isActive(item.path)
                        ? 'bg-primary-600/20 text-primary-400 border border-primary-600/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50',
                    )}
                  >
                    <span
                      className={cn(
                        isActive(item.path) ? 'text-primary-400' : 'text-slate-500',
                      )}
                    >
                      {item.icon}
                    </span>
                    <span className="flex-1">{item.label}</span>
                    {item.badgeCount !== undefined && item.badgeCount > 0 && (
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold">
                        {item.badgeCount > 99 ? '99+' : item.badgeCount}
                      </span>
                    )}
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-slate-700/50 flex-shrink-0">
          <p className="text-xs text-slate-600 text-center">EMS v1.0.0</p>
        </div>
      </aside>
    </>
  );
}
