import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import type { Database } from '@/types/supabase';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

/** Storage: web → undefined(localStorage), native → SecureStore */
function getStorage() {
  if (Platform.OS === 'web') return undefined;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const SecureStore = require('expo-secure-store');
  return {
    getItem: async (k: string) => { try { return await SecureStore.getItemAsync(k); } catch { return null; } },
    setItem: async (k: string, v: string) => { try { await SecureStore.setItemAsync(k, v); } catch { /* noop */ } },
    removeItem: async (k: string) => { try { await SecureStore.deleteItemAsync(k); } catch { /* noop */ } },
  };
}

let _client: SupabaseClient<Database> | null = null;

function getClient(): SupabaseClient<Database> | null {
  if (_client) return _client;
  if (!supabaseUrl || supabaseUrl.includes('your-project-id')) {
    console.warn('⚠️ Supabase 未配置');
    return null;
  }
  _client = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: getStorage(),
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
  return _client;
}

export function getSupabase() {
  return getClient();
}
