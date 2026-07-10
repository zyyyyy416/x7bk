import { useMemo, useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, RefreshControl } from 'react-native';
import { Text, Card, Surface, FAB, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors, Spacing, FontSize, BorderRadius } from '@/theme';
import { formatCurrency, formatAmount } from '@/utils/currency';
import { formatDate, formatRelativeTime, getCurrentMonth } from '@/utils/date';
import { calcEngelFromBills } from '@/utils/engel';
import { mapIcon, getCategoryColor } from '@/components/ui/CategoryItem';
import { getEngelLevel } from '@/constants/engelLevels';
import { useBills } from '@/hooks/useBills';
import { useBooks } from '@/hooks/useBooks';
import { useMonthlySummary, useAllBooksSummary } from '@/hooks/useAnalysis';
import { useAuthStore } from '@/stores/authStore';
import { useUiStore } from '@/stores/uiStore';
import BookPicker from '@/components/ui/BookPicker';
import type { BillWithDetails, Book } from '@/types';

// ─── 动态问候 ──────────────────────────────────────────
function getGreeting(): { text: string; emoji: string } {
  const hour = new Date().getHours();
  if (hour < 6) return { text: '夜深了', emoji: '🌙' };
  if (hour < 9) return { text: '早上好', emoji: '☀️' };
  if (hour < 12) return { text: '上午好', emoji: '🌤️' };
  if (hour < 14) return { text: '中午好', emoji: '☀️' };
  if (hour < 18) return { text: '下午好', emoji: '🌤️' };
  if (hour < 21) return { text: '晚上好', emoji: '🌆' };
  return { text: '夜深了', emoji: '🌙' };
}

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
      onPress={() => router.push(`/bill/${bill.id}` as any)}
    >
      <View style={[styles.billIconWrap, { backgroundColor: catColor + '22' }]}>
        <MaterialCommunityIcons name={iconName} size={20} color={catColor} />
      </View>

      {/* 中间信息 */}
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
          <Text style={styles.billNote} numberOfLines={1}>
            {bill.note}
          </Text>
        ) : null}
        <Text style={styles.billTime}>{formatRelativeTime(bill.created_at)}</Text>
      </View>

      {/* 右侧金额 */}
      <Text style={[styles.billAmount, isExpense ? styles.billExpense : styles.billIncome]}>
        {isExpense ? '-' : '+'}{formatAmount(amount)}
      </Text>
    </Pressable>
  );
}

// ─── 主页 ──────────────────────────────────────────────
export default function HomeScreen() {
  const greeting = useMemo(() => getGreeting(), []);
  const today = formatDate(new Date().toISOString());
  const currentMonth = getCurrentMonth();

  // 获取当前账本
  const { data: books, isLoading: booksLoading } = useBooks();
  const userId = useAuthStore((s) => s.user?.id);
  const activeBook = useUiStore((s) => s.activeBook);
  const setActiveBook = useUiStore((s) => s.setActiveBook);
  const showAllHome = !activeBook;
  const bookIds = useMemo(() => (books ?? []).map((b: Book) => b.id), [books]);
  const queryBookId = activeBook?.id ?? '';

  const [bookPickerVisible, setBookPickerVisible] = useState(false);

  // 首次加载时自动选中第一个账本 (用户未手动选择过)
  const [didAutoSelect, setDidAutoSelect] = useState(false);
  useEffect(() => {
    if (!booksLoading && books && books.length > 0 && !activeBook && !didAutoSelect) {
      setActiveBook(books[0]);
      setDidAutoSelect(true);
    }
  }, [books, booksLoading, activeBook, didAutoSelect]);

  // 获取账单 (最近 20 条)
  const {
    data: billsData,
    isLoading: billsLoading,
    isRefetching,
    refetch,
  } = useBills({
    bookId: queryBookId,
    page: 1,
    pageSize: 20,
  });
  const bills = billsData?.bills ?? [];

  // 获取月度分析 (全部时汇总所有账本)
  const monthStart = currentMonth + '-01';
  const [y, m] = currentMonth.split('-').map(Number);
  const monthEnd = currentMonth + '-' + String(new Date(y!, m!, 0).getDate()).padStart(2, '0');
  const { data: singleSummary } = useMonthlySummary(queryBookId, monthStart, monthEnd);
  const { data: allSummary } = useAllBooksSummary(bookIds, monthStart, monthEnd);
  const monthlySummary = showAllHome ? allSummary : singleSummary;

  // 从真实账单计算恩格尔系数
  const engelResult = useMemo(() => {
    if (!billsData?.bills || billsData.bills.length === 0) return null;
    return calcEngelFromBills(billsData.bills as any);
  }, [billsData]);

  // 使用月度分析或实时计算
  const displaySum = monthlySummary ?? {
    totalIncome: 0,
    totalExpense: engelResult?.totalExpense ?? 0,
    balance: 0 - (engelResult?.totalExpense ?? 0),
    engelCoefficient: engelResult?.coefficient ?? 0,
    engelLevel: engelResult?.level ?? getEngelLevel(0),
    billCount: bills.length,
  };

  const isLoading = booksLoading || billsLoading;

  return (
    <View style={styles.container}>
      {/* 顶部问候 */}
      <Surface style={styles.header} elevation={0}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>
              {greeting.text} {greeting.emoji}
            </Text>
            <Text style={styles.date}>{today}</Text>
            <Pressable
              style={styles.bookSwitcher}
              onPress={() => setBookPickerVisible(true)}
            >
              <Text style={styles.activeBook}>{activeBook?.name ?? '全部账本'}</Text>
              <MaterialCommunityIcons name="chevron-down" size={14} color={Colors.primary} />
            </Pressable>
          </View>
          <MaterialCommunityIcons name="bell-outline" size={24} color={Colors.textSecondary} />
        </View>
      </Surface>

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
        {/* 月度概览卡片 */}
        <Card style={styles.summaryCard} mode="elevated">
          <Card.Content>
            <View style={styles.summaryHeader}>
              <Text style={styles.summaryTitle}>{currentMonth}月 · 概览</Text>
              <Pressable onPress={() => router.push('/analysis')}>
                <Text style={styles.summaryMore}>查看分析 →</Text>
              </Pressable>
            </View>

            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>支出</Text>
                <Text style={[styles.summaryAmount, { color: Colors.expense }]}>
                  {formatCurrency(displaySum.totalExpense)}
                </Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>收入</Text>
                <Text style={[styles.summaryAmount, { color: Colors.income }]}>
                  {formatCurrency(displaySum.totalIncome)}
                </Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>结余</Text>
                <Text style={[styles.summaryAmount, { color: Colors.text }]}>
                  {formatCurrency(displaySum.balance)}
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* 恩格尔系数卡片 */}
        <Card style={styles.engelCard} mode="elevated">
          <Card.Content>
            <View style={styles.engelRow}>
              <View style={styles.engelLeft}>
                <View style={styles.engelHeader}>
                  <MaterialCommunityIcons name="food-fork-drink" size={18} color={Colors.primary} />
                  <Text style={styles.engelTitle}>恩格尔系数</Text>
                </View>
                <Text style={styles.engelLabel}>
                  {'⭐'.repeat(displaySum.engelLevel.stars)} {displaySum.engelLevel.label}
                </Text>
                <Text style={styles.engelDesc}>
                  {displaySum.engelLevel.description}
                </Text>
              </View>
              <Text style={styles.engelValue}>
                {displaySum.engelCoefficient}%
              </Text>
            </View>
          </Card.Content>
        </Card>

        {/* 近期账单 */}
        <View style={styles.billSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>近期账单</Text>
            <Text style={styles.sectionCount}>{bills.length} 笔</Text>
          </View>

          {showAllHome ? (
            <Card style={styles.emptyCard} mode="outlined">
              <Card.Content style={styles.emptyContent}>
                <MaterialCommunityIcons name="chart-pie" size={48} color={Colors.primary} />
                <Text style={styles.emptyText}>全部账本汇总视图</Text>
                <Text style={styles.emptyHint}>上方卡片为所有账本的聚合数据。切换到具体账本可查看账单明细。</Text>
              </Card.Content>
            </Card>
          ) : isLoading ? (
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
                <MaterialCommunityIcons
                  name="notebook-plus-outline"
                  size={48}
                  color={Colors.textMuted}
                />
                <Text style={styles.emptyText}>还没有记账记录</Text>
                <Text style={styles.emptyHint}>
                  点击下方 ⊕ 开始记账吧
                </Text>
              </Card.Content>
            </Card>
          )}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* 账本选择器弹窗 */}
      <BookPicker
        visible={bookPickerVisible}
        books={books ?? []}
        activeBook={activeBook}
        showAllOption
        onSelect={(book) => {
          setActiveBook(book);
          setBookPickerVisible(false);
        }}
        onClose={() => setBookPickerVisible(false)}
      />

      {/* 快速记账按钮 */}
      <FAB
        icon="plus"
        label="记账"
        style={styles.fab}
        onPress={() => router.push('/add')}
        color="#FFFFFF"
      />
    </View>
  );
}

// ─── 样式 ──────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greeting: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
    color: Colors.text,
  },
  date: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: 2,
  },
  activeBook: {
    fontSize: FontSize.xs,
    color: Colors.primary,
    fontWeight: '500',
  },
  bookSwitcher: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    backgroundColor: Colors.primary + '12',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  scrollView: {
    flex: 1,
  },
  // 月度概览
  summaryCard: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surface,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  summaryTitle: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryMore: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: '500',
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    height: 28,
    backgroundColor: Colors.divider,
  },
  summaryLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginBottom: 4,
  },
  summaryAmount: {
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  // 恩格尔
  engelCard: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: '#F0FFF4',
  },
  engelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  engelLeft: {
    flex: 1,
  },
  engelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: 4,
  },
  engelTitle: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  engelLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginLeft: 22,
  },
  engelDesc: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginLeft: 22,
    marginTop: 2,
  },
  engelValue: {
    fontSize: FontSize.amount,
    fontWeight: '800',
    color: Colors.primary,
  },
  // 加载
  loadingWrap: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    gap: Spacing.sm,
  },
  loadingText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  // 账单
  billSection: {
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
  },
  sectionCount: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  billListCard: {
    borderRadius: BorderRadius.lg,
  },
  billListContent: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.xs,
  },
  billRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    gap: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  billRowPressed: {
    backgroundColor: Colors.divider + '80',
  },
  billIconWrap: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  billInfo: {
    flex: 1,
    gap: 2,
  },
  billInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  billCategory: {
    fontSize: FontSize.md,
    fontWeight: '500',
    color: Colors.text,
  },
  billNote: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  billTime: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  billAmount: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  billExpense: {
    color: Colors.expense,
  },
  billIncome: {
    color: Colors.income,
  },
  billDivider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginLeft: 56,
  },
  // 空状态
  emptyCard: {
    borderRadius: BorderRadius.lg,
    borderStyle: 'dashed',
    borderColor: Colors.border,
  },
  emptyContent: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  emptyText: {
    fontSize: FontSize.md,
    color: Colors.textMuted,
    marginTop: Spacing.sm,
  },
  emptyHint: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: 4,
  },
  // FAB
  fab: {
    position: 'absolute',
    margin: Spacing.md,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
  },
  bottomSpacer: {
    height: 80,
  },
});
