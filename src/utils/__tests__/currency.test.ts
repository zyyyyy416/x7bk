import { formatCurrency, formatAmount, formatCurrencyShort } from '@/utils/currency';

describe('formatCurrency', () => {
  it('正值带 ¥ 符号和两位小数', () => {
    expect(formatCurrency(1234.56)).toBe('¥1,234.56');
  });

  it('负值带 -¥ 符号', () => {
    expect(formatCurrency(-500)).toBe('-¥500.00');
  });

  it('零值', () => {
    expect(formatCurrency(0)).toBe('¥0.00');
  });

  it('大数值带千分位', () => {
    expect(formatCurrency(1000000)).toBe('¥1,000,000.00');
  });

  it('小数四舍五入（toLocaleString 默认行为）', () => {
    expect(formatCurrency(99.999)).toBe('¥100.00');
  });

  it('很小的金额', () => {
    expect(formatCurrency(0.01)).toBe('¥0.01');
  });
});

describe('formatCurrencyShort', () => {
  it('四舍五入去掉小数', () => {
    expect(formatCurrencyShort(128.88)).toBe('¥129');
  });

  it('零值', () => {
    expect(formatCurrencyShort(0)).toBe('¥0');
  });

  it('负值', () => {
    expect(formatCurrencyShort(-500)).toBe('-¥500');
  });

  it('正值', () => {
    expect(formatCurrencyShort(1234)).toBe('¥1,234');
  });
});

describe('formatAmount', () => {
  it('不带符号的绝对值', () => {
    expect(formatAmount(-99.99)).toBe('99.99');
  });

  it('正值不变', () => {
    expect(formatAmount(1234.56)).toBe('1,234.56');
  });

  it('零值', () => {
    expect(formatAmount(0)).toBe('0.00');
  });
});
