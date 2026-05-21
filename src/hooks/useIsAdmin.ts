import { useAuth } from './useAuth';

export function useIsAdmin(): boolean {
  const { profile } = useAuth();
  return profile?.role === 'admin';
}
