---
name: security-audit
description: >
  对 X7BK 项目进行安全审计。检查：敏感信息泄露（密码/Token/密钥硬编码）、
  代码注入风险（SQL注入/eval/动态执行）、配置安全（明文密钥）、
  Auth/RLS 权限、错误信息泄露、依赖漏洞。当用户要求安全检查、安全审计、
  security audit、代码安全、漏洞扫描、安全隐患时触发。
---

# X7BK 安全审计

你是 X7BK 项目的安全审计员。对代码进行系统化的安全漏洞扫描，输出分级报告。

## 流程

1. 读取用户指定的文件或目录
2. 逐文件按 5 个检查项扫描
3. 输出分级报告，每个问题附修复方案
4. 最后给出优先级排序的建议

**排除规则**：`*.test.ts` `*.test.tsx` `node_modules/` `dist/` 不扫描。

---

## 检查项一：敏感信息泄露

### 扫描内容

- 硬编码密码、API Key、Token、Secret
  - grep: `password|secret|token|apiKey|api_key|privateKey|AUTH_TOKEN|service_role`
- 硬编码邮箱/手机号等凭据（如 `dev@xxx.com / 密码123`）
- `EXPO_PUBLIC_` 变量（会被打包进客户端 APK）
- 环境文件（`.env.local` 等）是否在 `.gitignore` 中

### 风险定级

| 情况 | 等级 | 处理 |
|------|:---:|------|
| 真实密码/密钥硬编码在源码中 | 🔴 | 立即移除，改用环境变量。如果已提交 git，需轮换密钥 |
| 开发账号凭据在 UI 中可见 | 🔴 | 移除"快速体验"功能或用 `__DEV__` 守卫 |
| `EXPO_PUBLIC_` 暴露 Supabase anon key | 🟠 | anon key 设计上公开，但需确认 RLS 已正确配置 |
| `service_role` key 出现在客户端代码 | 🔴 | 极度严重 — service_role 有管理员权限，必须立即移除 |
| `.env` 文件不在 gitignore | 🟠 | 添加到 `.gitignore`，检查 git 历史是否已泄露 |

### X7BK 已知问题参考

- `app/(auth)/login.tsx:47` — 硬编码 `dev@x7bk.com / x7bk123456`，且 UI 中明文展示
- `.env.local` — Supabase URL 和 anon key（已 gitignored ✅，但 `EXPO_PUBLIC_` 会打包进客户端）

---

## 检查项二：注入漏洞

### 扫描内容

- 动态代码执行：`eval(`、`new Function(`、`Function(`
- SQL 拼接：字符串拼接 `'SELECT * FROM ' + table`、模板字符串无参数化
- 命令注入：`exec(`、`child_process`
- 用户输入是否经过验证/清理后再传给后端

### 风险定级

| 情况 | 等级 | 处理 |
|------|:---:|------|
| 用户输入直接拼接到 SQL | 🔴 | 使用参数化查询（Supabase 默认已参数化，但如果用 `.rpc()` 或 raw SQL 需检查） |
| RLS 禁用 + GRANT ALL to anon | 🔴 | 启用 RLS，为每张表添加 `USING (auth.uid() = user_id)` 策略 |
| `Function()` / `eval()` 执行用户输入 | 🟠 | 替换为安全的表达式解析器或纯函数计算 |
| 无输入长度限制 | 🟡 | 添加 maxLength，防止 DoS |

### Supabase 安全检查

检查 `supabase/migrations/` 目录下的 SQL 文件：
- `DISABLE ROW LEVEL SECURITY` → 🔴 如果是生产环境
- `GRANT ALL TO anon` → 🔴 anon 不应有任何写权限
- `SECURITY DEFINER` 函数是否检查 `auth.uid()` → 🟠 如果没有身份校验

### X7BK 已知问题参考

- `app/(tabs)/add.tsx:115` — `Function()` 执行金额表达式（有正则过滤但仍是 eval-like）
- `supabase/migrations/001_schema.sql:138-144` — 7 张表 RLS 全部禁用
- `supabase/migrations/001_schema.sql:147-150` — GRANT ALL TO anon, authenticated

---

## 检查项三：配置安全

### 扫描内容

- `app.json`、`eas.json`、`app.config.js` 等配置文件中的密钥
- Supabase anon key 类型（必须是 `sb_publishable_` 前缀，发现 `service_role` 立即报警）
- 云服务 ID/端点等基础设施信息暴露
- 环境文件管理

### 风险定级

| 情况 | 等级 | 处理 |
|------|:---:|------|
| `service_role` key 在客户端配置中 | 🔴 | 立即轮换，service_role 仅用于服务端 |
| 配置文件有真实密钥且未 gitignore | 🟠 | 添加到 gitignore，检查 git 历史 |
| `app.json` 的 `extra` 字段有占位符但未被代码使用 | 🟡 | 清理未使用的占位符，避免误导 |

---

## 检查项四：权限与认证

### 扫描内容

- Auth gate 的完整性：是否所有受保护页面都经过认证检查
- 敏感操作（删除、移除成员）是否有二次确认
- signOut 是否正确清理了本地和远端状态
- SECURITY DEFINER 函数是否有身份校验
- 是否有未受保护的路由

### 风险定级

| 情况 | 等级 | 处理 |
|------|:---:|------|
| 受保护页面绕过 auth gate | 🔴 | 修复路由守卫 |
| signOut 失败时本地状态被清除但远端 session 仍有效 | 🟠 | 检查 signOut 返回值后再清理本地状态 |
| SECURITY DEFINER 函数无 `auth.uid()` 检查 | 🟠 | 添加身份校验 |
| 敏感操作无二次确认 | 🟡 | 添加 Alert 确认对话框 |

### X7BK 已知问题参考

- `src/services/auth.service.ts:41-45` — signOut 不检查返回值，失败也静默
- `src/hooks/useAuth.ts:18` — logout 先调 signOut 再清 store，但不管 signOut 是否成功
- `supabase/migrations/001_schema.sql:184` — `ensure_user_profile` 接受任意 `user_id` 无身份校验

---

## 检查项五：错误处理与依赖安全

### 扫描内容

- 错误消息是否泄露内部信息（表名、字段名、文件路径、错误码如 42501/PGRST301）
- `console.log` 是否打印敏感数据（token、密码、完整用户对象）
- `catch { /* noop */ }` 是否静默吞掉了安全关键的错误
- `package.json` 中是否有 deprecated 或带已知 CVE 的依赖

### 风险定级

| 情况 | 等级 | 处理 |
|------|:---:|------|
| 错误消息暴露数据库结构 | 🟡 | 对用户显示泛化消息，详细信息记日志 |
| 静默吞掉安全关键错误（如 SecureStore 写入失败） | 🟡 | 至少 console.warn，关键路径可考虑重试 |
| `as any` 绕过类型检查 | 🔵 | 完善 Supabase 类型定义，移除 as any |
| npm 依赖有已知 CVE | 🟠 | 升级或替换 |

### X7BK 已知问题参考

- `src/services/book.service.ts:56-62` — 错误消息含表名 `books`、错误码 `42501`、文件路径
- `src/services/bill.service.ts:87-91` — 错误消息暴露分类名称和 Supabase SQL Editor 操作指引
- `src/services/supabase.ts:14-16` — SecureStore 读写错误全静默吞掉
- `src/services/analysis.service.ts:105,114` — `(s.rpc as any)` 绕过类型检查（共 6 处）

---

## 报告输出格式

```markdown
## 🔒 安全审计报告

**审计范围**：<路径>
**审计时间**：<时间>

| 等级 | 数量 |
|------|:---:|
| 🔴 严重 | X |
| 🟠 高危 | X |
| 🟡 中危 | X |
| 🔵 低危 | X |

### 🔴 严重

#### [SEC-001] <简短标题>
- **文件**：`path:line`
- **代码**：`相关代码片段`
- **问题**：<一句话说明>
- **影响**：<攻击者可利用的方式>
- **修复**：<具体可操作的修复方案>

### 🟠 高危
...
### 🟡 中危
...
### 🔵 低危 / 建议
...

### 📊 修复优先级

1. [立即] ...
2. [本周] ...
3. [下个迭代] ...
```

---

## 运行方式

```
/comments-check security-audit src/                # 审计整个源码
/comments-check security-audit supabase/            # 审计数据库配置
/comments-check security-audit --diff               # 审计本次变更
```
