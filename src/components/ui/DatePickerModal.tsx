import { useState, useCallback, useMemo, useEffect } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text, Modal, Portal, IconButton, Button, Surface } from 'react-native-paper';
import dayjs from 'dayjs';
import { Colors, Spacing, FontSize, BorderRadius } from '@/theme';

interface DatePickerModalProps {
  visible: boolean;
  date: string; // YYYY-MM-DD
  onSelect: (date: string) => void;
  onClose: () => void;
  maxDate?: string; // 最大可选日期
}

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];

export default function DatePickerModal({
  visible,
  date,
  onSelect,
  onClose,
  maxDate,
}: DatePickerModalProps) {
  const [viewYear, setViewYear] = useState(() => dayjs(date).year());
  const [viewMonth, setViewMonth] = useState(() => dayjs(date).month() + 1); // 1-12

  const today = dayjs().format('YYYY-MM-DD');
  const max = maxDate ?? today;

  // 打开时同步到选中日期
  useEffect(() => {
    if (visible) {
      const d = dayjs(date);
      setViewYear(d.year());
      setViewMonth(d.month() + 1);
    }
  }, [visible, date]);

  // 当前视图月的日历网格
  const calendarDays = useMemo(() => {
    const firstDay = dayjs(`${viewYear}-${String(viewMonth).padStart(2, '0')}-01`);
    const startOfWeek = firstDay.day(); // 0=Sun
    // 调整为周一开头
    const offset = startOfWeek === 0 ? 6 : startOfWeek - 1;

    const days: (number | null)[] = [];
    // 填充上月空白
    for (let i = 0; i < offset; i++) {
      days.push(null);
    }
    // 本月日期
    const daysInMonth = firstDay.daysInMonth();
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(d);
    }
    return days;
  }, [viewYear, viewMonth]);

  const handlePrevMonth = useCallback(() => {
    if (viewMonth === 1) {
      setViewYear(viewYear - 1);
      setViewMonth(12);
    } else {
      setViewMonth(viewMonth - 1);
    }
  }, [viewYear, viewMonth]);

  const handleNextMonth = useCallback(() => {
    const now = dayjs();
    if (viewYear === now.year() && viewMonth === now.month() + 1) return;
    if (viewMonth === 12) {
      setViewYear(viewYear + 1);
      setViewMonth(1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  }, [viewYear, viewMonth]);

  const handleSelectDay = useCallback(
    (day: number) => {
      const d = `${viewYear}-${String(viewMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      if (d > max) return;
      onSelect(d);
      onClose();
    },
    [viewYear, viewMonth, max, onSelect, onClose]
  );

  const handleToday = useCallback(() => {
    onSelect(today);
    onClose();
  }, [today, onSelect, onClose]);

  return (
    <Portal>
      <Modal visible={visible} onDismiss={onClose} contentContainerStyle={styles.modal}>
        <Surface style={styles.container}>
          {/* 头部 */}
          <View style={styles.header}>
            <Text style={styles.title}>选择日期</Text>
            <IconButton icon="close" size={22} onPress={onClose} />
          </View>

          {/* 快捷按钮 */}
          <View style={styles.quickRow}>
            <Button mode="outlined" compact onPress={handleToday} style={styles.quickBtn}>
              今天
            </Button>
            <Button
              mode="outlined"
              compact
              onPress={() => {
                onSelect(dayjs().subtract(1, 'day').format('YYYY-MM-DD'));
                onClose();
              }}
              style={styles.quickBtn}
            >
              昨天
            </Button>
            <Button
              mode="outlined"
              compact
              onPress={() => {
                onSelect(dayjs().subtract(2, 'day').format('YYYY-MM-DD'));
                onClose();
              }}
              style={styles.quickBtn}
            >
              前天
            </Button>
          </View>

          {/* 月份切换 */}
          <View style={styles.monthRow}>
            <IconButton icon="chevron-left" size={22} onPress={handlePrevMonth} />
            <Text style={styles.monthLabel}>
              {viewYear}年{viewMonth}月
            </Text>
            <IconButton icon="chevron-right" size={22} onPress={handleNextMonth} />
          </View>

          {/* 星期 */}
          <View style={styles.weekdayRow}>
            {WEEKDAYS.map((wd) => (
              <Text key={wd} style={styles.weekday}>
                {wd}
              </Text>
            ))}
          </View>

          {/* 日期网格 */}
          <View style={styles.grid}>
            {calendarDays.map((day, idx) => {
              if (day === null) {
                return <View key={`e_${idx}`} style={styles.dayCell} />;
              }
              const dateStr = `${viewYear}-${String(viewMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isDisabled = dateStr > max;
              const isSelected = dateStr === date;
              const isToday = dateStr === today;

              return (
                <Pressable
                  key={dateStr}
                  style={({ pressed }) => [
                    styles.dayCell,
                    isSelected && styles.daySelected,
                    isToday && !isSelected && styles.dayToday,
                    isDisabled && styles.dayDisabled,
                    pressed && !isDisabled && styles.dayPressed,
                  ]}
                  onPress={() => !isDisabled && handleSelectDay(day)}
                >
                  <Text
                    style={[
                      styles.dayText,
                      isSelected && styles.dayTextSelected,
                      isToday && !isSelected && styles.dayTextToday,
                      isDisabled && styles.dayTextDisabled,
                    ]}
                  >
                    {day}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Surface>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: {
    padding: Spacing.md,
  },
  container: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: '600',
    color: Colors.text,
  },
  quickRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  quickBtn: {
    flex: 1,
    borderRadius: BorderRadius.md,
  },
  monthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  monthLabel: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: Spacing.xs,
  },
  weekday: {
    flex: 1,
    textAlign: 'center',
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: '500',
    paddingVertical: Spacing.xs,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.full,
  },
  daySelected: {
    backgroundColor: Colors.primary,
  },
  dayToday: {
    backgroundColor: Colors.primary + '18',
  },
  dayDisabled: {
    opacity: 0.3,
  },
  dayPressed: {
    backgroundColor: Colors.divider,
  },
  dayText: {
    fontSize: FontSize.md,
    color: Colors.text,
  },
  dayTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  dayTextToday: {
    color: Colors.primary,
    fontWeight: '600',
  },
  dayTextDisabled: {
    color: Colors.textMuted,
  },
});
