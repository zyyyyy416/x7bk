import type { Category } from '@/types';

/**
 * 预设二级分类
 * key: 一级分类 icon
 */
type CategorySeed = Omit<Category, 'id' | 'created_at'>;

/** 支出分类 — 一级 */
export const EXPENSE_CATEGORIES: CategorySeed[] = [
  { name: '餐饮饮食', icon: 'food', parent_id: null, type: 'expense', engel_eligible: true, sort_order: 1, is_default: true },
  { name: '交通出行', icon: 'car', parent_id: null, type: 'expense', engel_eligible: false, sort_order: 2, is_default: true },
  { name: '住房居家', icon: 'home', parent_id: null, type: 'expense', engel_eligible: false, sort_order: 3, is_default: true },
  { name: '购物消费', icon: 'shopping', parent_id: null, type: 'expense', engel_eligible: false, sort_order: 4, is_default: true },
  { name: '娱乐休闲', icon: 'gamepad-variant', parent_id: null, type: 'expense', engel_eligible: false, sort_order: 5, is_default: true },
  { name: '医疗健康', icon: 'hospital', parent_id: null, type: 'expense', engel_eligible: false, sort_order: 6, is_default: true },
  { name: '教育培训', icon: 'school', parent_id: null, type: 'expense', engel_eligible: false, sort_order: 7, is_default: true },
  { name: '人情往来', icon: 'account-group', parent_id: null, type: 'expense', engel_eligible: false, sort_order: 8, is_default: true },
  { name: '金融理财', icon: 'bank', parent_id: null, type: 'expense', engel_eligible: false, sort_order: 9, is_default: true },
  { name: '其他支出', icon: 'dots-horizontal', parent_id: null, type: 'expense', engel_eligible: false, sort_order: 10, is_default: true },
];

/** 支出分类 — 二级 (以 parent_name 关联) */
export const EXPENSE_SUB_CATEGORIES: Record<string, string[]> = {
  '餐饮饮食': ['三餐正餐', '外卖外带', '小吃零食', '奶茶咖啡', '水果饮品', '生鲜买菜', '聚餐宴请'],
  '交通出行': ['公交地铁', '出租车', '网约车', '加油充电', '停车费', '共享单车', '火车飞机', '长途客运'],
  '住房居家': ['房租', '房贷', '水费', '电费', '燃气费', '物业费', '网费话费', '维修装修', '家居家纺', '日常杂货'],
  '购物消费': ['服饰鞋包', '数码电子', '美妆护肤', '个护清洁', '文体办公', '烟酒茶叶', '宠物用品'],
  '娱乐休闲': ['电影演出', '游戏充值', '视频会员', '运动健身', '旅游度假', 'KTV酒吧', '书籍杂志', '景点门票', '摄影冲印'],
  '医疗健康': ['门诊挂号', '药品费', '住院医疗', '体检保健', '牙科眼科', '健身补剂'],
  '教育培训': ['学费培训', '书籍教材', '考试报名', '知识付费', '文具用品', '少儿教育'],
  '人情往来': ['红包礼金', '孝敬长辈', '礼品赠送', '慈善捐款', '聚会聚餐', '婚丧嫁娶'],
  '金融理财': ['信用卡还款', '贷款还款', '保险保费', '投资亏损', '手续费利息', '税费'],
  '其他支出': ['快递物流', '证件办理', '丢失赔偿', '其他杂项'],
};

/** 收入分类 — 一级 */
export const INCOME_CATEGORIES: CategorySeed[] = [
  { name: '职业收入', icon: 'briefcase', parent_id: null, type: 'income', engel_eligible: false, sort_order: 1, is_default: true },
  { name: '被动收入', icon: 'chart-line', parent_id: null, type: 'income', engel_eligible: false, sort_order: 2, is_default: true },
  { name: '其他收入', icon: 'gift', parent_id: null, type: 'income', engel_eligible: false, sort_order: 3, is_default: true },
];

/** 收入分类 — 二级 */
export const INCOME_SUB_CATEGORIES: Record<string, string[]> = {
  '职业收入': ['工资薪水', '奖金绩效', '兼职外快', '自由职业'],
  '被动收入': ['理财收益', '房租收入', '股息分红', '版权收入'],
  '其他收入': ['红包收入', '报销退款', '二手出售', '礼金收入'],
};

/** 一级分类 icon 映射 (MaterialCommunityIcons name) */
export const CATEGORY_ICON_MAP: Record<string, string> = {
  '餐饮饮食': 'food',
  '交通出行': 'car',
  '住房居家': 'home',
  '购物消费': 'shopping',
  '娱乐休闲': 'gamepad-variant',
  '医疗健康': 'hospital',
  '教育培训': 'school',
  '人情往来': 'account-group',
  '金融理财': 'bank',
  '其他支出': 'dots-horizontal',
  '职业收入': 'briefcase',
  '被动收入': 'chart-line',
  '其他收入': 'gift',
};
