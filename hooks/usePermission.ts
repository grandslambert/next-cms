import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function usePermission(requiredPermission: string | string[], redirectTo: string = '/admin') {
  const { data: session, status } = useSession();
  const router = useRouter();
  const permissions = (session?.user as any)?.permissions || {};

  useEffect(() => {
    if (status === 'loading') return;

    if (!session) {
      router.push('/admin/login');
      return;
    }

    const hasPermission = Array.isArray(requiredPermission)
      ? requiredPermission.some(perm => permissions[perm] === true)
      : permissions[requiredPermission] === true;

    if (!hasPermission) {
      router.push(redirectTo);
    }
  }, [session, status, permissions, requiredPermission, redirectTo, router]);

  const hasPermission = Array.isArray(requiredPermission)
    ? requiredPermission.some(perm => permissions[perm] === true)
    : permissions[requiredPermission] === true;

  return {
    hasPermission,
    permissions,
    isLoading: status === 'loading',
  };
}


