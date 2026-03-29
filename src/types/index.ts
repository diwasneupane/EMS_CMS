export type UserRole = 'admin' | 'teacher' | 'student';

// Pagination - only these 4 params accepted by most endpoints
export interface PaginationParams {
  page?: number;
  limit?: number; // max 100
  sort?: string;
  order?: 'ASC' | 'DESC';
}

// User filter - extends pagination with extra filters (only for /users, /users/students, /users/teachers, /users/pending)
export interface UserFilterParams extends PaginationParams {
  search?: string;
  departmentId?: string;
  programId?: string;
  isApproved?: boolean;
  isActive?: boolean;
}

// Attendance date range report params
export interface AttendanceReportParams extends PaginationParams {
  courseId?: string;
  startDate?: string;
  endDate?: string;
}

/** @deprecated Use PaginationParams instead */
export type QueryParams = PaginationParams;

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other';
  address?: string;
  profilePicture?: string | null;
  enrollmentNumber?: string | null;
  guardianName?: string | null;
  guardianPhone?: string | null;
  guardianEmail?: string | null;
  bloodGroup?: string | null;
  departmentId?: string | null;
  programId?: string | null;
  isApproved: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  department?: { id: string; name: string; code: string } | null;
  program?: { id: string; name: string; code: string } | null;
  userRoles?: Array<{ role: { name: string } }>;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    isApproved: boolean;
    roles: string[];
    permissions: string[];
  };
}

export interface Department {
  id: string;
  name: string;
  code: string;
  description?: string;
  headTeacherId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Program {
  id: string;
  name: string;
  code: string;
  departmentId: string;
  durationYears: number;
  totalCreditsRequired: number;
  description?: string;
  department?: Department;
  createdAt: string;
  updatedAt: string;
}

export interface Course {
  id: string;
  name: string;
  code: string;
  departmentId: string;
  creditHour: number;
  description?: string;
  department?: Department;
  createdAt: string;
  updatedAt: string;
}

export interface Semester {
  id: string;
  name: string;
  code: string;
  startDate: string;
  endDate: string;
  isActive?: boolean;
  isCurrent?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ClassSchedule {
  id: string;
  courseId: string;
  teacherId: string;
  semesterId: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  roomNumber?: string;
  building?: string;
  course?: Course;
  teacher?: User;
  semester?: Semester;
  createdAt: string;
  updatedAt: string;
}

export interface CourseAssignment {
  id: string;
  courseId: string;
  teacherId: string;
  semesterId: string;
  course?: Course;
  teacher?: User;
  semester?: Semester;
  studentsCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Enrollment {
  id: string;
  studentId: string;
  courseId: string;
  semesterId: string;
  status: 'active' | 'dropped' | 'completed';
  student?: User;
  course?: Course;
  semester?: Semester;
  createdAt: string;
  updatedAt: string;
}

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export interface Attendance {
  id: string;
  studentId: string;
  courseId: string;
  semesterId: string;
  teacherId?: string;
  enrollmentId?: string;
  date: string;
  status: AttendanceStatus;
  remarks?: string;
  student?: User;
  course?: Course;
  semester?: Semester;
  createdAt: string;
  updatedAt: string;
}

export interface Result {
  id: string;
  studentId: string;
  courseId: string;
  semesterId: string;
  enrollmentId?: string;
  academicMark: number;
  practicalMark: number;
  totalMark?: number;
  grade?: string;
  gpa?: number;
  remarks?: string;
  student?: User;
  course?: Course;
  semester?: Semester;
  createdAt: string;
  updatedAt: string;
}

export type AnnouncementPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: AnnouncementPriority;
  isPublished: boolean;
  targetRole?: 'all' | 'student' | 'teacher' | 'admin';
  targetSemesterId?: string;
  targetCourseId?: string;
  targetDepartmentId?: string;
  expiresAt?: string;
  course?: Course;
  department?: Department;
  createdAt: string;
  updatedAt: string;
  publishedAt?: Date;
  createdBy?: User;
}

export interface Permission {
  id: string;
  resource: string;
  action: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RolePermission {
  id: string;
  roleId: string;
  permissionId: string;
  createdAt: string;
  permission: Permission;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  rolePermissions: RolePermission[];
  usersCount?: number;
  createdAt: string;
  updatedAt: string;
}


export interface PaginatedMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  meta: PaginatedMeta;
}

export interface ApiError {
  message: string;
  statusCode: number;
  error?: string;
}

/** Max items per page the backend accepts */
export const MAX_PAGE_LIMIT = 100;
