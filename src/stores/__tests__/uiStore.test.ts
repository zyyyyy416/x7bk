import { useUiStore } from '@/stores/uiStore';
import type { Book } from '@/types';

const mockBook: Book = {
  id: 'book-1',
  name: '测试账本',
  cover: null,
  type: 'personal',
  creator_id: 'u1',
  created_at: '2026-01-01',
};

const initialState = {
  activeBook: null,
  isAddBillOpen: false,
  timeFilter: 'month',
  customStartDate: null,
  customEndDate: null,
};

describe('uiStore', () => {
  beforeEach(() => {
    useUiStore.setState({ ...initialState });
  });

  it('初始状态', () => {
    const s = useUiStore.getState();
    expect(s.activeBook).toBeNull();
    expect(s.isAddBillOpen).toBe(false);
    expect(s.timeFilter).toBe('month');
    expect(s.customStartDate).toBeNull();
    expect(s.customEndDate).toBeNull();
  });

  describe('setActiveBook', () => {
    it('设置当前账本', () => {
      useUiStore.getState().setActiveBook(mockBook);
      expect(useUiStore.getState().activeBook).toEqual(mockBook);
    });

    it('清除当前账本', () => {
      useUiStore.getState().setActiveBook(mockBook);
      useUiStore.getState().setActiveBook(null);
      expect(useUiStore.getState().activeBook).toBeNull();
    });
  });

  describe('setAddBillOpen', () => {
    it('打开记账弹窗', () => {
      useUiStore.getState().setAddBillOpen(true);
      expect(useUiStore.getState().isAddBillOpen).toBe(true);
    });

    it('关闭记账弹窗', () => {
      useUiStore.getState().setAddBillOpen(true);
      useUiStore.getState().setAddBillOpen(false);
      expect(useUiStore.getState().isAddBillOpen).toBe(false);
    });
  });

  describe('setTimeFilter', () => {
    it('切换为周视图', () => {
      useUiStore.getState().setTimeFilter('week');
      expect(useUiStore.getState().timeFilter).toBe('week');
    });

    it('切换为季度视图', () => {
      useUiStore.getState().setTimeFilter('3month');
      expect(useUiStore.getState().timeFilter).toBe('3month');
    });

    it('切换为自定义', () => {
      useUiStore.getState().setTimeFilter('custom');
      expect(useUiStore.getState().timeFilter).toBe('custom');
    });
  });

  describe('setCustomDateRange', () => {
    it('设置自定义日期范围', () => {
      useUiStore.getState().setCustomDateRange('2026-01-01', '2026-01-31');
      const s = useUiStore.getState();
      expect(s.customStartDate).toBe('2026-01-01');
      expect(s.customEndDate).toBe('2026-01-31');
    });

    it('清除日期范围', () => {
      useUiStore.getState().setCustomDateRange('2026-01-01', '2026-01-31');
      useUiStore.getState().setCustomDateRange(null, null);
      const s = useUiStore.getState();
      expect(s.customStartDate).toBeNull();
      expect(s.customEndDate).toBeNull();
    });
  });
});
