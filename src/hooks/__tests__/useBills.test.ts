import { renderHook, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useBills, useCreateBill, useUpdateBill, useDeleteBill } from '@/hooks/useBills';

// Mock bill.service
jest.mock('@/services/bill.service', () => ({
  getBills: jest.fn(),
  createBill: jest.fn(),
  updateBill: jest.fn(),
  deleteBill: jest.fn(),
}));

import { getBills, createBill } from '@/services/bill.service';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useBills', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('bookId 为空时查询不执行', () => {
    const { result } = renderHook(
      () => useBills({ bookId: '', page: 1, pageSize: 20 }),
      { wrapper: createWrapper() }
    );
    expect(result.current.isLoading).toBe(false);
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('查询成功返回账单列表', async () => {
    (getBills as jest.Mock).mockResolvedValue({
      bills: [{ id: 'b1', amount: 100 }, { id: 'b2', amount: 50 }],
      total: 2,
    });

    const { result } = renderHook(
      () => useBills({ bookId: 'book-1', page: 1, pageSize: 20 }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.bills).toHaveLength(2);
    expect(result.current.data?.total).toBe(2);
  });
});

describe('useCreateBill', () => {
  it('mutation 调用 createBill 服务', async () => {
    (createBill as jest.Mock).mockResolvedValue({ id: 'new-b1' });

    const { result } = renderHook(() => useCreateBill(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync({
        book_id: 'book-1', user_id: 'u1', category_id: 'cat-1',
        amount: 100, type: 'expense' as const,
        bill_date: '2026-07-17', is_shared: false,
      });
    });

    expect(createBill).toHaveBeenCalled();
    expect(createBill.mock.calls[0][0]).toMatchObject({
      book_id: 'book-1', amount: 100, type: 'expense',
    });
  });
});

describe('useDeleteBill', () => {
  it('返回 mutation 对象', () => {
    const { result } = renderHook(() => useDeleteBill(), { wrapper: createWrapper() });
    expect(result.current.mutateAsync).toBeDefined();
    expect(result.current.isPending).toBe(false);
  });
});
