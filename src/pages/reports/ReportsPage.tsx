import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Download, FileText, BarChart2, Users, CalendarCheck,
  GraduationCap, TrendingUp, X, ChevronDown, ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { reportsApi } from '../../api/reports';
import { coursesApi } from '../../api/courses';
import { semestersApi } from '../../api/semesters';
import { usersApi } from '../../api/users';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { getInitials } from '../../lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────
type ReportType = 'transcript' | 'grade-sheet' | 'attendance' | 'semester-summary' | 'teacher-performance';

interface TranscriptCourse {
  id: string; academicMark: string; practicalMark: string;
  totalMark: string; grade: string; gradePoint: string;
  attendancePercentage: string; remarks: string | null;
  course: { code: string; name: string; creditHour: number };
  semester: { name: string; code: string };
}
interface TranscriptData {
  studentId: string; cumulativeGPA: number; totalCourses: number;
  bySemester: Record<string, TranscriptCourse[]>;
}
interface AttendanceRecord {
  id: string; date: string; status: 'present' | 'absent' | 'late' | 'excused';
  remarks: string | null;
  studentId?: string;
  student?: { firstName: string; lastName: string; email: string; enrollmentNumber: string };
  course?: { code: string; name: string; creditHour?: number };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function gradeColor(grade: string) {
  if (grade === 'A+' || grade === 'A') return 'success';
  if (grade === 'B+' || grade === 'B') return 'info';
  if (grade === 'C+' || grade === 'C') return 'warning';
  if (grade === 'F') return 'error';
  return 'default';
}
function statusColor(status: string) {
  if (status === 'present') return 'success';
  if (status === 'absent') return 'error';
  if (status === 'late') return 'warning';
  return 'info';
}
function gpaColor(gpa: number) {
  if (gpa >= 3.6) return 'text-emerald-700 bg-emerald-50';
  if (gpa >= 3.0) return 'text-blue-700 bg-blue-50';
  if (gpa >= 2.0) return 'text-amber-700 bg-amber-50';
  return 'text-red-700 bg-red-50';
}

function StatCard({ label, value, sub, color = 'text-slate-800' }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 px-5 py-4 text-center">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs font-medium text-slate-500 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── CSV Export ───────────────────────────────────────────────────────────────
function downloadCSV(rows: Record<string, unknown>[], filename: string) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const lines = [
    keys.join(','),
    ...rows.map((r) => keys.map((k) => JSON.stringify(r[k] ?? '')).join(',')),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ─── Transcript Viewer ────────────────────────────────────────────────────────
function TranscriptView({ data }: { data: TranscriptData[] }) {
  const [openSem, setOpenSem] = useState<string | null>(null);
  const t = data[0];
  if (!t) return <p className="text-slate-500 text-sm">No transcript data.</p>;

  const semesters = Object.entries(t.bySemester);
  const semesterGPAs = semesters.map(([name, courses]) => {
    const avg = courses.reduce((s, c) => s + Number(c.gradePoint), 0) / (courses.length || 1);
    return { name, avg, courses };
  });

  const csvRows = semesters.flatMap(([semName, courses]) =>
    courses.map((c) => ({
      Semester: semName, Code: c.course.code, Course: c.course.name,
      Credits: c.course.creditHour, Academic: c.academicMark,
      Practical: c.practicalMark, Total: c.totalMark,
      Grade: c.grade, GradePoint: c.gradePoint, Attendance: c.attendancePercentage,
    }))
  );

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard label="Cumulative GPA" value={Number(t.cumulativeGPA).toFixed(2)} color="text-indigo-700" />
        <StatCard label="Total Courses" value={t.totalCourses} />
        <StatCard label="Semesters" value={semesters.length} />
      </div>

      {/* GPA trend bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Semester GPA Trend</p>
        <div className="flex items-end gap-2 h-20">
          {semesterGPAs.map(({ name, avg }) => (
            <div key={name} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-xs font-semibold text-slate-700">{avg.toFixed(1)}</span>
              <div
                className={`w-full rounded-t-md ${avg >= 3.6 ? 'bg-emerald-400' : avg >= 3.0 ? 'bg-blue-400' : avg >= 2.0 ? 'bg-amber-400' : 'bg-red-400'}`}
                style={{ height: `${Math.max(8, (avg / 4) * 56)}px` }}
              />
              <span className="text-[10px] text-slate-400 text-center leading-tight">{name.replace(' ', '\n')}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Per-semester accordion */}
      <div className="space-y-2">
        {semesters.map(([semName, courses]) => {
          const semGPA = courses.reduce((s, c) => s + Number(c.gradePoint), 0) / (courses.length || 1);
          const isOpen = openSem === semName;
          return (
            <div key={semName} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <button
                onClick={() => setOpenSem(isOpen ? null : semName)}
                className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {isOpen ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                  <span className="font-semibold text-slate-800 text-sm">{semName}</span>
                  <span className="text-xs text-slate-500">{courses.length} courses</span>
                </div>
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${gpaColor(semGPA)}`}>
                  GPA {semGPA.toFixed(2)}
                </span>
              </button>
              {isOpen && (
                <div className="border-t border-slate-100 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        {['Code', 'Course', 'Cr.', 'Academic', 'Practical', 'Total', 'Grade', 'Attendance'].map((h) => (
                          <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-2.5 whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {courses.map((c) => (
                        <tr key={c.id} className="hover:bg-slate-50">
                          <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{c.course.code}</td>
                          <td className="px-4 py-2.5 font-medium text-slate-800">{c.course.name}</td>
                          <td className="px-4 py-2.5 text-slate-600">{c.course.creditHour}</td>
                          <td className="px-4 py-2.5 text-slate-700">{Number(c.academicMark)}</td>
                          <td className="px-4 py-2.5 text-slate-700">{Number(c.practicalMark)}</td>
                          <td className="px-4 py-2.5 font-bold text-slate-800">{Number(c.totalMark)}/100</td>
                          <td className="px-4 py-2.5">
                            <Badge variant={gradeColor(c.grade) as 'success' | 'info' | 'warning' | 'error' | 'default'}>{c.grade}</Badge>
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-1.5">
                              <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${Number(c.attendancePercentage) >= 75 ? 'bg-emerald-500' : 'bg-red-400'}`}
                                  style={{ width: `${Number(c.attendancePercentage)}%` }} />
                              </div>
                              <span className="text-xs text-slate-600">{Number(c.attendancePercentage).toFixed(0)}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex justify-end">
        <Button variant="secondary" leftIcon={<Download className="w-4 h-4" />}
          onClick={() => downloadCSV(csvRows, `transcript-${t.studentId}.csv`)}>
          Download CSV
        </Button>
      </div>
    </div>
  );
}

// ─── Attendance Report Viewer ─────────────────────────────────────────────────
function AttendanceView({ data }: { data: AttendanceRecord[] }) {
  const counts = data.reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc; }, {} as Record<string, number>);
  const total = data.length;
  const rate = total > 0 ? Math.round((counts.present || 0) / total * 100) : 0;

  const statusDef = [
    { key: 'present', label: 'Present', color: 'bg-emerald-500', textColor: 'text-emerald-700' },
    { key: 'absent', label: 'Absent', color: 'bg-red-500', textColor: 'text-red-700' },
    { key: 'late', label: 'Late', color: 'bg-amber-500', textColor: 'text-amber-700' },
    { key: 'excused', label: 'Excused', color: 'bg-blue-500', textColor: 'text-blue-700' },
  ];

  const csvRows = data.map((r) => ({
    Name: r.student ? `${r.student.firstName} ${r.student.lastName}` : r.studentId ?? '',
    Enrollment: r.student?.enrollmentNumber ?? '',
    Email: r.student?.email ?? '',
    Course: r.course ? `${r.course.code} — ${r.course.name}` : '',
    Date: r.date,
    Status: r.status,
    Remarks: r.remarks ?? '',
  }));

  return (
    <div className="space-y-5">
      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total" value={total} />
        <StatCard label="Present" value={counts.present || 0} color="text-emerald-600" />
        <StatCard label="Absent" value={counts.absent || 0} color="text-red-600" />
        <StatCard label="Attendance Rate" value={`${rate}%`} color={rate >= 75 ? 'text-emerald-700' : 'text-red-700'} />
      </div>

      {/* Distribution bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Status Distribution</p>
        <div className="flex h-4 rounded-full overflow-hidden gap-0.5">
          {statusDef.map(({ key, color }) => counts[key] ? (
            <div key={key} className={`${color} transition-all`}
              style={{ width: `${(counts[key] / total) * 100}%` }}
              title={`${key}: ${counts[key]}`} />
          ) : null)}
        </div>
        <div className="flex flex-wrap gap-4 mt-3">
          {statusDef.map(({ key, label, color, textColor }) => (
            <div key={key} className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
              <span className={`text-xs font-medium ${textColor}`}>{label}: {counts[key] || 0}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Records table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Student', 'Course', 'Date', 'Status', 'Remarks'].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    {r.student ? (
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {getInitials(r.student.firstName, r.student.lastName)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-800">{r.student.firstName} {r.student.lastName}</p>
                          <p className="text-xs text-slate-500">{r.student.enrollmentNumber || r.student.email}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm font-mono text-slate-500">{r.studentId ?? '—'}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {r.course ? (
                      <div>
                        <p className="text-sm font-medium text-slate-800">{r.course.name}</p>
                        <p className="text-xs font-mono text-slate-500">{r.course.code}</p>
                      </div>
                    ) : <span className="text-sm text-slate-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">{r.date}</td>
                  <td className="px-4 py-3">
                    <Badge variant={statusColor(r.status) as 'success' | 'error' | 'warning' | 'info'}>{r.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500">{r.remarks || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-end">
        <Button variant="secondary" leftIcon={<Download className="w-4 h-4" />}
          onClick={() => downloadCSV(csvRows, `attendance-report.csv`)}>
          Download CSV
        </Button>
      </div>
    </div>
  );
}

// ─── Grade Sheet Viewer ───────────────────────────────────────────────────────
function GradeSheetView({ data }: { data: unknown[] }) {
  type GradeRow = { student?: { firstName?: string; lastName?: string; email?: string; enrollmentNumber?: string }; academicMark?: number | string; practicalMark?: number | string; totalMark?: number | string; grade?: string; gradePoint?: number | string; attendancePercentage?: number | string };
  const rows = data as GradeRow[];
  const total = rows.length;
  const passed = rows.filter((r) => r.grade !== 'F').length;
  const avgTotal = rows.reduce((s, r) => s + Number(r.totalMark || 0), 0) / (total || 1);

  const gradeBreakdown = rows.reduce((acc, r) => {
    const g = r.grade ?? 'N/A';
    acc[g] = (acc[g] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const csvRows = rows.map((r) => ({
    Name: `${r.student?.firstName ?? ''} ${r.student?.lastName ?? ''}`.trim(),
    Enrollment: r.student?.enrollmentNumber ?? '',
    Academic: r.academicMark ?? '', Practical: r.practicalMark ?? '',
    Total: r.totalMark ?? '', Grade: r.grade ?? '', GradePoint: r.gradePoint ?? '',
    Attendance: r.attendancePercentage ?? '',
  }));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total Students" value={total} />
        <StatCard label="Passed" value={passed} color="text-emerald-600" />
        <StatCard label="Failed" value={total - passed} color="text-red-600" />
        <StatCard label="Class Average" value={avgTotal.toFixed(1)} sub="out of 100" />
      </div>

      {/* Grade distribution */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Grade Distribution</p>
        <div className="flex items-end gap-3 h-16">
          {Object.entries(gradeBreakdown).sort().map(([g, count]) => (
            <div key={g} className="flex flex-col items-center gap-1 flex-1">
              <span className="text-xs font-bold text-slate-700">{count}</span>
              <div className="w-full bg-indigo-400 rounded-t-sm" style={{ height: `${Math.max(6, (count / total) * 48)}px` }} />
              <span className="text-xs text-slate-500">{g}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Student', 'Academic', 'Practical', 'Total', 'Grade', 'GPA', 'Attendance'].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r, i) => (
                <tr key={i} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-slate-800">{r.student?.firstName} {r.student?.lastName}</p>
                    <p className="text-xs text-slate-500">{r.student?.enrollmentNumber}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">{Number(r.academicMark)}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">{Number(r.practicalMark)}</td>
                  <td className="px-4 py-3 text-sm font-bold text-slate-800">{Number(r.totalMark)}/100</td>
                  <td className="px-4 py-3"><Badge variant={gradeColor(r.grade ?? '') as 'success' | 'info' | 'warning' | 'error' | 'default'}>{r.grade}</Badge></td>
                  <td className="px-4 py-3 text-sm font-semibold text-slate-700">{Number(r.gradePoint).toFixed(1)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${Number(r.attendancePercentage) >= 75 ? 'bg-emerald-500' : 'bg-red-400'}`}
                          style={{ width: `${Number(r.attendancePercentage)}%` }} />
                      </div>
                      <span className="text-xs text-slate-600">{Number(r.attendancePercentage).toFixed(0)}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-end">
        <Button variant="secondary" leftIcon={<Download className="w-4 h-4" />}
          onClick={() => downloadCSV(csvRows, 'grade-sheet.csv')}>
          Download CSV
        </Button>
      </div>
    </div>
  );
}

// ─── Generic / Semester Summary / Teacher Performance Viewer ─────────────────
function GenericView({ data, reportType }: { data: unknown[]; reportType: ReportType }) {
  const d = data[0] as Record<string, unknown> | undefined;
  if (!d) return <p className="text-slate-500 text-sm">No data found.</p>;

  const csvRows = data.map((item) => {
    const flat: Record<string, unknown> = {};
    const flatten = (obj: unknown, prefix = '') => {
      if (typeof obj !== 'object' || obj === null) return;
      Object.entries(obj as Record<string, unknown>).forEach(([k, v]) => {
        if (typeof v === 'object' && v !== null && !Array.isArray(v)) flatten(v, prefix ? `${prefix}_${k}` : k);
        else if (!Array.isArray(v)) flat[prefix ? `${prefix}_${k}` : k] = v;
      });
    };
    flatten(item);
    return flat;
  });

  // Semester summary
  if (reportType === 'semester-summary') {
    const stats = d as Record<string, unknown>;
    const numericKeys = Object.entries(stats).filter(([, v]) => typeof v === 'number');
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {numericKeys.map(([k, v]) => (
            <StatCard key={k} label={k.replace(/([A-Z])/g, ' $1').trim()} value={typeof v === 'number' && !Number.isInteger(v) ? Number(v).toFixed(2) : String(v)} />
          ))}
        </div>
        {(stats.courses as unknown[])?.length ? (
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Courses</p>
            <div className="space-y-2">
              {(stats.courses as Record<string, unknown>[]).map((c, i) => (
                <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b border-slate-100 last:border-0">
                  <span className="font-medium text-slate-800">{String(c.name || c.code || i + 1)}</span>
                  {c.averageScore != null && <span className="text-slate-600">Avg: {Number(c.averageScore).toFixed(1)}</span>}
                </div>
              ))}
            </div>
          </div>
        ) : null}
        <div className="flex justify-end">
          <Button variant="secondary" leftIcon={<Download className="w-4 h-4" />}
            onClick={() => downloadCSV(csvRows, `${reportType}.csv`)}>Download CSV</Button>
        </div>
      </div>
    );
  }

  // Teacher performance: { teacherId, performance: [{ courseId, courseName, semesterName, totalStudents, averageGradePoint }] }
  if (reportType === 'teacher-performance') {
    const tp = d as { teacherId?: string; performance?: { courseId: string; courseName: string; semesterName: string; totalStudents: number; averageGradePoint: number }[] };
    const performance = tp.performance ?? [];
    const totalStudents = performance.reduce((s, p) => s + (p.totalStudents || 0), 0);
    const avgGPA = performance.length > 0
      ? performance.reduce((s, p) => s + Number(p.averageGradePoint), 0) / performance.length
      : 0;

    const tpCsvRows = performance.map((p) => ({
      Course: p.courseName, Semester: p.semesterName,
      'Total Students': p.totalStudents, 'Avg Grade Point': Number(p.averageGradePoint).toFixed(2),
    }));

    return (
      <div className="space-y-5">
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Courses Taught" value={performance.length} />
          <StatCard label="Total Students" value={totalStudents} />
          <StatCard label="Avg Grade Point" value={avgGPA.toFixed(2)} color="text-indigo-700" />
        </div>

        {performance.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Course Performance</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    {['Course', 'Semester', 'Students', 'Avg Grade Point'].map((h) => (
                      <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-2.5 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {performance.map((p) => (
                    <tr key={`${p.courseId}-${p.semesterName}`} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-slate-800">{p.courseName}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{p.semesterName}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{p.totalStudents}</td>
                      <td className="px-4 py-3">
                        <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${gpaColor(Number(p.averageGradePoint))}`}>
                          {Number(p.averageGradePoint).toFixed(2)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <Button variant="secondary" leftIcon={<Download className="w-4 h-4" />}
            onClick={() => downloadCSV(tpCsvRows, `teacher-performance.csv`)}>Download CSV</Button>
        </div>
      </div>
    );
  }

  // Fallback: key-value summary
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {Object.entries(d).filter(([, v]) => typeof v === 'number' || typeof v === 'string').slice(0, 9).map(([k, v]) => (
          <StatCard key={k} label={k.replace(/([A-Z])/g, ' $1').trim()} value={String(v)} />
        ))}
      </div>
      <div className="flex justify-end">
        <Button variant="secondary" leftIcon={<Download className="w-4 h-4" />}
          onClick={() => downloadCSV(csvRows, `${reportType}.csv`)}>Download CSV</Button>
      </div>
    </div>
  );
}

// ─── Report Cards Config ──────────────────────────────────────────────────────
const REPORT_CARDS = [
  { type: 'transcript' as ReportType, title: 'Student Transcript', description: 'Complete academic record across all semesters with GPA trend', icon: <FileText className="w-6 h-6" />, color: 'text-indigo-600', bgColor: 'bg-indigo-50', border: 'hover:border-indigo-300' },
  { type: 'grade-sheet' as ReportType, title: 'Grade Sheet', description: 'All students\' grades for a specific course and semester', icon: <BarChart2 className="w-6 h-6" />, color: 'text-emerald-600', bgColor: 'bg-emerald-50', border: 'hover:border-emerald-300' },
  { type: 'attendance' as ReportType, title: 'Attendance Report', description: 'Detailed attendance records by course or student', icon: <CalendarCheck className="w-6 h-6" />, color: 'text-blue-600', bgColor: 'bg-blue-50', border: 'hover:border-blue-300' },
  { type: 'semester-summary' as ReportType, title: 'Semester Summary', description: 'Overview of all academic activities for a semester', icon: <GraduationCap className="w-6 h-6" />, color: 'text-amber-600', bgColor: 'bg-amber-50', border: 'hover:border-amber-300' },
  { type: 'teacher-performance' as ReportType, title: 'Teacher Performance', description: "Analysis of teacher's course load and student outcomes", icon: <TrendingUp className="w-6 h-6" />, color: 'text-purple-600', bgColor: 'bg-purple-50', border: 'hover:border-purple-300' },
];

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ReportsPage() {
  const [activeReport, setActiveReport] = useState<ReportType | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [reportData, setReportData] = useState<unknown[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { data: coursesData } = useQuery({ queryKey: ['courses-all'], queryFn: () => coursesApi.getAll({ limit: 100 }) });
  const { data: semestersData } = useQuery({ queryKey: ['semesters-all'], queryFn: () => semestersApi.getAll({ limit: 100 }) });
  const { data: studentsData } = useQuery({ queryKey: ['students-all'], queryFn: () => usersApi.getStudents({ limit: 200 }) });
  const { data: teachersData } = useQuery({ queryKey: ['teachers-all'], queryFn: () => usersApi.getTeachers({ limit: 100 }) });

  const selectCls = "w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white";

  const openReport = (type: ReportType) => { setActiveReport(type); setFilters({}); setReportData(null); };

  const generateReport = async () => {
    if (!activeReport) return;
    setIsLoading(true);
    try {
      let data: unknown;
      if (activeReport === 'transcript' && filters.studentId)
        data = await reportsApi.getTranscript(filters.studentId);
      else if (activeReport === 'grade-sheet' && filters.courseId && filters.semesterId)
        data = await reportsApi.getGradeSheet(filters.courseId, filters.semesterId);
      else if (activeReport === 'attendance') {
        if (filters.studentId) data = await reportsApi.getAttendanceReportByStudent(filters.studentId);
        else if (filters.courseId) data = await reportsApi.getAttendanceReportByCourse(filters.courseId);
        else { toast.error('Select a student or course for attendance report'); setIsLoading(false); return; }
      } else if (activeReport === 'semester-summary' && filters.semesterId)
        data = await reportsApi.getSemesterSummary(filters.semesterId);
      else if (activeReport === 'teacher-performance' && filters.teacherId)
        data = await reportsApi.getTeacherPerformance(filters.teacherId);
      else { toast.error('Please fill all required filters'); setIsLoading(false); return; }

      setReportData(Array.isArray(data) ? data : data ? [data] : []);
      toast.success('Report generated');
    } catch {
      toast.error('Failed to generate report');
      setReportData([]);
    } finally {
      setIsLoading(false);
    }
  };

  const activeCard = REPORT_CARDS.find((r) => r.type === activeReport);

  const renderFilters = () => {
    if (!activeReport) return null;
    return (
      <div className="space-y-3">
        {(activeReport === 'transcript' || activeReport === 'attendance') && (
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Student {activeReport === 'transcript' ? '(required)' : '(or select course)'}</label>
            <select value={filters.studentId ?? ''} onChange={(e) => setFilters((p) => ({ ...p, studentId: e.target.value }))} className={selectCls}>
              <option value="">Select Student</option>
              {(studentsData?.items ?? []).map((s) => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
            </select>
          </div>
        )}
        {(activeReport === 'grade-sheet' || activeReport === 'attendance') && (
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Course {activeReport === 'grade-sheet' ? '(required)' : '(or select student)'}</label>
            <select value={filters.courseId ?? ''} onChange={(e) => setFilters((p) => ({ ...p, courseId: e.target.value }))} className={selectCls}>
              <option value="">Select Course</option>
              {(coursesData?.items ?? []).map((c) => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
            </select>
          </div>
        )}
        {(activeReport === 'grade-sheet' || activeReport === 'semester-summary') && (
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Semester (required)</label>
            <select value={filters.semesterId ?? ''} onChange={(e) => setFilters((p) => ({ ...p, semesterId: e.target.value }))} className={selectCls}>
              <option value="">Select Semester</option>
              {(semestersData?.items ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        )}
        {activeReport === 'teacher-performance' && (
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Teacher (required)</label>
            <select value={filters.teacherId ?? ''} onChange={(e) => setFilters((p) => ({ ...p, teacherId: e.target.value }))} className={selectCls}>
              <option value="">Select Teacher</option>
              {(teachersData?.items ?? []).map((t) => <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>)}
            </select>
          </div>
        )}
      </div>
    );
  };

  const renderReport = () => {
    if (!reportData || !activeReport) return null;
    if (reportData.length === 0)
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Users className="w-10 h-10 text-slate-300 mb-3" />
          <p className="text-slate-500">No data found for the selected filters</p>
        </div>
      );
    if (activeReport === 'transcript') return <TranscriptView data={reportData as TranscriptData[]} />;
    if (activeReport === 'attendance') return <AttendanceView data={reportData as AttendanceRecord[]} />;
    if (activeReport === 'grade-sheet') return <GradeSheetView data={reportData} />;
    return <GenericView data={reportData} reportType={activeReport} />;
  };

  return (
    <div>
      <PageHeader title="Reports & Analytics" description="Generate, visualize and export academic reports" />

      {/* Report type cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
        {REPORT_CARDS.map((report) => (
          <button
            key={report.type}
            onClick={() => openReport(report.type)}
            className={`text-left bg-white rounded-xl border border-slate-200 shadow-sm p-6 cursor-pointer ${report.border} hover:shadow-md transition-all group`}
          >
            <div className={`w-12 h-12 rounded-xl ${report.bgColor} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
              <span className={report.color}>{report.icon}</span>
            </div>
            <h3 className="text-base font-semibold text-slate-800 mb-1.5 group-hover:text-primary-700 transition-colors">{report.title}</h3>
            <p className="text-sm text-slate-500 leading-relaxed">{report.description}</p>
            <div className="flex items-center gap-1 mt-4 text-primary-600 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
              <span>Generate →</span>
            </div>
          </button>
        ))}
      </div>

      {/* Report panel */}
      {activeReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg ${activeCard?.bgColor} flex items-center justify-center`}>
                  <span className={activeCard?.color}>{activeCard?.icon}</span>
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-900">{activeCard?.title}</h2>
                  <p className="text-xs text-slate-500 mt-0.5">{activeCard?.description}</p>
                </div>
              </div>
              <button onClick={() => setActiveReport(null)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {/* Filters */}
              <div className="p-6 border-b border-slate-200 bg-slate-50 flex-shrink-0">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Filters</p>
                {renderFilters()}
                <div className="mt-4">
                  <Button variant="primary" onClick={generateReport} isLoading={isLoading}>
                    Generate Report
                  </Button>
                </div>
              </div>

              {/* Results */}
              <div className="p-6">
                {reportData === null ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <FileText className="w-12 h-12 text-slate-300 mb-3" />
                    <p className="text-slate-500 font-medium">Select filters and click Generate</p>
                  </div>
                ) : isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Spinner size="lg" />
                  </div>
                ) : (
                  renderReport()
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
