import { MD3LightTheme, configureFonts } from 'react-native-paper';
import type { MD3Theme } from 'react-native-paper';

// 品牌色
export const Colors = {
  // 主色调 — 薄荷绿
  primary: '#00B894',
  primaryLight: '#55EFC4',
  primaryDark: '#00A383',

  // 语义色
  expense: '#FF6B6B',    // 支出红
  income: '#00B894',     // 收入绿
  warning: '#FDCB6E',    // 警告黄
  info: '#74B9FF',       // 信息蓝

  // 中性色
  background: '#F8F9FA',
  surface: '#FFFFFF',
  text: '#2D3436',
  textSecondary: '#636E72',
  textMuted: '#B2BEC3',
  border: '#DFE6E9',
  divider: '#F0F0F0',

  // 恩格尔系数等级色
  engelFree: '#00B894',      // 财务自由
  engelWellOff: '#55EFC4',   // 富足小康
  engelComfort: '#FDCB6E',   // 小资舒适
  engelModerate: '#F39C12',  // 温饱务实
  engelFoodie: '#E17055',    // 终极吃货
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const FontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  // 金额大数字
  amount: 36,
  amountLg: 48,
} as const;

export const BorderRadius = {
  sm: 6,
  md: 10,
  lg: 16,
  xl: 24,
  full: 999,
} as const;

const theme: MD3Theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: Colors.primary,
    primaryContainer: Colors.primaryLight,
    secondary: Colors.info,
    background: Colors.background,
    surface: Colors.surface,
    error: Colors.expense,
    onPrimary: '#FFFFFF',
    onBackground: Colors.text,
    onSurface: Colors.text,
    outline: Colors.border,
  },
  fonts: configureFonts({
    config: {
      displayLarge: { fontFamily: 'System', fontSize: 57 },
      headlineMedium: { fontFamily: 'System', fontSize: 28 },
      titleLarge: { fontFamily: 'System', fontSize: 22 },
      bodyLarge: { fontFamily: 'System', fontSize: 16 },
      bodyMedium: { fontFamily: 'System', fontSize: 14 },
    },
  }),
};

export default theme;
