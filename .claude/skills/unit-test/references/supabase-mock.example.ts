// ============================================================
// Supabase Mock 工厂
//
// 用于 Service 层测试，提供可控制的 Supabase client mock。
// Supabase JS client 使用链式 builder 模式：
//   supabase.from('table').select().eq('col', val).order('col').range(0, 9)
// 每个非终端方法返回 this，终端方法（.single(), .maybeSingle()）返回 Promise。
//
// 用法：
//   import { createMockSupabase } from './__mocks__/supabase-mock';
//
//   const mockSupabase = createMockSupabase();
//   // 预设某个查询的返回值
//   mockSupabase.chain.single.mockResolvedValue({ data: mockData, error: null });
//   // 注入到被测模块
//   (getSupabase as jest.Mock).mockReturnValue(mockSupabase);
// ============================================================

export interface MockSupabaseChain {
  // 终端方法 — 执行查询并返回 Promise
  single: jest.Mock;
  maybeSingle: jest.Mock;

  // Builder 方法 — 返回 this 以支持链式调用
  select: jest.Mock;
  insert: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
  upsert: jest.Mock;
  eq: jest.Mock;
  neq: jest.Mock;
  gt: jest.Mock;
  gte: jest.Mock;
  lt: jest.Mock;
  lte: jest.Mock;
  like: jest.Mock;
  ilike: jest.Mock;
  is: jest.Mock;
  in: jest.Mock;
  contains: jest.Mock;
  or: jest.Mock;
  order: jest.Mock;
  limit: jest.Mock;
  range: jest.Mock;
  match: jest.Mock;
  filter: jest.Mock;
  not: jest.Mock;
  textSearch: jest.Mock;
  set: jest.Mock;
  select: jest.Mock;
  count: jest.Mock;
  headers: jest.Mock;
}

export interface MockSupabase {
  from: jest.Mock;
  rpc: jest.Mock;
  auth: {
    signInWithPassword: jest.Mock;
    signUp: jest.Mock;
    signOut: jest.Mock;
    getSession: jest.Mock;
    getUser: jest.Mock;
    onAuthStateChange: jest.Mock;
  };
  storage: {
    from: jest.Mock;
  };
  channel: jest.Mock;
  removeChannel: jest.Mock;
  chain: MockSupabaseChain;
}

/**
 * 创建一个可控制的 Supabase mock client。
 *
 * `from(table)` 返回一个链式 builder，所有非终端方法返回 builder 自身。
 * 终端方法 `.single()` / `.maybeSingle()` 返回 Promise。
 *
 * 可通过 `mock.chain.single.mockResolvedValue(...)` 预设返回值，
 * 或通过 `mock.from().select.mockReturnValue(...)` 控制中间调用。
 */
export function createMockSupabase(): MockSupabase {
  // 链式 builder — 所有方法返回 this
  const chain: MockSupabaseChain = {
    single: jest.fn(),
    maybeSingle: jest.fn(),
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    upsert: jest.fn(),
    eq: jest.fn(),
    neq: jest.fn(),
    gt: jest.fn(),
    gte: jest.fn(),
    lt: jest.fn(),
    lte: jest.fn(),
    like: jest.fn(),
    ilike: jest.fn(),
    is: jest.fn(),
    in: jest.fn(),
    contains: jest.fn(),
    or: jest.fn(),
    order: jest.fn(),
    limit: jest.fn(),
    range: jest.fn(),
    match: jest.fn(),
    filter: jest.fn(),
    not: jest.fn(),
    textSearch: jest.fn(),
    set: jest.fn(),
    count: jest.fn(),
    headers: jest.fn(),
  };

  // 让所有非终端方法返回 chain 自身，支持链式调用
  const chainMethods = [
    'select', 'insert', 'update', 'delete', 'upsert',
    'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike',
    'is', 'in', 'contains', 'or', 'order', 'limit', 'range',
    'match', 'filter', 'not', 'textSearch', 'set', 'count', 'headers',
  ];
  for (const method of chainMethods) {
    (chain as any)[method].mockReturnValue(chain);
  }

  // 终端方法默认返回 { data: null, error: null }
  chain.single.mockResolvedValue({ data: null, error: null });
  chain.maybeSingle.mockResolvedValue({ data: null, error: null });

  const mockSupabase: MockSupabase = {
    from: jest.fn().mockReturnValue(chain),
    rpc: jest.fn(),
    auth: {
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      getSession: jest.fn(),
      getUser: jest.fn(),
      onAuthStateChange: jest.fn(),
    },
    storage: {
      from: jest.fn(),
    },
    channel: jest.fn(),
    removeChannel: jest.fn(),
    chain,
  };

  return mockSupabase;
}
