import { getSupabase } from './supabase';
import type { User } from '@/types';

type AuthResult = { success: true; user: User } | { success: false; error: string };

export async function signUpWithEmail(email: string, password: string, nickname?: string): Promise<AuthResult> {
  const s = getSupabase();
  if (!s) return { success: false, error: 'Supabase 未配置' };
  const { data, error } = await s.auth.signUp({ email, password, options: { data: { nickname: nickname ?? '' } } });
  if (error) return { success: false, error: error.message };
  if (!data.user) return { success: false, error: '注册失败' };

  // 等待 DB trigger 创建 profile + 个人账本
  await new Promise((r) => setTimeout(r, 1500));

  // 即使 trigger 未运行，也通过 RPC 兜底确保 profile 和账本存在
  const user = await readProfile(s, data.user.id);

  return { success: true, user };
}

export async function signInWithEmail(email: string, password: string): Promise<AuthResult> {
  const s = getSupabase();
  if (!s) return { success: false, error: 'Supabase 未配置' };
  const { data, error } = await s.auth.signInWithPassword({ email, password });
  if (error) return { success: false, error: error.message };
  if (!data.user) return { success: false, error: '登录失败' };

  const user = await readProfile(s, data.user.id);
  return { success: true, user };
}

export async function getCurrentUser(): Promise<User | null> {
  const s = getSupabase();
  if (!s) return null;
  const { data } = await s.auth.getSession();
  if (!data.session) return null;
  return readProfile(s, data.session.user.id);
}

export async function signOut() {
  const s = getSupabase();
  if (!s) return;
  await s.auth.signOut();
}

/**
 * 读取用户 profile，同时通过 RPC 兜底确保 profile + 个人账本存在。
 *
 * 如果 DB trigger (handle_new_user) 正常触发，RPC 调用是幂等的几乎无开销。
 * 如果 trigger 因 migration 未执行等原因缺失，RPC 会补建 profile 和账本。
 */
async function readProfile(s: NonNullable<ReturnType<typeof getSupabase>>, userId: string): Promise<User> {
  // 1. 先尝试通过 RPC 确保 profile 和账本存在 (SECURITY DEFINER, 绕过 RLS)
  try {
    const { data: rpcResult, error: rpcError } = await (s.rpc as any)('ensure_user_profile', { user_id: userId });

    if (!rpcError && rpcResult) {
      // RPC 返回 { profile: {...}, book: {...} }
      const result = rpcResult as any;
      if (result?.profile?.id) {
        // 确保分类已初始化 (trigger 不创建分类，此处兜底)
        try {
          await (s.rpc as any)('ensure_categories', { p_user_id: userId });
        } catch { /* RPC 不存在时静默降级 */ }
        return result.profile as User;
      }
    }
    // RPC 失败时静默降级到直接查询
  } catch {
    // RPC 函数可能不存在 (migration 未执行)，降级到直接查询
  }

  // 2. 降级：直接查询 users 表
  try {
    const { data } = await s.from('users').select('*').eq('id', userId).maybeSingle();
    if (data) {
      // 同样尝试初始化分类
      try {
        await (s.rpc as any)('ensure_categories', { p_user_id: userId });
      } catch { /* ignore */ }
      return data as User;
    }
  } catch { /* RLS/network */ }

  // 3. 最终降级：返回最小可用的 User 对象
  return {
    id: userId,
    phone: '',
    nickname: '用户',
    avatar_url: null,
    created_at: new Date().toISOString(),
  };
}
