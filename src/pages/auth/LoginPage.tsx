import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, GraduationCap, Lock, Mail } from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../hooks/useAuth';

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(1, 'Password is required').min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoggingIn, isAuthenticated } = useAuth();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data);
      navigate('/dashboard', { replace: true });
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      const msg = err?.response?.data?.message || 'Invalid credentials';
      setError('root', { message: msg });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-primary-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-8 py-8 text-center">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <GraduationCap className="w-9 h-9 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">EMS Admin Panel</h1>
            <p className="text-primary-200 text-sm mt-1">Education Management System</p>
          </div>

          {/* Form */}
          <div className="px-8 py-8">
            <h2 className="text-lg font-semibold text-slate-800 mb-1">Welcome back</h2>
            <p className="text-sm text-slate-500 mb-6">Sign in to your admin account</p>

            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              {errors.root && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200">
                  <p className="text-sm text-red-600 font-medium">{errors.root.message}</p>
                </div>
              )}

              <div className="space-y-4">
                <Input
                  label="Email Address"
                  type="email"
                  placeholder="admin@example.com"
                  error={errors.email?.message}
                  leftIcon={<Mail className="w-4 h-4" />}
                  required
                  {...register('email')}
                />

                <Input
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  error={errors.password?.message}
                  leftIcon={<Lock className="w-4 h-4" />}
                  required
                  rightElement={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  }
                  {...register('password')}
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full mt-6"
                size="lg"
                isLoading={isLoggingIn}
              >
                Sign In
              </Button>
            </form>

            <div className="mt-6 p-4 rounded-lg bg-slate-50 border border-slate-200">
              <p className="text-xs text-slate-500 font-medium mb-2">Demo Credentials</p>
              <p className="text-xs text-slate-600">
                Email: <span className="font-mono font-medium">admin@ems.com</span>
              </p>
              <p className="text-xs text-slate-600">
                Password: <span className="font-mono font-medium">Admin@123</span>
              </p>
            </div>
          </div>
        </div>

        <p className="text-center text-slate-400 text-xs mt-6">
          &copy; {new Date().getFullYear()} Education Management System. All rights reserved.
        </p>
      </div>
    </div>
  );
}
