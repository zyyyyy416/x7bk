import { useAuthStore } from '@/stores/authStore';
import { signOut, signInWithEmail, signUpWithEmail } from '@/services/auth.service';
import { useCallback } from 'react';

export function useAuth() {
  const { user, isAuthenticated, isLoading } = useAuthStore();

  const login = useCallback(async (email: string, password: string) => {
    return signInWithEmail(email, password);
  }, []);

  const register = useCallback(async (email: string, password: string, nickname?: string) => {
    return signUpWithEmail(email, password, nickname);
  }, []);

  const logout = useCallback(async () => {
    await signOut();
    useAuthStore.getState().logout();
  }, []);

  return { user, isAuthenticated, isLoading, login, register, logout };
}
