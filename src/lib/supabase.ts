import './polyfills';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';

export const isConfigured = url.startsWith('https://') && !url.includes('YOUR-PROJECT') && key.length > 20;

export const supabase = createClient(isConfigured ? url : 'https://placeholder.supabase.co', key || 'placeholder', {
  auth: {
    storage: localStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
