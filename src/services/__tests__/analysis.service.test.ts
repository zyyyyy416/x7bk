import { getMonthlySummary, getDailyTrend, getYearlyTrend } from '@/services/analysis.service';
import { createMockSupabase } from './__mocks__/supabase-mock';

jest.mock('@/services/supabase', () => ({
  getSupabase: jest.fn(),
}));

import { getSupabase } from '@/services/supabase';

describe('analysis.service', () => {
  let mockSupabase: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    mockSupabase = createMockSupabase();
    (getSupabase as jest.Mock).mockResolvedValue(mockSupabase);
  });

  describe('getSupabase 返回 null 时', () => {
    beforeEach(() => {
      (getSupabase as jest.Mock).mockResolvedValue(null);
    });

    it('getMonthlySummary 返回 null', async () => {
      const result = await getMonthlySummary('book-1', '2026-07-01', '2026-07-31');
      expect(result).toBeNull();
    });

    it('getDailyTrend 返回空数组', async () => {
      const result = await getDailyTrend('book-1', '2026-07-01', '2026-07-07');
      expect(result).toEqual([]);
    });

    it('getYearlyTrend 返回空数组', async () => {
      const result = await getYearlyTrend('book-1', 2026);
      expect(result).toEqual([]);
    });
  });

  describe('getMonthlySummary', () => {
    // Helper: create a fresh chain with then() for await
    function makeChain(thenData: any) {
      const c = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        is: jest.fn().mockReturnThis(),
        not: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
        single: jest.fn(),
        maybeSingle: jest.fn(),
        then: (resolve: any) => resolve(thenData),
      };
      c.single.mockResolvedValue(thenData);
      c.maybeSingle.mockResolvedValue(thenData);
      return c;
    }

    it('正确汇总收入和支出', async () => {
      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return makeChain({ data: [{ amount: 5000 }], error: null });       // income
        if (callCount === 2) return makeChain({ data: [{ amount: 800 }, { amount: 200 }], error: null }); // expense
        return makeChain({ data: [{ amount: 300 }], error: null });                              // food
      });

      const result = await getMonthlySummary('book-1', '2026-07-01', '2026-07-31');

      expect(result).not.toBeNull();
      if (result) {
        expect(result.totalIncome).toBe(5000);
        expect(result.totalExpense).toBe(1000);
        expect(result.balance).toBe(4000);
        expect(result.billCount).toBe(3); // inc.length(1) + exp.length(2)
      }
    });

    it('无账单时返回零值', async () => {
      mockSupabase.from.mockReturnValue(makeChain({ data: [], error: null }));

      const result = await getMonthlySummary('book-1', '2026-07-01', '2026-07-31');

      expect(result).not.toBeNull();
      if (result) {
        expect(result.totalIncome).toBe(0);
        expect(result.totalExpense).toBe(0);
        expect(result.balance).toBe(0);
        expect(result.billCount).toBe(0);
      }
    });
  });

  describe('getDailyTrend', () => {
    function makeChain(thenData: any) {
      const c = {
        select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(), lte: jest.fn().mockReturnThis(),
        then: (resolve: any) => resolve(thenData),
      };
      return c;
    }

    it('日期范围内所有日期都有值（零值填充）', async () => {
      mockSupabase.from.mockReturnValue(makeChain({ data: [], error: null }));

      const result = await getDailyTrend('book-1', '2026-07-01', '2026-07-03');

      expect(result).toHaveLength(3); // 3 天
      expect(result.map(r => r.date)).toEqual(['2026-07-01', '2026-07-02', '2026-07-03']);
      expect(result.every(r => r.expense === 0)).toBe(true);
    });

    it('有数据的天正确合计', async () => {
      mockSupabase.from.mockReturnValue(makeChain({
        data: [
          { amount: 100, bill_date: '2026-07-01' },
          { amount: 200, bill_date: '2026-07-01' },
          { amount: 50, bill_date: '2026-07-03' },
        ],
        error: null,
      }));

      const result = await getDailyTrend('book-1', '2026-07-01', '2026-07-03');

      expect(result).toHaveLength(3);
      expect(result[0].expense).toBe(300);  // 100+200
      expect(result[1].expense).toBe(0);    // no data
      expect(result[2].expense).toBe(50);
    });
  });

  describe('getYearlyTrend', () => {
    function makeChain(thenData: any) {
      const c = {
        select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(), lte: jest.fn().mockReturnThis(),
        then: (resolve: any) => resolve(thenData),
      };
      return c;
    }

    it('返回 12 个月数据（零值填充）', async () => {
      mockSupabase.from.mockReturnValue(makeChain({ data: [], error: null }));

      const result = await getYearlyTrend('book-1', 2026);

      expect(result).toHaveLength(12);
      expect(result[0]).toEqual({ month: '1月', expense: 0 });
      expect(result[11]).toEqual({ month: '12月', expense: 0 });
    });
  });
});
