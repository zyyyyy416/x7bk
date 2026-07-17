import dayjs from 'dayjs';
import {
  formatDate,
  formatDateFull,
  formatDateShort,
  formatMonth,
  getToday,
  getCurrentMonth,
  getMonthStart,
  getMonthEnd,
  formatRelativeTime,
} from '@/utils/date';

describe('formatDate', () => {
  it('格式化为 M月D日', () => {
    expect(formatDate('2026-07-06')).toBe('7月6日');
  });

  it('带前导零的日期', () => {
    expect(formatDate('2026-01-01')).toBe('1月1日');
  });
});

describe('formatDateFull', () => {
  it('格式化为 YYYY年M月D日', () => {
    expect(formatDateFull('2026-07-06')).toBe('2026年7月6日');
  });
});

describe('formatDateShort', () => {
  it('格式化为 MM/DD', () => {
    expect(formatDateShort('2026-07-06')).toBe('07/06');
  });
});

describe('formatMonth', () => {
  it('格式化为 YYYY年M月', () => {
    expect(formatMonth('2026-07')).toBe('2026年7月');
  });
});

describe('getToday', () => {
  it('返回今天的 YYYY-MM-DD 格式', () => {
    const today = getToday();
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // 应该和当前日期一致
    expect(today).toBe(dayjs().format('YYYY-MM-DD'));
  });
});

describe('getCurrentMonth', () => {
  it('返回当前月份的 YYYY-MM 格式', () => {
    const month = getCurrentMonth();
    expect(month).toMatch(/^\d{4}-\d{2}$/);
    expect(month).toBe(dayjs().format('YYYY-MM'));
  });
});

describe('getMonthStart', () => {
  it('返回当月第一天', () => {
    expect(getMonthStart('2026-07-15')).toBe('2026-07-01');
  });

  it('一月份', () => {
    expect(getMonthStart('2026-01-20')).toBe('2026-01-01');
  });

  it('不传参数使用当前日期', () => {
    const start = getMonthStart();
    expect(start).toBe(dayjs().startOf('month').format('YYYY-MM-DD'));
  });
});

describe('getMonthEnd', () => {
  it('返回当月最后一天', () => {
    expect(getMonthEnd('2026-07-15')).toBe('2026-07-31');
  });

  it('2026年2月（非闰年）', () => {
    expect(getMonthEnd('2026-02-15')).toBe('2026-02-28');
  });

  it('12月', () => {
    expect(getMonthEnd('2026-12-01')).toBe('2026-12-31');
  });
});

describe('formatRelativeTime', () => {
  it('刚刚 — 少于 1 分钟', () => {
    const ts = dayjs().subtract(30, 'second').toISOString();
    expect(formatRelativeTime(ts)).toBe('刚刚');
  });

  it('X 分钟前 — 1-59 分钟', () => {
    const ts = dayjs().subtract(3, 'minute').toISOString();
    expect(formatRelativeTime(ts)).toBe('3分钟前');
  });

  it('边界 — 刚好 1 分钟', () => {
    const ts = dayjs().subtract(1, 'minute').toISOString();
    expect(formatRelativeTime(ts)).toBe('1分钟前');
  });

  it('X 小时前 — 1-23 小时', () => {
    const ts = dayjs().subtract(2, 'hour').toISOString();
    expect(formatRelativeTime(ts)).toBe('2小时前');
  });

  it('昨天', () => {
    const ts = dayjs().subtract(1, 'day').toISOString();
    expect(formatRelativeTime(ts)).toBe('昨天');
  });

  it('X 天前 — 2-6 天', () => {
    const ts = dayjs().subtract(5, 'day').toISOString();
    expect(formatRelativeTime(ts)).toBe('5天前');
  });

  it('刚好 7 天回退到完整日期', () => {
    const ts = dayjs().subtract(7, 'day').format('YYYY-MM-DD');
    const result = formatRelativeTime(ts);
    // >=7 天显示 M月D日 格式
    expect(result).toMatch(/^\d+月\d+日$/);
  });

  it('固定日期字符串', () => {
    expect(formatRelativeTime('2026-07-01')).toBe('7月1日');
  });
});
