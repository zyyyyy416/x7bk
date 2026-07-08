import { getSupabase } from './supabase';
import type { Book, BookMember } from '@/types';
import { EXPENSE_CATEGORIES, EXPENSE_SUB_CATEGORIES, INCOME_CATEGORIES, INCOME_SUB_CATEGORIES } from '@/constants/categories';

export async function getMyBooks(userId: string) {
  const s = await getSupabase();
  if (!s) return [];

  // 查出用户创建的账本 + 作为成员加入的账本
  const [{ data: created }, { data: memberships }] = await Promise.all([
    s.from('books').select('id').eq('creator_id', userId),
    s.from('book_members').select('book_id').eq('user_id', userId),
  ]);

  const ids = new Set<string>();
  created?.forEach((b) => ids.add(b.id));
  memberships?.forEach((m) => ids.add(m.book_id));

  if (ids.size === 0) return [];

  const { data } = await s.from('books').select('*').in('id', Array.from(ids));
  return (data as Book[]) ?? [];
}

/**
 * 创建账本。
 *
 * 前置条件:
 * 1. migration 已执行 (RLS 已禁用 或 有 SECURITY DEFINER RPC 兜底)
 * 2. 用户在 public.users 中有 profile
 *
 * 如果创建失败，常见原因:
 * - "permission denied for table books" → migration 未执行，RLS 仍启用
 * - "relation 'public.books' does not exist" → 表不存在，需执行 migration
 * - 401 Unauthorized → JWT 过期，需重新登录
 */
export async function createBook(userId: string, book: Pick<Book, 'name' | 'type'>) {
  const s = await getSupabase();
  if (!s) throw new Error('Supabase 未配置，请检查环境变量');

  // 0. 确保用户 profile 存在 (RPC 兜底)
  try {
    await (s.rpc as any)('ensure_user_profile', { user_id: userId });
  } catch {
    // RPC 可能不存在 (migration 未执行)，忽略，继续尝试直接 INSERT
  }

  // 1. 创建账本
  const { data, error } = await s.from('books')
    .insert({ ...book, creator_id: userId })
    .select()
    .single();

  if (error) {
    // 友好提示: RLS 权限问题通常是 migration 未执行
    if (error.message.includes('permission denied') ||
        error.message.includes('violates row-level security') ||
        error.code === '42501' ||
        error.code === 'PGRST301') {
      throw new Error('数据库权限不足 — 请在 Supabase SQL Editor 中执行 supabase/migrations/001_schema.sql');
    }
    throw new Error(error.message);
  }

  const newBook = data as Book;

  // 2. 共享账本: 将创建者加入 book_members (角色 admin)
  if (newBook.type === 'shared') {
    try {
      await s.from('book_members').insert({
        book_id: newBook.id,
        user_id: userId,
        role: 'admin',
      });
    } catch {
      // 静默失败，不影响账本创建
    }
  }

  // 3. 创建默认分类 (通过 RPC，绕过可能的 RLS 限制)
  if (book.type === 'personal') {
    try {
      await (s.rpc as any)('ensure_categories', { p_user_id: userId });
    } catch {
      // RPC 可能不存在，尝试直接插入分类 (fallback)
      await seedCategoriesClient(s, userId);
    }
  }

  return newBook;
}

/**
 * 客户端直接插入分类 (fallback，仅在 RLS 已禁用时有效)
 */
async function seedCategoriesClient(s: NonNullable<ReturnType<typeof getSupabase>>, userId: string) {
  for (const cat of EXPENSE_CATEGORIES) {
    const { data: parent } = await s.from('categories')
      .insert({ ...cat, user_id: userId })
      .select()
      .single();
    if (!parent) continue;
    const subs = EXPENSE_SUB_CATEGORIES[cat.name] ?? [];
    if (subs.length) {
      await s.from('categories').insert(
        subs.map((name, idx) => ({
          name,
          icon: cat.icon,
          parent_id: parent.id,
          type: 'expense' as const,
          engel_eligible: cat.engel_eligible,
          sort_order: idx + 1,
          is_default: true,
          user_id: userId,
        }))
      );
    }
  }

  for (const cat of INCOME_CATEGORIES) {
    const { data: parent } = await s.from('categories')
      .insert({ ...cat, user_id: userId })
      .select()
      .single();
    if (!parent) continue;
    const subs = INCOME_SUB_CATEGORIES[cat.name] ?? [];
    if (subs.length) {
      await s.from('categories').insert(
        subs.map((name, idx) => ({
          name,
          icon: cat.icon,
          parent_id: parent.id,
          type: 'income' as const,
          engel_eligible: false,
          sort_order: idx + 1,
          is_default: true,
          user_id: userId,
        }))
      );
    }
  }
}

export async function joinBookByCode(userId: string, inviteCode: string) {
  const s = await getSupabase();
  if (!s) throw new Error('Supabase 未配置');

  // 先查找账本是否存在
  const { data: book } = await s.from('books').select('id,name').eq('id', inviteCode).single();
  if (!book) throw new Error('邀请码无效，未找到对应账本');

  // 检查是否已是成员
  const { data: existing } = await s.from('book_members')
    .select('id')
    .eq('book_id', inviteCode).eq('user_id', userId).maybeSingle();
  if (existing) throw new Error('你已是该账本成员');

  const { data, error } = await s.from('book_members')
    .insert({ book_id: inviteCode, user_id: userId, role: 'member' })
    .select('*, book:books(*)')
    .single();
  if (error) throw new Error(error.message);
  return data as BookMember & { book: Book };
}

/** 获取账本成员列表 */
export async function getBookMembers(bookId: string) {
  const s = await getSupabase();
  if (!s) return [];
  const { data } = await s.from('book_members')
    .select('*, user:users(id, nickname, avatar_url)')
    .eq('book_id', bookId)
    .order('joined_at', { ascending: true });
  return (data ?? []) as (BookMember & { user: { id: string; nickname: string; avatar_url: string | null } })[];
}

/** 管理员移除成员 */
export async function removeMember(bookId: string, userId: string) {
  const s = await getSupabase();
  if (!s) throw new Error('Supabase 未配置');
  const { error } = await s.from('book_members')
    .delete()
    .eq('book_id', bookId)
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
}

/** 成员退出账本 */
export async function leaveBook(bookId: string, userId: string) {
  return removeMember(bookId, userId);
}
