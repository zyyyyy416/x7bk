import { useMemo, useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, RefreshControl, Alert } from 'react-native';
import { Text, Card, FAB, ActivityIndicator, Dialog, Portal, Button, TextInput, Snackbar, Avatar, IconButton, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { Colors, Spacing, FontSize, BorderRadius } from '@/theme';
import { formatCurrency, formatAmount } from '@/utils/currency';
import { formatRelativeTime } from '@/utils/date';
import { CATEGORY_ICON_MAP } from '@/constants/categories';
import { useBills } from '@/hooks/useBills';
import { useBooks, useBookMembers, useRemoveMember, useLeaveBook } from '@/hooks/useBooks';
import { useUiStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import type { BillWithDetails, Book, BookMember } from '@/types';

// ─── 单条账单行 ────────────────────────────────────────
function BillRow({ bill }: { bill: BillWithDetails }) {
  const iconKey = bill.category?.icon ?? 'help-circle';
  const iconName = (CATEGORY_ICON_MAP[iconKey] ?? 'help-circle') as keyof typeof MaterialCommunityIcons.glyphMap;
  const isExpense = bill.type === 'expense';
  const amount = Number(bill.amount);

  return (
    <Pressable
      style={({ pressed }) => [styles.billRow, pressed && styles.billRowPressed]}
      onPress={() => router.push({ pathname: '/bill/[id]', params: { id: bill.id } } as any)}
    >
      <View style={[styles.billIconWrap, { backgroundColor: (isExpense ? Colors.expense : Colors.income) + '15' }]}>
        <MaterialCommunityIcons
          name={iconName}
          size={20}
          color={isExpense ? Colors.expense : Colors.income}
        />
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

      <Text style={[styles.billAmount, isExpense ? styles.billExpense : styles.billIncome]}>
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

  const [inviteVisible, setInviteVisible] = useState(false);
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

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: book?.name ?? '账本详情' }} />

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
        {/* 账本信息卡片 */}
        {book && (
          <Card style={styles.infoCard} mode="elevated">
            <Card.Content style={styles.infoContent}>
              <View style={styles.infoLeft}>
                <MaterialCommunityIcons
                  name={book.type === 'personal' ? 'notebook' : 'account-group'}
                  size={32}
                  color={Colors.primary}
                />
                <View>
                  <Text style={styles.bookName}>{book.name}</Text>
                  <Text style={styles.bookType}>
                    {book.type === 'personal' ? '个人账本' : '共享账本'}
                  </Text>
                </View>
              </View>
              <Text style={styles.billCount}>{bills.length} 笔记录</Text>
            </Card.Content>
          </Card>
        )}

        {/* 共享账本: 成员 & 邀请 */}
        {book && book.type === 'shared' && (
          <Card style={styles.memberCard} mode="elevated">
            <Card.Content>
              <View style={styles.memberHeader}>
                <Text style={styles.memberTitle}>
                  成员 ({(members ?? []).length})
                </Text>
                {isAdmin && (
                  <Button mode="text" icon="plus" onPress={() => setInviteVisible(true)} compact>
                    邀请
                  </Button>
                )}
              </View>
              {(members ?? []).map((m: any) => (
                <View key={m.id} style={styles.memberRow}>
                  <Avatar.Text
                    size={36}
                    label={(m.user?.nickname ?? '?')[0]}
                    style={{ backgroundColor: Colors.primary }}
                  />
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>
                      {m.user?.nickname ?? '用户'} {m.user_id === book.creator_id ? '(管理员)' : ''}
                    </Text>
                    <Text style={styles.memberRole}>{m.role === 'admin' ? '管理员' : '成员'}</Text>
                  </View>
                  {isAdmin && m.user_id !== userId && (
                    <IconButton
                      icon="close"
                      size={18}
                      onPress={() => handleRemoveMember(m.user_id, m.user?.nickname ?? '用户')}
                    />
                  )}
                </View>
              ))}
              {!isAdmin && (
                <>
                  <Divider style={{ marginVertical: Spacing.sm }} />
                  <Button mode="text" textColor={Colors.expense} onPress={handleLeave} icon="exit-to-app">
                    退出账本
                  </Button>
                </>
              )}
            </Card.Content>
          </Card>
        )}

        {/* 账单列表 */}
        <View style={styles.billSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>全部账单</Text>
          </View>

          {isLoading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={Colors.primary} />
              <Text style={styles.loadingText}>加载中...</Text>
            </View>
          ) : bills.length > 0 ? (
            <Card style={styles.billListCard} mode="elevated">
              <Card.Content style={styles.billListContent}>
                {bills.map((bill: BillWithDetails, idx: number) => (
                  <View key={bill.id}>
                    <BillRow bill={bill} />
                    {idx < bills.length - 1 && <View style={styles.billDivider} />}
                  </View>
                ))}
              </Card.Content>
            </Card>
          ) : (
            <Card style={styles.emptyCard} mode="outlined">
              <Card.Content style={styles.emptyContent}>
                <MaterialCommunityIcons name="notebook-plus-outline" size={48} color={Colors.textMuted} />
                <Text style={styles.emptyText}>还没有记账记录</Text>
                <Text style={styles.emptyHint}>点击下方按钮开始记账</Text>
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
  // 账单
  billSection: { paddingHorizontal: Spacing.md, marginBottom: Spacing.md },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  sectionTitle: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
  billListCard: { borderRadius: BorderRadius.lg },
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
