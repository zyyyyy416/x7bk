import { create } from 'zustand';
import type { Book } from '@/types';

interface UiState {
  /** 当前选中的账本 */
  activeBook: Book | null;
  /** 记账弹窗可见 */
  isAddBillOpen: boolean;
  /** 时间筛选: 'week' | 'month' | '3month' | 'year' | 'custom' */
  timeFilter: string;
  /** 自定义开始日期 */
  customStartDate: string | null;
  /** 自定义结束日期 */
  customEndDate: string | null;

  setActiveBook: (book: Book | null) => void;
  setAddBillOpen: (open: boolean) => void;
  setTimeFilter: (filter: string) => void;
  setCustomDateRange: (start: string | null, end: string | null) => void;
}

export const useUiStore = create<UiState>((set) => ({
  activeBook: null,
  isAddBillOpen: false,
  timeFilter: 'month',
  customStartDate: null,
  customEndDate: null,

  setActiveBook: (book) => set({ activeBook: book }),
  setAddBillOpen: (open) => set({ isAddBillOpen: open }),
  setTimeFilter: (filter) => set({ timeFilter: filter }),
  setCustomDateRange: (start, end) => set({ customStartDate: start, customEndDate: end }),
}));
