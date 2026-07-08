import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
} from 'react-native';
import {
  Text,
  Searchbar,
  Chip,
  Surface,
  IconButton,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius } from '@/theme';
import CategoryItem from '@/components/ui/CategoryItem';
import type { CategoryItemData } from '@/components/ui/CategoryItem';
import {
  EXPENSE_CATEGORIES,
  EXPENSE_SUB_CATEGORIES,
  INCOME_CATEGORIES,
  INCOME_SUB_CATEGORIES,
} from '@/constants/categories';
import { matchesPinyinSearch } from '@/utils/pinyin';
import { useCategoryStore } from '@/stores/categoryStore';
import { useAuthStore } from '@/stores/authStore';
import { getSupabase } from '@/services/supabase';

// ─── 时间段智能排序 ────────────────────────────────────

/** 根据当前时间给一级分类加权排序 */
function getTimeBasedBoost(categoryName: string): number {
  const hour = new Date().getHours();

  // 早餐时段 (6-9): 餐饮置顶
  if (hour >= 6 && hour < 9) {
    if (categoryName === '餐饮饮食') return 10;
    if (categoryName === '交通出行') return 5;
  }
  // 午餐时段 (11-14): 餐饮、外卖置顶
  if (hour >= 11 && hour < 14) {
    if (categoryName === '餐饮饮食') return 10;
  }
  // 晚餐时段 (17-21): 餐饮、娱乐置顶
  if (hour >= 17 && hour < 21) {
    if (categoryName === '餐饮饮食') return 10;
    if (categoryName === '娱乐休闲') return 5;
  }
  // 深夜 (21-6): 外卖、小吃
  if (hour >= 21 || hour < 6) {
    if (categoryName === '餐饮饮食') return 8;
  }
  // 月末: 住房居家置顶 (房租)
  const day = new Date().getDate();
  if (day >= 28) {
    if (categoryName === '住房居家') return 3;
  }

  return 0;
}

// ─── 将预设分类转换为组件所需的数据格式 ─────────────────

interface ParentCategory {
  id: string;
  name: string;
  icon: string;
  engelEligible: boolean;
  type: 'expense' | 'income';
}

interface SubCategory {
  id: string;
  parentId: string;
  name: string;
  type: 'expense' | 'income';
  engelEligible: boolean;
}

function buildCategoryTree(customCats: { id: string; parentName: string; name: string; icon: string }[] = []): {
  expenseParents: ParentCategory[];
  incomeParents: ParentCategory[];
  subCategories: Record<string, SubCategory[]>;
} {
  const expenseParents: ParentCategory[] = EXPENSE_CATEGORIES.map((c, i) => ({
    id: `exp_${i}`,
    name: c.name,
    icon: c.icon,
    engelEligible: c.engel_eligible,
    type: 'expense',
  }));

  const incomeParents: ParentCategory[] = INCOME_CATEGORIES.map((c, i) => ({
    id: `inc_${i}`,
    name: c.name,
    icon: c.icon,
    engelEligible: false,
    type: 'income',
  }));

  const subCategories: Record<string, SubCategory[]> = {};

  expenseParents.forEach((parent) => {
    const subs = EXPENSE_SUB_CATEGORIES[parent.name] ?? [];
    // 合并预设 + 自定义
    const customSubs = customCats
      .filter((c) => c.parentName === parent.name)
      .map((c, idx) => ({
        id: c.id, // 用真实 UUID
        parentId: parent.id,
        name: c.name,
        type: 'expense' as const,
        engelEligible: parent.engelEligible,
      }));
    subCategories[parent.id] = [
      ...subs.map((name, idx) => ({
        id: `${parent.id}_preset_${idx}`,
        parentId: parent.id,
        name,
        type: 'expense' as const,
        engelEligible: parent.engelEligible,
      })),
      ...customSubs,
    ];
  });

  incomeParents.forEach((parent) => {
    const subs = INCOME_SUB_CATEGORIES[parent.name] ?? [];
    const customSubs = customCats
      .filter((c) => c.parentName === parent.name)
      .map((c, idx) => ({
        id: c.id,
        parentId: parent.id,
        name: c.name,
        type: 'income' as const,
        engelEligible: false,
      }));
    subCategories[parent.id] = [
      ...subs.map((name, idx) => ({
        id: `${parent.id}_preset_${idx}`,
        parentId: parent.id,
        name,
        type: 'income' as const,
        engelEligible: false,
      })),
      ...customSubs,
    ];
  });

  return { expenseParents, incomeParents, subCategories };
}

// ─── 组件 Props ────────────────────────────────────────

export interface SelectedCategory {
  parentName: string;
  parentIcon: string;
  subName: string;
  type: 'expense' | 'income';
  engelEligible: boolean;
}

interface CategoryPickerProps {
  visible: boolean;
  onSelect: (category: SelectedCategory) => void;
  onClose: () => void;
  defaultType?: 'expense' | 'income';
}

// ─── 组件 ──────────────────────────────────────────────

export default function CategoryPicker({
  visible,
  onSelect,
  onClose,
  defaultType = 'expense',
}: CategoryPickerProps) {
  const [activeTab, setActiveTab] = useState<'expense' | 'income'>(defaultType);
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const customCategories = useCategoryStore((s) => s.customCategories);
  const setCustomCategories = useCategoryStore((s) => s.setCustomCategories);
  const userId = useAuthStore((s) => s.user?.id);

  // 打开 picker 时从 DB 加载自定义分类
  useEffect(() => {
    if (!visible || !userId) return;
    (async () => {
      const s = await getSupabase();
      if (!s) return;
      const { data } = await s.from('categories')
        .select('id, name, icon, parent_id')
        .eq('user_id', userId)
        .eq('is_default', false)
        .not('parent_id', 'is', null);
      if (!data) return;
      // 查父分类名
      const parentIds = [...new Set((data as any[]).map((r: any) => r.parent_id))];
      const { data: parents } = await s.from('categories')
        .select('id, name')
        .in('id', parentIds);
      const parentMap = new Map((parents ?? []).map((p: any) => [p.id, p.name]));
      setCustomCategories((data as any[]).map((row: any) => ({
        id: row.id,
        name: row.name,
        icon: row.icon,
        parentName: parentMap.get(row.parent_id) ?? '',
      })));
    })();
  }, [visible, userId]);

  const { expenseParents, incomeParents, subCategories } = useMemo(
    () => buildCategoryTree(customCategories),
    [customCategories]
  );

  const parents = activeTab === 'expense' ? expenseParents : incomeParents;
  const selectedParent = parents.find((p) => p.id === selectedParentId);
  const currentSubs = selectedParentId ? (subCategories[selectedParentId] ?? []) : [];

  // 搜索过滤 + 时间智能排序
  const filteredParents = useMemo(() => {
    let result = [...parents];

    // 拼音/中文搜索
    if (searchQuery.trim()) {
      result = result.filter(
        (p) =>
          matchesPinyinSearch(p.name, searchQuery) ||
          (subCategories[p.id] ?? []).some((s) => matchesPinyinSearch(s.name, searchQuery))
      );
    } else {
      // 无搜索时按时间段智能排序
      result.sort((a, b) => {
        const boostA = getTimeBasedBoost(a.name);
        const boostB = getTimeBasedBoost(b.name);
        if (boostA !== boostB) return boostB - boostA;
        // 按历史频率: 餐饮 > 交通 > 购物 > 娱乐 > 住房 > 日常...
        return 0; // 保持原顺序
      });
    }

    return result;
  }, [parents, searchQuery, subCategories]);

  const handleSelectParent = useCallback((parentId: string) => {
    setSelectedParentId(parentId);
  }, []);

  const handleSelectSub = useCallback(
    (sub: SubCategory) => {
      if (!selectedParent) return;
      onSelect({
        parentName: selectedParent.name,
        parentIcon: selectedParent.icon,
        subName: sub.name,
        type: activeTab,
        engelEligible: sub.engelEligible,
      });
      // 重置状态
      setSelectedParentId(null);
      setSearchQuery('');
    },
    [selectedParent, activeTab, onSelect]
  );

  const handleBack = useCallback(() => {
    setSelectedParentId(null);
    setSearchQuery('');
  }, []);

  const handleTabChange = useCallback((tab: 'expense' | 'income') => {
    setActiveTab(tab);
    setSelectedParentId(null);
    setSearchQuery('');
  }, []);

  const handleClose = useCallback(() => {
    setSelectedParentId(null);
    setSearchQuery('');
    onClose();
  }, [onClose]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <Surface style={styles.container}>
        {/* 头部 */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {selectedParentId ? (
              <IconButton icon="arrow-left" size={24} onPress={handleBack} />
            ) : null}
            <Text style={styles.title}>
              {selectedParent ? selectedParent.name : '选择分类'}
            </Text>
          </View>
          <IconButton icon="close" size={24} onPress={handleClose} />
        </View>

        {/* 支出/收入 Tab */}
        {!selectedParentId && (
          <View style={styles.tabRow}>
            <Chip
              selected={activeTab === 'expense'}
              onPress={() => handleTabChange('expense')}
              style={[styles.tab, activeTab === 'expense' && styles.tabExpense]}
              showSelectedOverlay
            >
              支出
            </Chip>
            <Chip
              selected={activeTab === 'income'}
              onPress={() => handleTabChange('income')}
              style={[styles.tab, activeTab === 'income' && styles.tabIncome]}
              showSelectedOverlay
            >
              收入
            </Chip>
          </View>
        )}

        {/* 搜索 */}
        {!selectedParentId && (
          <Searchbar
            placeholder="搜索分类..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchBar}
            inputStyle={styles.searchInput}
          />
        )}

        {/* 内容 */}
        <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
          {/* 一级分类列表 */}
          {!selectedParentId && (
            <View style={styles.parentGrid}>
              {filteredParents.map((parent) => (
                <Pressable
                  key={parent.id}
                  style={({ pressed }) => [
                    styles.parentItem,
                    pressed && styles.parentPressed,
                  ]}
                  onPress={() => handleSelectParent(parent.id)}
                >
                  <CategoryItem
                    item={{ id: parent.id, name: parent.name, icon: parent.icon }}
                    showChevron
                  />
                </Pressable>
              ))}
            </View>
          )}

          {/* 二级分类列表 */}
          {selectedParentId && selectedParent && (
            <View style={styles.subList}>
              <Text style={styles.subSectionTitle}>
                选择"{selectedParent.name}"下的具体分类
              </Text>
              {currentSubs.map((sub) => (
                <Pressable
                  key={sub.id}
                  style={({ pressed }) => [
                    styles.subItem,
                    pressed && styles.parentPressed,
                  ]}
                  onPress={() => handleSelectSub(sub)}
                >
                  <CategoryItem
                    item={{ id: sub.id, name: sub.name, icon: selectedParent.icon }}
                    trailing={
                      sub.engelEligible ? (
                        <MaterialCommunityIcons
                          name="food-fork-drink"
                          size={14}
                          color={Colors.primary}
                        />
                      ) : null
                    }
                  />
                </Pressable>
              ))}
            </View>
          )}
        </ScrollView>
      </Surface>
    </Modal>
  );
}

// ─── 样式 ──────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.xl,
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: '600',
    color: Colors.text,
    marginLeft: Spacing.sm,
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  tab: {
    borderRadius: 20,
  },
  tabExpense: {
    backgroundColor: Colors.expense + '18',
  },
  tabIncome: {
    backgroundColor: Colors.income + '18',
  },
  searchBar: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    elevation: 0,
  },
  searchInput: {
    fontSize: FontSize.md,
    minHeight: 0,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.md,
  },
  parentGrid: {
    gap: Spacing.xs,
  },
  parentItem: {
    borderRadius: BorderRadius.md,
  },
  parentPressed: {
    backgroundColor: Colors.border + '60',
  },
  subList: {
    gap: Spacing.xs,
  },
  subItem: {
    borderRadius: BorderRadius.md,
  },
  subSectionTitle: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
});
