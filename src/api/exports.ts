import apiClient from '../lib/axios';

export const exportsApi = {
  exportStudents: async (): Promise<Blob> => {
    const response = await apiClient.get('/exports/students', { responseType: 'blob' });
    return response.data;
  },

  exportResultsBySemester: async (semesterId: string): Promise<Blob> => {
    const response = await apiClient.get(`/exports/results/semester/${semesterId}`, { responseType: 'blob' });
    return response.data;
  },

  exportAttendanceByCourse: async (courseId: string): Promise<Blob> => {
    const response = await apiClient.get(`/exports/attendance/course/${courseId}`, { responseType: 'blob' });
    return response.data;
  },
};

// Helper: trigger CSV download in browser
export function downloadCsv(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
