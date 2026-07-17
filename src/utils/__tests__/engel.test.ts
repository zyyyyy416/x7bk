import { calcEngelCoefficient, getEngelLevelByExpense, calcEngelFromBills } from '@/utils/engel';

describe('calcEngelCoefficient', () => {
  it('正常计算：500/2000 = 25%', () => {
    expect(calcEngelCoefficient(500, 2000)).toBe(25);
  });

  it('精确两位小数：333/1000 = 33.3%', () => {
    expect(calcEngelCoefficient(333, 1000)).toBe(33.3);
  });

  it('分母 <= 0 返回 0', () => {
    expect(calcEngelCoefficient(3000, 0)).toBe(0);
    expect(calcEngelCoefficient(0, -100)).toBe(0);
  });

  it('无食品支出 = 0', () => {
    expect(calcEngelCoefficient(0, 2000)).toBe(0);
  });

  it('食品支出 > 总支出 也会计算（异常数据不在此过滤）', () => {
    expect(calcEngelCoefficient(3000, 2000)).toBe(150);
  });
});

describe('getEngelLevelByExpense', () => {
  it('25% 是富足小康级', () => {
    const level = getEngelLevelByExpense(500, 2000);
    expect(level.label).toBe('富足小康级');
    expect(level.stars).toBe(4);
  });

  it('15% 是财务自由级', () => {
    const level = getEngelLevelByExpense(150, 1000);
    expect(level.stars).toBe(5);
  });

  it('35% 是小资舒适级', () => {
    const level = getEngelLevelByExpense(350, 1000);
    expect(level.stars).toBe(3);
  });

  it('45% 是温饱务实级', () => {
    const level = getEngelLevelByExpense(450, 1000);
    expect(level.stars).toBe(2);
  });

  it('60% 是终极吃货级', () => {
    const level = getEngelLevelByExpense(600, 1000);
    expect(level.stars).toBe(1);
  });

  it('总支出为 0 时系数为 0，对应财务自由级（5 星）', () => {
    const level = getEngelLevelByExpense(0, 0);
    expect(level.stars).toBe(5);
  });
});

describe('calcEngelFromBills', () => {
  it('跳过收入类型账单', () => {
    const bills = [
      { type: 'income', amount: 5000, category: null },
      { type: 'expense', amount: 100, category: { engel_eligible: true } },
    ] as any[];
    const result = calcEngelFromBills(bills);
    expect(result.foodExpense).toBe(100);
    expect(result.totalExpense).toBe(100);
  });

  it('仅计入 engel_eligible 分类为食品支出', () => {
    const bills = [
      { type: 'expense', amount: 200, category: { engel_eligible: true } },
      { type: 'expense', amount: 300, category: { engel_eligible: false } },
    ] as any[];
    const result = calcEngelFromBills(bills);
    expect(result.foodExpense).toBe(200);
    expect(result.totalExpense).toBe(500);
  });

  it('category 为 null 时不报错', () => {
    const bills = [
      { type: 'expense', amount: 100, category: null },
    ] as any[];
    const result = calcEngelFromBills(bills);
    expect(result.foodExpense).toBe(0);
    expect(result.totalExpense).toBe(100);
  });

  it('空账单列表', () => {
    const result = calcEngelFromBills([]);
    expect(result.coefficient).toBe(0);
    expect(result.foodExpense).toBe(0);
    expect(result.totalExpense).toBe(0);
  });

  it('使用 amount 的绝对值', () => {
    const bills = [
      { type: 'expense', amount: -100, category: { engel_eligible: true } },
    ] as any[];
    const result = calcEngelFromBills(bills);
    expect(result.totalExpense).toBe(100);
  });
});
