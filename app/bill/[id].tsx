import { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import {
  Text,
  Card,
  Button,
  TextInput,
  Dialog,
  Portal,
  Divider,
  Snackbar,
  ActivityIndicator,
} from 'react-native-paper';
import { router, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius } from '@/theme';
import { formatCurrency } from '@/utils/currency';
import { formatDateFull, formatRelativeTime } from '@/utils/date';
import { useUpdateBill, useDeleteBill } from '@/hooks/useBills';
import { getBillById } from '@/services/bill.service';
import CategoryItem from '@/components/ui/CategoryItem';
import type { BillWithDetails } from '@/types';

export default function BillDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  // 直接通过 ID 获取账单详情
  const [bill, setBill] = useState<BillWithDetails | null>(null);
  const [billLoading, setBillLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setBillLoading(true);
    getBillById(id).then((data) => {
      setBill(data);
      setBillLoading(false);
    }).catch(() => {
      setBillLoading(false);
    });
  }, [id]);

  // 编辑状态
  const [isEditing, setIsEditing] = useState(false);
  const [editAmount, setEditAmount] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editDate, setEditDate] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [snackbar, setSnackbar] = useState('');

  const updateBill = useUpdateBill();
  const deleteBill = useDeleteBill();

  // 进入编辑模式
  const handleStartEdit = useCallback(() => {
    if (!bill) return;
    setEditAmount(String(bill.amount));
    setEditNote(bill.note ?? '');
    setEditDate(bill.bill_date ?? '');
    setIsEditing(true);
  }, [bill]);

  // 保存编辑
  const handleSaveEdit = useCallback(async () => {
    if (!bill) return;
    const newAmount = parseFloat(editAmount);
    if (isNaN(newAmount) || newAmount <= 0) {
      setSnackbar('请输入有效金额');
      return;
    }

    try {
      await updateBill.mutateAsync({
        id: bill.id,
        updates: { amount: newAmount, note: editNote || null, bill_date: editDate || bill.bill_date },
      });
      setSnackbar('已更新');
      setIsEditing(false);
    } catch (err: any) {
      setSnackbar(`更新失败: ${err?.message ?? '未知错误'}`);
    }
  }, [bill, editAmount, editNote, updateBill]);

  // 删除
  const handleDelete = useCallback(async () => {
    if (!bill) return;
    try {
      await deleteBill.mutateAsync(bill.id);
      setSnackbar('已删除');
      setTimeout(() => router.back(), 500);
    } catch (err: any) {
      setSnackbar(`删除失败: ${err?.message ?? '未知错误'}`);
    }
    setShowDeleteDialog(false);
  }, [bill, deleteBill]);

  // ─── Loading ─────────────────────────────────────────
  if (billLoading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>加载中...</Text>
      </View>
    );
  }

  if (!bill) {
    return (
      <View style={styles.loadingWrap}>
        <MaterialCommunityIcons name="alert-circle-outline" size={48} color={Colors.textMuted} />
        <Text style={styles.loadingText}>账单未找到</Text>
      </View>
    );
  }

  const isExpense = bill.type === 'expense';
  const amount = Number(bill.amount);

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* 金额展示 */}
        <View style={styles.amountSection}>
          <Text style={[styles.amount, isExpense ? styles.amountExpense : styles.amountIncome]}>
            {isExpense ? '-' : '+'}{formatCurrency(amount)}
          </Text>

          {isEditing ? (
            <View style={styles.editForm}>
              <TextInput
                label="金额"
                value={editAmount}
                onChangeText={setEditAmount}
                keyboardType="decimal-pad"
                mode="outlined"
                style={styles.editInput}
              />
              <TextInput
                label="备注"
                value={editNote}
                onChangeText={setEditNote}
                mode="outlined"
                style={styles.editInput}
              />
              <TextInput
                label="日期"
                value={editDate}
                onChangeText={setEditDate}
                mode="outlined"
                style={styles.editInput}
                placeholder="YYYY-MM-DD"
              />
              <View style={styles.editActions}>
                <Button mode="text" onPress={() => setIsEditing(false)}>
                  取消
                </Button>
                <Button
                  mode="contained"
                  onPress={handleSaveEdit}
                  loading={updateBill.isPending}
                >
                  保存
                </Button>
              </View>
            </View>
          ) : (
            <View style={styles.metaRow}>
              {bill.note ? (
                <Text style={styles.note}>"{bill.note}"</Text>
              ) : null}
              <View style={styles.badgeRow}>
                {bill.is_shared && (
                  <View style={styles.badge}>
                    <MaterialCommunityIcons name="account-group" size={14} color={Colors.primary} />
                    <Text style={styles.badgeText}>共享</Text>
                  </View>
                )}
              </View>
            </View>
          )}
        </View>

        <Divider style={styles.divider} />

        {/* 信息卡片 */}
        <Card style={styles.infoCard} mode="elevated">
          <Card.Content>
            {bill.category && (
              <CategoryItem
                item={{
                  id: bill.category_id,
                  name: bill.category.name,
                  icon: bill.category.icon,
                  engelEligible: bill.category.engel_eligible,
                }}
                subtitle={isExpense ? '支出' : '收入'}
              />
            )}
            <Divider style={styles.infoDivider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>日期</Text>
              <Text style={styles.infoValue}>{formatDateFull(bill.bill_date)}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>时间</Text>
              <Text style={styles.infoValue}>{formatRelativeTime(bill.created_at)}</Text>
            </View>
            {bill.user && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>记账人</Text>
                <Text style={styles.infoValue}>
                  {bill.user.nickname ?? '用户'}
                </Text>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* 操作按钮 */}
        <View style={styles.actionRow}>
          <Button
            mode="outlined"
            icon="pencil"
            onPress={handleStartEdit}
            style={styles.actionBtn}
            textColor={Colors.primary}
          >
            编辑
          </Button>
          <Button
            mode="outlined"
            icon="delete"
            onPress={() => setShowDeleteDialog(true)}
            style={styles.actionBtn}
            textColor={Colors.expense}
          >
            删除
          </Button>
        </View>
      </ScrollView>

      {/* 删除确认弹窗 */}
      <Portal>
        <Dialog visible={showDeleteDialog} onDismiss={() => setShowDeleteDialog(false)}>
          <Dialog.Title>确认删除</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogText}>
              确定要删除这笔 {isExpense ? '支出' : '收入'}记录吗？此操作不可撤销。
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowDeleteDialog(false)}>取消</Button>
            <Button
              onPress={handleDelete}
              textColor={Colors.expense}
              loading={deleteBill.isPending}
            >
              删除
            </Button>
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
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: FontSize.md,
    color: Colors.textMuted,
  },
  amountSection: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  amount: {
    fontSize: FontSize.amountLg,
    fontWeight: '800',
  },
  amountExpense: {
    color: Colors.expense,
  },
  amountIncome: {
    color: Colors.income,
  },
  metaRow: {
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.md,
  },
  note: {
    fontSize: FontSize.lg,
    color: Colors.text,
    fontStyle: 'italic',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  badgeText: {
    fontSize: FontSize.xs,
    color: Colors.primary,
    fontWeight: '500',
  },
  editForm: {
    width: '100%',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  editInput: {
    backgroundColor: Colors.surface,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
  },
  divider: {
    marginHorizontal: Spacing.lg,
    backgroundColor: Colors.divider,
  },
  infoCard: {
    margin: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  infoDivider: {
    marginVertical: Spacing.sm,
    backgroundColor: Colors.divider,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs + 2,
  },
  infoLabel: {
    fontSize: FontSize.md,
    color: Colors.textMuted,
  },
  infoValue: {
    fontSize: FontSize.md,
    color: Colors.text,
    fontWeight: '500',
  },
  actionRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    gap: Spacing.md,
  },
  actionBtn: {
    flex: 1,
    borderRadius: BorderRadius.md,
  },
  dialogText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
  snackbar: {
    marginBottom: 60,
  },
});
