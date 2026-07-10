import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { BillWithDetails, BillFilter, PaginationParams } from '@/types';
import { getBills, createBill, updateBill, deleteBill } from '@/services/bill.service';

/** 获取账单列表 */
export function useBills(filter: BillFilter & PaginationParams) {
  return useQuery({
    queryKey: ['bills', filter],
    queryFn: () => getBills(filter),
    enabled: !!filter.bookId,
  });
}

/** 新增账单 */
export function useCreateBill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createBill,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['bills', { bookId: variables.book_id }] });
    },
  });
}

/** 更新账单 */
export function useUpdateBill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Parameters<typeof updateBill>[1] }) =>
      updateBill(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      queryClient.invalidateQueries({ queryKey: ['dailyTrend'] });
      queryClient.invalidateQueries({ queryKey: ['yearlyTrend'] });
      queryClient.invalidateQueries({ queryKey: ['categoryBreakdown'] });
      queryClient.invalidateQueries({ queryKey: ['allBooksCategoryBreakdown'] });
      queryClient.invalidateQueries({ queryKey: ['monthlySummary'] });
      queryClient.invalidateQueries({ queryKey: ['allBooksSummary'] });
    },
  });
}

/** 删除账单 */
export function useDeleteBill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteBill,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      queryClient.invalidateQueries({ queryKey: ['dailyTrend'] });
      queryClient.invalidateQueries({ queryKey: ['yearlyTrend'] });
      queryClient.invalidateQueries({ queryKey: ['categoryBreakdown'] });
      queryClient.invalidateQueries({ queryKey: ['allBooksCategoryBreakdown'] });
      queryClient.invalidateQueries({ queryKey: ['monthlySummary'] });
      queryClient.invalidateQueries({ queryKey: ['allBooksSummary'] });
    },
  });
}
