import dayjs from 'dayjs';

/** 格式化日期: 2026-07-06 → 7月6日 */
export function formatDate(date: string): string {
  return dayjs(date).format('M月D日');
}

/** 格式化日期: 2026-07-06 → 2026年7月6日 */
export function formatDateFull(date: string): string {
  return dayjs(date).format('YYYY年M月D日');
}

/** 格式化日期: 2026-07-06 → 07/06 */
export function formatDateShort(date: string): string {
  return dayjs(date).format('MM/DD');
}

/** 格式化月份: 2026-07 → 2026年7月 */
export function formatMonth(date: string): string {
  return dayjs(date).format('YYYY年M月');
}

/** 获取今天的日期字符串 YYYY-MM-DD */
export function getToday(): string {
  return dayjs().format('YYYY-MM-DD');
}

/** 获取当前月份 YYYY-MM */
export function getCurrentMonth(): string {
  return dayjs().format('YYYY-MM');
}

/** 获取本月第一天 */
export function getMonthStart(date?: string): string {
  return dayjs(date).startOf('month').format('YYYY-MM-DD');
}

/** 获取本月最后一天 */
export function getMonthEnd(date?: string): string {
  return dayjs(date).endOf('month').format('YYYY-MM-DD');
}

/** 相对时间: 刚刚 / 3分钟前 / 2小时前 / 昨天 / 3天前 */
export function formatRelativeTime(date: string): string {
  const now = dayjs();
  const target = dayjs(date);
  const diffMinutes = now.diff(target, 'minute');
  const diffHours = now.diff(target, 'hour');
  const diffDays = now.diff(target, 'day');

  if (diffMinutes < 1) return '刚刚';
  if (diffMinutes < 60) return `${diffMinutes}分钟前`;
  if (diffHours < 24) return `${diffHours}小时前`;
  if (diffDays === 1) return '昨天';
  if (diffDays < 7) return `${diffDays}天前`;
  return formatDate(date);
}
