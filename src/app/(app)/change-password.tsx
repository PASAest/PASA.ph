import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Screen } from '@/components/Screen';
import { Button, Field, Text } from '@/components/ui';
import { notify } from '@/lib/actions';
import { useAuth } from '@/lib/auth';
import { openedFromResetLink, supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';

const MIN_LENGTH = 8; // same rule as sign-up

/** True when this session came from a password-reset email link in the last hour. */
async function signedInFromResetLink() {
  if (openedFromResetLink) return true;
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    const amr: { method: string; timestamp: number }[] = payload.amr ?? [];
    return amr.some((a) => (a.method === 'recovery' || a.method === 'otp') && Date.now() / 1000 - a.timestamp < 3600);
  } catch {
    return false;
  }
}

// Change password from Settings (needs the current password), or set a new one after a reset email link.
export default function ChangePassword() {
  const { session } = useAuth();
  const [reset, setReset] = useState(false);
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [errors, setErrors] = useState<Partial<Record<keyof typeof form, string>>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    signedInFromResetLink().then(setReset);
  }, []);

  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    const e: typeof errors = {};
    if (!reset && !form.current) e.current = 'Enter your current password';
    if (form.next.length < MIN_LENGTH) e.next = `Use at least ${MIN_LENGTH} characters`;
    else if (!reset && form.next === form.current) e.next = 'Choose a password different from your current one';
    if (form.confirm !== form.next) e.confirm = "The passwords don't match";
    setErrors(e);
    if (Object.keys(e).length) return;

    setSaving(true);
    if (!reset) {
      // Check the current password first, so someone holding an unlocked phone can't change it.
      const email = session?.user.email ?? '';
      const { error } = await supabase.auth.signInWithPassword({ email, password: form.current });
      if (error) {
        setSaving(false);
        return setErrors({ current: 'Your current password is wrong' });
      }
    }
    const { error } = await supabase.auth.updateUser({ password: form.next });
    setSaving(false);
    if (error) return notify('Could not change your password', error.message);
    toast('Password changed');
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  };

  return (
    <Screen back title={reset ? 'Set a new password' : 'Change password'} footer={<Button title="Save new password" onPress={save} loading={saving} />}>
      <Text variant="muted">
        {reset ? 'Choose a new password for your PASA account.' : 'Enter your current password, then choose a new one.'} Use at least {MIN_LENGTH} characters.
      </Text>
      {!reset && (
        <Field
          label="Current password"
          value={form.current}
          onChangeText={set('current')}
          error={errors.current}
          secureTextEntry
          autoComplete="current-password"
          icon="lock-closed-outline"
        />
      )}
      <Field label="New password" value={form.next} onChangeText={set('next')} error={errors.next} secureTextEntry autoComplete="new-password" icon="key-outline" />
      <Field
        label="Confirm new password"
        value={form.confirm}
        onChangeText={set('confirm')}
        error={errors.confirm}
        secureTextEntry
        autoComplete="new-password"
        icon="key-outline"
      />
    </Screen>
  );
}
