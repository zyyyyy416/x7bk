import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Book } from '@/types';
import { getMyBooks, createBook, getBookMembers, removeMember, leaveBook, joinBookByCode } from '@/services/book.service';
import { useAuthStore } from '@/stores/authStore';

/** 获取我的所有账本 */
export function useBooks() {
  const userId = useAuthStore((s) => s.user?.id);

  return useQuery({
    queryKey: ['books', userId],
    queryFn: () => getMyBooks(userId!),
    enabled: !!userId,
  });
}

/** 创建账本 */
export function useCreateBook() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);

  return useMutation({
    mutationFn: (book: Pick<Book, 'name' | 'type'>) => createBook(userId!, book),
    onSuccess: (newBook) => {
      // 直接往缓存里插入新账本，不用等 refetch
      queryClient.setQueryData<Book[]>(['books', userId], (old: Book[] | undefined) => {
        if (!old) return [newBook];
        // 避免重复
        if (old.some((b: Book) => b.id === newBook.id)) return old;
        return [...old, newBook];
      });
      // 同时标记失效，后台静默更新确保数据一致
      queryClient.invalidateQueries({ queryKey: ['books', userId] });
    },
  });
}

/** 获取账本成员 */
export function useBookMembers(bookId: string) {
  return useQuery({
    queryKey: ['bookMembers', bookId],
    queryFn: () => getBookMembers(bookId),
    enabled: !!bookId,
  });
}

/** 加入账本 */
export function useJoinBook() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);

  return useMutation({
    mutationFn: (inviteCode: string) => joinBookByCode(userId!, inviteCode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
    },
  });
}

/** 移除成员 */
export function useRemoveMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ bookId, userId: memberId }: { bookId: string; userId: string }) =>
      removeMember(bookId, memberId),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['bookMembers', vars.bookId] });
    },
  });
}

/** 退出账本 */
export function useLeaveBook() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  return useMutation({
    mutationFn: (bookId: string) => leaveBook(bookId, userId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
    },
  });
}
