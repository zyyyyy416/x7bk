import { signUpWithEmail, signInWithEmail, getCurrentUser, signOut } from '@/services/auth.service';
import { createMockSupabase } from './__mocks__/supabase-mock';

jest.mock('@/services/supabase', () => ({
  getSupabase: jest.fn(),
}));

import { getSupabase } from '@/services/supabase';

describe('auth.service', () => {
  let mockSupabase: ReturnType<typeof createMockSupabase>;

  // signUpWithEmail 内部有 await new Promise(r => setTimeout(r, 1500))
  // mock setTimeout 让它同步执行，避免真等 1.5 秒
  beforeEach(() => {
    jest.spyOn(global, 'setTimeout').mockImplementation((cb: any) => { cb(); return 0 as any as NodeJS.Timeout; });
    mockSupabase = createMockSupabase();
    (getSupabase as jest.Mock).mockReturnValue(mockSupabase);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ─── Null Supabase ─────────────────────────────────
  describe('getSupabase 返回 null 时', () => {
    beforeEach(() => {
      (getSupabase as jest.Mock).mockReturnValue(null);
    });

    it('signUpWithEmail', async () => {
      const result = await signUpWithEmail('a@b.com', '123456');
      expect(result).toEqual({ success: false, error: 'Supabase 未配置' });
    });

    it('signInWithEmail', async () => {
      const result = await signInWithEmail('a@b.com', '123456');
      expect(result).toEqual({ success: false, error: 'Supabase 未配置' });
    });

    it('getCurrentUser 返回 null', async () => {
      const result = await getCurrentUser();
      expect(result).toBeNull();
    });

    it('signOut 不报错', async () => {
      await expect(signOut()).resolves.toBeUndefined();
    });
  });

  // ─── signUpWithEmail ───────────────────────────────
  describe('signUpWithEmail', () => {
    it('注册成功', async () => {
      const mockUser = { id: 'new-u1', email: 'a@b.com' };
      mockSupabase.auth.signUp.mockResolvedValue({ data: { user: mockUser }, error: null });
      mockSupabase.rpc.mockResolvedValue({ data: { profile: { id: 'new-u1', phone: '', nickname: '测试', avatar_url: null, created_at: '2026-01-01' }, book: {} }, error: null });

      const result = await signUpWithEmail('a@b.com', '123456', '测试');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.user.id).toBe('new-u1');
      }
    });

    it('auth 返回错误', async () => {
      mockSupabase.auth.signUp.mockResolvedValue({ data: null, error: { message: '邮箱已注册' } });

      const result = await signUpWithEmail('a@b.com', '123456');

      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe('邮箱已注册');
    });
  });

  // ─── signInWithEmail ───────────────────────────────
  describe('signInWithEmail', () => {
    it('登录成功', async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: { id: 'u1' } }, error: null,
      });
      // readProfile 降级到直接查询 users 表
      mockSupabase.chain.maybeSingle.mockResolvedValue({
        data: { id: 'u1', phone: '138', nickname: '用户', avatar_url: null, created_at: '2026-01-01' },
        error: null,
      });
      // ensure_categories RPC
      mockSupabase.rpc.mockResolvedValue({ data: true, error: null });

      const result = await signInWithEmail('a@b.com', '123456');
      expect(result.success).toBe(true);
    });

    it('密码错误', async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: null, error: { message: '密码错误' },
      });
      const result = await signInWithEmail('a@b.com', 'wrong');
      expect(result).toEqual({ success: false, error: '密码错误' });
    });
  });

  // ─── getCurrentUser ────────────────────────────────
  describe('getCurrentUser', () => {
    it('无 session 返回 null', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({ data: { session: null } });
      const result = await getCurrentUser();
      expect(result).toBeNull();
    });

    it('有 session 返回 user', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { user: { id: 'u1' } } },
      });
      mockSupabase.chain.maybeSingle.mockResolvedValue({
        data: { id: 'u1', phone: '138', nickname: '用户', avatar_url: null, created_at: '2026-01-01' },
        error: null,
      });

      const result = await getCurrentUser();
      expect(result).not.toBeNull();
      expect(result!.id).toBe('u1');
    });
  });

  // ─── signOut ───────────────────────────────────────
  describe('signOut', () => {
    it('退出成功', async () => {
      mockSupabase.auth.signOut.mockResolvedValue({ error: null });
      await expect(signOut()).resolves.toBeUndefined();
    });
  });
});
