import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, GraduationCap, Lock, Mail, BookOpen, Users, BarChart3 } from 'lucide-react';
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
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-2/5 flex-col justify-between bg-gradient-to-br from-slate-900 via-primary-900 to-slate-800 p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-primary-500 rounded-full -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-72 h-72 bg-indigo-500 rounded-full translate-x-1/3 translate-y-1/3" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <span className="text-white font-bold text-lg tracking-tight">EMS</span>
          </div>
          <h2 className="text-4xl font-bold text-white leading-tight mb-4">
            Education Management System
          </h2>
          <p className="text-primary-200 text-lg leading-relaxed">
            A unified platform for managing courses, students, attendance, and academic records.
          </p>
        </div>
        <div className="relative z-10 space-y-5">
          {[
            { icon: BookOpen, title: 'Course Management', desc: 'Manage courses, schedules, and assignments in one place' },
            { icon: Users, title: 'Student Tracking', desc: 'Monitor enrollment, attendance, and academic progress' },
            { icon: BarChart3, title: 'Analytics & Reports', desc: 'Gain insights through detailed reports and statistics' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-start gap-4">
              <div className="w-9 h-9 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <Icon className="w-4.5 h-4.5 text-primary-300" />
              </div>
              <div>
                <p className="text-white font-medium text-sm">{title}</p>
                <p className="text-primary-300 text-xs mt-0.5 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="relative z-10 text-primary-400 text-xs">
          &copy; {new Date().getFullYear()} Education Management System
        </p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center bg-white px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2.5 mb-10 justify-center">
            <div className="w-9 h-9 bg-primary-600 rounded-xl flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="text-slate-900 font-bold text-lg">EMS</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900">Welcome back</h1>
            <p className="text-slate-500 mt-1.5">Sign in to your account to continue</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
            {errors.root && (
              <div className="p-3.5 rounded-lg bg-red-50 border border-red-200">
                <p className="text-sm text-red-600 font-medium">{errors.root.message}</p>
              </div>
            )}

            <Input
              label="Email Address"
              type="email"
              placeholder="you@example.com"
              error={errors.email?.message}
              leftIcon={<Mail className="w-4 h-4" />}
              required
              className="py-3 text-base"
              {...register('email')}
            />

            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              error={errors.password?.message}
              leftIcon={<Lock className="w-4 h-4" />}
              required
              className="py-3 text-base"
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
              {...register('password')}
            />

            <Button
              type="submit"
              variant="primary"
              className="w-full mt-2"
              size="lg"
              isLoading={isLoggingIn}
            >
              Sign In
            </Button>
          </form>

          <p className="text-center text-slate-400 text-xs mt-8">
            &copy; {new Date().getFullYear()} Education Management System. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
