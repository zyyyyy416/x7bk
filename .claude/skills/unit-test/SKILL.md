---
name: unit-test
description: >
  为 X7BK 项目中的代码创建单元测试并执行。根据被测代码的类型自动选择
  测试策略（纯函数无需 mock、Service 需 mock Supabase、Hook 需 wrapper）。
  当用户要求写测试、加测试、运行测试时触发。覆盖 utils/stores/services/hooks 四层。
---

# X7BK 单元测试

## 流程

1. **识别被测代码**：用户指定文件或函数 → 读取源码 → 判断层级（见下方分级）
2. **检查测试环境**：如 `jest.config.js` 不存在，按[附录 A](#附录-a-首次搭建) 搭建
3. **编写测试**：根据层级选择策略，创建 `src/__tests__/` 下的测试文件
4. **运行验证**：`npx jest <测试文件> --no-coverage`，确保全部通过
5. **类型检查**：`npm run typecheck`（可选）确保无类型错误

## 分级策略

根据被测代码的依赖复杂度，分四个等级：

### L1 · 纯函数（最简单）
**识别**：文件在 `src/utils/` 下，或函数无副作用、不依赖外部模块。

**策略**：直接 `import`，测试输入 → 输出。无需 mock。

**关键点**：
- `currency.ts` — `toLocaleString('zh-CN')` 用逗号千分位
- `date.ts` — `formatRelativeTime` 依赖当前时间，用 `dayjs().subtract()` 构造输入
- `engel.ts` — 测试零除守卫、收入跳过、`engel_eligible` 过滤
- `pinyin.ts` — 中文子串和拼音首字母两种匹配路径

### L2 · Zustand Store
**识别**：文件在 `src/stores/` 下，或被 `create()` 创建的 store。

**策略**：不依赖 React，直接操作 store。
```typescript
beforeEach(() => { useXxxStore.setState(initialState); });
// 调用 action
useXxxStore.getState().actionName();
// 断言状态
expect(useXxxStore.getState().field).toBe(expected);
```

**关键点**：
- `authStore`：`setUser(mockUser)` → `isAuthenticated=true`
- `categoryStore`：`toggleHidden` 开关逻辑、`isHidden(name)` getter
- Zusand v5 用 `.getState()/.setState()` 而非 hook render

### L3 · Supabase Service
**识别**：文件在 `src/services/` 下，调用 `getSupabase()`。

**策略**：Mock `getSupabase()` 返回可控 client。Supabase 用链式 builder，mock 时所有 filter 方法返回 `this`，终端方法返回 Promise。

```typescript
jest.mock('@/services/supabase', () => ({ getSupabase: jest.fn() }));
```

**参考文件**：`references/supabase-mock.example.ts` 提供了 `createMockSupabase()` 工厂。

**Mock 要点**：
- 链式方法（`.select()`, `.eq()`, `.gte()`, `.order()`, `.range()` 等）→ 返回 `this`
- 终端方法（`.single()`, `.maybeSingle()`）→ 返回 `{ data, error }` 的 Promise
- `await query` 直接 await 链 → 链需要有 `.then()` 方法
- RPC 调用 → `mockSupabase.rpc.mockResolvedValue({ data, error })`
- 每个函数测试：成功路径 + 错误路径 + `getSupabase()` 返回 null

### L4 · React Query Hook
**识别**：文件在 `src/hooks/` 下，使用 `useQuery`/`useMutation`。

**策略**：`renderHook` + `QueryClientProvider` wrapper + mock 底层 service。

```typescript
import { renderHook, waitFor } from '@testing-library/react-native';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    require('react').createElement(
      require('@tanstack/react-query').QueryClientProvider,
      { client: queryClient },
      children
    );
}
```

**关键点**：
- Mock 底层 service（如 `jest.mock('@/services/bill.service')`）
- 测试 `enabled` 守卫条件（无 bookId 时不执行）
- Mutation 测试：mock service 函数被正确调用即可

## 运行命令

```bash
npx jest <file> --no-coverage    # 运行指定测试文件
npx jest --no-coverage           # 运行全部测试
npx jest --watch                 # 监听模式
npx jest --coverage              # 覆盖率
```

## 文件约定

- 测试文件：`src/__tests__/<path>/<name>.test.ts`，镜像源码结构
- 路径别名：`@/` → `src/`（已在 jest.config.js 配置）
- 类型：`*.test.ts` 或 `*.test.tsx`

---

## 附录 A：首次搭建

若 `jest.config.js` 不存在于项目根：

1. 安装：`npm install --save-dev jest@^29 jest-expo@~52.0.0 @testing-library/react-native@^12 react-test-renderer@18.3.1 @types/jest@^29`
2. 复制 `references/jest.config.js` → 项目根 `/jest.config.js`
3. 复制 `references/jest.setup.js` → 项目根 `/jest.setup.js`
4. 在 `package.json` 添加 `scripts`：`"test": "jest --passWithNoTests"`
5. 在 `tsconfig.json` 的 `compilerOptions.types` 加 `"jest"`
6. 验证：`npx jest --passWithNoTests`

## 附录 B：常见 Mock 模式

**Supabase 链式**：参考 `references/supabase-mock.example.ts`

**Zustand 重置**：`useXxxStore.setState(initialState)` in `beforeEach`

**dayjs 时间**：`dayjs().subtract(N, 'unit').toISOString()` 避免硬编码日期

**环境变量**：已在 `jest.setup.js` 设置 `EXPO_PUBLIC_SUPABASE_URL`

**类型宽松**：测试中可用 `as any` 绕过复杂类型，只要运行逻辑正确即可
