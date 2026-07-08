import { create } from 'zustand';

/** 用户自定义的二级分类 */
export interface CustomCategory {
  id: string;
  parentName: string; // 所属一级分类名
  name: string;
  icon: string;
}

interface CategoryState {
  hiddenCategories: string[];
  customCategories: CustomCategory[];

  toggleHidden: (categoryName: string) => void;
  addCustom: (cat: CustomCategory) => void;
  removeCustom: (id: string) => void;
  setCustomCategories: (cats: CustomCategory[]) => void;
  isHidden: (categoryName: string) => boolean;
}

export const useCategoryStore = create<CategoryState>((set, get) => ({
  hiddenCategories: [],
  customCategories: [],

  toggleHidden: (name) =>
    set((s) => {
      const hidden = s.hiddenCategories.includes(name)
        ? s.hiddenCategories.filter((n) => n !== name)
        : [...s.hiddenCategories, name];
      return { hiddenCategories: hidden };
    }),

  addCustom: (cat) =>
    set((s) => ({
      customCategories: [...s.customCategories, cat],
    })),

  removeCustom: (id) =>
    set((s) => ({
      customCategories: s.customCategories.filter((c) => c.id !== id),
    })),

  setCustomCategories: (cats) => set({ customCategories: cats }),

  isHidden: (name) => get().hiddenCategories.includes(name),
}));
