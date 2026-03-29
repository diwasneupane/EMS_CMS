import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, ClipboardCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { attendanceApi } from '../../api/attendance';
import { coursesApi } from '../../api/courses';
import { semestersApi } from '../../api/semesters';
import { enrollmentsApi } from '../../api/enrollments';
import { useAuth } from '../../hooks/useAuth';
import { usePermission } from '../../hooks/usePermission';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Table } from '../../components/ui/Table';
import type { Column } from '../../components/ui/Table';
import { Pagination } from '../../components/ui/Pagination';
import { Spinner } from '../../components/ui/Spinner';
import { formatDate, getInitials } from '../../lib/utils';
import type { Attendance, AttendanceStatus } from '../../types';

const STATUS_OPTIONS: { value: AttendanceStatus; label: string; color: string }[] = [
  { value: 'present', label: 'Present', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  { value: 'absent', label: 'Absent', color: 'text-red-600 bg-red-50 border-red-200' },
  { value: 'late', label: 'Late', color: 'text-amber-600 bg-amber-50 border-amber-200' },
  { value: 'excused', label: 'Excused', color: 'text-blue-600 bg-blue-50 border-blue-200' },
];

export default function AttendancePage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { can } = usePermission();
  const [activeTab, setActiveTab] = useState<'mark' | 'records'>('mark');
  const [courseFilter, setCourseFilter] = useState('');
  const [semesterFilter, setSemesterFilter] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceStatus>>({});
  const [recordPage, setRecordPage] = useState(1);

  const { data: coursesData } = useQuery({ queryKey: ['courses-all'], queryFn: () => coursesApi.getAll({ limit: 100 }) });
  const { data: semestersData } = useQuery({ queryKey: ['semesters-all'], queryFn: () => semestersApi.getAll({ limit: 100 }) });

  // Get enrolled students by fetching enrollments for course+semester
  const { data: enrollmentsData, isLoading: studentsLoading } = useQuery({
    queryKey: ['enrollments-for-attendance', courseFilter, semesterFilter],
    queryFn: () => enrollmentsApi.getByCourseAndSemester(courseFilter, semesterFilter, { limit: 100 }),
    enabled: !!courseFilter && !!semesterFilter,
  });

  const { data: records, isLoading: recordsLoading } = useQuery({
    queryKey: ['attendance-records', recordPage, courseFilter, selectedDate],
    queryFn: () => attendanceApi.getByCourseAndDate(courseFilter, selectedDate, { page: recordPage, limit: 10 }),
    enabled: activeTab === 'records' && !!courseFilter,
  });

  const markMutation = useMutation({
    mutationFn: attendanceApi.mark,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-records'] });
      toast.success('Attendance saved successfully');
      setAttendanceMap({});
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message || 'Failed to save attendance');
    },
  });

  const enrollments = enrollmentsData?.items ?? [];
  const students = enrollments.map((e) => e.student).filter(Boolean);

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setAttendanceMap((prev) => ({ ...prev, [studentId]: status }));
  };

  const handleSubmitAttendance = () => {
    if (!courseFilter || !semesterFilter) {
      toast.error('Please select course and semester first');
      return;
    }
    if (!user?.id) {
      toast.error('User not found');
      return;
    }
    const recordsList = enrollments.map((enrollment) => ({
      studentId: enrollment.studentId,
      enrollmentId: enrollment.id,
      status: attendanceMap[enrollment.studentId] ?? 'present',
    }));
    markMutation.mutate({
      courseId: courseFilter,
      semesterId: semesterFilter,
      date: selectedDate,
      teacherId: user.id,
      records: recordsList,
    });
  };

  const statusVariant = (status: string) => {
    if (status === 'present') return 'success';
    if (status === 'absent') return 'error';
    if (status === 'late') return 'warning';
    return 'info';
  };

  const attendanceColumns: Column<Attendance>[] = [
    {
      header: 'Student', accessor: 'student', render: (_, row) => (
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">
            {row.student ? getInitials(row.student.firstName, row.student.lastName) : 'S'}
          </div>
          <span className="text-sm font-medium text-slate-800">
            {row.student ? `${row.student.firstName} ${row.student.lastName}` : '-'}
          </span>
        </div>
      ),
    },
    {
      header: 'Course', accessor: 'course', render: (_, row) => (
        <span className="text-sm text-slate-600">{row.course?.name ?? '-'}</span>
      ),
    },
    { header: 'Date', accessor: 'date', render: (_, row) => <span className="text-sm text-slate-600">{formatDate(row.date)}</span> },
    {
      header: 'Status', accessor: 'status', render: (_, row) => (
        <Badge variant={statusVariant(row.status)}>{row.status}</Badge>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Attendance"
        description="Mark and manage student attendance"
      />

      {/* Filters */}
      <Card className="mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Course</label>
            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white min-w-[200px]"
            >
              <option value="">Select course</option>
              {(coursesData?.items ?? []).map((c) => (
                <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Semester</label>
            <select
              value={semesterFilter}
              onChange={(e) => setSemesterFilter(e.target.value)}
              className="text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white min-w-[180px]"
            >
              <option value="">Select semester</option>
              {(semestersData?.items ?? []).map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
            />
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-white rounded-lg border border-slate-200 p-1 w-fit">
        <button
          onClick={() => setActiveTab('mark')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'mark'
              ? 'bg-primary-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Mark Attendance
        </button>
        <button
          onClick={() => setActiveTab('records')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'records'
              ? 'bg-primary-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          View Records
        </button>
      </div>

      {activeTab === 'mark' && (
        <Card padding="none">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-800">Mark Attendance</h3>
              <p className="text-sm text-slate-500 mt-0.5">
                Date: {formatDate(selectedDate)} &bull; {enrollments.length} students
              </p>
            </div>
            {can('attendance', 'create') && (
              <Button
                variant="primary"
                leftIcon={<Save className="w-4 h-4" />}
                onClick={handleSubmitAttendance}
                isLoading={markMutation.isPending}
                disabled={enrollments.length === 0}
              >
                Save Attendance
              </Button>
            )}
          </div>

          {!courseFilter || !semesterFilter ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <ClipboardCheck className="w-12 h-12 text-slate-300 mb-3" />
              <p className="text-slate-500 font-medium">Select a course and semester to mark attendance</p>
            </div>
          ) : studentsLoading ? (
            <div className="flex items-center justify-center py-16">
              <Spinner size="lg" />
            </div>
          ) : enrollments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-slate-500">No students enrolled in this course</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {/* All-present quick action */}
              <div className="px-4 py-2 bg-slate-50 flex items-center gap-2 flex-wrap">
                <span className="text-xs font-medium text-slate-500 mr-2">Quick set all:</span>
                {STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      const all: Record<string, AttendanceStatus> = {};
                      enrollments.forEach((e) => { all[e.studentId] = opt.value; });
                      setAttendanceMap(all);
                    }}
                    className={`text-xs px-2 py-1 rounded border font-medium ${opt.color}`}
                  >
                    All {opt.label}
                  </button>
                ))}
              </div>
              {enrollments.map((enrollment) => {
                const student = enrollment.student;
                if (!student) return null;
                return (
                  <div key={enrollment.id} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">
                        {getInitials(student.firstName, student.lastName)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">
                          {student.firstName} {student.lastName}
                        </p>
                        <p className="text-xs text-slate-500">{student.enrollmentNumber ?? student.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {STATUS_OPTIONS.map((opt) => (
                        <label key={opt.value} className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name={`attendance-${enrollment.studentId}`}
                            value={opt.value}
                            checked={(attendanceMap[enrollment.studentId] ?? 'present') === opt.value}
                            onChange={() => handleStatusChange(enrollment.studentId, opt.value)}
                            className="w-3.5 h-3.5 text-primary-600"
                          />
                          <span className="text-xs font-medium text-slate-600">{opt.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {activeTab === 'records' && (
        <Card padding="none">
          <Table
            columns={attendanceColumns}
            data={records?.items ?? []}
            loading={recordsLoading}
            emptyTitle="No attendance records"
            emptyMessage="No attendance records match your filters."
            keyExtractor={(row) => row.id}
          />
          {records && (
            <Pagination
              currentPage={recordPage}
              totalPages={records.meta.totalPages}
              total={records.meta.total}
              limit={10}
              onPageChange={setRecordPage}
            />
          )}
        </Card>
      )}
    </div>
  );
}
