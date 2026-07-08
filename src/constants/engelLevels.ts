import type { EngelLevel } from '@/types';

/**
 * 恩格尔系数等级判定标准 (中国国情适配版)
 * 参考: 国家统计局 ~28%-30%
 */
export const ENGEL_LEVELS: EngelLevel[] = [
  {
    min: 0,
    max: 20,
    stars: 5,
    label: '财务自由级',
    tag: '💰 财务自由',
    description: '你已经不需要为食物操心啦！',
  },
  {
    min: 20,
    max: 30,
    stars: 4,
    label: '富足小康级',
    tag: '✨ 富足小康',
    description: '吃得好，活得也好，人生赢家！',
  },
  {
    min: 30,
    max: 40,
    stars: 3,
    label: '小资舒适级',
    tag: '☕ 小资舒适',
    description: '恩格尔系数刚刚好，生活有滋有味。',
  },
  {
    min: 40,
    max: 50,
    stars: 2,
    label: '温饱务实级',
    tag: '🍚 温饱务实',
    description: '干饭人，干饭魂！吃是人生大事。',
  },
  {
    min: 50,
    max: 100,
    stars: 1,
    label: '终极吃货级',
    tag: '🍕 终极吃货',
    description: '你的胃就是你的财富管理中心！🏆',
  },
];

/** 根据恩格尔系数获取等级 */
export function getEngelLevel(coefficient: number): EngelLevel {
  return ENGEL_LEVELS.find((l) => coefficient >= l.min && coefficient < l.max)
    ?? ENGEL_LEVELS[ENGEL_LEVELS.length - 1];
}
