import { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import {
  Text,
  Card,
  List,
  Switch,
  FAB,
  TextInput,
  Button,
  Dialog,
  Portal,
  Snackbar,
  IconButton,
  Divider,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius } from '@/theme';
import {
  EXPENSE_CATEGORIES,
  EXPENSE_SUB_CATEGORIES,
  INCOME_CATEGORIES,
  INCOME_SUB_CATEGORIES,
} from '@/constants/categories';
import { useCategoryStore } from '@/stores/categoryStore';
import type { CustomCategory } from '@/stores/categoryStore';
import CategoryItem from '@/components/ui/CategoryItem';
import { getSupabase } from '@/services/supabase';
import { useAuthStore } from '@/stores/authStore';

export default function CategoryManageScreen() {
  const { hiddenCategories, customCategories, toggleHidden, addCustom, removeCustom, setCustomCategories } =
    useCategoryStore();
  const userId = useAuthStore((s) => s.user?.id);

  // 页面加载时从 DB 同步自定义分类到 store
  useEffect(() => {
    if (!userId) return;
    (async () => {
      const s = await getSupabase();
      if (!s) return;
      // 查询自定义分类
      const { data } = await s.from('categories')
        .select('id, name, icon, parent_id')
        .eq('user_id', userId)
        .eq('is_default', false)
        .not('parent_id', 'is', null);
      if (!data) return;
      // 查所有父分类名
      const parentIds = [...new Set((data as any[]).map((r: any) => r.parent_id))];
      const { data: parents } = await s.from('categories')
        .select('id, name')
        .in('id', parentIds);
      const parentMap = new Map((parents ?? []).map((p: any) => [p.id, p.name]));
      const cats: CustomCategory[] = (data as any[]).map((row: any) => ({
        id: row.id,
        name: row.name,
        icon: row.icon,
        parentName: parentMap.get(row.parent_id) ?? '',
      }));
      setCustomCategories(cats);
    })();
  }, [userId]);

  const [dialogVisible, setDialogVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [selectedParent, setSelectedParent] = useState<string>('');
  const [newType, setNewType] = useState<'expense' | 'income'>('expense');
  const [snackbar, setSnackbar] = useState('');
  const [saving, setSaving] = useState(false);

  const handleAddCustom = useCallback(async () => {
    if (!newName.trim()) {
      setSnackbar('请输入分类名称');
      return;
    }
    if (!selectedParent) {
      setSnackbar('请选择所属一级分类');
      return;
    }

    setSaving(true);
    try {
      // 找到父分类
      const parent = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES].find(
        (c) => c.name === selectedParent
      );

      // 写入 Supabase
      const s = await getSupabase();
      if (!s) throw new Error('Supabase 未配置');

      // 先查父分类在 DB 中的真实 ID
      const { data: parentRow } = await s.from('categories')
        .select('id')
        .eq('user_id', userId ?? '')
        .eq('name', selectedParent)
        .is('parent_id', null)
        .single();

      if (!parentRow) throw new Error('未找到父分类，请先确保默认分类已初始化');

      const { data: newRow, error } = await s.from('categories')
        .insert({
          user_id: userId,
          name: newName.trim(),
          icon: parent?.icon ?? 'help-circle',
          parent_id: parentRow.id,
          type: newType === 'income' ? 'income' : 'expense',
          engel_eligible: parent?.engel_eligible ?? false,
          sort_order: 99,
          is_default: false,
        } as any)
        .select()
        .single();

      if (error) throw new Error(error.message);

      // 同步到 Zustand
      addCustom({
        id: newRow.id,
        parentName: selectedParent,
        name: newName.trim(),
        icon: parent?.icon ?? 'help-circle',
      });

      setNewName('');
      setSelectedParent('');
      setDialogVisible(false);
      setSnackbar(`已添加 "${newName.trim()}"`);
    } catch (err: any) {
      setSnackbar(`添加失败: ${err?.message ?? '未知错误'}`);
    } finally {
      setSaving(false);
    }
  }, [newName, selectedParent, newType, addCustom, userId]);

  const handleRemoveCustom = useCallback(
    async (cat: CustomCategory) => {
      Alert.alert('删除分类', `确定要删除 "${cat.name}" 吗？`, [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            try {
              const s = await getSupabase();
              if (s) {
                await s.from('categories').delete().eq('id', cat.id);
              }
            } catch { /* ignore */ }
            removeCustom(cat.id);
          },
        },
      ]);
    },
    [removeCustom]
  );

  // 构建展示数据
  const expenseSections = EXPENSE_CATEGORIES.map((parent) => ({
    parentName: parent.name,
    parentIcon: parent.icon,
    subs: [
      ...(EXPENSE_SUB_CATEGORIES[parent.name] ?? []).map((name) => ({
        name,
        isCustom: false,
        id: `preset_${parent.name}_${name}`,
      })),
      ...customCategories
        .filter((c) => c.parentName === parent.name)
        .map((c) => ({ name: c.name, isCustom: true, id: c.id })),
    ],
  }));

  const incomeSections = INCOME_CATEGORIES.map((parent) => ({
    parentName: parent.name,
    parentIcon: parent.icon,
    subs: [
      ...(INCOME_SUB_CATEGORIES[parent.name] ?? []).map((name) => ({
        name,
        isCustom: false,
        id: `preset_${parent.name}_${name}`,
      })),
      ...customCategories
        .filter((c) => c.parentName === parent.name)
        .map((c) => ({ name: c.name, isCustom: true, id: c.id })),
    ],
  }));

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* 支出分类 */}
        <Text style={styles.sectionHeader}>💸 支出分类</Text>
        {expenseSections.map((section) => (
          <Card key={section.parentName} style={styles.card} mode="elevated">
            <Card.Content style={styles.cardContent}>
              <View style={styles.parentRow}>
                <CategoryItem
                  item={{
                    id: section.parentName,
                    name: section.parentName,
                    icon: section.parentIcon,
                  }}
                />
              </View>
              <Divider style={styles.divider} />
              {section.subs.map((sub) => (
                <View key={sub.id} style={styles.subRow}>
                  <View style={styles.subLeft}>
                    {sub.isCustom ? (
                      <MaterialCommunityIcons
                        name="pencil"
                        size={16}
                        color={Colors.textMuted}
                        style={styles.subDot}
                      />
                    ) : (
                      <View style={styles.subDot} />
                    )}
                    <Text
                      style={[
                        styles.subName,
                        hiddenCategories.includes(sub.name) && styles.subHidden,
                      ]}
                    >
                      {sub.name}
                    </Text>
                    {sub.isCustom && (
                      <IconButton
                        icon="close-circle"
                        size={16}
                        iconColor={Colors.expense}
                        onPress={() =>
                          handleRemoveCustom({
                            id: sub.id,
                            parentName: section.parentName,
                            name: sub.name,
                            icon: section.parentIcon,
                          })
                        }
                        style={styles.removeBtn}
                      />
                    )}
                  </View>
                  <Switch
                    value={!hiddenCategories.includes(sub.name)}
                    onValueChange={() => toggleHidden(sub.name)}
                    color={Colors.primary}
                  />
                </View>
              ))}
              {/* 添加到此一级 */}
              <Button
                mode="text"
                icon="plus"
                textColor={Colors.primary}
                onPress={() => {
                  setSelectedParent(section.parentName);
                  setNewType('expense');
                  setDialogVisible(true);
                }}
                style={styles.addBtn}
              >
                添加分类
              </Button>
            </Card.Content>
          </Card>
        ))}

        {/* 收入分类 */}
        <Text style={styles.sectionHeader}>💰 收入分类</Text>
        {incomeSections.map((section) => (
          <Card key={section.parentName} style={styles.card} mode="elevated">
            <Card.Content style={styles.cardContent}>
              <View style={styles.parentRow}>
                <CategoryItem
                  item={{
                    id: section.parentName,
                    name: section.parentName,
                    icon: section.parentIcon,
                  }}
                />
              </View>
              <Divider style={styles.divider} />
              {section.subs.map((sub) => (
                <View key={sub.id} style={styles.subRow}>
                  <View style={styles.subLeft}>
                    {sub.isCustom ? (
                      <MaterialCommunityIcons
                        name="pencil"
                        size={16}
                        color={Colors.textMuted}
                        style={styles.subDot}
                      />
                    ) : (
                      <View style={styles.subDot} />
                    )}
                    <Text
                      style={[
                        styles.subName,
                        hiddenCategories.includes(sub.name) && styles.subHidden,
                      ]}
                    >
                      {sub.name}
                    </Text>
                    {sub.isCustom && (
                      <IconButton
                        icon="close-circle"
                        size={16}
                        iconColor={Colors.expense}
                        onPress={() =>
                          handleRemoveCustom({
                            id: sub.id,
                            parentName: section.parentName,
                            name: sub.name,
                            icon: section.parentIcon,
                          })
                        }
                        style={styles.removeBtn}
                      />
                    )}
                  </View>
                  <Switch
                    value={!hiddenCategories.includes(sub.name)}
                    onValueChange={() => toggleHidden(sub.name)}
                    color={Colors.primary}
                  />
                </View>
              ))}
              <Button
                mode="text"
                icon="plus"
                textColor={Colors.primary}
                onPress={() => {
                  setSelectedParent(section.parentName);
                  setNewType('income');
                  setDialogVisible(true);
                }}
                style={styles.addBtn}
              >
                添加分类
              </Button>
            </Card.Content>
          </Card>
        ))}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* 添加自定义分类弹窗 */}
      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>
            添加自定义分类
          </Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogHint}>
              添加到: {selectedParent || '(请先选择)'}
            </Text>
            <TextInput
              label="分类名称"
              value={newName}
              onChangeText={setNewName}
              mode="outlined"
              style={styles.dialogInput}
              autoFocus
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)}>取消</Button>
            <Button onPress={handleAddCustom} loading={saving}>添加</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Snackbar
        visible={!!snackbar}
        onDismiss={() => setSnackbar('')}
        duration={2000}
        style={styles.snackbar}
      >
        {snackbar}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  sectionHeader: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  card: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  cardContent: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.xs,
  },
  parentRow: {
    paddingVertical: Spacing.xs,
  },
  divider: {
    marginVertical: Spacing.xs,
    backgroundColor: Colors.divider,
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    minHeight: 44,
  },
  subLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: Spacing.sm,
  },
  subDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.border,
  },
  subName: {
    fontSize: FontSize.md,
    color: Colors.text,
  },
  subHidden: {
    textDecorationLine: 'line-through',
    color: Colors.textMuted,
  },
  removeBtn: {
    margin: 0,
    padding: 0,
  },
  addBtn: {
    marginTop: Spacing.xs,
    alignSelf: 'flex-start',
  },
  bottomSpacer: {
    height: 80,
  },
  dialogInput: {
    marginTop: Spacing.sm,
    backgroundColor: Colors.surface,
  },
  dialogHint: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  snackbar: {
    marginBottom: 60,
  },
});
