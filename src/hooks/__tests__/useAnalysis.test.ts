import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  useMonthlySummary, useAllBooksSummary, useCategoryBreakdown,
  useMonthlyTrend, useEngelTrend, useDailyTrend, useYearlyTrend,
} from '@/hooks/useAnalysis';

// Mock analysis.service
jest.mock('@/services/analysis.service', () => ({
  getMonthlySummary: jest.fn(),
  getAllBooksSummary: jest.fn(),
  getCategoryBreakdown: jest.fn(),
  getMonthlyTrend: jest.fn(),
  getEngelTrend: jest.fn(),
  getDailyTrend: jest.fn(),
  getYearlyTrend: jest.fn(),
}));

import {
  getMonthlySummary, getAllBooksSummary, getCategoryBreakdown,
  getMonthlyTrend, getEngelTrend, getDailyTrend, getYearlyTrend,
} from '@/services/analysis.service';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useMonthlySummary', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('参数不全时查询不执行', () => {
    const { result } = renderHook(
      () => useMonthlySummary('', '', ''),
      { wrapper: createWrapper() }
    );
    expect(result.current.isLoading).toBe(false);
  });

  it('查询成功返回汇总', async () => {
    (getMonthlySummary as jest.Mock).mockResolvedValue({
      totalIncome: 5000, totalExpense: 3000, balance: 2000,
      engelCoefficient: 25, engelLevel: { label: '富足小康级', stars: 4 },
      billCount: 10,
    });

    const { result } = renderHook(
      () => useMonthlySummary('book-1', '2026-07-01', '2026-07-31'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.totalIncome).toBe(5000);
    expect(result.current.data?.totalExpense).toBe(3000);
  });
});

describe('useAllBooksSummary', () => {
  it('bookIds 为空时查询不执行', () => {
    const { result } = renderHook(
      () => useAllBooksSummary([], '2026-07-01', '2026-07-31'),
      { wrapper: createWrapper() }
    );
    expect(result.current.isLoading).toBe(false);
  });

  it('查询成功', async () => {
    (getAllBooksSummary as jest.Mock).mockResolvedValue({
      totalIncome: 8000, totalExpense: 4000, balance: 4000,
      engelCoefficient: 20, billCount: 20,
    });

    const { result } = renderHook(
      () => useAllBooksSummary(['book-1', 'book-2'], '2026-07-01', '2026-07-31'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.totalIncome).toBe(8000);
  });
});

describe('useCategoryBreakdown', () => {
  it('参数不全时查询不执行', () => {
    const { result } = renderHook(
      () => useCategoryBreakdown('', '', ''),
      { wrapper: createWrapper() }
    );
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('查询成功返回分类分布', async () => {
    (getCategoryBreakdown as jest.Mock).mockResolvedValue([
      { id: 'cat-1', name: '餐饮饮食', icon: 'food', total: 1500 },
      { id: 'cat-2', name: '交通出行', icon: 'transport', total: 500 },
    ]);

    const { result } = renderHook(
      () => useCategoryBreakdown('book-1', '2026-07-01', '2026-07-31'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(2);
  });
});

describe('useMonthlyTrend', () => {
  it('默认 months=6', async () => {
    (getMonthlyTrend as jest.Mock).mockResolvedValue([
      { month: '2026-02', expense: 1000, income: 2000 },
    ]);

    const { result } = renderHook(
      () => useMonthlyTrend('book-1'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(getMonthlyTrend).toHaveBeenCalledWith('book-1', 6);
  });
});

describe('useEngelTrend', () => {
  it('查询成功返回恩格尔趋势', async () => {
    (getEngelTrend as jest.Mock).mockResolvedValue([
      { month: '2026-07', coefficient: 25 },
    ]);

    const { result } = renderHook(
      () => useEngelTrend('book-1'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
  });
});

describe('useDailyTrend', () => {
  it('查询成功返回日趋势', async () => {
    (getDailyTrend as jest.Mock).mockResolvedValue([
      { date: '2026-07-01', expense: 100 },
      { date: '2026-07-02', expense: 200 },
    ]);

    const { result } = renderHook(
      () => useDailyTrend('book-1', '2026-07-01', '2026-07-07'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(2);
  });
});

describe('useYearlyTrend', () => {
  it('查询成功返回 12 个月', async () => {
    (getYearlyTrend as jest.Mock).mockResolvedValue(
      Array.from({ length: 12 }, (_, i) => ({ month: `${i + 1}月`, expense: 500 }))
    );

    const { result } = renderHook(
      () => useYearlyTrend('book-1', 2026),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(12);
  });
});
