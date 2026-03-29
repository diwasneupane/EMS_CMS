import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, ClipboardCheck, ArrowLeft, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { attendanceApi } from '../../api/attendance';
import type { AttendanceGroup } from '../../api/attendance';
import { coursesApi } from '../../api/courses';
import { semestersApi } from '../../api/semesters';
import { enrollmentsApi } from '../../api/enrollments';
import { courseAssignmentsApi } from '../../api/courseAssignments';
import { useAuth } from '../../hooks/useAuth';
import { usePermission } from '../../hooks/usePermission';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Pagination } from '../../components/ui/Pagination';
import { Spinner } from '../../components/ui/Spinner';
import { formatDate, getInitials } from '../../lib/utils';
import type { AttendanceStatus } from '../../types';

// re-export for convenience
export type { AttendanceGroup };

const STATUS_OPTIONS: { value: AttendanceStatus; label: string; color: string }[] = [
  { value: 'present', label: 'Present', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  { value: 'absent', label: 'Absent', color: 'text-red-600 bg-red-50 border-red-200' },
  { value: 'late', label: 'Late', color: 'text-amber-600 bg-amber-50 border-amber-200' },
  { value: 'excused', label: 'Excused', color: 'text-blue-600 bg-blue-50 border-blue-200' },
];

function RateBar({ rate }: { rate: number }) {
  const barColor = rate >= 80 ? 'bg-emerald-500' : rate >= 60 ? 'bg-amber-500' : 'bg-red-500';
  const textColor = rate >= 80 ? 'text-emerald-700' : rate >= 60 ? 'text-amber-700' : 'text-red-700';
  return (
    <div className="flex items-center gap-2 min-w-[110px]">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(rate, 100)}%` }} />
      </div>
      <span className={`text-xs font-semibold tabular-nums ${textColor}`}>{rate.toFixed(1)}%</span>
    </div>
  );
}

export default function AttendancePage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { can, isAdmin } = usePermission();
  const [activeTab, setActiveTab] = useState<'mark' | 'records'>('mark');
  const [courseFilter, setCourseFilter] = useState('');
  const [semesterFilter, setSemesterFilter] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceStatus>>({});
  const [recordPage, setRecordPage] = useState(1);
  const [detailGroup, setDetailGroup] = useState<AttendanceGroup | null>(null);

  const { data: myAssignmentsData } = useQuery({
    queryKey: ['my-course-assignments'],
    queryFn: () => courseAssignmentsApi.getMyCourses({ limit: 100 }),
    enabled: !isAdmin,
  });

  const { data: allCoursesData } = useQuery({
    queryKey: ['courses-all'],
    queryFn: () => coursesApi.getAll({ limit: 100 }),
    enabled: isAdmin,
  });
  const { data: allSemestersData } = useQuery({
    queryKey: ['semesters-all'],
    queryFn: () => semestersApi.getAll({ limit: 100 }),
    enabled: isAdmin,
  });

  const courseOptions = useMemo(() => {
    if (isAdmin) {
      return (allCoursesData?.items ?? []).map((c) => ({ id: c.id, label: `${c.code} - ${c.name}` }));
    }
    const assignments = myAssignmentsData?.items ?? [];
    const seen = new Set<string>();
    return assignments
      .filter((a) => a.course && !seen.has(a.courseId) && seen.add(a.courseId))
      .map((a) => ({ id: a.courseId, label: `${a.course!.code} - ${a.course!.name}` }));
  }, [isAdmin, allCoursesData, myAssignmentsData]);

  const semesterOptions = useMemo(() => {
    if (isAdmin) {
      return (allSemestersData?.items ?? []).map((s) => ({ id: s.id, label: s.name }));
    }
    const assignments = myAssignmentsData?.items ?? [];
    const seen = new Set<string>();
    return assignments
      .filter((a) => a.semester && !seen.has(a.semesterId) && seen.add(a.semesterId))
      .map((a) => ({ id: a.semesterId, label: a.semester!.name }));
  }, [isAdmin, allSemestersData, myAssignmentsData]);

  const { data: enrollmentsData, isLoading: studentsLoading } = useQuery({
    queryKey: ['enrollments-for-attendance', courseFilter, semesterFilter],
    queryFn: () => enrollmentsApi.getByCourseAndSemester(courseFilter, semesterFilter, { limit: 100 }),
    enabled: !!courseFilter && !!semesterFilter,
  });

  const { data: groupedRecords, isLoading: recordsLoading } = useQuery({
    queryKey: ['attendance-grouped', recordPage],
    queryFn: () => attendanceApi.getGrouped({ page: recordPage, limit: 20 }),
    enabled: activeTab === 'records',
  });

  const detailDate = detailGroup?.date?.split('T')[0] ?? '';

  const { data: detailData, isLoading: detailLoading } = useQuery({
    queryKey: ['attendance-detail', detailGroup?.courseId, detailDate],
    queryFn: () => attendanceApi.getByCourseAndDate(detailGroup!.courseId, detailDate, { limit: 100 }),
    enabled: !!detailGroup,
  });

  const markMutation = useMutation({
    mutationFn: attendanceApi.mark,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-grouped'] });
      toast.success('Attendance saved successfully');
      setAttendanceMap({});
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message || 'Failed to save attendance');
    },
  });

  const enrollments = enrollmentsData?.items ?? [];

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

  const statusVariant = (status: string): 'success' | 'error' | 'warning' | 'info' => {
    if (status === 'present') return 'success';
    if (status === 'absent') return 'error';
    if (status === 'late') return 'warning';
    return 'info';
  };

  return (
    <div>
      <PageHeader title="Attendance" description="Mark and manage student attendance" />

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
              {courseOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
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
              {semesterOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
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

      <div className="flex gap-1 mb-4 bg-white rounded-lg border border-slate-200 p-1 w-fit">
        <button
          onClick={() => setActiveTab('mark')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'mark' ? 'bg-primary-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Mark Attendance
        </button>
        <button
          onClick={() => {
            setActiveTab('records');
            setDetailGroup(null);
          }}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'records' ? 'bg-primary-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
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
              <div className="px-4 py-2 bg-slate-50 flex items-center gap-2 flex-wrap">
                <span className="text-xs font-medium text-slate-500 mr-2">Quick set all:</span>
                {STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      const all: Record<string, AttendanceStatus> = {};
                      enrollments.forEach((e) => {
                        all[e.studentId] = opt.value;
                      });
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

      {activeTab === 'records' && !detailGroup && (
        <Card padding="none">
          {recordsLoading ? (
            <div className="flex items-center justify-center py-16">
              <Spinner size="lg" />
            </div>
          ) : (groupedRecords?.items ?? []).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <ClipboardCheck className="w-12 h-12 text-slate-300 mb-3" />
              <p className="text-sm font-medium text-slate-500">No attendance records</p>
              <p className="text-sm text-slate-400">No attendance records found.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">
                        Date
                      </th>
                      <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">
                        Course
                      </th>
                      <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">
                        Semester
                      </th>
                      <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">
                        Teacher
                      </th>
                      <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">
                        Present / Total
                      </th>
                      <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">
                        Absent
                      </th>
                      <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 min-w-[140px]">
                        Rate
                      </th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(groupedRecords?.items ?? []).map((group, idx) => (
                      <tr
                        key={`${group.courseId}-${group.date}-${idx}`}
                        className="hover:bg-slate-50 transition-colors"
                      >
                        <td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">
                          {formatDate(group.date)}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm font-medium text-slate-800">{group.courseCode}</span>
                          <span className="text-sm text-slate-500 ml-1">— {group.courseName}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">{group.semesterName}</td>
                        <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">{group.teacherName}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className="font-semibold text-emerald-700">{group.present}</span>
                          <span className="text-slate-400"> / {group.totalStudents}</span>
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-red-700">{group.absent}</td>
                        <td className="px-4 py-3">
                          <RateBar rate={group.attendanceRate} />
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setDetailGroup(group)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                            title="View student details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {groupedRecords && (
                <Pagination
                  currentPage={recordPage}
                  totalPages={groupedRecords.meta.totalPages}
                  total={groupedRecords.meta.total}
                  limit={20}
                  onPageChange={setRecordPage}
                />
              )}
            </>
          )}
        </Card>
      )}

      {activeTab === 'records' && detailGroup && (
        <Card padding="none">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 flex-wrap">
            <button
              onClick={() => setDetailGroup(null)}
              className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <div className="h-4 w-px bg-slate-200" />
            <span className="text-sm font-semibold text-slate-800">
              {detailGroup.courseCode} — {detailGroup.courseName}
            </span>
            <span className="text-sm text-slate-500">{formatDate(detailGroup.date)}</span>
            <span className="text-sm text-slate-500">{detailGroup.semesterName}</span>
            <span className="text-sm text-slate-500">Teacher: {detailGroup.teacherName}</span>
          </div>
          {detailLoading ? (
            <div className="flex items-center justify-center py-16">
              <Spinner size="lg" />
            </div>
          ) : (detailData?.items ?? []).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <p className="text-sm text-slate-500">No individual records found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">
                      Student
                    </th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">
                      Status
                    </th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">
                      Remarks
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(detailData?.items ?? []).map((record) => (
                    <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                            {record.student
                              ? getInitials(record.student.firstName, record.student.lastName)
                              : 'S'}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-800">
                              {record.student ? `${record.student.firstName} ${record.student.lastName}` : '-'}
                            </p>
                            {record.student?.enrollmentNumber && (
                              <p className="text-xs text-slate-500">{record.student.enrollmentNumber}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={statusVariant(record.status)}>{record.status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500">{record.remarks ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
