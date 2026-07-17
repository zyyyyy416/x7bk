import { getMyBooks, createBook, joinBookByCode, getBookMembers, removeMember, leaveBook, deleteBook } from '@/services/book.service';
import { createMockSupabase } from './__mocks__/supabase-mock';

jest.mock('@/services/supabase', () => ({
  getSupabase: jest.fn(),
}));

import { getSupabase } from '@/services/supabase';

describe('book.service', () => {
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

    it('getMyBooks 返回空数组', async () => {
      expect(await getMyBooks('u1')).toEqual([]);
    });

    it('createBook 抛出错误', async () => {
      await expect(createBook('u1', { name: '测试', type: 'personal' }))
        .rejects.toThrow('Supabase 未配置');
    });

    it('joinBookByCode 抛出错误', async () => {
      await expect(joinBookByCode('u1', 'code')).rejects.toThrow('Supabase 未配置');
    });

    it('getBookMembers 返回空数组', async () => {
      expect(await getBookMembers('book-1')).toEqual([]);
    });

    it('removeMember 抛出错误', async () => {
      await expect(removeMember('b1', 'u1')).rejects.toThrow('Supabase 未配置');
    });

    it('deleteBook 抛出错误', async () => {
      await expect(deleteBook('b1', 'u1')).rejects.toThrow('Supabase 未配置');
    });
  });

  // ─── getMyBooks ────────────────────────────────────
  describe('getMyBooks', () => {
    it('返回创建的 + 加入的账本（去重）', async () => {
      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        const c = {
          select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(),
          in: jest.fn().mockReturnThis(), order: jest.fn().mockReturnThis(),
          then: (resolve: any) => {
            if (callCount === 1) return resolve({ data: [{ id: 'book-1' }], error: null });
            if (callCount === 2) return resolve({ data: [{ book_id: 'book-1' }, { book_id: 'book-2' }], error: null });
            return resolve({ data: [{ id: 'book-1', name: 'A' }, { id: 'book-2', name: 'B' }], error: null });
          },
        };
        return c;
      });

      const result = await getMyBooks('u1');
      expect(result).toHaveLength(2);
    });

    it('无账本返回空', async () => {
      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        return {
          select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          then: (resolve: any) => resolve({ data: [], error: null }),
        };
      });

      expect(await getMyBooks('u1')).toEqual([]);
    });
  });

  // ─── createBook ────────────────────────────────────
  describe('createBook', () => {
    it('创建个人账本成功', async () => {
      mockSupabase.rpc.mockResolvedValue({ data: true, error: null });
      mockSupabase.chain.single.mockResolvedValue({
        data: { id: 'new-book', name: '测试', type: 'personal', creator_id: 'u1', cover: null, created_at: '2026-01-01' },
        error: null,
      });

      const result = await createBook('u1', { name: '测试', type: 'personal' });
      expect(result.id).toBe('new-book');
    });

    it('RLS 错误映射为友好提示', async () => {
      mockSupabase.rpc.mockResolvedValue({ data: null, error: { message: 'rpc error' } });
      mockSupabase.chain.single.mockResolvedValue({
        data: null,
        error: { message: 'permission denied for table books', code: '42501' },
      });

      await expect(createBook('u1', { name: '测试', type: 'personal' }))
        .rejects.toThrow('数据库权限不足');
    });
  });

  // ─── joinBookByCode ────────────────────────────────
  describe('joinBookByCode', () => {
    it('邀请码无效', async () => {
      mockSupabase.chain.single.mockResolvedValue({ data: null, error: null });
      await expect(joinBookByCode('u1', 'bad-code')).rejects.toThrow('邀请码无效');
    });

    it('已是成员', async () => {
      // 第一次 single: find book (success)
      // 第二次 maybeSingle: check existing member
      mockSupabase.chain.single.mockResolvedValueOnce({ data: { id: 'b1', name: '测试' }, error: null });
      mockSupabase.chain.maybeSingle.mockResolvedValueOnce({ data: { id: 'm1' }, error: null });

      await expect(joinBookByCode('u1', 'b1')).rejects.toThrow('已是该账本成员');
    });
  });

  // ─── getBookMembers ────────────────────────────────
  describe('getBookMembers', () => {
    it('返回成员列表', async () => {
      const c = {
        select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        then: (resolve: any) => resolve({ data: [
          { id: 'm1', user: { id: 'u1', nickname: 'A', avatar_url: null } },
        ], error: null }),
      };
      mockSupabase.from.mockReturnValue(c);

      const result = await getBookMembers('book-1');
      expect(result).toHaveLength(1);
      expect(result[0].user.nickname).toBe('A');
    });
  });

  // ─── removeMember / leaveBook ──────────────────────
  describe('removeMember', () => {
    it('成功移除', async () => {
      const c = {
        delete: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(),
        then: (resolve: any) => resolve({ error: null }),
      };
      mockSupabase.from.mockReturnValue(c);

      await expect(removeMember('b1', 'u2')).resolves.toBeUndefined();
    });
  });

  // ─── leaveBook ─────────────────────────────────────
  describe('leaveBook', () => {
    it('等同于 removeMember', async () => {
      const c = {
        delete: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(),
        then: (resolve: any) => resolve({ error: null }),
      };
      mockSupabase.from.mockReturnValue(c);

      await expect(leaveBook('b1', 'u1')).resolves.toBeUndefined();
    });
  });

  // ─── deleteBook ────────────────────────────────────
  describe('deleteBook', () => {
    it('创建者成功删除', async () => {
      const c = {
        delete: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(),
        then: (resolve: any) => resolve({ error: null }),
      };
      mockSupabase.from.mockReturnValue(c);

      await expect(deleteBook('b1', 'u1')).resolves.toBeUndefined();
    });
  });
});
