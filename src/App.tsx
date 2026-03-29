import React from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { DashboardLayout } from './components/layout/DashboardLayout';
import LoginPage from './pages/auth/LoginPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import UsersPage from './pages/users/UsersPage';
import StudentsPage from './pages/users/StudentsPage';
import TeachersPage from './pages/users/TeachersPage';
import PendingApprovalsPage from './pages/users/PendingApprovalsPage';
import DepartmentsPage from './pages/departments/DepartmentsPage';
import ProgramsPage from './pages/programs/ProgramsPage';
import CoursesPage from './pages/courses/CoursesPage';
import SemestersPage from './pages/semesters/SemestersPage';
import SchedulesPage from './pages/schedules/SchedulesPage';
import AssignmentsPage from './pages/assignments/AssignmentsPage';
import EnrollmentsPage from './pages/enrollments/EnrollmentsPage';
import AttendancePage from './pages/attendance/AttendancePage';
import ResultsPage from './pages/results/ResultsPage';
import AnnouncementsPage from './pages/announcements/AnnouncementsPage';
import ReportsPage from './pages/reports/ReportsPage';
import RolesPage from './pages/roles/RolesPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!user?.roles?.includes('admin')) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />

          {/* Users */}
          <Route
            path="users"
            element={
              <AdminRoute>
                <UsersPage />
              </AdminRoute>
            }
          />
          <Route path="users/students" element={<StudentsPage />} />
          <Route path="users/teachers" element={<TeachersPage />} />
          <Route
            path="users/pending"
            element={
              <AdminRoute>
                <PendingApprovalsPage />
              </AdminRoute>
            }
          />

          {/* Academic */}
          <Route path="departments" element={<DepartmentsPage />} />
          <Route path="programs" element={<ProgramsPage />} />
          <Route path="courses" element={<CoursesPage />} />
          <Route path="semesters" element={<SemestersPage />} />

          {/* Scheduling */}
          <Route path="schedules" element={<SchedulesPage />} />
          <Route path="assignments" element={<AssignmentsPage />} />

          {/* Learning */}
          <Route path="enrollments" element={<EnrollmentsPage />} />
          <Route path="attendance" element={<AttendancePage />} />
          <Route path="results" element={<ResultsPage />} />

          {/* Communication */}
          <Route path="announcements" element={<AnnouncementsPage />} />

          {/* Reports */}
          <Route path="reports" element={<ReportsPage />} />

          {/* Settings (admin only) */}
          <Route
            path="roles"
            element={
              <AdminRoute>
                <RolesPage />
              </AdminRoute>
            }
          />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
