import './polyfills';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';

export const isConfigured = url.startsWith('https://') && !url.includes('YOUR-PROJECT') && key.length > 20;

/** Web: this page was opened from a password-reset email link (read before Supabase clears it from the address). */
export const openedFromResetLink =
  Platform.OS === 'web' && typeof window !== 'undefined' && /type=recovery/.test(window.location.hash + window.location.search);

export const supabase = createClient(isConfigured ? url : 'https://placeholder.supabase.co', key || 'placeholder', {
  auth: {
    storage: localStorage,
    autoRefreshToken: true,
    persistSession: true,
    // Web: sign in from the link in a password-reset email (it lands on /change-password).
    detectSessionInUrl: Platform.OS === 'web',
  },
});

if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
