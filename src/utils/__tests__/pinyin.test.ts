import { matchesPinyinSearch } from '@/utils/pinyin';

describe('matchesPinyinSearch', () => {
  it('拼音首字母前缀匹配', () => {
    expect(matchesPinyinSearch('奶茶咖啡', 'nc')).toBe(true);
  });

  it('三餐正餐 → sc', () => {
    expect(matchesPinyinSearch('三餐正餐', 'sc')).toBe(true);
  });

  it('多个字符逐个匹配首字母', () => {
    expect(matchesPinyinSearch('外卖外带', 'wm')).toBe(true);
  });

  it('中文子串匹配', () => {
    expect(matchesPinyinSearch('奶茶咖啡', '奶茶')).toBe(true);
  });

  it('完整名称匹配', () => {
    expect(matchesPinyinSearch('午餐', '午餐')).toBe(true);
  });

  it('空查询始终匹配', () => {
    expect(matchesPinyinSearch('奶茶咖啡', '')).toBe(true);
  });

  it('无匹配返回 false', () => {
    expect(matchesPinyinSearch('奶茶咖啡', 'zz')).toBe(false);
  });

  it('部分首字母不匹配', () => {
    expect(matchesPinyinSearch('奶茶咖啡', 'nb')).toBe(false);
  });

  it('单个首字母匹配', () => {
    expect(matchesPinyinSearch('奶茶咖啡', 'n')).toBe(true);
  });

  it('查询比分类名长', () => {
    expect(matchesPinyinSearch('奶茶', '奶茶咖啡')).toBe(false);
  });
});
