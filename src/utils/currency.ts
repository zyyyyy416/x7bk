import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';

dayjs.locale('zh-cn');

/** 格式化金额: ¥1,234.56 */
export function formatCurrency(amount: number): string {
  const abs = Math.abs(amount);
  const formatted = abs.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return amount < 0 ? `-¥${formatted}` : `¥${formatted}`;
}

/** 格式化金额 (无符号) */
export function formatAmount(amount: number): string {
  return Math.abs(amount).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** 简短金额 (如 ¥128 去掉小数) */
export function formatCurrencyShort(amount: number): string {
  const rounded = Math.round(Math.abs(amount));
  const formatted = rounded.toLocaleString('zh-CN');
  return amount < 0 ? `-¥${formatted}` : `¥${formatted}`;
}
