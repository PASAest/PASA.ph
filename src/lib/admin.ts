import { Alert, Platform, Share } from 'react-native';
import { supabase } from './supabase';

export type AdminUser = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  program: string;
  year_level: number;
  is_tutor: boolean;
  plus_until: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  banned: boolean;
  ban_reason: string;
  is_admin: boolean;
  school: string;
  verification_status: string;
  tutor_status: string;
};

/** Asks for a short text answer. Web uses the browser prompt; native falls back to the default. */
export function ask(title: string, defaultValue: string): Promise<string | null> {
  if (Platform.OS === 'web') return Promise.resolve(window.prompt(title, defaultValue));
  if (Platform.OS === 'ios') {
    return new Promise((resolve) =>
      Alert.prompt(title, undefined, [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
        { text: 'OK', onPress: (v?: string) => resolve(v || defaultValue) },
      ], 'plain-text', defaultValue),
    );
  }
  return Promise.resolve(defaultValue);
}

export async function banUser(userId: string, reason: string, adminId: string) {
  return supabase.from('bans').insert({ user_id: userId, reason, banned_by: adminId });
}

export async function unbanUser(userId: string) {
  return supabase.from('bans').delete().eq('user_id', userId);
}

/** Turns rows into CSV and downloads it (web) or opens the share sheet (phone). */
export async function exportCsv(filename: string, rows: Record<string, string | number | null>[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const escape = (v: string | number | null) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => escape(r[h])).join(','))].join('\n');
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  } else {
    await Share.share({ message: csv, title: filename });
  }
}
