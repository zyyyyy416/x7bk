import { renderHook, act } from '@testing-library/react-native';
import { useAuth } from '@/hooks/useAuth';

// Mock service
jest.mock('@/services/auth.service', () => ({
  signInWithEmail: jest.fn(),
  signUpWithEmail: jest.fn(),
  signOut: jest.fn(),
}));

import { signInWithEmail, signUpWithEmail, signOut } from '@/services/auth.service';

// Mock store
const mockStoreLogout = jest.fn();
jest.mock('@/stores/authStore', () => ({
  useAuthStore: jest.fn((selector?: any) => {
    const state = {
      user: { id: 'u1', phone: '138', nickname: '测试', avatar_url: null, created_at: '2026-01-01' },
      isAuthenticated: true,
      isLoading: false,
    };
    if (typeof selector === 'function') return selector(state);
    return state;
  }),
}));

import { useAuthStore } from '@/stores/authStore';

// Zustand store has .getState()/.setState() on the hook function itself
const mockStoreObj = useAuthStore as unknown as jest.Mock;
mockStoreObj.getState = () => ({ logout: mockStoreLogout });

describe('useAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAuthStore as unknown as jest.Mock).mockImplementation((selector?: any) => {
      const state = {
        user: { id: 'u1', phone: '138', nickname: '测试', avatar_url: null, created_at: '2026-01-01' },
        isAuthenticated: true,
        isLoading: false,
      };
      if (typeof selector === 'function') return selector(state);
      return state;
    });
    (useAuthStore as unknown as jest.Mock).getState = () => ({ logout: mockStoreLogout });
  });

  it('返回用户状态', () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.user?.id).toBe('u1');
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.isLoading).toBe(false);
  });

  it('login 调用服务', async () => {
    (signInWithEmail as jest.Mock).mockResolvedValue({ success: true, user: { id: 'u1' } });

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.login('a@b.com', '123456');
    });

    expect(signInWithEmail).toHaveBeenCalledWith('a@b.com', '123456');
  });

  it('register 调用服务', async () => {
    (signUpWithEmail as jest.Mock).mockResolvedValue({ success: true, user: { id: 'new' } });

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.register('a@b.com', '123456', '昵称');
    });

    expect(signUpWithEmail).toHaveBeenCalledWith('a@b.com', '123456', '昵称');
  });

  it('logout 调用 signOut 并清除 store', async () => {
    (signOut as jest.Mock).mockResolvedValue(undefined);

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.logout();
    });

    expect(signOut).toHaveBeenCalled();
  });
});
