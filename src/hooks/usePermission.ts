import { useAuthStore } from '../store/authStore';

/**
 * Returns a `can(resource, action)` checker based on the logged-in user's
 * permissions array (e.g. ["departments:create", "departments:read", ...]).
 *
 * Admins always get all permissions because the backend includes every
 * permission in their token. Teachers/students only get what's assigned.
 */
export function usePermission() {
  const user = useAuthStore((s) => s.user);
  const permissions: string[] = user?.permissions ?? [];
  const roles: string[] = user?.roles ?? [];

  const isAdmin = roles.includes('admin');

  /**
   * Check if the user has permission for a resource+action.
   * Admins bypass the check (always true).
   */
  const can = (resource: string, action: string): boolean => {
    if (isAdmin) return true;
    return permissions.includes(`${resource}:${action}`);
  };

  /** Returns true if user has at least one action on the resource */
  const canAny = (resource: string, actions: string[]): boolean => {
    if (isAdmin) return true;
    return actions.some((action) => permissions.includes(`${resource}:${action}`));
  };

  return { can, canAny, isAdmin, permissions };
}
