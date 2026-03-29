import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, FileText, BarChart2, Users, CalendarCheck, GraduationCap, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { reportsApi } from '../../api/reports';
import { coursesApi } from '../../api/courses';
import { semestersApi } from '../../api/semesters';
import { usersApi } from '../../api/users';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { Table } from '../../components/ui/Table';
import type { Column } from '../../components/ui/Table';
import { formatDate } from '../../lib/utils';

type ReportType = 'transcript' | 'grade-sheet' | 'attendance' | 'semester-summary' | 'teacher-performance';

interface ReportCard {
  type: ReportType;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

const REPORT_CARDS: ReportCard[] = [
  {
    type: 'transcript',
    title: 'Student Transcript',
    description: 'Complete academic record for a student across all semesters',
    icon: <FileText className="w-6 h-6" />,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
  },
  {
    type: 'grade-sheet',
    title: 'Grade Sheet',
    description: 'Complete grades for all students in a specific course and semester',
    icon: <BarChart2 className="w-6 h-6" />,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
  },
  {
    type: 'attendance',
    title: 'Attendance Report',
    description: 'Detailed attendance records by course, semester, or student',
    icon: <CalendarCheck className="w-6 h-6" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  {
    type: 'semester-summary',
    title: 'Semester Summary',
    description: 'Overview of all academic activities for a semester',
    icon: <GraduationCap className="w-6 h-6" />,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
  },
  {
    type: 'teacher-performance',
    title: 'Teacher Performance',
    description: "Analysis of teacher's course load and student outcomes",
    icon: <TrendingUp className="w-6 h-6" />,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
  },
];

export default function ReportsPage() {
  const [activeReport, setActiveReport] = useState<ReportType | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [reportData, setReportData] = useState<unknown[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { data: coursesData } = useQuery({ queryKey: ['courses-all'], queryFn: () => coursesApi.getAll({ limit: 100 }) });
  const { data: semestersData } = useQuery({ queryKey: ['semesters-all'], queryFn: () => semestersApi.getAll({ limit: 100 }) });
  const { data: studentsData } = useQuery({ queryKey: ['students-all'], queryFn: () => usersApi.getStudents({ limit: 200 }) });
  const { data: teachersData } = useQuery({ queryKey: ['teachers-all'], queryFn: () => usersApi.getTeachers({ limit: 100 }) });

  const courseOptions = (coursesData?.items ?? []).map((c) => ({ value: c.id, label: `${c.code} - ${c.name}` }));
  const semesterOptions = (semestersData?.items ?? []).map((s) => ({ value: s.id, label: s.name }));
  const studentOptions = (studentsData?.items ?? []).map((s) => ({ value: s.id, label: `${s.firstName} ${s.lastName}` }));
  const teacherOptions = (teachersData?.items ?? []).map((t) => ({ value: t.id, label: `${t.firstName} ${t.lastName}` }));

  const openReport = (type: ReportType) => {
    setActiveReport(type);
    setFilters({});
    setReportData(null);
  };

  const generateReport = async () => {
    if (!activeReport) return;
    setIsLoading(true);
    try {
      let data;
      if (activeReport === 'transcript' && filters.studentId) {
        data = await reportsApi.getTranscript(filters.studentId);
      } else if (activeReport === 'grade-sheet' && filters.courseId && filters.semesterId) {
        data = await reportsApi.getGradeSheet(filters.courseId, filters.semesterId);
      } else if (activeReport === 'attendance') {
        if (filters.studentId) {
          data = await reportsApi.getAttendanceReportByStudent(filters.studentId);
        } else if (filters.courseId) {
          data = await reportsApi.getAttendanceReportByCourse(filters.courseId);
        }
      } else if (activeReport === 'semester-summary' && filters.semesterId) {
        data = await reportsApi.getSemesterSummary(filters.semesterId);
      } else if (activeReport === 'teacher-performance' && filters.teacherId) {
        data = await reportsApi.getTeacherPerformance(filters.teacherId);
      }
      setReportData(Array.isArray(data) ? data : data ? [data] : []);
      toast.success('Report generated successfully');
    } catch {
      toast.error('Failed to generate report. Check your filters.');
      setReportData([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async () => {
    toast.error('Export not available for this report type');
  };

  const renderFilters = () => {
    if (!activeReport) return null;

    return (
      <div className="space-y-4">
        {(activeReport === 'transcript') && (
          <select
            value={filters.studentId ?? ''}
            onChange={(e) => setFilters((p) => ({ ...p, studentId: e.target.value }))}
            className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
          >
            <option value="">Select Student</option>
            {studentOptions.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        )}
        {(activeReport === 'grade-sheet' || activeReport === 'attendance') && (
          <select
            value={filters.courseId ?? ''}
            onChange={(e) => setFilters((p) => ({ ...p, courseId: e.target.value }))}
            className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
          >
            <option value="">Select Course</option>
            {courseOptions.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        )}
        {activeReport === 'teacher-performance' && (
          <select
            value={filters.teacherId ?? ''}
            onChange={(e) => setFilters((p) => ({ ...p, teacherId: e.target.value }))}
            className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
          >
            <option value="">Select Teacher (optional)</option>
            {teacherOptions.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        )}
        <select
          value={filters.semesterId ?? ''}
          onChange={(e) => setFilters((p) => ({ ...p, semesterId: e.target.value }))}
          className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
        >
          <option value="">Select Semester</option>
          {semesterOptions.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>
    );
  };

  return (
    <div>
      <PageHeader
        title="Reports & Analytics"
        description="Generate and export academic reports"
      />

      {/* Report Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
        {REPORT_CARDS.map((report) => (
          <div
            key={report.type}
            onClick={() => openReport(report.type)}
            className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 cursor-pointer hover:border-primary-300 hover:shadow-md transition-all group"
          >
            <div className={`w-12 h-12 rounded-xl ${report.bgColor} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
              <span className={report.color}>{report.icon}</span>
            </div>
            <h3 className="text-base font-semibold text-slate-800 mb-1.5 group-hover:text-primary-700 transition-colors">
              {report.title}
            </h3>
            <p className="text-sm text-slate-500 leading-relaxed">{report.description}</p>
            <div className="flex items-center gap-1 mt-4 text-primary-600 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
              <span>Generate Report</span>
            </div>
          </div>
        ))}
      </div>

      {/* Report Viewer Modal */}
      {activeReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {REPORT_CARDS.find((r) => r.type === activeReport)?.title}
                </h2>
                <p className="text-sm text-slate-500 mt-0.5">Configure filters and generate report</p>
              </div>
              <button
                onClick={() => setActiveReport(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {/* Filters */}
              <div className="p-6 border-b border-slate-200 bg-slate-50">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Report Filters</h3>
                {renderFilters()}
                <div className="flex gap-3 mt-4">
                  <Button
                    variant="primary"
                    onClick={generateReport}
                    isLoading={isLoading}
                  >
                    Generate Report
                  </Button>
                  {reportData && reportData.length > 0 && (
                    <Button
                      variant="secondary"
                      leftIcon={<Download className="w-4 h-4" />}
                      onClick={handleExport}
                    >
                      Export CSV
                    </Button>
                  )}
                </div>
              </div>

              {/* Results */}
              <div className="p-6">
                {reportData === null ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <FileText className="w-12 h-12 text-slate-300 mb-3" />
                    <p className="text-slate-500">Configure filters above and click "Generate Report"</p>
                  </div>
                ) : reportData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <p className="text-slate-500">No data found for the selected filters</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-medium text-slate-600 mb-4">
                      {reportData.length} record{reportData.length !== 1 ? 's' : ''} found
                    </p>
                    <div className="overflow-x-auto">
                      <pre className="text-xs bg-slate-50 rounded-lg p-4 border border-slate-200 overflow-auto max-h-96">
                        {JSON.stringify(reportData, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
