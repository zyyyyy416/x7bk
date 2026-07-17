import { useAuthStore } from '@/stores/authStore';
import type { User } from '@/types';

const mockUser: User = {
  id: 'u1',
  phone: '13800001111',
  nickname: '测试用户',
  avatar_url: null,
  created_at: '2026-01-01',
};

const initialState = {
  user: null,
  session: null,
  isLoading: true,
  isAuthenticated: false,
};

describe('authStore', () => {
  beforeEach(() => {
    useAuthStore.setState(initialState);
  });

  it('初始状态', () => {
    const s = useAuthStore.getState();
    expect(s.user).toBeNull();
    expect(s.session).toBeNull();
    expect(s.isLoading).toBe(true);
    expect(s.isAuthenticated).toBe(false);
  });

  it('setUser 设置用户并标记已认证', () => {
    useAuthStore.getState().setUser(mockUser);
    const s = useAuthStore.getState();
    expect(s.user).toEqual(mockUser);
    expect(s.isAuthenticated).toBe(true);
  });

  it('setUser(null) 清除认证状态', () => {
    useAuthStore.getState().setUser(mockUser);
    useAuthStore.getState().setUser(null);
    const s = useAuthStore.getState();
    expect(s.user).toBeNull();
    expect(s.isAuthenticated).toBe(false);
  });

  it('setSession 设置 session token', () => {
    useAuthStore.getState().setSession('token-abc-123');
    expect(useAuthStore.getState().session).toBe('token-abc-123');
  });

  it('setLoading 切换加载状态', () => {
    useAuthStore.getState().setLoading(false);
    expect(useAuthStore.getState().isLoading).toBe(false);
  });

  it('logout 重置所有状态', () => {
    useAuthStore.getState().setUser(mockUser);
    useAuthStore.getState().setSession('token-xyz');
    useAuthStore.getState().logout();
    const s = useAuthStore.getState();
    expect(s.user).toBeNull();
    expect(s.session).toBeNull();
    expect(s.isAuthenticated).toBe(false);
  });
});
