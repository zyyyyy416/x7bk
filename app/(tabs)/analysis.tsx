import { useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Text, Card, Chip, ActivityIndicator, Dialog, Portal, Button, List } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PieChart, LineChart, BarChart } from 'react-native-gifted-charts';
import { Colors, Spacing, FontSize, BorderRadius } from '@/theme';
import { formatCurrency } from '@/utils/currency';
import { getCurrentMonth } from '@/utils/date';
import { useBooks } from '@/hooks/useBooks';
import { useMonthlySummary, useAllBooksSummary, useCategoryBreakdown, useAllBooksCategoryBreakdown, useSubCategoryBreakdown, useMonthlyTrend, useEngelTrend, useComparison } from '@/hooks/useAnalysis';
import { useUiStore } from '@/stores/uiStore';
import DatePickerModal from '@/components/ui/DatePickerModal';
import type { Book } from '@/types';

// 自定义色系
const CHART_COLORS = [
  '#C5D9F2', '#7CA4D6', '#F2A8B6', '#A6D9B6', '#FCE0A6',
  '#E6F0FA', '#FDECF0', '#EBF7F2', '#FFF8EB', '#A83232',
];

const TIME_FILTERS = ['本周', '本月', '近3月', '本年', '自定义'];

export default function AnalysisScreen() {
  const { data: books } = useBooks();
  const setActiveBook = useUiStore((s) => s.setActiveBook);
  const currentMonth = getCurrentMonth();

  const [timeFilter, setTimeFilter] = useState('本月');
  const [bookFilter, setBookFilter] = useState<string>('__all__');
  const [bookPickerVisible, setBookPickerVisible] = useState(false);
  const [customStart, setCustomStart] = useState<string | null>(null);
  const [customEnd, setCustomEnd] = useState<string | null>(null);
  const [datePickerTarget, setDatePickerTarget] = useState<'start' | 'end' | null>(null);
  const [drillCategory, setDrillCategory] = useState<{ id: string; name: string } | null>(null);
  const [compareMode, setCompareMode] = useState<'mom' | 'yoy'>('mom');

  const showAll = bookFilter === '__all__';
  const bookIds = useMemo(() => (books ?? []).map((b: Book) => b.id), [books]);
  const selectedBook = showAll ? null : (books ?? []).find((b: Book) => b.id === bookFilter);

  // 使用当前月份 (自定义时间范围暂只影响占位，实际查询仍用 currentMonth)
  const { data: singleSummary, isLoading: singleLoading } = useMonthlySummary(
    showAll ? '' : bookFilter, currentMonth,
  );
  const { data: allSummary, isLoading: allLoading } = useAllBooksSummary(bookIds, currentMonth);
  const displaySum = showAll ? allSummary : singleSummary;

  const chartBookId = showAll ? '' : bookFilter;
  const { data: categoryData } = useCategoryBreakdown(chartBookId, currentMonth);
  const { data: allCategoryData } = useAllBooksCategoryBreakdown(bookIds, currentMonth);
  const displayCategoryData = showAll ? allCategoryData : categoryData;
  const { data: trendData } = useMonthlyTrend(showAll ? (bookIds[0] ?? '') : bookFilter);
  const { data: engelData } = useEngelTrend(showAll ? (bookIds[0] ?? '') : bookFilter);
  // 下钻 & 对比 (全部时用第一个账本)
  const drillBookId = showAll ? (bookIds[0] ?? '') : bookFilter;
  const { data: subData } = useSubCategoryBreakdown(drillBookId, currentMonth, drillCategory?.id ?? '');
  const { data: comparison } = useComparison(drillBookId, currentMonth, compareMode);

  // 饼图
  const pieData = useMemo(() => (displayCategoryData ?? []).map((c: any, i: number) => ({
    value: Number(c.total),
    text: c.name.length > 4 ? c.name.slice(0, 4) : c.name,
    color: CHART_COLORS[i % CHART_COLORS.length]!,
  })), [displayCategoryData]);

  // 趋势
  const lineData = useMemo(() => (trendData ?? []).map((d: any) => ({
    value: Number(d.expense),
    label: d.month.slice(5),
  })), [trendData]);

  const engelLineData = useMemo(() => (engelData ?? []).map((d: any) => ({
    value: Number(d.coefficient),
    label: d.month.slice(5),
  })), [engelData]);

  // 下钻饼图数据
  const subPieData = useMemo(() => (subData ?? []).map((c: any, i: number) => ({
    value: Number(c.total),
    text: c.name.length > 4 ? c.name.slice(0, 4) : c.name,
    color: CHART_COLORS[i % CHART_COLORS.length]!,
  })), [subData]);

  // 对比柱状图
  const barData = useMemo(() => {
    if (!comparison) return [];
    return [
      { value: comparison.current.expense, label: '本月支出', frontColor: Colors.expense },
      { value: comparison.compare.expense, label: comparison.compareLabel + '支出', frontColor: Colors.textMuted },
      { value: comparison.current.income, label: '本月收入', frontColor: Colors.income },
      { value: comparison.compare.income, label: comparison.compareLabel + '收入', frontColor: '#81ECEC' },
    ];
  }, [comparison]);

  return (
    <ScrollView style={styles.container}>
      {/* ═══ 顶部筛选区 ═══ */}
      <View style={styles.header}>
        {/* 第一行: 账本选择 (下拉) */}
        <Pressable style={styles.dropdown} onPress={() => setBookPickerVisible(true)}>
          <MaterialCommunityIcons name="book-open-variant" size={18} color={Colors.primary} />
          <Text style={styles.dropdownText} numberOfLines={1}>
            {showAll ? '全部账本' : selectedBook?.name ?? '选择账本'}
          </Text>
          <MaterialCommunityIcons name="chevron-down" size={18} color={Colors.textMuted} />
        </Pressable>

        {/* 第二行: 时间筛选 */}
        <View style={styles.chipRow}>
          {TIME_FILTERS.map((filter) => (
            <Chip
              key={filter}
              selected={filter === timeFilter}
              onPress={() => {
                setTimeFilter(filter);
                if (filter === '自定义') {
                  setDatePickerTarget('start');
                }
              }}
              style={styles.chip}
              showSelectedOverlay
              compact
            >
              {filter}
            </Chip>
          ))}
        </View>
      </View>

      {/* ═══ 月度汇总 ═══ */}
      <Card style={styles.card} mode="elevated">
        <Card.Content>
          <Text variant="titleMedium" style={styles.cardTitle}>
            {showAll ? '全部账本 · ' : ''}月度概览
          </Text>
          {singleLoading || allLoading ? (
            <View style={styles.loadingWrap}><ActivityIndicator color={Colors.primary} /></View>
          ) : displaySum ? (
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
          ) : (
            <View style={styles.chartPlaceholder}><Text style={styles.placeholderText}>暂无数据</Text></View>
          )}
        </Card.Content>
      </Card>

      {/* ═══ 恩格尔系数 ═══ */}
      <Card style={[styles.card, { backgroundColor: '#FFF5F5' }]} mode="elevated">
        <Card.Content>
          <View style={styles.engelRow}>
            <View style={styles.engelLeft}>
              <View style={styles.cardHeaderRow}>
                <MaterialCommunityIcons name="food-fork-drink" size={18} color="#FF6B6B" />
                <Text style={styles.cardTitle}>恩格尔系数</Text>
              </View>
              {displaySum && (
                <>
                  <Text style={styles.engelLabel}>
                    {'⭐'.repeat(displaySum.engelLevel.stars)} {displaySum.engelLevel.label}
                  </Text>
                  <Text style={styles.engelDesc}>{displaySum.engelLevel.description}</Text>
                </>
              )}
            </View>
            {displaySum ? (
              <Text style={styles.engelValue}>{displaySum.engelCoefficient}%</Text>
            ) : (
              <Text style={styles.engelValue}>--</Text>
            )}
          </View>
          {engelLineData.length > 0 && (
            <View style={{ marginTop: Spacing.sm, height: 80 }}>
              <LineChart
                data={engelLineData} height={70} color="#FF6B6B" thickness={2} hideDataPoints
                startFillColor="#FF6B6B20" endFillColor="#FF6B6B02" startOpacity={0.3} endOpacity={0}
                noOfSections={2}
                yAxisTextStyle={{ color: Colors.textMuted, fontSize: 9 }}
                xAxisLabelTextStyle={{ color: Colors.textMuted, fontSize: 9 }}
                hideRules
              />
            </View>
          )}
        </Card.Content>
      </Card>

      {/* ═══ 支出分类占比 (支持下钻) ═══ */}
      <Card style={styles.card} mode="elevated">
        <Card.Content>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm }}>
            {drillCategory && (
              <Button mode="text" icon="arrow-left" onPress={() => setDrillCategory(null)} compact>{drillCategory.name}</Button>
            )}
            <Text variant="titleMedium" style={[styles.cardTitle, { marginBottom: 0 }]}>
              {drillCategory ? '二级分类' : '支出分类占比'}
            </Text>
          </View>
          {!drillCategory ? (
            pieData.length > 0 ? (
              <View style={styles.chartWrap}>
                <PieChart
                  data={pieData} donut radius={100} innerRadius={55}
                  centerLabelComponent={() => (
                    <Text style={{ textAlign: 'center', fontWeight: '700', fontSize: FontSize.sm, color: Colors.text }}>
                      {formatCurrency(displaySum?.totalExpense ?? 0)}
                    </Text>
                  )}
                  onPress={(item: any, index: number) => {
                    const cat = (displayCategoryData ?? [])[index];
                    if (cat) setDrillCategory({ id: (cat as any).id, name: cat.name });
                  }}
                />
                <View style={styles.legendRow}>
                  {pieData.map((d: any, idx: number) => (
                    <Pressable key={d.text} style={styles.legendItem} onPress={() => {
                      const cat = (displayCategoryData ?? [])[idx];
                      if (cat) setDrillCategory({ id: (cat as any).id, name: cat.name });
                    }}>
                      <View style={[styles.legendDot, { backgroundColor: d.color }]} />
                      <Text style={styles.legendText} numberOfLines={1}>{d.text}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : (
              <View style={styles.chartPlaceholder}><Text style={styles.placeholderText}>暂无支出数据</Text></View>
            )
          ) : (
            subPieData.length > 0 ? (
              <View style={styles.chartWrap}>
                <PieChart
                  data={subPieData} donut radius={100} innerRadius={55}
                  centerLabelComponent={() => (
                    <Text style={{ textAlign: 'center', fontWeight: '600', fontSize: FontSize.xs, color: Colors.text }}>
                      {drillCategory.name}
                    </Text>
                  )}
                />
                <View style={styles.legendRow}>
                  {subPieData.map((d: any) => (
                    <View key={d.text} style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: d.color }]} />
                      <Text style={styles.legendText} numberOfLines={1}>{d.text}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : (
              <View style={styles.chartPlaceholder}><Text style={styles.placeholderText}>该分类下暂无数据</Text></View>
            )
          )}
        </Card.Content>
      </Card>

      {/* ═══ 支出趋势 ═══ */}
      <Card style={styles.card} mode="elevated">
        <Card.Content>
          <Text variant="titleMedium" style={styles.cardTitle}>
            近{trendData?.length ?? 6}月支出趋势
          </Text>
          {lineData.length > 0 ? (
            <View style={styles.chartWrap}>
              <LineChart
                data={lineData} height={180} color={Colors.expense} dataPointsColor={Colors.expense}
                thickness={2} startFillColor={Colors.expense + '20'} endFillColor={Colors.expense + '02'}
                startOpacity={0.4} endOpacity={0.1} noOfSections={4}
                yAxisTextStyle={{ color: Colors.textMuted, fontSize: 10 }}
                xAxisLabelTextStyle={{ color: Colors.textMuted, fontSize: 10 }}
                hideRules
              />
            </View>
          ) : (
            <View style={styles.chartPlaceholder}><Text style={styles.placeholderText}>暂无趋势数据</Text></View>
          )}
        </Card.Content>
      </Card>

      {/* ═══ 同比环比 ═══ */}
      <Card style={styles.card} mode="elevated">
        <Card.Content>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm }}>
            <Text variant="titleMedium" style={[styles.cardTitle, { marginBottom: 0 }]}>收支对比</Text>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              <Chip selected={compareMode === 'mom'} onPress={() => setCompareMode('mom')} compact style={{ borderRadius: 20 }}>环比</Chip>
              <Chip selected={compareMode === 'yoy'} onPress={() => setCompareMode('yoy')} compact style={{ borderRadius: 20 }}>同比</Chip>
            </View>
          </View>
          {barData.length > 0 ? (
            <View style={styles.chartWrap}>
              <BarChart
                data={barData}
                height={180}
                barWidth={38}
                spacing={20}
                noOfSections={4}
                yAxisTextStyle={{ color: Colors.textMuted, fontSize: 10 }}
                xAxisLabelTextStyle={{ color: Colors.textMuted, fontSize: 10 }}
                hideRules
              />
            </View>
          ) : (
            <View style={styles.chartPlaceholder}><Text style={styles.placeholderText}>暂无对比数据</Text></View>
          )}
        </Card.Content>
      </Card>

      <View style={styles.bottomSpacer} />

      {/* ═══ 账本选择弹窗 ═══ */}
      <Portal>
        <Dialog visible={bookPickerVisible} onDismiss={() => setBookPickerVisible(false)}>
          <Dialog.Title>选择账本</Dialog.Title>
          <Dialog.Content style={{ paddingHorizontal: 0 }}>
            <List.Item
              title="全部账本"
              left={(props: any) => <List.Icon {...props} icon="chart-pie" />}
              onPress={() => { setBookFilter('__all__'); setBookPickerVisible(false); }}
              style={bookFilter === '__all__' && { backgroundColor: Colors.primary + '12' }}
            />
            {(books ?? []).map((b: Book) => (
              <List.Item
                key={b.id}
                title={b.name}
                description={b.type === 'personal' ? '个人账本' : '共享账本'}
                left={(props: any) => (
                  <List.Icon {...props} icon={b.type === 'personal' ? 'notebook' : 'account-group'} />
                )}
                onPress={() => { setBookFilter(b.id); setActiveBook(b); setBookPickerVisible(false); }}
                style={b.id === bookFilter && { backgroundColor: Colors.primary + '12' }}
              />
            ))}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setBookPickerVisible(false)}>取消</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* ═══ 日期选择器 ═══ */}
      <DatePickerModal
        visible={datePickerTarget !== null}
        date={datePickerTarget === 'start' ? (customStart ?? currentMonth + '-01') : (customEnd ?? currentMonth + '-28')}
        onSelect={(d) => {
          if (datePickerTarget === 'start') {
            setCustomStart(d);
            setDatePickerTarget('end');
          } else {
            setCustomEnd(d);
            setDatePickerTarget(null);
          }
        }}
        onClose={() => setDatePickerTarget(null)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xxl, paddingBottom: Spacing.md },
  // 下拉
  dropdown: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 2,
    borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.sm,
  },
  dropdownText: { flex: 1, fontSize: FontSize.md, fontWeight: '600', color: Colors.primary },
  // 时间
  chipRow: { flexDirection: 'row', gap: Spacing.xs, flexWrap: 'wrap' },
  chip: { borderRadius: 20 },
  // 汇总
  card: { marginHorizontal: Spacing.md, marginBottom: Spacing.md, borderRadius: BorderRadius.lg },
  cardTitle: { fontWeight: '600', marginBottom: Spacing.md, marginLeft: Spacing.xs },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  summaryRow: { flexDirection: 'row', alignItems: 'center' },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryDivider: { width: 1, height: 28, backgroundColor: Colors.divider },
  summaryLabel: { fontSize: FontSize.xs, color: Colors.textMuted, marginBottom: 4 },
  summaryAmount: { fontSize: FontSize.lg, fontWeight: '700' },
  // 恩格尔
  engelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  engelLeft: { flex: 1 },
  engelLabel: { fontSize: FontSize.sm, color: Colors.textSecondary, marginLeft: 28 },
  engelDesc: { fontSize: FontSize.xs, color: Colors.textMuted, marginLeft: 28, marginTop: 2 },
  engelValue: { fontSize: 40, fontWeight: '800', color: '#FF6B6B' },
  // 图表
  chartWrap: { alignItems: 'center', paddingVertical: Spacing.sm },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: Spacing.md, marginTop: Spacing.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: FontSize.xs, color: Colors.textSecondary, maxWidth: 72 },
  chartPlaceholder: { height: 120, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: Colors.border },
  placeholderText: { fontSize: FontSize.md, color: Colors.textMuted, marginTop: Spacing.sm },
  loadingWrap: { height: 60, alignItems: 'center', justifyContent: 'center' },
  bottomSpacer: { height: Spacing.xxl },
});
