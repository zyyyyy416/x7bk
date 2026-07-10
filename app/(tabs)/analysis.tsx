import { useState, useMemo, useRef, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Dimensions } from 'react-native';
import { Text, Card, Chip, ActivityIndicator, Dialog, Portal, Button, List, IconButton, SegmentedButtons } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LineChart, PieChart } from 'react-native-gifted-charts';
import { Colors, Spacing, FontSize, BorderRadius } from '@/theme';
import { formatCurrency } from '@/utils/currency';
import dayjs from 'dayjs';
import { useBooks } from '@/hooks/useBooks';
import { useMonthlySummary, useAllBooksSummary, useCategoryBreakdown, useAllBooksCategoryBreakdown, useSubCategoryBreakdown, useEngelTrend, useDailyTrend, useYearlyTrend } from '@/hooks/useAnalysis';
import { useUiStore } from '@/stores/uiStore';
import { mapIcon, getCategoryColor } from '@/components/ui/CategoryItem';
import DatePickerModal from '@/components/ui/DatePickerModal';
import type { Book } from '@/types';

function getTimelineOptions(period: string) {
  const now = dayjs();
  if (period === 'week') {
    return Array.from({ length: 4 }, (_, i) => {
      const start = now.subtract(i, 'week').startOf('week');
      const end = start.endOf('week');
      return { label: `${start.format('M/D')}-${end.format('M/D')}`, start: start.format('YYYY-MM-DD'), end: end.format('YYYY-MM-DD') };
    }).reverse();
  }
  if (period === 'month') {
    return Array.from({ length: 6 }, (_, i) => {
      const m = now.subtract(i, 'month');
      return { label: m.format('YYYY-MM'), start: m.startOf('month').format('YYYY-MM-DD'), end: m.endOf('month').format('YYYY-MM-DD') };
    }).reverse();
  }
  if (period === 'year') {
    return Array.from({ length: 3 }, (_, i) => {
      const y = now.subtract(i, 'year');
      return { label: y.format('YYYY'), start: y.startOf('year').format('YYYY-MM-DD'), end: y.endOf('year').format('YYYY-MM-DD') };
    }).reverse();
  }
  return [];
}

export default function AnalysisScreen() {
  const { data: books } = useBooks();
  const setActiveBook = useUiStore((s) => s.setActiveBook);

  const [timePeriod, setTimePeriod] = useState<string>('week');
  const timelineInitial = useMemo(() => getTimelineOptions('week'), []);
  const [timeIndex, setTimeIndex] = useState(timelineInitial.length - 1);
  const [bookFilter, setBookFilter] = useState<string>('__all__');
  const [bookPickerVisible, setBookPickerVisible] = useState(false);
  const [customStart, setCustomStart] = useState<string | null>(null);
  const [customEnd, setCustomEnd] = useState<string | null>(null);
  const [datePickerTarget, setDatePickerTarget] = useState<'start' | 'end' | null>(null);
  const [chartView, setChartView] = useState<'list' | 'donut'>('list');
  const timelineRef = useRef<ScrollView>(null);

  const scrollTimelineToEnd = useCallback(() => {
    setTimeout(() => timelineRef.current?.scrollToEnd({ animated: false }), 100);
  }, []);

  const timelineOptions = useMemo(() => getTimelineOptions(timePeriod), [timePeriod]);
  const activeRange = timelineOptions[timeIndex] ?? { start: dayjs().startOf('month').format('YYYY-MM-DD'), end: dayjs().endOf('month').format('YYYY-MM-DD') };
  const rangeStart = customStart ?? activeRange.start;
  const rangeEnd = customEnd ?? activeRange.end;

  const showAll = bookFilter === '__all__';
  const bookIds = useMemo(() => (books ?? []).map((b: Book) => b.id), [books]);
  const selectedBook = showAll ? null : (books ?? []).find((b: Book) => b.id === bookFilter);
  const queryBook = showAll ? '' : bookFilter;
  const drillBookId = showAll ? (bookIds[0] ?? '') : bookFilter;

  // 汇总
  const { data: singleSummary } = useMonthlySummary(queryBook, rangeStart, rangeEnd);
  const { data: allSummary } = useAllBooksSummary(bookIds, rangeStart, rangeEnd);
  const displaySum = showAll ? allSummary : singleSummary;

  // 分类占比 (当前)
  const { data: categoryData } = useCategoryBreakdown(queryBook, rangeStart, rangeEnd);
  const { data: allCategoryData } = useAllBooksCategoryBreakdown(bookIds, rangeStart, rangeEnd);
  const displayCategoryData = showAll ? allCategoryData : categoryData;
  const totalExpense = useMemo(() => (displayCategoryData ?? []).reduce((s: number, c: any) => s + Number(c.total), 0), [displayCategoryData]);
  const pieData = useMemo(() => (displayCategoryData ?? []).map((c: any, i: number) => ({
    value: Number(c.total), label: c.name.length > 4 ? c.name.slice(0, 4) : c.name,
    color: [Colors.primary, Colors.expense, Colors.warning, Colors.info, '#A29BFE', '#FD79A8', '#00CEC9', '#FDCB6E', '#636E72', '#E17055'][i % 10]!,
  })), [displayCategoryData]);

  // 分类占比 (上一时段用于环比)
  const prevStart = dayjs(rangeStart).subtract(1, timePeriod === 'year' ? 'year' : timePeriod === 'week' ? 'week' : 'month').format('YYYY-MM-DD');
  const prevEnd = dayjs(rangeEnd).subtract(1, timePeriod === 'year' ? 'year' : timePeriod === 'week' ? 'week' : 'month').format('YYYY-MM-DD');
  const prevQueryBook = showAll ? '' : bookFilter;
  const { data: prevSingleCat } = useCategoryBreakdown(prevQueryBook, prevStart, prevEnd);
  const { data: prevAllCat } = useAllBooksCategoryBreakdown(bookIds, prevStart, prevEnd);
  const prevCat = showAll ? prevAllCat : prevSingleCat;
  const prevMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of (prevCat ?? [])) { m.set(c.name, c.total); }
    return m;
  }, [prevCat]);

  // 支出趋势 (动态按时间范围)
  const trendYear = parseInt(rangeStart.slice(0, 4), 10);
  const { data: dailyTrend } = useDailyTrend(drillBookId, rangeStart, rangeEnd);
  const { data: yearlyTrend } = useYearlyTrend(drillBookId, trendYear);
  const { data: engelData } = useEngelTrend(drillBookId);

  const trendIsYear = timePeriod === 'year';
  const screenW = Dimensions.get('window').width;
  const chartW = screenW - 28;
  const lineData = useMemo(() => {
    if (trendIsYear) {
      return (yearlyTrend ?? []).map((d: any) => ({ value: d.expense, label: d.month, dataPointText: d.expense > 0 ? String(d.expense) : '' }));
    }
    return (dailyTrend ?? []).map((d: any, i: number) => {
      const day = parseInt(d.date.slice(8), 10) || parseInt(d.date.slice(5), 10);
      const showLabel = timePeriod === 'month' ? (i === 0 || day % 5 === 0) : true;
      return {
        value: d.expense,
        label: showLabel ? d.date.slice(5) : '',
        dataPointText: d.expense > 0 ? String(d.expense) : '',
      };
    });
  }, [dailyTrend, yearlyTrend, trendIsYear, timePeriod]);
  const trendSpacing = Math.max((chartW - 30) / Math.max(lineData.length, 1) - 2, 8);

  const engelLineData = useMemo(() => (engelData ?? []).map((d: any) => ({ value: Number(d.coefficient), label: d.month.slice(5) })), [engelData]);

  return (
    <ScrollView style={styles.container}>
      {/* ═══ 筛选 ═══ */}
      <View style={styles.header}>
        <Pressable style={styles.dropdown} onPress={() => setBookPickerVisible(true)}>
          <MaterialCommunityIcons name="book-open-variant" size={16} color={Colors.primary} />
          <Text style={styles.dropdownText} numberOfLines={1}>{showAll ? '全部账本' : selectedBook?.name ?? '选择'}</Text>
          <MaterialCommunityIcons name="chevron-down" size={16} color={Colors.textMuted} />
        </Pressable>
        <SegmentedButtons value={timePeriod}
          onValueChange={(v) => { setTimePeriod(v); setTimeIndex(getTimelineOptions(v).length - 1); setTimeout(scrollTimelineToEnd, 150); }}
          buttons={[{ value: 'week', label: '周' }, { value: 'month', label: '月' }, { value: 'year', label: '年' }, { value: 'custom', label: '自定义' }]}
          style={styles.periodSegments} />
        {timePeriod !== 'custom' ? (
          <ScrollView ref={timelineRef} horizontal showsHorizontalScrollIndicator={false} style={styles.timeline} onContentSizeChange={scrollTimelineToEnd}>
            {timelineOptions.map((opt, idx) => (
              <Chip key={opt.label} selected={idx === timeIndex} onPress={() => setTimeIndex(idx)} style={styles.timelineChip} compact>{opt.label}</Chip>
            ))}
          </ScrollView>
        ) : (
          <View style={styles.customRange}>
            <Button mode="outlined" onPress={() => setDatePickerTarget('start')} compact style={{ flex: 1 }}>{rangeStart}</Button>
            <Text style={{ color: Colors.textMuted, marginHorizontal: 4 }}>~</Text>
            <Button mode="outlined" onPress={() => setDatePickerTarget('end')} compact style={{ flex: 1 }}>{rangeEnd}</Button>
          </View>
        )}
      </View>

      {/* ═══ 月度概览 ═══ */}
      <Card style={styles.card} mode="elevated">
        <Card.Content style={{ paddingVertical: Spacing.sm }}>
          <Text variant="titleMedium" style={styles.cardTitle}>{showAll ? '全部 · ' : ''}概览</Text>
          {displaySum ? (
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}><Text style={styles.summaryLabel}>支出</Text>
                <Text style={[styles.summaryAmount, { color: Colors.expense }]}>{formatCurrency(displaySum.totalExpense)}</Text></View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}><Text style={styles.summaryLabel}>收入</Text>
                <Text style={[styles.summaryAmount, { color: Colors.income }]}>{formatCurrency(displaySum.totalIncome)}</Text></View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}><Text style={styles.summaryLabel}>结余</Text>
                <Text style={[styles.summaryAmount, { color: Colors.text }]}>{formatCurrency(displaySum.balance)}</Text></View>
            </View>
          ) : <View style={styles.empty}><Text style={styles.emptyText}>暂无数据</Text></View>}
        </Card.Content>
      </Card>

      {/* ═══ 恩格尔 ═══ */}
      <Card style={[styles.card, { backgroundColor: '#FFF5F5' }]} mode="elevated">
        <Card.Content style={{ paddingVertical: Spacing.sm }}>
          <View style={styles.engelRow}>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><MaterialCommunityIcons name="food-fork-drink" size={16} color="#FF6B6B" /><Text style={styles.cardTitle}>恩格尔</Text></View>
              {displaySum && <Text style={styles.engelSub}>{'⭐'.repeat(displaySum.engelLevel.stars)} {displaySum.engelLevel.label}</Text>}
            </View>
            <Text style={styles.engelValue}>{displaySum?.engelCoefficient ?? '--'}%</Text>
          </View>
          {engelLineData.length > 0 && (
            <View style={{ height: 50, marginTop: 4 }}>
              <LineChart data={engelLineData} height={45} color="#FF6B6B" thickness={2} hideDataPoints startFillColor="#FF6B6B15" endFillColor="#FF6B6B00" startOpacity={0.2} endOpacity={0} noOfSections={2} yAxisTextStyle={{ color: Colors.textMuted, fontSize: 8 }} xAxisLabelTextStyle={{ color: Colors.textMuted, fontSize: 8 }} hideRules />
            </View>
          )}
        </Card.Content>
      </Card>

      {/* ═══ 支出趋势 ═══ */}
      <Card style={styles.card} mode="elevated">
        <Card.Content style={{ paddingVertical: Spacing.sm }}>
          <Text variant="titleMedium" style={styles.cardTitle}>支出趋势</Text>
          {lineData.length > 0 ? (
            <LineChart data={lineData} height={100} color={Colors.expense} dataPointsColor={Colors.expense}
                yAxisOffset={0} spacing={trendSpacing} initialSpacing={8} endSpacing={8}
                isAnimated={false}
                thickness={2} startFillColor={Colors.expense + '15'} endFillColor={Colors.expense + '00'}
                startOpacity={0.3} endOpacity={0} noOfSections={3}
                yAxisTextStyle={{ color: Colors.textMuted, fontSize: 10 }}
                xAxisLabelTextStyle={{ color: Colors.textMuted, fontSize: 10 }}
                hideRules
              />
          ) : <View style={styles.empty}><Text style={styles.emptyText}>暂无数据</Text></View>}
        </Card.Content>
      </Card>

      {/* ═══ 分类占比 — 行列表 ═══ */}
      <Card style={styles.card} mode="elevated">
        <Card.Content style={{ paddingVertical: Spacing.sm }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text variant="titleMedium" style={[styles.cardTitle, { marginBottom: 0 }]}>分类占比</Text>
            <IconButton icon={chartView === 'list' ? 'chart-donut' : 'view-list'} size={20} onPress={() => setChartView(chartView === 'list' ? 'donut' : 'list')} />
          </View>
          {chartView === 'donut' ? (
            pieData.length > 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: Spacing.sm }}>
                <PieChart data={pieData} donut radius={80} innerRadius={45}
                  centerLabelComponent={() => (<Text style={{ textAlign: 'center', fontWeight: '700', fontSize: 12, color: Colors.text }}>{formatCurrency(totalExpense)}</Text>)}
                />
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 8 }}>
                  {pieData.map((d: any) => (
                    <View key={d.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: d.color }} />
                      <Text style={{ fontSize: 10, color: Colors.textSecondary }}>{d.label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : <View style={styles.empty}><Text style={styles.emptyText}>暂无数据</Text></View>
          ) : (
          (displayCategoryData ?? []).map((cat: any) => {
            const pct = totalExpense > 0 ? Math.round((Number(cat.total) / totalExpense) * 100) : 0;
            const prevTotal = prevMap.get(cat.name) ?? 0;
            const delta = prevTotal > 0 ? Math.round(((Number(cat.total) - prevTotal) / prevTotal) * 100) : 0;
            const color = getCategoryColor(cat.icon);
            return (
              <View key={cat.name} style={styles.catRow}>
                <View style={[styles.catIcon, { backgroundColor: color + '18' }]}>
                  <MaterialCommunityIcons name={mapIcon(cat.icon)} size={18} color={color} />
                </View>
                <View style={styles.catInfo}>
                  <View style={styles.catTop}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Text style={styles.catName}>{cat.name}</Text>
                      {prevTotal > 0 && delta !== 0 && (
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <MaterialCommunityIcons name={delta > 0 ? 'arrow-up' : 'arrow-down'} size={11} color={delta > 0 ? Colors.expense : Colors.income} />
                          <Text style={{ fontSize: 10, fontWeight: '600', color: delta > 0 ? Colors.expense : Colors.income }}>{Math.abs(delta)}%</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.catPct, { color }]}>{pct}%</Text>
                  </View>
                  <View style={styles.progressBg}>
                    <View style={[styles.progressFill, { backgroundColor: color, width: `${Math.max(pct, 2)}%` }]} />
                  </View>
                </View>
                <Text style={styles.catAmount}>{formatCurrency(Number(cat.total))}</Text>
              </View>
            );
          })
          )}
          {chartView === 'list' && (!displayCategoryData || displayCategoryData.length === 0) && <View style={styles.empty}><Text style={styles.emptyText}>暂无数据</Text></View>}
        </Card.Content>
      </Card>

      <View style={{ height: 60 }} />

      {/* ═══ 弹窗 ═══ */}
      <Portal>
        <Dialog visible={bookPickerVisible} onDismiss={() => setBookPickerVisible(false)}>
          <Dialog.Title>选择账本</Dialog.Title>
          <Dialog.Content style={{ paddingHorizontal: 0 }}>
            <List.Item title="全部账本" left={(props: any) => <List.Icon {...props} icon="chart-pie" />}
              onPress={() => { setBookFilter('__all__'); setBookPickerVisible(false); }}
              style={bookFilter === '__all__' && { backgroundColor: Colors.primary + '12' }} />
            {(books ?? []).map((b: Book) => (
              <List.Item key={b.id} title={b.name} description={b.type === 'personal' ? '个人' : '共享'}
                left={(props: any) => <List.Icon {...props} icon={b.type === 'personal' ? 'notebook' : 'account-group'} />}
                onPress={() => { setBookFilter(b.id); setActiveBook(b); setBookPickerVisible(false); }}
                style={b.id === bookFilter && { backgroundColor: Colors.primary + '12' }} />
            ))}
          </Dialog.Content>
          <Dialog.Actions><Button onPress={() => setBookPickerVisible(false)}>取消</Button></Dialog.Actions>
        </Dialog>
      </Portal>
      <DatePickerModal visible={datePickerTarget !== null}
        date={datePickerTarget === 'start' ? (customStart ?? dayjs().format('YYYY-MM-01')) : (customEnd ?? dayjs().format('YYYY-MM-28'))}
        onSelect={(d) => { if (datePickerTarget === 'start') { setCustomStart(d); setDatePickerTarget('end'); } else { setCustomEnd(d); setDatePickerTarget(null); } }}
        onClose={() => setDatePickerTarget(null)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: Spacing.sm, paddingTop: Spacing.md, paddingBottom: Spacing.xs },
  dropdown: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.surface, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.sm, paddingVertical: 8, borderWidth: 1, borderColor: Colors.border, marginBottom: 8 },
  dropdownText: { flex: 1, fontSize: 13, fontWeight: '600', color: Colors.primary },
  periodSegments: { marginBottom: 6 },
  timeline: { marginBottom: 2 },
  timelineChip: { marginRight: 6, borderRadius: 20 },
  customRange: { flexDirection: 'row', alignItems: 'center' },
  // 卡
  card: { marginHorizontal: Spacing.sm, marginBottom: 6, borderRadius: BorderRadius.lg },
  cardTitle: { fontWeight: '600', fontSize: 14, marginBottom: 0 },
  engelSub: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  // 概览
  summaryRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryDivider: { width: 1, height: 20, backgroundColor: Colors.divider },
  summaryLabel: { fontSize: 10, color: Colors.textMuted },
  summaryAmount: { fontSize: 15, fontWeight: '700' },
  // 恩格尔
  engelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  engelValue: { fontSize: 28, fontWeight: '800', color: '#FF6B6B' },
  // 分类占比行
  catRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: 8 },
  catIcon: { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  catInfo: { flex: 1 },
  catTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  catName: { fontSize: 12, fontWeight: '500', color: Colors.text },
  catPct: { fontSize: 12, fontWeight: '700' },
  progressBg: { height: 4, borderRadius: 2, backgroundColor: Colors.divider },
  progressFill: { height: 4, borderRadius: 2 },
  catAmount: { fontSize: 12, fontWeight: '600', color: Colors.text, width: 64, textAlign: 'right' },
  // 占位
  empty: { height: 40, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 12, color: Colors.textMuted },
});
