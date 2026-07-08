import { getEngelLevel } from '@/constants/engelLevels';
import type { EngelLevel, Bill } from '@/types';

/**
 * 计算恩格尔系数
 * @param foodExpense 食品支出总额 (餐饮饮食 大类下所有二级分类)
 * @param totalExpense 个人消费支出总额
 * @returns 恩格尔系数百分比 (0-100)
 */
export function calcEngelCoefficient(foodExpense: number, totalExpense: number): number {
  if (totalExpense <= 0) return 0;
  return Math.round((foodExpense / totalExpense) * 10000) / 100;
}

/**
 * 根据食品支出和总支出获取恩格尔等级
 */
export function getEngelLevelByExpense(foodExpense: number, totalExpense: number): EngelLevel {
  const coeff = calcEngelCoefficient(foodExpense, totalExpense);
  return getEngelLevel(coeff);
}

/**
 * 从账单列表计算恩格尔系数
 * @param bills 账单列表 (需含 category.engel_eligible 字段)
 */
export function calcEngelFromBills(
  bills: (Bill & { category?: { engel_eligible: boolean } | null })[]
): { coefficient: number; foodExpense: number; totalExpense: number; level: EngelLevel } {
  let foodExpense = 0;
  let totalExpense = 0;

  for (const bill of bills) {
    if (bill.type !== 'expense') continue;
    const amount = Math.abs(bill.amount);
    totalExpense += amount;
    if (bill.category?.engel_eligible) {
      foodExpense += amount;
    }
  }

  const coefficient = calcEngelCoefficient(foodExpense, totalExpense);
  const level = getEngelLevel(coefficient);

  return { coefficient, foodExpense, totalExpense, level };
}
