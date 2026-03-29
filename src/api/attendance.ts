import apiClient from '../lib/axios';
import type { Attendance, PaginatedResponse, PaginationParams, AttendanceReportParams } from '../types';

export interface MarkAttendancePayload {
  courseId: string;
  semesterId: string;
  date: string; // YYYY-MM-DD
  teacherId: string;
  records: Array<{
    studentId: string;
    enrollmentId?: string;
    status: 'present' | 'absent' | 'late' | 'excused';
    remarks?: string;
  }>;
}

export const attendanceApi = {
  // Mark bulk attendance for a class session
  mark: async (payload: MarkAttendancePayload): Promise<Attendance[]> => {
    const { data } = await apiClient.post('/attendance/mark', payload);
    return data;
  },

  // Update a single attendance record
  update: async (id: string, payload: {
    status?: 'present' | 'absent' | 'late' | 'excused';
    remarks?: string;
  }): Promise<Attendance> => {
    const { data } = await apiClient.patch(`/attendance/${id}`, payload);
    return data;
  },

  // Get attendance by course and date
  getByCourseAndDate: async (courseId: string, date: string, params?: PaginationParams): Promise<PaginatedResponse<Attendance>> => {
    const { data } = await apiClient.get(`/attendance/course/${courseId}/date/${date}`, { params });
    return data;
  },

  // Own attendance
  getMyAttendance: async (params?: PaginationParams): Promise<PaginatedResponse<Attendance>> => {
    const { data } = await apiClient.get('/attendance/my-attendance', { params });
    return data;
  },

  // By student
  getByStudent: async (studentId: string, params?: PaginationParams): Promise<PaginatedResponse<Attendance>> => {
    const { data } = await apiClient.get(`/attendance/student/${studentId}`, { params });
    return data;
  },

  // By student and course
  getByStudentAndCourse: async (studentId: string, courseId: string, params?: PaginationParams): Promise<PaginatedResponse<Attendance>> => {
    const { data } = await apiClient.get(`/attendance/student/${studentId}/course/${courseId}`, { params });
    return data;
  },

  // Student stats
  getStudentStats: async (studentId: string): Promise<{
    totalClasses: number;
    present: number;
    absent: number;
    late: number;
    excused: number;
    attendancePercentage: number;
  }> => {
    const { data } = await apiClient.get(`/attendance/statistics/student/${studentId}`);
    return data;
  },

  // Course stats
  getCourseStats: async (courseId: string): Promise<{
    courseId: string;
    totalStudents: number;
    averageAttendance: number;
  }> => {
    const { data } = await apiClient.get(`/attendance/statistics/course/${courseId}`);
    return data;
  },

  // Date range report
  getDateRangeReport: async (params: AttendanceReportParams): Promise<PaginatedResponse<Attendance>> => {
    const { data } = await apiClient.get('/attendance/report/date-range', { params });
    return data;
  },
};
