import { getBills, getBillById, createBill, updateBill, deleteBill, saveBill } from '@/services/bill.service';
import { createMockSupabase } from './__mocks__/supabase-mock';

jest.mock('@/services/supabase', () => ({
  getSupabase: jest.fn(),
}));

import { getSupabase } from '@/services/supabase';

describe('bill.service', () => {
  let mockSupabase: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    mockSupabase = createMockSupabase();
    (getSupabase as jest.Mock).mockResolvedValue(mockSupabase);
  });

  // ─── Null Supabase ─────────────────────────────────
  describe('getSupabase 返回 null 时', () => {
    beforeEach(() => {
      (getSupabase as jest.Mock).mockResolvedValue(null);
    });

    it('getBills 返回空数组', async () => {
      const result = await getBills({ bookId: 'book-1', page: 1, pageSize: 20 });
      expect(result).toEqual({ bills: [], total: 0 });
    });

    it('getBillById 返回 null', async () => {
      const result = await getBillById('bill-1');
      expect(result).toBeNull();
    });

    it('createBill 抛出错误', async () => {
      await expect(createBill({
        book_id: 'b1', user_id: 'u1', category_id: 'c1',
        amount: 100, type: 'expense', bill_date: '2026-07-17', is_shared: false,
      })).rejects.toThrow('Supabase 未配置');
    });

    it('updateBill 抛出错误', async () => {
      await expect(updateBill('b1', { amount: 200 })).rejects.toThrow('Supabase 未配置');
    });

    it('deleteBill 抛出错误', async () => {
      await expect(deleteBill('b1')).rejects.toThrow('Supabase 未配置');
    });
  });

  // ─── getBills ──────────────────────────────────────
  describe('getBills', () => {
    it('返回分页账单列表', async () => {
      const mockBills = [
        { id: 'b1', amount: 100, note: '午饭' },
        { id: 'b2', amount: 50, note: '咖啡' },
      ];

      // getBills 内部 await q（chain 本身），需要 chain 是 thenable
      (mockSupabase.chain as any).then = (resolve: any) =>
        resolve({ data: mockBills, error: null, count: 2 });

      const result = await getBills({ bookId: 'book-1', page: 1, pageSize: 20 });
      expect(result.bills).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('可选日期筛选条件被应用', async () => {
      (mockSupabase.chain as any).then = (resolve: any) =>
        resolve({ data: [], error: null, count: 0 });

      await getBills({
        bookId: 'book-1', page: 1, pageSize: 20,
        startDate: '2026-07-01', endDate: '2026-07-31',
        type: 'expense',
      });

      // 验证 .gte 和 .lte 被调用
      expect(mockSupabase.chain.gte).toHaveBeenCalledWith('bill_date', '2026-07-01');
      expect(mockSupabase.chain.lte).toHaveBeenCalledWith('bill_date', '2026-07-31');
      expect(mockSupabase.chain.eq).toHaveBeenCalledWith('type', 'expense');
    });
  });

  // ─── createBill ────────────────────────────────────
  describe('createBill', () => {
    it('成功创建账单', async () => {
      const newBill = { id: 'new-b1', amount: 100, note: '测试' };
      mockSupabase.chain.single.mockResolvedValue({ data: newBill, error: null });

      const result = await createBill({
        book_id: 'book-1', user_id: 'u1', category_id: 'cat-1',
        amount: 100, type: 'expense', bill_date: '2026-07-17', is_shared: false,
      });

      expect(result).toEqual(newBill);
      expect(mockSupabase.from).toHaveBeenCalledWith('bills');
    });

    it('数据库错误抛出异常', async () => {
      mockSupabase.chain.single.mockResolvedValue({
        data: null,
        error: { message: '违反约束' },
      });

      await expect(createBill({
        book_id: 'book-1', user_id: 'u1', category_id: 'cat-1',
        amount: 100, type: 'expense', bill_date: '2026-07-17', is_shared: false,
      })).rejects.toEqual({ message: '违反约束' });
    });
  });

  // ─── deleteBill ────────────────────────────────────
  describe('deleteBill', () => {
    it('成功删除', async () => {
      (mockSupabase.chain as any).then = (resolve: any) => resolve({ error: null });

      await expect(deleteBill('b1')).resolves.toBeUndefined();
    });
  });

  // ─── saveBill ──────────────────────────────────────
  describe('saveBill', () => {
    it('找不到分类时抛出错误', async () => {
      // saveBill 内部调用 findCategoryId，它查找分类
      // .maybeSingle() 两次都返回 null
      mockSupabase.chain.maybeSingle.mockResolvedValue({ data: null, error: null });

      await expect(saveBill({
        bookId: 'book-1', userId: 'u1',
        parentCategoryName: '不存在大类', subCategoryName: '不存在小类',
        type: 'expense', amount: 100,
      })).rejects.toThrow(/分类.*未找到/);
    });
  });
});
