import { getSupabase } from './supabase';
import type { MonthlySummary } from '@/types';
import dayjs from 'dayjs';
import { getEngelLevel } from '@/constants/engelLevels';
import { calcEngelCoefficient } from '@/utils/engel';

export async function getMonthlySummary(bookId: string, startDate: string, endDate: string) {
  const s = await getSupabase();
  if (!s) return null;

  const [{ data: inc }, { data: exp }, { data: food }] = await Promise.all([
    s.from('bills').select('amount').eq('book_id', bookId).eq('type', 'income').gte('bill_date', startDate).lte('bill_date', endDate),
    s.from('bills').select('amount').eq('book_id', bookId).eq('type', 'expense').gte('bill_date', startDate).lte('bill_date', endDate),
    s.from('bills').select('amount, categories!inner(engel_eligible)').eq('book_id', bookId).eq('type', 'expense').eq('categories.engel_eligible', true).gte('bill_date', startDate).lte('bill_date', endDate),
  ]);

  return calcSummary(inc ?? [], exp ?? [], food ?? []);
}

export async function getAllBooksSummary(bookIds: string[], startDate: string, endDate: string) {
  const s = await getSupabase();
  if (!s || bookIds.length === 0) return null;

  const [{ data: inc }, { data: exp }, { data: food }] = await Promise.all([
    s.from('bills').select('amount').in('book_id', bookIds).eq('type', 'income').gte('bill_date', startDate).lte('bill_date', endDate),
    s.from('bills').select('amount').in('book_id', bookIds).eq('type', 'expense').gte('bill_date', startDate).lte('bill_date', endDate),
    s.from('bills').select('amount, categories!inner(engel_eligible)').in('book_id', bookIds).eq('type', 'expense').eq('categories.engel_eligible', true).gte('bill_date', startDate).lte('bill_date', endDate),
  ]);

  return calcSummary(inc ?? [], exp ?? [], food ?? []);
}

export async function getCategoryBreakdown(bookId: string, startDate: string, endDate: string) {
  return _getCategoryBreakdown([bookId], startDate, endDate);
}

export async function getAllBooksCategoryBreakdown(bookIds: string[], startDate: string, endDate: string) {
  return _getCategoryBreakdown(bookIds, startDate, endDate);
}

async function _getCategoryBreakdown(bookIds: string[], startDate: string, endDate: string) {
  const s = await getSupabase();
  if (!s || bookIds.length === 0) return [];

  // 查账单 + 其二级分类信息 (含 parent_id)
  const { data } = await s.from('bills')
    .select('amount, category:categories!inner(id, name, icon, parent_id, type)')
    .in('book_id', bookIds)
    .eq('type', 'expense')
    .gte('bill_date', startDate)
    .lte('bill_date', endDate);

  if (!data) return [];

  // 收集所有一级分类 parent_id
  const parentIds = new Set<string>();
  for (const row of data as any[]) {
    if (row.category?.parent_id) {
      parentIds.add(row.category.parent_id);
    }
  }

  // 批量查询一级分类名称/icon
  const parentMap = new Map<string, { name: string; icon: string }>();
  if (parentIds.size > 0) {
    const { data: parents } = await s.from('categories')
      .select('id, name, icon')
      .in('id', Array.from(parentIds));
    for (const p of (parents ?? [])) {
      parentMap.set(p.id, { name: p.name, icon: p.icon });
    }
  }

  // 按一级分类聚合金额
  const agg = new Map<string, { id: string; name: string; icon: string; total: number }>();
  for (const row of data as any[]) {
    const cat = row.category;
    if (!cat) continue;
    if (!cat.parent_id) {
      const existing = agg.get(cat.id);
      if (existing) { existing.total += Number(row.amount); }
      else { agg.set(cat.id, { id: cat.id, name: cat.name, icon: cat.icon, total: Number(row.amount) }); }
    } else {
      const p = parentMap.get(cat.parent_id);
      const key = cat.parent_id;
      if (p) {
        const existing = agg.get(key);
        if (existing) { existing.total += Number(row.amount); }
        else { agg.set(key, { id: key, name: p.name, icon: p.icon, total: Number(row.amount) }); }
      } else {
        const existing = agg.get(key);
        if (existing) { existing.total += Number(row.amount); }
        else { agg.set(key, { id: key, name: cat.name, icon: cat.icon, total: Number(row.amount) }); }
      }
    }
  }
  return Array.from(agg.values()).sort((a, b) => b.total - a.total);
}

/** 近 N 个月支出趋势 */
export async function getMonthlyTrend(bookId: string, months: number = 6) {
  const s = await getSupabase();
  if (!s) return [];

  const { data } = await (s.rpc as any)('get_monthly_trend', { p_book_id: bookId, p_months: months });
  return (data ?? []) as { month: string; expense: number; income: number }[];
}

/** 近 N 个月恩格尔系数趋势 */
export async function getEngelTrend(bookId: string, months: number = 6) {
  const s = await getSupabase();
  if (!s) return [];

  const { data } = await (s.rpc as any)('get_engel_trend', { p_book_id: bookId, p_months: months });
  return (data ?? []) as { month: string; coefficient: number }[];
}

function calcSummary(inc: { amount: number }[], exp: { amount: number }[], food: { amount: number }[]) {
  const totalIncome = inc.reduce((sum, b) => sum + Number(b.amount), 0);
  const totalExpense = exp.reduce((sum, b) => sum + Number(b.amount), 0);
  const foodExpense = food.reduce((sum, b) => sum + Number(b.amount), 0);
  const coeff = calcEngelCoefficient(foodExpense, totalExpense);

  return {
    totalIncome, totalExpense,
    balance: totalIncome - totalExpense,
    engelCoefficient: coeff,
    engelLevel: getEngelLevel(coeff),
    billCount: inc.length + exp.length,
  } as MonthlySummary;
}

/** 二级分类支出分布 (下钻) */
export async function getSubCategoryBreakdown(bookId: string, startDate: string, endDate: string, parentCategoryId: string) {
  const s = await getSupabase();
  if (!s) return [];

  const { data: subCats } = await s.from('categories')
    .select('id, name, icon')
    .eq('parent_id', parentCategoryId);
  if (!subCats?.length) return [];

  const subIds = subCats.map((c) => c.id);
  const catMap = new Map(subCats.map((c) => [c.id, { name: c.name, icon: c.icon }]));

  const { data } = await s.from('bills')
    .select('amount, category_id')
    .eq('book_id', bookId).eq('type', 'expense')
    .in('category_id', subIds)
    .gte('bill_date', startDate)
    .lte('bill_date', endDate);

  if (!data) return [];

  const agg = new Map<string, { name: string; icon: string; total: number }>();
  for (const row of data as any[]) {
    const cat = catMap.get(row.category_id);
    if (!cat) continue;
    const existing = agg.get(row.category_id);
    if (existing) { existing.total += Number(row.amount); }
    else { agg.set(row.category_id, { name: cat.name, icon: cat.icon, total: Number(row.amount) }); }
  }
  return Array.from(agg.values()).sort((a, b) => b.total - a.total);
}

/** 多账本二级分类支出分布 (下钻) */
export async function getAllBooksSubCategoryBreakdown(bookIds: string[], startDate: string, endDate: string, parentCategoryId: string) {
  const s = await getSupabase();
  if (!s || bookIds.length === 0) return [];

  const { data: subCats } = await s.from('categories')
    .select('id, name, icon')
    .eq('parent_id', parentCategoryId);
  if (!subCats?.length) return [];

  const subIds = subCats.map((c) => c.id);
  const catMap = new Map(subCats.map((c) => [c.id, { name: c.name, icon: c.icon }]));

  const { data } = await s.from('bills')
    .select('amount, category_id')
    .in('book_id', bookIds).eq('type', 'expense')
    .in('category_id', subIds)
    .gte('bill_date', startDate)
    .lte('bill_date', endDate);

  if (!data) return [];

  const agg = new Map<string, { name: string; icon: string; total: number }>();
  for (const row of data as any[]) {
    const cat = catMap.get(row.category_id);
    if (!cat) continue;
    const existing = agg.get(row.category_id);
    if (existing) { existing.total += Number(row.amount); }
    else { agg.set(row.category_id, { name: cat.name, icon: cat.icon, total: Number(row.amount) }); }
  }
  return Array.from(agg.values()).sort((a, b) => b.total - a.total);
}

/** 同比/环比对比 */
export async function getComparison(bookId: string, month: string, mode: 'mom' | 'yoy') {
  const s = await getSupabase();
  if (!s) return null;

  const [y, mVal] = month.split('-').map(Number);
  const endDay = new Date(y!, mVal!, 0).getDate();
  const start = `${month}-01`;
  const end = `${month}-${String(endDay).padStart(2, '0')}`;

  let cmpStart: string, cmpEnd: string;
  if (mode === 'mom') {
    // 上月
    const prevM = mVal === 1 ? 12 : mVal! - 1;
    const prevY = mVal === 1 ? y! - 1 : y;
    const prevEndDay = new Date(prevY!, prevM, 0).getDate();
    cmpStart = `${prevY}-${String(prevM).padStart(2, '0')}-01`;
    cmpEnd = `${prevY}-${String(prevM).padStart(2, '0')}-${String(prevEndDay).padStart(2, '0')}`;
  } else {
    // 去年同月
    const prevY = y! - 1;
    const prevEndDay = new Date(prevY, mVal!, 0).getDate();
    cmpStart = `${prevY}-${String(mVal).padStart(2, '0')}-01`;
    cmpEnd = `${prevY}-${String(mVal).padStart(2, '0')}-${String(prevEndDay).padStart(2, '0')}`;
  }

  const q = (d1: string, d2: string) =>
    s.from('bills').select('amount, type').eq('book_id', bookId).gte('bill_date', d1).lte('bill_date', d2);

  const [{ data: cur }, { data: cmp }] = await Promise.all([q(start, end), q(cmpStart, cmpEnd)]);

  const sum = (rows: any[], t: string) => rows.filter((r: any) => r.type === t).reduce((a: number, r: any) => a + Number(r.amount), 0);

  return {
    current: { income: sum(cur ?? [], 'income'), expense: sum(cur ?? [], 'expense') },
    compare: { income: sum(cmp ?? [], 'income'), expense: sum(cmp ?? [], 'expense') },
    compareLabel: mode === 'mom' ? '上月' : '去年同月',
  };
}

/** 按天统计支出 (周/月视图) — 填充零值覆盖全部日期 */
export async function getDailyTrend(bookId: string, startDate: string, endDate: string) {
  const s = await getSupabase();
  if (!s) return [];

  // 生成日期范围内所有日期
  const dates: string[] = [];
  let cur = dayjs(startDate);
  const end = dayjs(endDate);
  while (cur.isBefore(end) || cur.isSame(end, 'day')) {
    dates.push(cur.format('YYYY-MM-DD'));
    cur = cur.add(1, 'day');
  }

  const { data } = await s.from('bills')
    .select('amount, bill_date')
    .eq('book_id', bookId).eq('type', 'expense')
    .gte('bill_date', startDate).lte('bill_date', endDate);

  const map = new Map<string, number>();
  for (const row of (data ?? []) as any[]) {
    map.set(row.bill_date, (map.get(row.bill_date) ?? 0) + Number(row.amount));
  }
  return dates.map((date) => ({ date, expense: map.get(date) ?? 0 }));
}

/** 按年统计支出 (12个月) — 填充零值 */
export async function getYearlyTrend(bookId: string, year: number) {
  const s = await getSupabase();
  if (!s) return [];
  const { data } = await s.from('bills')
    .select('amount, bill_date')
    .eq('book_id', bookId).eq('type', 'expense')
    .gte('bill_date', `${year}-01-01`).lte('bill_date', `${year}-12-31`);

  const map = new Map<number, number>();
  for (const row of (data ?? []) as any[]) {
    const m = parseInt(row.bill_date.split('-')[1]!, 10);
    map.set(m, (map.get(m) ?? 0) + Number(row.amount));
  }
  return Array.from({ length: 12 }, (_, i) => ({ month: `${i + 1}月`, expense: map.get(i + 1) ?? 0 }));
}
