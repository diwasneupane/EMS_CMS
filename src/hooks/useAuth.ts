import { useAuthStore } from '../store/authStore';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '../api/auth';
import type { LoginCredentials, AuthResponse } from '../types';

export function useAuth() {
  const { user, isAuthenticated, setAuth, logout, accessToken } = useAuthStore();

  const isAdmin = user?.roles?.includes('admin') ?? false;
  const isTeacher = user?.roles?.includes('teacher') ?? false;
  const isStudent = user?.roles?.includes('student') ?? false;

  const loginMutation = useMutation({
    mutationFn: (credentials: LoginCredentials) => authApi.login(credentials),
    onSuccess: (data: AuthResponse) => {
      setAuth(data.user, data.accessToken, data.refreshToken);
      toast.success(`Welcome back, ${data.user.firstName}!`);
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message || 'Login failed. Please try again.');
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      try {
        await authApi.logout();
      } catch {
        // ignore errors on logout
      }
    },
    onSettled: () => {
      logout();
    },
  });

  return {
    user,
    accessToken,
    isAuthenticated,
    isAdmin,
    isTeacher,
    isStudent,
    login: loginMutation.mutateAsync,
    logout: logoutMutation.mutate,
    isLoggingIn: loginMutation.isPending,
    loginError: loginMutation.error,
  };
}
