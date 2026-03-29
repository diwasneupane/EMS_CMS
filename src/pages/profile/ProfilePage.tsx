import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { User, Lock, Mail, Phone, Shield } from 'lucide-react';
import { usersApi } from '../../api/users';
import { authApi } from '../../api/auth';
import { useAuth } from '../../hooks/useAuth';
import { useAuthStore } from '../../store/authStore';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card, CardHeader } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { getInitials } from '../../lib/utils';

const profileSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phoneNumber: z.string().optional(),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(6, 'New password must be at least 6 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ProfileFormData = z.infer<typeof profileSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const { user: authUser } = useAuth();
  const updateUser = useAuthStore((s) => s.updateUser);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: () => usersApi.getProfile(),
  });

  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors },
    reset: resetProfile,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    values: profile
      ? { firstName: profile.firstName, lastName: profile.lastName, phoneNumber: profile.phoneNumber ?? '' }
      : undefined,
  });

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    formState: { errors: passwordErrors },
    reset: resetPassword,
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  });

  const profileMutation = useMutation({
    mutationFn: (data: ProfileFormData) => usersApi.updateProfile(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      updateUser({ firstName: variables.firstName, lastName: variables.lastName });
      toast.success('Profile updated successfully');
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message || 'Failed to update profile');
    },
  });

  const passwordMutation = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) => authApi.changePassword(data),
    onSuccess: () => {
      toast.success('Password changed successfully');
      resetPassword();
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message || 'Failed to change password');
    },
  });

  const onProfileSubmit = (data: ProfileFormData) => {
    profileMutation.mutate(data);
  };

  const onPasswordSubmit = (data: PasswordFormData) => {
    passwordMutation.mutate({ currentPassword: data.currentPassword, newPassword: data.newPassword });
  };

  const displayUser = profile ?? authUser;
  const roles: string[] = authUser?.roles ?? [];

  return (
    <div>
      <PageHeader title="My Profile" description="Manage your account information and security settings" />

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="space-y-6">
          <Card>
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center text-xl font-bold flex-shrink-0">
                {displayUser
                  ? getInitials(displayUser.firstName ?? '', displayUser.lastName ?? '')
                  : '?'}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-slate-900 truncate">
                  {displayUser?.firstName} {displayUser?.lastName}
                </h2>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="flex items-center gap-1.5 text-sm text-slate-500">
                    <Mail className="w-3.5 h-3.5" />
                    {displayUser?.email}
                  </span>
                  {(displayUser as { phoneNumber?: string })?.phoneNumber && (
                    <span className="flex items-center gap-1.5 text-sm text-slate-500">
                      <Phone className="w-3.5 h-3.5" />
                      {(displayUser as { phoneNumber?: string }).phoneNumber}
                    </span>
                  )}
                </div>
                {roles.length > 0 && (
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <Shield className="w-3.5 h-3.5 text-slate-400" />
                    {roles.map((role) => (
                      <Badge key={role} variant="info">
                        {role}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader title="Edit Profile" description="Update your personal information" />
              <form onSubmit={handleProfileSubmit(onProfileSubmit)} noValidate className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="First Name"
                    placeholder="John"
                    error={profileErrors.firstName?.message}
                    required
                    {...registerProfile('firstName')}
                  />
                  <Input
                    label="Last Name"
                    placeholder="Doe"
                    error={profileErrors.lastName?.message}
                    required
                    {...registerProfile('lastName')}
                  />
                </div>
                <Input
                  label="Phone Number"
                  type="tel"
                  placeholder="+1 234 567 8900"
                  error={profileErrors.phoneNumber?.message}
                  leftIcon={<Phone className="w-4 h-4" />}
                  {...registerProfile('phoneNumber')}
                />
                <div className="flex justify-end pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    isLoading={profileMutation.isPending}
                    leftIcon={<User className="w-4 h-4" />}
                  >
                    Save Changes
                  </Button>
                </div>
              </form>
            </Card>

            <Card>
              <CardHeader title="Change Password" description="Keep your account secure with a strong password" />
              <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} noValidate className="space-y-4">
                <Input
                  label="Current Password"
                  type="password"
                  placeholder="Enter current password"
                  error={passwordErrors.currentPassword?.message}
                  leftIcon={<Lock className="w-4 h-4" />}
                  required
                  {...registerPassword('currentPassword')}
                />
                <Input
                  label="New Password"
                  type="password"
                  placeholder="Enter new password"
                  error={passwordErrors.newPassword?.message}
                  leftIcon={<Lock className="w-4 h-4" />}
                  required
                  {...registerPassword('newPassword')}
                />
                <Input
                  label="Confirm New Password"
                  type="password"
                  placeholder="Confirm new password"
                  error={passwordErrors.confirmPassword?.message}
                  leftIcon={<Lock className="w-4 h-4" />}
                  required
                  {...registerPassword('confirmPassword')}
                />
                <div className="flex justify-end pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    isLoading={passwordMutation.isPending}
                    leftIcon={<Lock className="w-4 h-4" />}
                  >
                    Change Password
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
