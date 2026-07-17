import { useCategoryStore } from '@/stores/categoryStore';

const initialState = {
  hiddenCategories: [],
  customCategories: [],
};

describe('categoryStore', () => {
  beforeEach(() => {
    useCategoryStore.setState({ ...initialState });
  });

  it('初始状态', () => {
    const s = useCategoryStore.getState();
    expect(s.hiddenCategories).toEqual([]);
    expect(s.customCategories).toEqual([]);
  });

  describe('toggleHidden', () => {
    it('添加后 isHidden 返回 true', () => {
      useCategoryStore.getState().toggleHidden('三餐正餐');
      expect(useCategoryStore.getState().isHidden('三餐正餐')).toBe(true);
      expect(useCategoryStore.getState().hiddenCategories).toContain('三餐正餐');
    });

    it('再次调用移除', () => {
      useCategoryStore.getState().toggleHidden('三餐正餐');
      expect(useCategoryStore.getState().isHidden('三餐正餐')).toBe(true);
      useCategoryStore.getState().toggleHidden('三餐正餐');
      expect(useCategoryStore.getState().isHidden('三餐正餐')).toBe(false);
    });

    it('不存在时返回 false', () => {
      expect(useCategoryStore.getState().isHidden('不存在的分类')).toBe(false);
    });

    it('多个分类互不干扰', () => {
      useCategoryStore.getState().toggleHidden('三餐正餐');
      useCategoryStore.getState().toggleHidden('外卖外带');
      expect(useCategoryStore.getState().isHidden('三餐正餐')).toBe(true);
      expect(useCategoryStore.getState().isHidden('外卖外带')).toBe(true);
      // 只移除一个
      useCategoryStore.getState().toggleHidden('三餐正餐');
      expect(useCategoryStore.getState().isHidden('三餐正餐')).toBe(false);
      expect(useCategoryStore.getState().isHidden('外卖外带')).toBe(true);
    });
  });

  describe('customCategories', () => {
    const cat = { id: 'c1', parentName: '餐饮', name: '测试分类', icon: 'test' };

    it('addCustom 添加自定义分类', () => {
      useCategoryStore.getState().addCustom(cat);
      expect(useCategoryStore.getState().customCategories).toHaveLength(1);
      expect(useCategoryStore.getState().customCategories[0]).toEqual(cat);
    });

    it('removeCustom 移除', () => {
      useCategoryStore.getState().addCustom(cat);
      useCategoryStore.getState().removeCustom('c1');
      expect(useCategoryStore.getState().customCategories).toHaveLength(0);
    });

    it('removeCustom 不存在的 id 不影响', () => {
      useCategoryStore.getState().addCustom(cat);
      useCategoryStore.getState().removeCustom('nonexistent');
      expect(useCategoryStore.getState().customCategories).toHaveLength(1);
    });

    it('setCustomCategories 替换整个数组', () => {
      const cats = [
        { id: 'c1', parentName: '餐饮', name: '测试1', icon: 'test1' },
        { id: 'c2', parentName: '购物', name: '测试2', icon: 'test2' },
      ];
      useCategoryStore.getState().setCustomCategories(cats);
      expect(useCategoryStore.getState().customCategories).toEqual(cats);
      expect(useCategoryStore.getState().customCategories).toHaveLength(2);
    });
  });
});
