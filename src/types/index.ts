/** 账单类型 */
export type BillType = 'expense' | 'income';

/** 用户角色 */
export type MemberRole = 'admin' | 'member';

/** 账本类型 */
export type BookType = 'personal' | 'shared';

/** 消费归属 */
export type BillScope = 'personal' | 'shared';

/** 结算状态 */
export type SettlementStatus = 'pending' | 'settled';

/** 用户 */
export interface User {
  id: string;
  phone: string;
  nickname: string | null;
  avatar_url: string | null;
  created_at: string;
}

/** 账本 */
export interface Book {
  id: string;
  name: string;
  cover: string | null;
  type: BookType;
  creator_id: string;
  created_at: string;
}

/** 账本成员 */
export interface BookMember {
  id: string;
  book_id: string;
  user_id: string;
  role: MemberRole;
  joined_at: string;
}

/** 分类 */
export interface Category {
  id: string;
  name: string;
  icon: string;
  parent_id: string | null;
  type: BillType;
  engel_eligible: boolean;
  sort_order: number;
  is_default: boolean;
}

/** 一级分类 (含子分类) */
export interface CategoryGroup {
  category: Category;
  children: Category[];
}

/** 账单 */
export interface Bill {
  id: string;
  book_id: string;
  user_id: string;
  category_id: string;
  amount: number;
  type: BillType;
  note: string | null;
  photo_url: string | null;
  bill_date: string;
  is_shared: boolean;
  created_at: string;
}

/** 账单列表项 (含关联数据) */
export interface BillWithDetails extends Bill {
  category?: Category;
  user?: Pick<User, 'id' | 'nickname' | 'avatar_url'>;
}

/** 预算 */
export interface Budget {
  id: string;
  user_id: string;
  book_id: string | null;
  category_id: string | null;
  amount: number;
  period: 'monthly';
  start_date: string;
}

/** 结算 */
export interface Settlement {
  id: string;
  book_id: string;
  from_user_id: string;
  to_user_id: string;
  amount: number;
  status: SettlementStatus;
  settled_at: string | null;
  created_at: string;
}

/** 恩格尔系数等级 */
export interface EngelLevel {
  min: number;
  max: number;
  stars: number;
  label: string;
  tag: string;
  description: string;
}

/** 月度分析概览 */
export interface MonthlySummary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  engelCoefficient: number;
  engelLevel: EngelLevel;
  billCount: number;
}

/** 分页参数 */
export interface PaginationParams {
  page: number;
  pageSize: number;
}

/** 账单筛选参数 */
export interface BillFilter {
  bookId: string;
  startDate?: string;
  endDate?: string;
  categoryId?: string;
  type?: BillType;
  isShared?: boolean;
}
