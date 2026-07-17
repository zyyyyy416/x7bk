// ============================================================
// Jest 全局 setup — 在测试运行前执行
// ============================================================

// 1. Mock expo-secure-store（被 supabase.ts 的 getStorage() 引用）
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

// 2. Mock react-native-paper 的 Portal 组件（避免 native portal 依赖）
//    只对需要 mock 的组件做简单 stub，不影响其他 paper 组件
jest.mock('react-native-paper', () => {
  const actual = jest.requireActual('react-native-paper');
  return {
    ...actual,
    Portal: ({ children }) => children,
  };
});

// 3. 抑制 React Query 的 act() 警告（异步状态更新的已知无害警告）
const originalError = console.error;
console.error = (...args) => {
  if (args[0]?.includes?.('was not wrapped in act')) return;
  originalError.call(console, ...args);
};

// 4. 设置 Supabase 环境变量（避免 getSupabase() 返回 null）
process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test-project.supabase.co';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
