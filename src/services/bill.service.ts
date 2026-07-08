import { getSupabase } from './supabase';
import type { Bill, BillWithDetails, BillFilter, PaginationParams } from '@/types';

export async function getBills(filter: BillFilter & PaginationParams) {
  const s = await getSupabase();
  if (!s) return { bills: [], total: 0 };

  let q = s.from('bills')
    .select('*, category:categories(*), user:users(id, nickname, avatar_url)', { count: 'exact' })
    .eq('book_id', filter.bookId)
    .order('bill_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (filter.startDate) q = q.gte('bill_date', filter.startDate);
  if (filter.endDate) q = q.lte('bill_date', filter.endDate);
  if (filter.categoryId) q = q.eq('category_id', filter.categoryId);
  if (filter.type) q = q.eq('type', filter.type);

  const from = (filter.page - 1) * filter.pageSize;
  q = q.range(from, from + filter.pageSize - 1);

  const { data, error, count } = await q;
  if (error) throw error;
  return { bills: (data ?? []) as unknown as BillWithDetails[], total: count ?? 0 };
}

/** 根据 ID 获取单条账单详情 */
export async function getBillById(id: string) {
  const s = await getSupabase();
  if (!s) return null;
  const { data } = await s.from('bills')
    .select('*, category:categories(*), user:users(id, nickname, avatar_url)')
    .eq('id', id)
    .single();
  return data as BillWithDetails | null;
}

export async function createBill(bill: Omit<Bill, 'id' | 'created_at'>) {
  const s = await getSupabase();
  if (!s) throw new Error('Supabase 未配置');
  const { data, error } = await s.from('bills').insert(bill).select().single();
  if (error) throw error;
  return data as Bill;
}

export async function updateBill(id: string, updates: Partial<Bill>) {
  const s = await getSupabase();
  if (!s) throw new Error('Supabase 未配置');
  const { data, error } = await s.from('bills').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data as Bill;
}

export async function deleteBill(id: string) {
  const s = await getSupabase();
  if (!s) throw new Error('Supabase 未配置');
  const { error } = await s.from('bills').delete().eq('id', id);
  if (error) throw error;
}

async function findCategoryId(userId: string, parentName: string, subName: string, type: 'expense' | 'income') {
  const s = await getSupabase();
  if (!s) return null;

  const { data: sub } = await s.from('categories').select('id')
    .eq('user_id', userId).eq('name', subName).eq('type', type)
    .not('parent_id', 'is', null).limit(1).maybeSingle();
  if (sub) return sub.id;

  const { data: parent } = await s.from('categories').select('id')
    .eq('user_id', userId).eq('name', parentName).eq('type', type)
    .is('parent_id', null).limit(1).maybeSingle();
  return parent?.id ?? null;
}

export async function saveBill(params: {
  bookId: string; userId: string;
  parentCategoryName: string; subCategoryName: string;
  type: 'expense' | 'income'; amount: number;
  note?: string | null; billDate?: string; isShared?: boolean;
}) {
  const s = await getSupabase();
  if (!s) throw new Error('Supabase 未配置');

  const catId = await findCategoryId(params.userId, params.parentCategoryName, params.subCategoryName, params.type);
  if (!catId) {
    throw new Error(
      `分类"${params.parentCategoryName} > ${params.subCategoryName}"未找到。\n` +
      `请确认已在 Supabase SQL Editor 执行迁移脚本，或尝试重新登录以初始化分类。`
    );
  }

  const { data, error } = await s.from('bills').insert({
    book_id: params.bookId, user_id: params.userId, category_id: catId,
    amount: params.amount, type: params.type,
    note: params.note ?? null, bill_date: params.billDate ?? new Date().toISOString().split('T')[0],
    is_shared: params.isShared ?? false,
  }).select().single();

  if (error) throw error;
  return data as Bill;
}
