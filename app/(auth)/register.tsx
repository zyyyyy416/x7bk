import { useEffect } from 'react';
import { router } from 'expo-router';

/** 注册功能已合并到 login.tsx (Tab 切换)，此页面重定向 */
export default function RegisterScreen() {
  useEffect(() => {
    router.replace('/(auth)/login');
  }, []);
  return null;
}
