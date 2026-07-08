import { useQuery } from '@tanstack/react-query';
import { getMonthlySummary, getAllBooksSummary, getCategoryBreakdown, getAllBooksCategoryBreakdown, getSubCategoryBreakdown, getMonthlyTrend, getEngelTrend, getComparison } from '@/services/analysis.service';

/** 获取月度分析概览 */
export function useMonthlySummary(bookId: string, month: string) {
  return useQuery({
    queryKey: ['monthlySummary', bookId, month],
    queryFn: () => getMonthlySummary(bookId, month),
    enabled: !!bookId && !!month,
  });
}

/** 获取全部账本月度汇总 */
export function useAllBooksSummary(bookIds: string[], month: string) {
  return useQuery({
    queryKey: ['allBooksSummary', bookIds, month],
    queryFn: () => getAllBooksSummary(bookIds, month),
    enabled: bookIds.length > 0 && !!month,
  });
}

/** 获取分类支出分布 */
export function useCategoryBreakdown(bookId: string, month: string) {
  return useQuery({
    queryKey: ['categoryBreakdown', bookId, month],
    queryFn: () => getCategoryBreakdown(bookId, month),
    enabled: !!bookId && !!month,
  });
}

/** 获取全部账本分类支出分布 */
export function useAllBooksCategoryBreakdown(bookIds: string[], month: string) {
  return useQuery({
    queryKey: ['allBooksCategoryBreakdown', bookIds, month],
    queryFn: () => getAllBooksCategoryBreakdown(bookIds, month),
    enabled: bookIds.length > 0 && !!month,
  });
}

/** 获取月度趋势 */
export function useMonthlyTrend(bookId: string, months?: number) {
  return useQuery({
    queryKey: ['monthlyTrend', bookId, months ?? 6],
    queryFn: () => getMonthlyTrend(bookId, months ?? 6),
    enabled: !!bookId,
  });
}

/** 获取恩格尔系数趋势 */
export function useEngelTrend(bookId: string, months?: number) {
  return useQuery({
    queryKey: ['engelTrend', bookId, months ?? 6],
    queryFn: () => getEngelTrend(bookId, months ?? 6),
    enabled: !!bookId,
  });
}

/** 获取二级分类分布 (下钻) */
export function useSubCategoryBreakdown(bookId: string, month: string, parentId: string) {
  return useQuery({
    queryKey: ['subCategoryBreakdown', bookId, month, parentId],
    queryFn: () => getSubCategoryBreakdown(bookId, month, parentId),
    enabled: !!bookId && !!month && !!parentId,
  });
}

/** 同比/环比对比 */
export function useComparison(bookId: string, month: string, mode: 'mom' | 'yoy') {
  return useQuery({
    queryKey: ['comparison', bookId, month, mode],
    queryFn: () => getComparison(bookId, month, mode),
    enabled: !!bookId && !!month,
  });
}
