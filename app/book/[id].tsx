import { useMemo, useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Pressable, RefreshControl, Alert } from 'react-native';
import { Text, Card, FAB, ActivityIndicator, Dialog, Portal, Button, TextInput, Snackbar, Avatar, IconButton, Divider, Searchbar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import dayjs from 'dayjs';
import { Colors, Spacing, FontSize, BorderRadius } from '@/theme';
import { formatCurrency, formatAmount } from '@/utils/currency';
import { formatDate, formatRelativeTime } from '@/utils/date';
import { useBills } from '@/hooks/useBills';
import { useBooks, useBookMembers, useRemoveMember, useLeaveBook, useDeleteBook } from '@/hooks/useBooks';
import { useUiStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import { mapIcon, getCategoryColor } from '@/components/ui/CategoryItem';
import type { BillWithDetails, Book } from '@/types';

// ─── 单条账单行 ────────────────────────────────────────
function BillRow({ bill }: { bill: BillWithDetails }) {
  const iconKey = bill.category?.icon ?? 'help-circle';
  const iconName = mapIcon(iconKey);
  const catColor = getCategoryColor(iconKey);
  const isExpense = bill.type === 'expense';
  const amount = Number(bill.amount);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.billRow,
        { backgroundColor: catColor + '10' },
        pressed && styles.billRowPressed,
      ]}
      onPress={() => router.push({ pathname: '/bill/[id]', params: { id: bill.id } } as any)}
    >
      <View style={[styles.billIconWrap, { backgroundColor: catColor + '22' }]}>
        <MaterialCommunityIcons name={iconName} size={20} color={catColor} />
      </View>

      <View style={styles.billInfo}>
        <View style={styles.billInfoRow}>
          <Text style={styles.billCategory} numberOfLines={1}>
            {bill.category?.name ?? '未分类'}
          </Text>
          {bill.is_shared && (
            <MaterialCommunityIcons name="account-group" size={14} color={Colors.primary} />
          )}
        </View>
        {bill.note ? (
          <Text style={styles.billNote} numberOfLines={1}>{bill.note}</Text>
        ) : null}
        <Text style={styles.billTime}>{formatRelativeTime(bill.created_at)}</Text>
      </View>

      <Text style={[styles.billAmount, { color: isExpense ? Colors.expense : Colors.income }]}>
        {isExpense ? '-' : '+'}{formatAmount(amount)}
      </Text>
    </Pressable>
  );
}

// ─── 账本详情页 ────────────────────────────────────────
export default function BookDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: books } = useBooks();
  const { data: members } = useBookMembers(id ?? '');
  const setActiveBook = useUiStore((s) => s.setActiveBook);
  const userId = useAuthStore((s) => s.user?.id);
  const removeMember = useRemoveMember();
  const leaveBook = useLeaveBook();
  const deleteBook = useDeleteBook();

  const [inviteVisible, setInviteVisible] = useState(false);
  const [memberVisible, setMemberVisible] = useState(false);
  const [snackbar, setSnackbar] = useState('');

  // 找到当前账本
  const book = useMemo(() => (books ?? []).find((b: Book) => b.id === id), [books, id]);

  // 当前用户在此账本中的角色
  const myRole = useMemo(() => {
    if (!members || !userId) return null;
    const me = members.find((m: any) => m.user_id === userId);
    return me?.role ?? (book?.creator_id === userId ? 'admin' : null);
  }, [members, userId, book]);
  const isAdmin = myRole === 'admin';

  // 进入页面时设置当前激活账本
  useEffect(() => {
    if (book) setActiveBook(book);
    return () => { setActiveBook(null); };
  }, [book]);

  // 获取该账本下所有账单
  const {
    data: billsData,
    isLoading,
    isRefetching,
    refetch,
  } = useBills({ bookId: id ?? '', page: 1, pageSize: 50 });

  const bills = billsData?.bills ?? [];

  // 搜索
  const [searchQuery, setSearchQuery] = useState('');
  const filteredBills = useMemo(() => {
    if (!searchQuery.trim()) return bills;
    const q = searchQuery.trim().toLowerCase();
    return bills.filter((b: BillWithDetails) =>
      (b.note ?? '').toLowerCase().includes(q) ||
      (b.category?.name ?? '').toLowerCase().includes(q) ||
      String(b.amount).includes(q)
    );
  }, [bills, searchQuery]);

  // 按日期分组
  const groupedBills = useMemo(() => {
    const groups: { date: string; items: BillWithDetails[]; total: number }[] = [];
    for (const bill of filteredBills) {
      const last = groups[groups.length - 1];
      if (last && last.date === bill.bill_date) {
        last.items.push(bill);
        last.total += Number(bill.amount);
      } else {
        groups.push({ date: bill.bill_date, items: [bill], total: Number(bill.amount) });
      }
    }
    return groups;
  }, [filteredBills]);

  // 邀请码
  const handleCopyInvite = () => {
    setSnackbar('邀请码已复制: ' + id);
    setInviteVisible(false);
  };

  // 移除成员
  const handleRemoveMember = (memberId: string, name: string) => {
    Alert.alert('移除成员', `确定要移除 ${name} 吗？`, [
      { text: '取消', style: 'cancel' },
      { text: '移除', style: 'destructive', onPress: () => removeMember.mutate({ bookId: id!, userId: memberId }) },
    ]);
  };

  // 退出账本
  const handleLeave = () => {
    Alert.alert('退出账本', '确定要退出该账本吗？退出后将无法查看账单。', [
      { text: '取消', style: 'cancel' },
      { text: '退出', style: 'destructive', onPress: () => {
        leaveBook.mutate(id!, { onSuccess: () => router.back() });
      }},
    ]);
  };

  // 删除账本
  const handleDeleteBook = () => {
    Alert.alert('删除账本', '确定要删除该账本吗？所有账单将被永久删除，此操作不可撤销。', [
      { text: '取消', style: 'cancel' },
      { text: '删除', style: 'destructive', onPress: () => {
        deleteBook.mutate(id!, { onSuccess: () => router.back() });
      }},
    ]);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{
        title: book?.name ?? '账本详情',
        headerRight: () => (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {book?.type === 'shared' && (
              <IconButton icon="cog" size={22} onPress={() => setMemberVisible(true)} />
            )}
            {book?.creator_id === userId && (
              <IconButton icon="delete" size={22} iconColor={Colors.expense} onPress={handleDeleteBook} />
            )}
          </View>
        ),
      }} />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
      >
        {/* 搜索 */}
        <View style={styles.searchWrap}>
          <Searchbar
            placeholder="搜索备注、分类、金额..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchBar}
            inputStyle={styles.searchInput}
          />
        </View>

        {/* 账单列表 */}
        <View style={styles.billSection}>
          {isLoading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={Colors.primary} />
              <Text style={styles.loadingText}>加载中...</Text>
            </View>
          ) : groupedBills.length > 0 ? (
            groupedBills.map((group) => (
              <View key={group.date}>
                {/* 日期分割线 */}
                <View style={styles.dateSeparator}>
                  <View style={styles.dateLine} />
                  <Text style={styles.dateLabel}>{(() => { const d = dayjs(group.date).format('M月D日'); const w = '周' + ['日','一','二','三','四','五','六'][dayjs(group.date).day()]; return `${d} ${w} · ${formatCurrency(group.total)}`; })()}</Text>
                  <View style={styles.dateLine} />
                </View>
                <Card style={styles.billListCard} mode="elevated">
                  <Card.Content style={styles.billListContent}>
                    {group.items.map((bill: BillWithDetails, idx: number) => (
                      <View key={bill.id}>
                        <BillRow bill={bill} />
                        {idx < group.items.length - 1 && <View style={styles.billDivider} />}
                      </View>
                    ))}
                  </Card.Content>
                </Card>
              </View>
            ))
          ) : (
            <Card style={styles.emptyCard} mode="outlined">
              <Card.Content style={styles.emptyContent}>
                <MaterialCommunityIcons name="notebook-plus-outline" size={48} color={Colors.textMuted} />
                <Text style={styles.emptyText}>{searchQuery ? '未找到匹配记录' : '还没有记账记录'}</Text>
                <Text style={styles.emptyHint}>{searchQuery ? '尝试其他关键词' : '点击下方按钮开始记账'}</Text>
              </Card.Content>
            </Card>
          )}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* 快速记账 FAB */}
      <FAB
        icon="plus"
        label="记账"
        style={styles.fab}
        onPress={() => router.push('/add')}
        color="#FFFFFF"
      />

      {/* 成员管理对话框 */}
      <Portal>
        <Dialog visible={memberVisible} onDismiss={() => setMemberVisible(false)}>
          <Dialog.Title>成员管理 ({(members ?? []).length})</Dialog.Title>
          <Dialog.Content>
            {(members ?? []).map((m: any) => (
              <View key={m.id} style={styles.memberRow}>
                <Avatar.Text size={36} label={(m.user?.nickname ?? '?')[0]} style={{ backgroundColor: Colors.primary }} />
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>{m.user?.nickname ?? '用户'} {m.user_id === book?.creator_id ? '(管理员)' : ''}</Text>
                  <Text style={styles.memberRole}>{m.role === 'admin' ? '管理员' : '成员'}</Text>
                </View>
                {isAdmin && m.user_id !== userId && (
                  <IconButton icon="close" size={18} onPress={() => handleRemoveMember(m.user_id, m.user?.nickname ?? '用户')} />
                )}
              </View>
            ))}
          </Dialog.Content>
          <Dialog.Actions>
            {isAdmin && <Button onPress={() => { setMemberVisible(false); setTimeout(() => setInviteVisible(true), 300); }}>邀请</Button>}
            {!isAdmin && <Button textColor={Colors.expense} onPress={() => { setMemberVisible(false); handleLeave(); }}>退出账本</Button>}
            <Button onPress={() => setMemberVisible(false)}>关闭</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* 邀请对话框 */}
      <Portal>
        <Dialog visible={inviteVisible} onDismiss={() => setInviteVisible(false)}>
          <Dialog.Title>邀请成员</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.inviteLabel}>邀请码</Text>
            <TextInput
              value={id}
              mode="outlined"
              editable={false}
              right={<TextInput.Icon icon="content-copy" onPress={handleCopyInvite} />}
              style={styles.inviteCode}
            />
            <Text style={styles.inviteHint}>
              将邀请码发送给好友，好友在"我的账本"页面输入邀请码即可加入
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setInviteVisible(false)}>关闭</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Snackbar visible={!!snackbar} onDismiss={() => setSnackbar('')} duration={2000} style={styles.snackbar}>
        {snackbar}
      </Snackbar>
    </View>
  );
}

// ─── 样式 ──────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollView: { flex: 1 },
  // 账本信息
  infoCard: { margin: Spacing.md, borderRadius: BorderRadius.lg },
  infoContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  infoLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  bookName: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text },
  bookType: { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: 2 },
  billCount: { fontSize: FontSize.sm, color: Colors.textMuted, fontWeight: '500' },
  // 搜索
  searchWrap: { paddingHorizontal: Spacing.md, marginBottom: Spacing.md },
  searchBar: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, elevation: 0 },
  searchInput: { fontSize: FontSize.md, minHeight: 0 },
  // 日期分割线
  dateSeparator: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, marginBottom: Spacing.sm, marginTop: Spacing.sm },
  dateLine: { flex: 1, height: 1, backgroundColor: Colors.divider },
  dateLabel: { fontSize: FontSize.xs, color: Colors.textMuted, marginHorizontal: Spacing.md, fontWeight: '500' },
  // 账单
  billSection: { marginBottom: Spacing.md },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  sectionTitle: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
  billListCard: { marginHorizontal: Spacing.md, borderRadius: BorderRadius.lg },
  billListContent: { paddingVertical: Spacing.xs, paddingHorizontal: Spacing.xs },
  billRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm, paddingHorizontal: Spacing.sm, gap: Spacing.md, borderRadius: BorderRadius.md },
  billRowPressed: { backgroundColor: Colors.divider + '80' },
  billIconWrap: { width: 40, height: 40, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center' },
  billInfo: { flex: 1, gap: 2 },
  billInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  billCategory: { fontSize: FontSize.md, fontWeight: '500', color: Colors.text },
  billNote: { fontSize: FontSize.sm, color: Colors.textMuted },
  billTime: { fontSize: FontSize.xs, color: Colors.textMuted },
  billAmount: { fontSize: FontSize.lg, fontWeight: '700', fontVariant: ['tabular-nums'] },
  billExpense: { color: Colors.expense },
  billIncome: { color: Colors.income },
  billDivider: { height: 1, backgroundColor: Colors.divider, marginLeft: 56 },
  // 空状态
  emptyCard: { borderRadius: BorderRadius.lg, borderStyle: 'dashed', borderColor: Colors.border },
  emptyContent: { alignItems: 'center', paddingVertical: Spacing.xl },
  emptyText: { fontSize: FontSize.md, color: Colors.textMuted, marginTop: Spacing.sm },
  emptyHint: { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: 4 },
  // 加载
  loadingWrap: { alignItems: 'center', paddingVertical: Spacing.xl, gap: Spacing.sm },
  loadingText: { fontSize: FontSize.sm, color: Colors.textMuted },
  // 成员
  memberCard: { marginHorizontal: Spacing.md, marginBottom: Spacing.md, borderRadius: BorderRadius.lg },
  memberHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  memberTitle: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
  memberRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm, gap: Spacing.md },
  memberInfo: { flex: 1 },
  memberName: { fontSize: FontSize.md, fontWeight: '500', color: Colors.text },
  memberRole: { fontSize: FontSize.xs, color: Colors.textMuted },
  // 邀请
  inviteLabel: { fontSize: FontSize.sm, color: Colors.textMuted, marginBottom: 4 },
  inviteCode: { backgroundColor: Colors.surface, marginBottom: Spacing.sm },
  inviteHint: { fontSize: FontSize.xs, color: Colors.textMuted, lineHeight: 18 },
  snackbar: { marginBottom: 60 },
  // FAB
  fab: { position: 'absolute', margin: Spacing.md, right: 0, bottom: 0, backgroundColor: Colors.primary, borderRadius: BorderRadius.lg },
  bottomSpacer: { height: 80 },
});
