/** @type {import('jest').Config} */
module.exports = {
  // Expo 项目使用 jest-expo preset
  preset: 'jest-expo',

  // 全局 setup 文件（mock expo-secure-store 等）
  setupFiles: ['<rootDir>/jest.setup.js'],

  // 路径别名：@/ → src/（与 tsconfig.json 和 babel.config.js 一致）
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },

  // 忽略 .claude/ 目录
  modulePathIgnorePatterns: ['<rootDir>/.claude/'],

  // 测试文件匹配模式
  testMatch: [
    '**/__tests__/**/*.test.{ts,tsx}',
    '**/*.test.{ts,tsx}',
  ],

  // 覆盖率收集范围
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/types/**',
    '!src/**/*.d.ts',
  ],
};
