-- ============================================================
-- 小7记账 (X7BK) — 数据库 Schema v1.1
-- 适用于: Supabase PostgreSQL 15+
--
-- 结构:
--   Part A: 扩展 + 枚举类型
--   Part B: 建表 (7 张)
--   Part C: 索引
--   Part D: RLS 策略 (MVP 阶段禁用 RLS)
--   Part E: 触发器 & SECURITY DEFINER 函数
--   Part F: 存量数据修复
-- ============================================================

-- ============================================================
-- Part A: 扩展 & 枚举类型 (可重复执行)
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$ BEGIN CREATE TYPE public.book_type AS ENUM ('personal', 'shared'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE public.member_role AS ENUM ('admin', 'member'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE public.bill_type AS ENUM ('expense', 'income'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE public.settlement_status AS ENUM ('pending', 'settled'); EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ============================================================
-- Part B: 建表
-- ============================================================

-- B1. users — 用户表 (扩展 Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone       TEXT,
  nickname    TEXT,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- B2. books — 账本表
CREATE TABLE IF NOT EXISTS public.books (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  cover       TEXT,
  type        book_type NOT NULL DEFAULT 'personal',
  creator_id  UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- B3. book_members — 账本成员表
CREATE TABLE IF NOT EXISTS public.book_members (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  book_id     UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role        member_role NOT NULL DEFAULT 'member',
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(book_id, user_id)
);

-- B4. categories — 分类表
CREATE TABLE IF NOT EXISTS public.categories (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID REFERENCES public.users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  icon            TEXT NOT NULL DEFAULT 'help-circle',
  parent_id       UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  type            bill_type NOT NULL DEFAULT 'expense',
  engel_eligible  BOOLEAN NOT NULL DEFAULT false,
  sort_order      INT NOT NULL DEFAULT 0,
  is_default      BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- B5. bills — 账单表
CREATE TABLE IF NOT EXISTS public.bills (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  book_id         UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  category_id     UUID NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  amount          NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  type            bill_type NOT NULL DEFAULT 'expense',
  note            TEXT,
  photo_url       TEXT,
  bill_date       DATE NOT NULL DEFAULT CURRENT_DATE,
  is_shared       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- B6. budgets — 预算表
CREATE TABLE IF NOT EXISTS public.budgets (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  book_id         UUID REFERENCES public.books(id) ON DELETE CASCADE,
  category_id     UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  amount          NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  period          TEXT NOT NULL DEFAULT 'monthly',
  start_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- B7. settlements — 结算表
CREATE TABLE IF NOT EXISTS public.settlements (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  book_id         UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  from_user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  to_user_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount          NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  status          settlement_status NOT NULL DEFAULT 'pending',
  settled_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Part C: 索引
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_bills_book_date ON public.bills(book_id, bill_date DESC);
CREATE INDEX IF NOT EXISTS idx_bills_category ON public.bills(category_id);
CREATE INDEX IF NOT EXISTS idx_bills_user ON public.bills(user_id);
CREATE INDEX IF NOT EXISTS idx_books_creator ON public.books(creator_id);
CREATE INDEX IF NOT EXISTS idx_book_members_user ON public.book_members(user_id);
-- 删除旧版"一人一账本"唯一索引 (v2.0 起支持多个个人账本)
DROP INDEX IF EXISTS idx_books_one_personal_per_user;

-- ============================================================
-- Part D: RLS 策略 — MVP 阶段禁用 RLS
--          （生产环境应启用并配置细粒度策略）
-- ============================================================

-- 先清理旧策略 (避免重复创建报错)
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', r.tablename);
  END LOOP;
END $$;

-- 单独确认每张表 RLS 已禁用
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.books DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.bills DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlements DISABLE ROW LEVEL SECURITY;

-- 确保 authenticated 和 anon 角色有基本权限
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated;

-- 未来新建表的默认权限
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated;

-- ============================================================
-- Part E: 触发器 & SECURITY DEFINER 函数
-- ============================================================

-- E1. handle_new_user — 新用户注册后自动创建 profile + 个人账本
--     挂载在 auth.users 表的 AFTER INSERT 触发器上
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- 创建用户 profile (幂等)
  INSERT INTO public.users (id, phone, nickname)
  VALUES (
    NEW.id,
    COALESCE(NEW.phone, ''),
    COALESCE(NEW.raw_user_meta_data->>'nickname', '用户' || substring(NEW.id::text, 1, 6))
  )
  ON CONFLICT (id) DO NOTHING;

  -- 创建默认日常账本 (仅当用户无任何账本时)
  INSERT INTO public.books (name, type, creator_id)
  SELECT '日常账本', 'personal', NEW.id
  WHERE NOT EXISTS (
    SELECT 1 FROM public.books WHERE creator_id = NEW.id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 删除并重建触发器 (确保使用最新函数定义)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- E2. ensure_user_profile — 客户端可调用的 RPC
--     登录后调用，确保 profile + 个人账本存在
--     即使 RLS 策略有问题，SECURITY DEFINER 也能绕过
CREATE OR REPLACE FUNCTION public.ensure_user_profile(user_id UUID)
RETURNS JSONB AS $$
DECLARE
  profile JSONB;
  book JSONB;
BEGIN
  -- 确保 profile 存在
  INSERT INTO public.users (id, phone, nickname)
  VALUES (user_id, '', '用户' || substring(user_id::text, 1, 6))
  ON CONFLICT (id) DO NOTHING;

  SELECT to_jsonb(u) INTO profile
  FROM public.users u WHERE u.id = user_id;

  -- 确保默认日常账本存在 (仅当用户无任何账本时)
  INSERT INTO public.books (name, type, creator_id)
  SELECT '日常账本', 'personal', user_id
  WHERE NOT EXISTS (
    SELECT 1 FROM public.books WHERE creator_id = user_id
  );

  SELECT to_jsonb(b) INTO book
  FROM public.books b
  WHERE b.creator_id = user_id
  ORDER BY b.created_at ASC
  LIMIT 1;

  RETURN jsonb_build_object('profile', profile, 'book', book);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- E3. ensure_categories — 客户端可调用的 RPC
--     创建个人账本后调用，初始化默认分类
--     使用循环逐个 INSERT 避免 CTE + enum 的类型转换问题
CREATE OR REPLACE FUNCTION public.ensure_categories(p_user_id UUID)
RETURNS INT AS $$
DECLARE
  cat_count INT;
  parent_id UUID;
BEGIN
  SELECT count(*) INTO cat_count FROM public.categories WHERE user_id = p_user_id;
  IF cat_count > 0 THEN
    RETURN cat_count;
  END IF;

  -- === 支出分类 ===

  -- 1. 餐饮饮食
  INSERT INTO public.categories (user_id, name, icon, type, engel_eligible, sort_order, is_default)
  VALUES (p_user_id, '餐饮饮食', 'food', 'expense'::bill_type, true, 1, true)
  RETURNING id INTO parent_id;
  INSERT INTO public.categories (user_id, name, icon, parent_id, type, engel_eligible, sort_order, is_default) VALUES
    (p_user_id, '三餐正餐', 'food', parent_id, 'expense'::bill_type, true, 1, true),
    (p_user_id, '外卖外带', 'food', parent_id, 'expense'::bill_type, true, 2, true),
    (p_user_id, '小吃零食', 'food', parent_id, 'expense'::bill_type, true, 3, true),
    (p_user_id, '奶茶咖啡', 'food', parent_id, 'expense'::bill_type, true, 4, true),
    (p_user_id, '水果饮品', 'food', parent_id, 'expense'::bill_type, true, 5, true),
    (p_user_id, '生鲜买菜', 'food', parent_id, 'expense'::bill_type, true, 6, true),
    (p_user_id, '聚餐宴请', 'food', parent_id, 'expense'::bill_type, true, 7, true);

  -- 2. 交通出行
  INSERT INTO public.categories (user_id, name, icon, type, engel_eligible, sort_order, is_default)
  VALUES (p_user_id, '交通出行', 'car', 'expense'::bill_type, false, 2, true)
  RETURNING id INTO parent_id;
  INSERT INTO public.categories (user_id, name, icon, parent_id, type, engel_eligible, sort_order, is_default) VALUES
    (p_user_id, '公交地铁', 'car', parent_id, 'expense'::bill_type, false, 1, true),
    (p_user_id, '出租车',   'car', parent_id, 'expense'::bill_type, false, 2, true),
    (p_user_id, '网约车',   'car', parent_id, 'expense'::bill_type, false, 3, true),
    (p_user_id, '加油充电', 'car', parent_id, 'expense'::bill_type, false, 4, true),
    (p_user_id, '停车费',   'car', parent_id, 'expense'::bill_type, false, 5, true),
    (p_user_id, '共享单车', 'car', parent_id, 'expense'::bill_type, false, 6, true),
    (p_user_id, '火车飞机', 'car', parent_id, 'expense'::bill_type, false, 7, true),
    (p_user_id, '长途客运', 'car', parent_id, 'expense'::bill_type, false, 8, true);

  -- 3. 住房居家
  INSERT INTO public.categories (user_id, name, icon, type, engel_eligible, sort_order, is_default)
  VALUES (p_user_id, '住房居家', 'home', 'expense'::bill_type, false, 3, true)
  RETURNING id INTO parent_id;
  INSERT INTO public.categories (user_id, name, icon, parent_id, type, engel_eligible, sort_order, is_default) VALUES
    (p_user_id, '房租',     'home', parent_id, 'expense'::bill_type, false, 1, true),
    (p_user_id, '房贷',     'home', parent_id, 'expense'::bill_type, false, 2, true),
    (p_user_id, '水费',     'home', parent_id, 'expense'::bill_type, false, 3, true),
    (p_user_id, '电费',     'home', parent_id, 'expense'::bill_type, false, 4, true),
    (p_user_id, '燃气费',   'home', parent_id, 'expense'::bill_type, false, 5, true),
    (p_user_id, '物业费',   'home', parent_id, 'expense'::bill_type, false, 6, true),
    (p_user_id, '网费话费', 'home', parent_id, 'expense'::bill_type, false, 7, true),
    (p_user_id, '维修装修', 'home', parent_id, 'expense'::bill_type, false, 8, true),
    (p_user_id, '家居家纺', 'home', parent_id, 'expense'::bill_type, false, 9, true),
    (p_user_id, '日常杂货', 'home', parent_id, 'expense'::bill_type, false, 10, true);

  -- 4. 购物消费
  INSERT INTO public.categories (user_id, name, icon, type, engel_eligible, sort_order, is_default)
  VALUES (p_user_id, '购物消费', 'shopping', 'expense'::bill_type, false, 4, true)
  RETURNING id INTO parent_id;
  INSERT INTO public.categories (user_id, name, icon, parent_id, type, engel_eligible, sort_order, is_default) VALUES
    (p_user_id, '服饰鞋包', 'shopping', parent_id, 'expense'::bill_type, false, 1, true),
    (p_user_id, '数码电子', 'shopping', parent_id, 'expense'::bill_type, false, 2, true),
    (p_user_id, '美妆护肤', 'shopping', parent_id, 'expense'::bill_type, false, 3, true),
    (p_user_id, '个护清洁', 'shopping', parent_id, 'expense'::bill_type, false, 4, true),
    (p_user_id, '文体办公', 'shopping', parent_id, 'expense'::bill_type, false, 5, true),
    (p_user_id, '烟酒茶叶', 'shopping', parent_id, 'expense'::bill_type, false, 6, true),
    (p_user_id, '宠物用品', 'shopping', parent_id, 'expense'::bill_type, false, 7, true);

  -- 5. 娱乐休闲
  INSERT INTO public.categories (user_id, name, icon, type, engel_eligible, sort_order, is_default)
  VALUES (p_user_id, '娱乐休闲', 'gamepad-variant', 'expense'::bill_type, false, 5, true)
  RETURNING id INTO parent_id;
  INSERT INTO public.categories (user_id, name, icon, parent_id, type, engel_eligible, sort_order, is_default) VALUES
    (p_user_id, '电影演出', 'gamepad-variant', parent_id, 'expense'::bill_type, false, 1, true),
    (p_user_id, '游戏充值', 'gamepad-variant', parent_id, 'expense'::bill_type, false, 2, true),
    (p_user_id, '视频会员', 'gamepad-variant', parent_id, 'expense'::bill_type, false, 3, true),
    (p_user_id, '运动健身', 'gamepad-variant', parent_id, 'expense'::bill_type, false, 4, true),
    (p_user_id, '旅游度假', 'gamepad-variant', parent_id, 'expense'::bill_type, false, 5, true),
    (p_user_id, 'KTV/酒吧', 'gamepad-variant', parent_id, 'expense'::bill_type, false, 6, true),
    (p_user_id, '书籍杂志', 'gamepad-variant', parent_id, 'expense'::bill_type, false, 7, true),
    (p_user_id, '景点门票', 'gamepad-variant', parent_id, 'expense'::bill_type, false, 8, true),
    (p_user_id, '摄影冲印', 'gamepad-variant', parent_id, 'expense'::bill_type, false, 9, true);

  -- 6. 医疗健康
  INSERT INTO public.categories (user_id, name, icon, type, engel_eligible, sort_order, is_default)
  VALUES (p_user_id, '医疗健康', 'hospital', 'expense'::bill_type, false, 6, true)
  RETURNING id INTO parent_id;
  INSERT INTO public.categories (user_id, name, icon, parent_id, type, engel_eligible, sort_order, is_default) VALUES
    (p_user_id, '门诊挂号', 'hospital', parent_id, 'expense'::bill_type, false, 1, true),
    (p_user_id, '药品费',   'hospital', parent_id, 'expense'::bill_type, false, 2, true),
    (p_user_id, '住院医疗', 'hospital', parent_id, 'expense'::bill_type, false, 3, true),
    (p_user_id, '体检保健', 'hospital', parent_id, 'expense'::bill_type, false, 4, true),
    (p_user_id, '牙科眼科', 'hospital', parent_id, 'expense'::bill_type, false, 5, true),
    (p_user_id, '健身补剂', 'hospital', parent_id, 'expense'::bill_type, false, 6, true);

  -- 7. 教育培训
  INSERT INTO public.categories (user_id, name, icon, type, engel_eligible, sort_order, is_default)
  VALUES (p_user_id, '教育培训', 'school', 'expense'::bill_type, false, 7, true)
  RETURNING id INTO parent_id;
  INSERT INTO public.categories (user_id, name, icon, parent_id, type, engel_eligible, sort_order, is_default) VALUES
    (p_user_id, '学费培训', 'school', parent_id, 'expense'::bill_type, false, 1, true),
    (p_user_id, '书籍教材', 'school', parent_id, 'expense'::bill_type, false, 2, true),
    (p_user_id, '考试报名', 'school', parent_id, 'expense'::bill_type, false, 3, true),
    (p_user_id, '知识付费', 'school', parent_id, 'expense'::bill_type, false, 4, true),
    (p_user_id, '文具用品', 'school', parent_id, 'expense'::bill_type, false, 5, true),
    (p_user_id, '少儿教育', 'school', parent_id, 'expense'::bill_type, false, 6, true);

  -- 8. 人情往来
  INSERT INTO public.categories (user_id, name, icon, type, engel_eligible, sort_order, is_default)
  VALUES (p_user_id, '人情往来', 'account-group', 'expense'::bill_type, false, 8, true)
  RETURNING id INTO parent_id;
  INSERT INTO public.categories (user_id, name, icon, parent_id, type, engel_eligible, sort_order, is_default) VALUES
    (p_user_id, '红包礼金', 'account-group', parent_id, 'expense'::bill_type, false, 1, true),
    (p_user_id, '孝敬长辈', 'account-group', parent_id, 'expense'::bill_type, false, 2, true),
    (p_user_id, '礼品赠送', 'account-group', parent_id, 'expense'::bill_type, false, 3, true),
    (p_user_id, '慈善捐款', 'account-group', parent_id, 'expense'::bill_type, false, 4, true),
    (p_user_id, '聚会聚餐', 'account-group', parent_id, 'expense'::bill_type, false, 5, true),
    (p_user_id, '婚丧嫁娶', 'account-group', parent_id, 'expense'::bill_type, false, 6, true);

  -- 9. 金融理财
  INSERT INTO public.categories (user_id, name, icon, type, engel_eligible, sort_order, is_default)
  VALUES (p_user_id, '金融理财', 'bank', 'expense'::bill_type, false, 9, true)
  RETURNING id INTO parent_id;
  INSERT INTO public.categories (user_id, name, icon, parent_id, type, engel_eligible, sort_order, is_default) VALUES
    (p_user_id, '信用卡还款', 'bank', parent_id, 'expense'::bill_type, false, 1, true),
    (p_user_id, '贷款还款',   'bank', parent_id, 'expense'::bill_type, false, 2, true),
    (p_user_id, '保险保费',   'bank', parent_id, 'expense'::bill_type, false, 3, true),
    (p_user_id, '投资亏损',   'bank', parent_id, 'expense'::bill_type, false, 4, true),
    (p_user_id, '手续费利息', 'bank', parent_id, 'expense'::bill_type, false, 5, true),
    (p_user_id, '税费',       'bank', parent_id, 'expense'::bill_type, false, 6, true);

  -- 10. 其他支出
  INSERT INTO public.categories (user_id, name, icon, type, engel_eligible, sort_order, is_default)
  VALUES (p_user_id, '其他支出', 'dots-horizontal', 'expense'::bill_type, false, 10, true)
  RETURNING id INTO parent_id;
  INSERT INTO public.categories (user_id, name, icon, parent_id, type, engel_eligible, sort_order, is_default) VALUES
    (p_user_id, '快递物流', 'dots-horizontal', parent_id, 'expense'::bill_type, false, 1, true),
    (p_user_id, '证件办理', 'dots-horizontal', parent_id, 'expense'::bill_type, false, 2, true),
    (p_user_id, '丢失赔偿', 'dots-horizontal', parent_id, 'expense'::bill_type, false, 3, true),
    (p_user_id, '其他杂项', 'dots-horizontal', parent_id, 'expense'::bill_type, false, 4, true);

  -- === 收入分类 ===

  -- 11. 职业收入
  INSERT INTO public.categories (user_id, name, icon, type, engel_eligible, sort_order, is_default)
  VALUES (p_user_id, '职业收入', 'briefcase', 'income'::bill_type, false, 1, true)
  RETURNING id INTO parent_id;
  INSERT INTO public.categories (user_id, name, icon, parent_id, type, engel_eligible, sort_order, is_default) VALUES
    (p_user_id, '工资薪水', 'briefcase', parent_id, 'income'::bill_type, false, 1, true),
    (p_user_id, '奖金绩效', 'briefcase', parent_id, 'income'::bill_type, false, 2, true),
    (p_user_id, '兼职外快', 'briefcase', parent_id, 'income'::bill_type, false, 3, true),
    (p_user_id, '自由职业', 'briefcase', parent_id, 'income'::bill_type, false, 4, true);

  -- 12. 被动收入
  INSERT INTO public.categories (user_id, name, icon, type, engel_eligible, sort_order, is_default)
  VALUES (p_user_id, '被动收入', 'chart-line', 'income'::bill_type, false, 2, true)
  RETURNING id INTO parent_id;
  INSERT INTO public.categories (user_id, name, icon, parent_id, type, engel_eligible, sort_order, is_default) VALUES
    (p_user_id, '理财收益', 'chart-line', parent_id, 'income'::bill_type, false, 1, true),
    (p_user_id, '房租收入', 'chart-line', parent_id, 'income'::bill_type, false, 2, true),
    (p_user_id, '股息分红', 'chart-line', parent_id, 'income'::bill_type, false, 3, true),
    (p_user_id, '版权收入', 'chart-line', parent_id, 'income'::bill_type, false, 4, true);

  -- 13. 其他收入
  INSERT INTO public.categories (user_id, name, icon, type, engel_eligible, sort_order, is_default)
  VALUES (p_user_id, '其他收入', 'cash-plus', 'income'::bill_type, false, 3, true)
  RETURNING id INTO parent_id;
  INSERT INTO public.categories (user_id, name, icon, parent_id, type, engel_eligible, sort_order, is_default) VALUES
    (p_user_id, '红包收入', 'cash-plus', parent_id, 'income'::bill_type, false, 1, true),
    (p_user_id, '报销退款', 'cash-plus', parent_id, 'income'::bill_type, false, 2, true),
    (p_user_id, '二手出售', 'cash-plus', parent_id, 'income'::bill_type, false, 3, true),
    (p_user_id, '礼金收入', 'cash-plus', parent_id, 'income'::bill_type, false, 4, true);

  SELECT count(*) INTO cat_count FROM public.categories WHERE user_id = p_user_id;
  RETURN cat_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Part F: 存量数据修复
-- ============================================================

-- 删除旧约束
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_phone_key;

-- 补充缺失的用户 profile
INSERT INTO public.users (id, phone, nickname)
SELECT au.id, '', '用户' || substring(au.id::text, 1, 6)
FROM auth.users au
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE id = au.id)
ON CONFLICT (id) DO NOTHING;

-- 补充缺失的默认账本
INSERT INTO public.books (name, type, creator_id)
SELECT '日常账本', 'personal', u.id
FROM public.users u
WHERE NOT EXISTS (SELECT 1 FROM public.books WHERE creator_id = u.id);

-- 为有账本但无分类的用户补充分类（通过 RPC）
-- 注意：此步骤仅对缺分类的用户执行，数据量大时可能较慢
DO $$
DECLARE
  u RECORD;
BEGIN
  FOR u IN
    SELECT DISTINCT b.creator_id AS uid
    FROM public.books b
    WHERE NOT EXISTS (SELECT 1 FROM public.categories c WHERE c.user_id = b.creator_id)
  LOOP
    PERFORM public.ensure_categories(u.uid);
  END LOOP;
END $$;

-- ============================================================
-- Part G: 分析用 RPC 函数
-- ============================================================

-- G1. get_monthly_trend — 近 N 个月收支趋势
CREATE OR REPLACE FUNCTION public.get_monthly_trend(p_book_id UUID, p_months INT DEFAULT 6)
RETURNS TABLE(month TEXT, expense NUMERIC, income NUMERIC) AS $$
BEGIN
  RETURN QUERY
  SELECT
    to_char(date_trunc('month', d.month_start), 'YYYY-MM') AS month,
    COALESCE(SUM(CASE WHEN b.type = 'expense' THEN b.amount ELSE 0 END), 0) AS expense,
    COALESCE(SUM(CASE WHEN b.type = 'income' THEN b.amount ELSE 0 END), 0) AS income
  FROM (
    SELECT date_trunc('month', now()) - (i || ' months')::interval AS month_start
    FROM generate_series(0, p_months - 1) AS i
  ) d
  LEFT JOIN public.bills b ON
    b.book_id = p_book_id
    AND date_trunc('month', b.bill_date) = d.month_start
  GROUP BY d.month_start
  ORDER BY d.month_start ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- G2. get_engel_trend — 近 N 个月恩格尔系数趋势
CREATE OR REPLACE FUNCTION public.get_engel_trend(p_book_id UUID, p_months INT DEFAULT 6)
RETURNS TABLE(month TEXT, coefficient NUMERIC) AS $$
BEGIN
  RETURN QUERY
  WITH monthly AS (
    SELECT
      to_char(date_trunc('month', bill_date), 'YYYY-MM') AS m,
      SUM(amount) FILTER (WHERE type = 'expense') AS total_expense,
      SUM(amount) FILTER (WHERE type = 'expense' AND c.engel_eligible = true) AS food_expense
    FROM public.bills b
    JOIN public.categories c ON b.category_id = c.id
    WHERE b.book_id = p_book_id
      AND b.bill_date >= date_trunc('month', now()) - (p_months || ' months')::interval
    GROUP BY date_trunc('month', bill_date)
  )
  SELECT m, ROUND((food_expense / NULLIF(total_expense, 0)) * 100, 1)::numeric
  FROM monthly
  ORDER BY m ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
