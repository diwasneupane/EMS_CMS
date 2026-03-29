import apiClient from '../lib/axios';

export const reportsApi = {
  getTranscript: async (studentId: string) => {
    const { data } = await apiClient.get(`/reports/transcript/${studentId}`);
    return data;
  },

  getGradeSheet: async (courseId: string, semesterId: string) => {
    const { data } = await apiClient.get(`/reports/grade-sheet/course/${courseId}/semester/${semesterId}`);
    return data;
  },

  getAttendanceReportByStudent: async (studentId: string) => {
    const { data } = await apiClient.get(`/reports/attendance-report/student/${studentId}`);
    return data;
  },

  getAttendanceReportByCourse: async (courseId: string) => {
    const { data } = await apiClient.get(`/reports/attendance-report/course/${courseId}`);
    return data;
  },

  getSemesterSummary: async (semesterId: string) => {
    const { data } = await apiClient.get(`/reports/semester-summary/${semesterId}`);
    return data;
  },

  getTeacherPerformance: async (teacherId: string) => {
    const { data } = await apiClient.get(`/reports/teacher-performance/${teacherId}`);
    return data;
  },
};
