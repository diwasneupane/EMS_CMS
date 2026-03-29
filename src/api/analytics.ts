import apiClient from '../lib/axios';

// Actual admin response shape — no `role` discriminator
export interface AdminDashboard {
  totalStudents: number;
  totalTeachers: number;
  totalCourses: number;
  totalDepartments: number;
  totalPrograms: number;
  pendingApprovals: number;
  totalEnrollments: number;
  currentSemester?: { id: string; name: string } | null;
}

export interface TeacherDashboard {
  assignedCourses: number;
  totalStudents: number;
  averageAttendance: number;
}

export interface StudentDashboard {
  enrolledCourses: number;
  gpa: number;
  attendancePercentage: number;
  completedCredits: number;
}

export type DashboardData = AdminDashboard | TeacherDashboard | StudentDashboard;

export const analyticsApi = {
  getDashboard: async (): Promise<DashboardData> => {
    const { data } = await apiClient.get('/analytics/dashboard');
    return data;
  },
};
