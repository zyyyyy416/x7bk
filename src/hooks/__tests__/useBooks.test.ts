import { renderHook, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useBooks, useCreateBook, useBookMembers, useJoinBook, useLeaveBook, useDeleteBook } from '@/hooks/useBooks';

// Mock book.service
jest.mock('@/services/book.service', () => ({
  getMyBooks: jest.fn(),
  createBook: jest.fn(),
  getBookMembers: jest.fn(),
  joinBookByCode: jest.fn(),
  leaveBook: jest.fn(),
  deleteBook: jest.fn(),
}));

import { getMyBooks, createBook, getBookMembers, joinBookByCode, leaveBook, deleteBook } from '@/services/book.service';

// Mock authStore with a userId
jest.mock('@/stores/authStore', () => ({
  useAuthStore: jest.fn((selector?: any) => {
    if (typeof selector === 'function') {
      return selector({ user: { id: 'test-user-1' } });
    }
    return { user: { id: 'test-user-1' } };
  }),
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useBooks', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('查询成功返回账本列表', async () => {
    (getMyBooks as jest.Mock).mockResolvedValue([
      { id: 'book-1', name: '日常账本', type: 'personal' },
      { id: 'book-2', name: '旅行账本', type: 'shared' },
    ]);

    const { result } = renderHook(() => useBooks(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(2);
  });
});

describe('useCreateBook', () => {
  it('mutation 调用 createBook 服务', async () => {
    (createBook as jest.Mock).mockResolvedValue({
      id: 'new-book', name: '测试', type: 'personal', creator_id: 'test-user-1',
    });

    const { result } = renderHook(() => useCreateBook(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync({ name: '测试', type: 'personal' });
    });

    expect(createBook).toHaveBeenCalledWith('test-user-1', { name: '测试', type: 'personal' });
  });
});

describe('useBookMembers', () => {
  it('bookId 为空时查询不执行', () => {
    const { result } = renderHook(
      () => useBookMembers(''),
      { wrapper: createWrapper() }
    );
    expect(result.current.isLoading).toBe(false);
  });

  it('查询成功返回成员列表', async () => {
    (getBookMembers as jest.Mock).mockResolvedValue([
      { id: 'm1', user: { id: 'u1', nickname: '成员A', avatar_url: null } },
    ]);

    const { result } = renderHook(
      () => useBookMembers('book-1'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
  });
});

describe('useJoinBook', () => {
  it('mutation 调用 joinBookByCode', async () => {
    (joinBookByCode as jest.Mock).mockResolvedValue({ id: 'm1', book_id: 'b1', role: 'member' });

    const { result } = renderHook(() => useJoinBook(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync('invite-code-123');
    });

    expect(joinBookByCode).toHaveBeenCalledWith('test-user-1', 'invite-code-123');
  });
});

describe('useLeaveBook', () => {
  it('mutation 调用 leaveBook', async () => {
    (leaveBook as jest.Mock).mockResolvedValue(undefined);

    const { result } = renderHook(() => useLeaveBook(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync('book-1');
    });

    expect(leaveBook).toHaveBeenCalledWith('book-1', 'test-user-1');
  });
});

describe('useDeleteBook', () => {
  it('mutation 调用 deleteBook', async () => {
    (deleteBook as jest.Mock).mockResolvedValue(undefined);

    const { result } = renderHook(() => useDeleteBook(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync('book-1');
    });

    expect(deleteBook).toHaveBeenCalledWith('book-1', 'test-user-1');
  });
});
