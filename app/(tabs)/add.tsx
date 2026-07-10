import { useState, useCallback, useMemo, useEffect } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import {
  Text,
  TextInput,
  Surface,
  IconButton,
  Button,
  Snackbar,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { Colors, Spacing, FontSize, BorderRadius } from '@/theme';
import { formatCurrency } from '@/utils/currency';
import { formatDate } from '@/utils/date';
import CategoryPicker from '@/components/bill/CategoryPicker';
import CategoryItem from '@/components/ui/CategoryItem';
import BookPicker from '@/components/ui/BookPicker';
import type { Book } from '@/types';
import type { SelectedCategory } from '@/components/bill/CategoryPicker';
import { useBooks, useCreateBook } from '@/hooks/useBooks';
import { useAuthStore } from '@/stores/authStore';
import { useUiStore } from '@/stores/uiStore';
import { saveBill } from '@/services/bill.service';
import { useQueryClient } from '@tanstack/react-query';
import DatePickerModal from '@/components/ui/DatePickerModal';

// ─── 步骤枚举 ──────────────────────────────────────────
type Step = 'amount' | 'confirm';

// ─── 键盘布局 ──────────────────────────────────────────
const KEYBOARD_ROWS = [
  ['1', '2', '3', 'backspace'],
  ['4', '5', '6', '+'],
  ['7', '8', '9', '-'],
  ['.', '0', 'done'],
];

// ─── 组件 ──────────────────────────────────────────────
export default function AddBillScreen() {
  // 状态
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<SelectedCategory | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickForType, setPickForType] = useState<'expense' | 'income'>('expense');
  const [note, setNote] = useState('');
  const [snackbar, setSnackbar] = useState('');
  const [billDate, setBillDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [bookPickerVisible, setBookPickerVisible] = useState(false);

  // 数据
  const user = useAuthStore((s) => s.user);
  const { data: books, isLoading: booksLoading } = useBooks();
  const createBook = useCreateBook();
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);

  // 使用全局账本状态
  const activeBook = useUiStore((s) => s.activeBook);
  const setActiveBook = useUiStore((s) => s.setActiveBook);

  // 首次加载时自动选中第一个账本
  const [autoSelected, setAutoSelected] = useState(false);
  useEffect(() => {
    if (!booksLoading && books && books.length > 0 && !activeBook && !autoSelected) {
      setActiveBook(books[0]);
      setAutoSelected(true);
    }
  }, [books, booksLoading, activeBook, autoSelected]);

  // 无账本时快速创建日常账本
  const handleCreatePersonalBook = useCallback(async () => {
    try {
      await createBook.mutateAsync({ name: '日常账本', type: 'personal' });
    } catch (err: any) {
      setSnackbar(`创建失败: ${err?.message ?? '未知错误'}`);
    }
  }, [createBook]);

  // ─── 金额处理 ─────────────────────────────────────────
  const handleNumberPress = useCallback((num: string) => {
    setAmount((prev) => {
      if (num === '.' && prev.includes('.')) return prev;
      if (prev.includes('.') && prev.split('.')[1]!.length >= 2) return prev;
      if (prev === '0' && num !== '.') return num;
      return prev + num;
    });
  }, []);

  const handleDelete = useCallback(() => {
    setAmount((prev) => prev.slice(0, -1));
  }, []);

  const handleClear = useCallback(() => {
    setAmount('');
  }, []);

  const handleOperator = useCallback((op: string) => {
    setAmount((prev) => {
      if (!prev) return prev;
      // 如果最后一位已是运算符，替换
      const last = prev.slice(-1);
      if (last === '+' || last === '-') return prev.slice(0, -1) + op;
      return prev + op;
    });
  }, []);

  // 计算金额表达式（在确认步骤时使用）
  const evaluateAmount = useCallback(() => {
    if (!amount) return null;
    try {
      // 安全计算: 只支持 + - 运算
      const sanitized = amount.replace(/[^0-9+\-.]/g, '');
      const result = Function(`"use strict"; return (${sanitized || '0'})`)();
      const num = parseFloat(String(result));
      if (isNaN(num) || num <= 0) return null;
      return Math.round(num * 100) / 100;
    } catch {
      return null;
    }
  }, [amount]);

  // ─── 日期处理 ─────────────────────────────────────────
  const dateDisplay = useMemo(() => {
    const d = dayjs(billDate);
    const today = dayjs().format('YYYY-MM-DD');
    const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
    if (billDate === today) return '今天';
    if (billDate === yesterday) return '昨天';
    return formatDate(billDate);
  }, [billDate]);

  const handleDatePrev = useCallback(() => {
    setBillDate((prev) => dayjs(prev).subtract(1, 'day').format('YYYY-MM-DD'));
  }, []);

  const handleDateNext = useCallback(() => {
    setBillDate((prev) => {
      const next = dayjs(prev).add(1, 'day').format('YYYY-MM-DD');
      // 不能超过今天
      return next > dayjs().format('YYYY-MM-DD') ? prev : next;
    });
  }, []);

  const handleDateToday = useCallback(() => {
    setBillDate(dayjs().format('YYYY-MM-DD'));
  }, []);

  // ─── 分类选择 ─────────────────────────────────────────
  const handleOpenPicker = useCallback((type: 'expense' | 'income') => {
    setPickForType(type);
    setPickerVisible(true);
  }, []);

  const handleCategorySelect = useCallback((cat: SelectedCategory) => {
    setCategory(cat);
    setPickerVisible(false);
  }, []);

  // ─── 保存 ─────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    const evaluated = evaluateAmount();
    if (!evaluated || !category) {
      setSnackbar('请输入金额并选择分类');
      return;
    }
    if (!activeBook) {
      setSnackbar('请先创建或加入账本');
      return;
    }

    setIsSaving(true);
    try {
      await saveBill({
        bookId: activeBook.id,
        userId: user?.id ?? '',
        parentCategoryName: category.parentName,
        subCategoryName: category.subName,
        type: category.type,
        amount: evaluated,
        note: note || null,
        billDate,
        isShared: activeBook.type === 'shared',
      });

      // 刷新首页账单列表
      // 刷新所有相关缓存
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      queryClient.invalidateQueries({ queryKey: ['monthlySummary'] });
      queryClient.invalidateQueries({ queryKey: ['allBooksSummary'] });
      queryClient.invalidateQueries({ queryKey: ['categoryBreakdown'] });
      queryClient.invalidateQueries({ queryKey: ['monthlyTrend'] });
      queryClient.invalidateQueries({ queryKey: ['engelTrend'] });
      queryClient.invalidateQueries({ queryKey: ['dailyTrend'] });
      queryClient.invalidateQueries({ queryKey: ['yearlyTrend'] });

      setSnackbar(`已记录 ${formatCurrency(evaluated)}`);
      // 重置
      setAmount('');
      setCategory(null);
      setNote('');
    } catch (err: any) {
      setSnackbar(`保存失败: ${err?.message ?? '未知错误'}`);
    } finally {
      setIsSaving(false);
    }
  }, [amount, category, note, evaluateAmount, activeBook, user, queryClient]);

  // ─── 渲染 ─────────────────────────────────────────────

  const displayAmount = evaluateAmount();
  const isExpense = category?.type !== 'income';

  return (
    <View style={styles.container}>
      {/* ═══ 金额输入区 ═══ */}
      <View style={styles.amountArea}>
        {/* 无账本提示 */}
        {!booksLoading && (books ?? []).length === 0 && (
          <View style={styles.noBookBanner}>
            <MaterialCommunityIcons name="notebook-plus" size={32} color={Colors.warning} />
            <Text style={styles.noBookText}>还没有账本，先创建一个吧</Text>
            <Button
              mode="contained"
              onPress={handleCreatePersonalBook}
              loading={createBook.isPending}
              style={styles.createBookBtn}
              contentStyle={styles.createBookBtnContent}
            >
              创建日常账本
            </Button>
          </View>
        )}

        {/* 账本标识/选择器 */}
        {activeBook && (
          <Pressable
            style={styles.bookSelector}
            onPress={() => setBookPickerVisible(true)}
          >
            <MaterialCommunityIcons
              name={activeBook.type === 'personal' ? 'notebook' : 'account-group'}
              size={16}
              color={Colors.primary}
            />
            <Text style={styles.bookSelectorText} numberOfLines={1}>
              {activeBook.name}
            </Text>
            <MaterialCommunityIcons name="chevron-down" size={16} color={Colors.textMuted} />
          </Pressable>
        )}

        {/* 收支切换 */}
        {activeBook && (
          <View style={styles.typeToggle}>
          <Button
            mode={isExpense ? 'contained' : 'outlined'}
            onPress={() => handleOpenPicker('expense')}
            style={[styles.typeBtn, isExpense && styles.typeBtnExpense]}
            labelStyle={styles.typeBtnLabel}
            compact
          >
            支出
          </Button>
          <Button
            mode={!isExpense ? 'contained' : 'outlined'}
            onPress={() => handleOpenPicker('income')}
            style={[styles.typeBtn, !isExpense && styles.typeBtnIncome]}
            labelStyle={styles.typeBtnLabel}
            compact
          >
            收入
          </Button>
        </View>
        )}

        {/* 金额 */}
        <View style={styles.amountDisplay}>
          <Text style={styles.currencySymbol}>¥</Text>
          {amount ? (
            <Text style={[styles.amountText, !isExpense && { color: Colors.income }]}>
              {amount}
            </Text>
          ) : (
            <Text style={styles.amountPlaceholder}>0.00</Text>
          )}
        </View>

        {/* 计算结果 */}
        {amount && /[+\-]/.test(amount) && displayAmount ? (
          <Text style={styles.evaluatedHint}>
            = {formatCurrency(displayAmount)}
          </Text>
        ) : null}

        {/* 已选分类预览 */}
        {category ? (
          <View style={styles.categoryPreview}>
            <CategoryItem
              item={{
                id: 'selected',
                name: `${category.parentName} · ${category.subName}`,
                icon: category.parentIcon,
                engelEligible: category.engelEligible,
              }}
              trailing={
                <IconButton
                  icon="pencil"
                  size={18}
                  onPress={() => handleOpenPicker(category.type)}
                />
              }
            />
          </View>
        ) : (
          amount.length > 0 && (
            <Button
              mode="text"
              onPress={() => handleOpenPicker('expense')}
              textColor={Colors.textMuted}
              icon="shape"
            >
              选择分类
            </Button>
          )
        )}
      </View>

      {/* ═══ 日期选择 ═══ */}
      {amount.length > 0 && (
        <View style={styles.dateRow}>
          <IconButton
            icon="chevron-left"
            size={22}
            onPress={handleDatePrev}
            iconColor={Colors.textSecondary}
          />
          <Button
            mode="text"
            onPress={() => setDatePickerVisible(true)}
            textColor={Colors.text}
            labelStyle={styles.dateLabel}
            compact
            icon="calendar"
          >
            {dateDisplay}
          </Button>
          <IconButton
            icon="chevron-right"
            size={22}
            onPress={handleDateNext}
            iconColor={billDate === dayjs().format('YYYY-MM-DD') ? Colors.textMuted : Colors.textSecondary}
            disabled={billDate === dayjs().format('YYYY-MM-DD')}
          />
        </View>
      )}

      {/* ═══ 备注输入 ═══ */}
      {amount.length > 0 && category && (
        <View style={styles.noteArea}>
          <TextInput
            mode="outlined"
            placeholder="添加备注 (选填)"
            value={note}
            onChangeText={setNote}
            style={styles.noteInput}
            outlineStyle={styles.noteOutline}
            right={<TextInput.Icon icon="camera-outline" onPress={() => {}} />}
          />
        </View>
      )}

      {/* ═══ 保存按钮 ═══ */}
      {category && displayAmount && displayAmount > 0 && (
        <View style={styles.saveArea}>
          <Button
            mode="contained"
            onPress={handleSave}
            style={styles.saveButton}
            contentStyle={styles.saveButtonContent}
            labelStyle={styles.saveButtonLabel}
            loading={isSaving}
            disabled={isSaving}
          >
            {isSaving ? '保存中...' : `记录 ${formatCurrency(displayAmount)}`}
          </Button>
        </View>
      )}

      {/* ═══ 数字键盘 ═══ */}
      <Surface style={styles.keyboard} elevation={0}>
        {KEYBOARD_ROWS.map((row, rowIdx) => (
          <View key={rowIdx} style={styles.keyRow}>
            {row.map((key) => {
              if (key === 'backspace') {
                return (
                  <IconButton
                    key={key}
                    icon="backspace-outline"
                    size={28}
                    onPress={handleDelete}
                    onLongPress={handleClear}
                    style={styles.keyButton}
                  />
                );
              }
              if (key === '+' || key === '-') {
                return (
                  <IconButton
                    key={key}
                    icon={key === '+' ? 'plus' : 'minus'}
                    size={22}
                    onPress={() => handleOperator(key)}
                    style={styles.keyButton}
                    iconColor={Colors.textSecondary}
                  />
                );
              }
              if (key === 'done') {
                return (
                  <IconButton
                    key={key}
                    icon="check-circle"
                    size={38}
                    onPress={() => {
                      if (!amount) return;
                      // 如果有结果且没选分类，弹出选择器
                      if (!category) {
                        handleOpenPicker('expense');
                      } else {
                        handleSave();
                      }
                    }}
                    style={styles.doneButton}
                    iconColor={Colors.primary}
                  />
                );
              }
              return (
                <Text
                  key={key}
                  style={[
                    styles.keyText,
                    key === '.' && styles.keyTextDot,
                  ]}
                  onPress={() => handleNumberPress(key)}
                  suppressHighlighting
                >
                  {key}
                </Text>
              );
            })}
          </View>
        ))}
      </Surface>

      {/* ═══ 分类选择器弹窗 ═══ */}
      <CategoryPicker
        visible={pickerVisible}
        onSelect={handleCategorySelect}
        onClose={() => setPickerVisible(false)}
        defaultType={pickForType}
      />

      {/* ═══ 账本选择器弹窗 ═══ */}
      <BookPicker
        visible={bookPickerVisible}
        books={books ?? []}
        activeBook={activeBook}
        onSelect={(book) => {
          setActiveBook(book);
          setBookPickerVisible(false);
        }}
        onClose={() => setBookPickerVisible(false)}
      />

      {/* ═══ 日期选择器弹窗 ═══ */}
      <DatePickerModal
        visible={datePickerVisible}
        date={billDate}
        onSelect={setBillDate}
        onClose={() => setDatePickerVisible(false)}
      />

      {/* ═══ Snackbar ═══ */}
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

// ─── 样式 ──────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  // 金额区域
  amountArea: {
    flex: 2.2,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: Spacing.xl,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  typeToggle: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  typeBtn: {
    borderRadius: 20,
    minWidth: 72,
  },
  typeBtnExpense: {
    backgroundColor: Colors.expense,
  },
  typeBtnIncome: {
    backgroundColor: Colors.income,
  },
  typeBtnLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  amountDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencySymbol: {
    fontSize: FontSize.amount,
    fontWeight: '300',
    color: Colors.textSecondary,
    marginRight: 4,
  },
  amountText: {
    fontSize: FontSize.amountLg,
    fontWeight: '700',
    color: Colors.text,
  },
  amountPlaceholder: {
    fontSize: FontSize.amountLg,
    fontWeight: '300',
    color: Colors.textMuted,
  },
  evaluatedHint: {
    fontSize: FontSize.md,
    color: Colors.textMuted,
    fontWeight: '400',
  },
  categoryPreview: {
    marginTop: Spacing.sm,
    width: '100%',
    maxWidth: 280,
  },
  // 日期
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.xs,
  },
  dateLabel: {
    fontSize: FontSize.md,
    fontWeight: '500',
  },
  // 备注
  noteArea: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  noteInput: {
    backgroundColor: Colors.surface,
  },
  noteOutline: {
    borderRadius: BorderRadius.lg,
  },
  // 保存
  saveArea: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  saveButton: {
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primary,
  },
  saveButtonContent: {
    height: 50,
  },
  saveButtonLabel: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // 键盘
  keyboard: {
    flex: 2.8,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingTop: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  keyRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: Spacing.xs,
  },
  keyText: {
    fontSize: FontSize.xxl,
    fontWeight: '500',
    color: Colors.text,
    width: 72,
    height: 56,
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  keyTextDot: {
    fontSize: 30,
  },
  keyButton: {
    width: 72,
    height: 56,
    margin: 0,
  },
  doneButton: {
    width: 72,
    height: 56,
    margin: 0,
  },
  snackbar: {
    marginBottom: 80,
  },
  // 无账本提示
  noBookBanner: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    backgroundColor: Colors.warning + '10',
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  noBookText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  createBookBtn: {
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
  },
  createBookBtnContent: {
    height: 40,
    paddingHorizontal: Spacing.lg,
  },
  // 账本选择器
  bookSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary + '12',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    alignSelf: 'center',
    marginBottom: Spacing.sm,
  },
  bookSelectorText: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: '500',
    maxWidth: 160,
  },
});
