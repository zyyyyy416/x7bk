// ============================================================
// Supabase Mock 工厂 — 复制自 skill references
// 用于 Service 层测试，提供可控制的 Supabase client mock
// ============================================================

// 链式 builder 的所有方法返回 this
function createChain() {
  const chain: Record<string, jest.Mock> = {};

  // 终端方法 — 真正的返回值在此预设
  chain.single = jest.fn();
  chain.maybeSingle = jest.fn();

  // Builder 方法
  const methods = [
    'select', 'insert', 'update', 'delete', 'upsert',
    'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike',
    'is', 'in', 'contains', 'or', 'order', 'limit', 'range',
    'match', 'filter', 'not', 'textSearch', 'set', 'count', 'headers',
  ];
  for (const m of methods) {
    chain[m] = jest.fn().mockReturnValue(chain);
  }

  // 终端方法默认值
  chain.single.mockResolvedValue({ data: null, error: null });
  chain.maybeSingle.mockResolvedValue({ data: null, error: null });

  return chain;
}

export function createMockSupabase() {
  const chain = createChain();

  const mockSupabase = {
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
    storage: { from: jest.fn() },
    channel: jest.fn(),
    removeChannel: jest.fn(),
    chain,
  };

  return mockSupabase;
}
