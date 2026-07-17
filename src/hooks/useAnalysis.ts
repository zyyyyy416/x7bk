import { useQuery } from '@tanstack/react-query';
import { getMonthlySummary, getAllBooksSummary, getCategoryBreakdown, getAllBooksCategoryBreakdown, getSubCategoryBreakdown, getAllBooksSubCategoryBreakdown, getMonthlyTrend, getEngelTrend, getComparison, getDailyTrend, getYearlyTrend } from '@/services/analysis.service';

/** 获取月度分析概览 */
export function useMonthlySummary(bookId: string, startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['monthlySummary', bookId, startDate, endDate],
    queryFn: () => getMonthlySummary(bookId, startDate, endDate),
    enabled: !!bookId && !!startDate && !!endDate,
  });
}

/** 获取全部账本月度汇总 */
export function useAllBooksSummary(bookIds: string[], startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['allBooksSummary', bookIds, startDate, endDate],
    queryFn: () => getAllBooksSummary(bookIds, startDate, endDate),
    enabled: bookIds.length > 0 && !!startDate && !!endDate,
  });
}

/** 获取分类支出分布 */
export function useCategoryBreakdown(bookId: string, startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['categoryBreakdown', bookId, startDate, endDate],
    queryFn: () => getCategoryBreakdown(bookId, startDate, endDate),
    enabled: !!bookId && !!startDate && !!endDate,
  });
}

/** 获取全部账本分类支出分布 */
export function useAllBooksCategoryBreakdown(bookIds: string[], startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['allBooksCategoryBreakdown', bookIds, startDate, endDate],
    queryFn: () => getAllBooksCategoryBreakdown(bookIds, startDate, endDate),
    enabled: bookIds.length > 0 && !!startDate && !!endDate,
  });
}

/** 二级分类分布 (下钻) */
export function useSubCategoryBreakdown(bookId: string, startDate: string, endDate: string, parentId: string) {
  return useQuery({
    queryKey: ['subCategoryBreakdown', bookId, startDate, endDate, parentId],
    queryFn: () => getSubCategoryBreakdown(bookId, startDate, endDate, parentId),
    enabled: !!bookId && !!startDate && !!endDate && !!parentId,
  });
}

/** 多账本二级分类分布 (下钻) */
export function useAllBooksSubCategoryBreakdown(bookIds: string[], startDate: string, endDate: string, parentId: string) {
  return useQuery({
    queryKey: ['allBooksSubCategoryBreakdown', bookIds, startDate, endDate, parentId],
    queryFn: () => getAllBooksSubCategoryBreakdown(bookIds, startDate, endDate, parentId),
    enabled: bookIds.length > 0 && !!startDate && !!endDate && !!parentId,
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

export function useDailyTrend(bookId: string, startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['dailyTrend', bookId, startDate, endDate],
    queryFn: () => getDailyTrend(bookId, startDate, endDate),
    enabled: !!bookId && !!startDate && !!endDate,
  });
}

export function useYearlyTrend(bookId: string, year: number) {
  return useQuery({
    queryKey: ['yearlyTrend', bookId, year],
    queryFn: () => getYearlyTrend(bookId, year),
    enabled: !!bookId && !!year,
  });
}

