import { useEffect, useState } from 'react';
import { Stack, router, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { PaperProvider } from 'react-native-paper';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { View, ActivityIndicator } from 'react-native';
import { useAuthStore } from '@/stores/authStore';
import { getCurrentUser } from '@/services/auth.service';
import theme, { Colors } from '@/theme';

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 60_000, retry: 1 } } });

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, setUser } = useAuthStore();
  const segments = useSegments();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const u = await getCurrentUser();
        if (u) setUser(u);
      } catch { /* not logged in */ }
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    if (!ready) return;
    const inAuth = segments[0] === '(auth)';
    if (!user && !inAuth) router.replace('/(auth)/login');
  }, [ready, user, segments]);

  if (!ready) {
    return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }
  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <PaperProvider theme={theme}>
        <StatusBar style="auto" />
        <AuthGate>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="(auth)" options={{ presentation: 'modal' }} />
            <Stack.Screen name="book/[id]" options={{ headerShown: true, title: '账本详情' }} />
            <Stack.Screen name="bill/[id]" options={{ headerShown: true, title: '账单详情' }} />
            <Stack.Screen name="category-manage" options={{ headerShown: true, title: '分类管理' }} />
          </Stack>
        </AuthGate>
      </PaperProvider>
    </QueryClientProvider>
  );
}
