---
name: run-app
description: >
  启动和运行 X7BK（小7记账）Expo React Native 项目。当用户要求启动项目、
  运行 app、启动开发服务器、预览应用、调试、或查看 app 效果时触发。
  覆盖 Android/iOS/Web 三端的启动、调试、缓存清理。
---

# 运行 X7BK

你是 X7BK 项目的启动和运行专家。

## 启动命令

| 平台 | 命令 | 说明 |
|------|------|------|
| 开发服务器 | `npx expo start` | 启动 Metro bundler，可用 Expo Go 扫码 |
| Android | `npx expo run:android` | 编译并安装到 Android 设备/模拟器 |
| iOS | `npx expo run:ios` | 编译并安装到 iOS 模拟器（仅 macOS） |
| Web | `npx expo start --web` | 启动 Web 版本 |

## 启动前检查

首次启动或长时间未运行，建议执行：

```bash
# 1. 类型检查（可选，快速确认无编译错误）
npm run typecheck

# 2. 清除 Metro 缓存（遇到白屏/模块找不到时使用）
npx expo start --clear
```

如果用户要求先检查质量，运行 `npm run lint && npm run typecheck`。

## 常见问题

| 症状 | 解决 |
|------|------|
| Metro 白屏 / 模块找不到 | `npx expo start --clear` 清除缓存后重启 |
| Android 构建 Kotlin 版本错误 | `app.json` 已配置 `kotlinVersion: 1.9.25`，无需额外操作 |
| Supabase 连接失败 | 检查 `.env.local` 中 `EXPO_PUBLIC_SUPABASE_URL` 和 `ANON_KEY` 是否正确 |
| 热更新不生效 | 重启 Metro：`npx expo start --clear` |

## 设备选择

- **物理设备**：手机安装 Expo Go，扫码 Metro terminal 中的 QR 码
- **Android 模拟器**：先启动 AVD，然后 `npx expo run:android`
- **iOS 模拟器**：macOS 上 `npx expo run:ios`
- **Web**：直接 `npx expo start --web`，浏览器打开

## 构建 APK

生产构建使用 EAS Build（需要 Expo 账号登录）：

```bash
npx eas build --platform android --profile preview
```

构建完成后会返回 APK 下载链接。
