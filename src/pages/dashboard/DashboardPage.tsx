import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Users, BookOpen, Building2, GraduationCap, UserPlus,
  BookMarked, Bell, TrendingUp, ChevronRight, Clock,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { StatCard } from '../../components/ui/StatCard';
import { Card, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { analyticsApi } from '../../api/analytics';
import type { AdminDashboard, TeacherDashboard, StudentDashboard } from '../../api/analytics';
import { useAuth } from '../../hooks/useAuth';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line,
} from 'recharts';

const mockChartData = [
  { month: 'Sep', enrollments: 120 },
  { month: 'Oct', enrollments: 145 },
  { month: 'Nov', enrollments: 132 },
  { month: 'Dec', enrollments: 160 },
  { month: 'Jan', enrollments: 178 },
  { month: 'Feb', enrollments: 165 },
  { month: 'Mar', enrollments: 182 },
];

const mockGradeData = [
  { grade: 'A', count: 45 },
  { grade: 'B+', count: 80 },
  { grade: 'B', count: 95 },
  { grade: 'C+', count: 70 },
  { grade: 'C', count: 40 },
  { grade: 'D', count: 20 },
  { grade: 'F', count: 8 },
];

export default function DashboardPage() {
  const { isAdmin, isTeacher, user } = useAuth();
  const navigate = useNavigate();

  const { data: dashData, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: analyticsApi.getDashboard,
    staleTime: 1000 * 60 * 2,
  });

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="xl" />
      </div>
    );
  }

  // Use role from useAuth (not from API response — API doesn't return role field)
  const adminData = isAdmin ? (dashData as AdminDashboard) : null;
  const teacherData = isTeacher ? (dashData as TeacherDashboard) : null;
  const studentData = !isAdmin && !isTeacher ? (dashData as StudentDashboard) : null;

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold">
          {greeting}, {user?.firstName}!
        </h1>
        <p className="mt-1 text-primary-200 flex items-center gap-1.5 text-sm">
          <Clock className="w-4 h-4" />
          {today}
        </p>
        {adminData?.currentSemester && (
          <p className="mt-2 text-sm text-primary-100">
            Current semester: <span className="font-semibold">{adminData.currentSemester.name}</span>
          </p>
        )}
      </div>

      {/* ── ADMIN VIEW ── */}
      {isAdmin && adminData && (
        <>
          {/* Stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
            <StatCard
              label="Total Students"
              value={adminData.totalStudents ?? 0}
              icon={<Users className="w-5 h-5" />}
              color="indigo"
            />
            <StatCard
              label="Total Teachers"
              value={adminData.totalTeachers ?? 0}
              icon={<GraduationCap className="w-5 h-5" />}
              color="emerald"
            />
            <StatCard
              label="Total Courses"
              value={adminData.totalCourses ?? 0}
              icon={<BookOpen className="w-5 h-5" />}
              color="blue"
            />
            <StatCard
              label="Departments"
              value={adminData.totalDepartments ?? 0}
              icon={<Building2 className="w-5 h-5" />}
              color="purple"
            />
            <StatCard
              label="Programs"
              value={adminData.totalPrograms ?? 0}
              icon={<GraduationCap className="w-5 h-5" />}
              color="rose"
            />
            <StatCard
              label="Enrollments"
              value={adminData.totalEnrollments ?? 0}
              icon={<BookMarked className="w-5 h-5" />}
              color="amber"
            />
            {(adminData.pendingApprovals ?? 0) > 0 && (
              <div
                className="col-span-2 flex items-center gap-4 p-4 rounded-xl bg-amber-50 border border-amber-200 cursor-pointer hover:bg-amber-100 transition-colors"
                onClick={() => navigate('/users/pending')}
              >
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <UserPlus className="w-5 h-5 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-amber-800">
                    {adminData.pendingApprovals} pending approval{adminData.pendingApprovals !== 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-amber-600">Students waiting for admin review</p>
                </div>
                <ChevronRight className="w-4 h-4 text-amber-500 flex-shrink-0" />
              </div>
            )}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader title="Enrollment Trends" description="Monthly enrollments" />
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={mockChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }} />
                  <Line type="monotone" dataKey="enrollments" stroke="#4f46e5" strokeWidth={2} dot={{ fill: '#4f46e5', r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </Card>

            <Card>
              <CardHeader title="Grade Distribution" description="Current semester" />
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={mockGradeData} barSize={24}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="grade" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Quick actions */}
          <Card>
            <CardHeader title="Quick Actions" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Add Student', path: '/users/students', icon: <Users className="w-5 h-5" />, color: 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100' },
                { label: 'Add Course', path: '/courses', icon: <BookOpen className="w-5 h-5" />, color: 'bg-blue-50 text-blue-600 hover:bg-blue-100' },
                { label: 'Announcement', path: '/announcements', icon: <Bell className="w-5 h-5" />, color: 'bg-amber-50 text-amber-600 hover:bg-amber-100' },
                { label: 'View Reports', path: '/reports', icon: <TrendingUp className="w-5 h-5" />, color: 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' },
              ].map((a) => (
                <button
                  key={a.path}
                  onClick={() => navigate(a.path)}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition-all group"
                >
                  <div className={`p-2.5 rounded-lg transition-colors ${a.color}`}>{a.icon}</div>
                  <span className="text-xs font-medium text-slate-600 group-hover:text-slate-800">{a.label}</span>
                </button>
              ))}
            </div>
          </Card>
        </>
      )}

      {/* ── TEACHER VIEW ── */}
      {isTeacher && teacherData && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              label="Assigned Courses"
              value={teacherData.assignedCourses ?? 0}
              icon={<BookOpen className="w-5 h-5" />}
              color="indigo"
            />
            <StatCard
              label="Total Students"
              value={teacherData.totalStudents ?? 0}
              icon={<Users className="w-5 h-5" />}
              color="emerald"
            />
            <StatCard
              label="Avg. Attendance"
              value={`${teacherData.averageAttendance ?? 0}%`}
              icon={<TrendingUp className="w-5 h-5" />}
              color="blue"
            />
          </div>

          <Card>
            <CardHeader title="Quick Actions" />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: 'My Schedule', path: '/schedules', icon: <Clock className="w-5 h-5" />, color: 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100' },
                { label: 'Mark Attendance', path: '/attendance', icon: <BookMarked className="w-5 h-5" />, color: 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' },
                { label: 'Enter Results', path: '/results', icon: <TrendingUp className="w-5 h-5" />, color: 'bg-amber-50 text-amber-600 hover:bg-amber-100' },
              ].map((a) => (
                <button key={a.path} onClick={() => navigate(a.path)}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition-all group"
                >
                  <div className={`p-2.5 rounded-lg transition-colors ${a.color}`}>{a.icon}</div>
                  <span className="text-xs font-medium text-slate-600 group-hover:text-slate-800">{a.label}</span>
                </button>
              ))}
            </div>
          </Card>
        </>
      )}

      {/* ── STUDENT VIEW ── */}
      {!isAdmin && !isTeacher && studentData && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Enrolled Courses" value={studentData.enrolledCourses ?? 0} icon={<BookOpen className="w-5 h-5" />} color="indigo" />
          <StatCard label="GPA" value={studentData.gpa?.toFixed(2) ?? '0.00'} icon={<TrendingUp className="w-5 h-5" />} color="emerald" />
          <StatCard label="Attendance" value={`${studentData.attendancePercentage ?? 0}%`} icon={<GraduationCap className="w-5 h-5" />} color="blue" />
          <StatCard label="Credits" value={studentData.completedCredits ?? 0} icon={<BookMarked className="w-5 h-5" />} color="purple" />
        </div>
      )}
    </div>
  );
}
