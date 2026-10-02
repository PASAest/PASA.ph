import { Slot } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { AdminShell } from '@/components/admin/AdminShell';
import { Logo } from '@/components/Logo';
import { Button, Card, Field, Loading, Text } from '@/components/ui';
import { notify } from '@/lib/actions';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { colors, space } from '@/theme';

// /admin · Web panel for the PASA team. Only users listed in public.admins get in.
export default function AdminLayout() {
  const { session, loading } = useAuth();
  // Admin check result, remembered per user so switching accounts re-checks.
  const [check, setCheck] = useState<{ userId: string; isAdmin: boolean } | null>(null);
  const userId = session?.user.id;
  const isAdmin = check && check.userId === userId ? check.isAdmin : null;
  const [counts, setCounts] = useState<Record<string, number>>({});

  // Badges in the sidebar: open reports, things waiting for approval, withdrawals to send.
  const refreshCounts = useCallback(async () => {
    const head = { count: 'exact' as const, head: true };
    const [reports, students, tutors, listings, payouts] = await Promise.all([
      supabase.from('reports').select('id', head).eq('status', 'open'),
      supabase.from('profiles').select('id', head).eq('verification_status', 'pending'),
      supabase.from('profiles').select('id', head).eq('tutor_status', 'pending'),
      supabase.from('listings').select('id', head).eq('status', 'pending_review'),
      supabase.from('payouts').select('id', head).eq('status', 'requested'),
    ]);
    setCounts({
      '/admin/reports': reports.count ?? 0,
      '/admin/approvals': (students.count ?? 0) + (tutors.count ?? 0) + (listings.count ?? 0),
      '/admin/payments': payouts.count ?? 0,
    });
  }, []);

  useEffect(() => {
    if (!userId) return;
    supabase.rpc('is_admin').then(({ data }) => {
      setCheck({ userId, isAdmin: !!data });
      if (data) refreshCounts();
    });
  }, [userId, refreshCounts]);

  // Keep badges fresh while the panel is open.
  useEffect(() => {
    if (!isAdmin) return;
    const t = setInterval(refreshCounts, 30_000);
    return () => clearInterval(t);
  }, [isAdmin, refreshCounts]);

  if (loading || (session && isAdmin === null)) return <Loading />;
  if (!session) return <AdminLogin />;
  if (!isAdmin) {
    return (
      <Centered>
        <Text variant="h2">Admins only</Text>
        <Text variant="muted" style={{ textAlign: 'center' }}>
          {session.user.email} isn't a PASA admin. Add it in Supabase (see supabase/seed-users.sql), or sign in with an admin account.
        </Text>
        <Button title="Sign out" variant="outline" onPress={() => supabase.auth.signOut()} />
      </Centered>
    );
  }

  return (
    <AdminShell counts={counts}>
      <Slot />
    </AdminShell>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: space(6) }}>
      <View style={{ width: '100%', maxWidth: 400, gap: space(4), alignItems: 'center' }}>
        <Logo size={72} />
        {children}
      </View>
    </View>
  );
}

function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!email || !password) return;
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    setBusy(false);
    if (error) notify('Sign in failed', error.message === 'Invalid login credentials' ? 'Wrong email or password.' : error.message);
  };
  return (
    <Centered>
      <Text variant="h2">PASA Admin</Text>
      <Card style={{ width: '100%', gap: space(3) }}>
        <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" icon="mail-outline" />
        <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry icon="lock-closed-outline" onSubmitEditing={submit} />
        <Button title="Sign in" onPress={submit} loading={busy} />
      </Card>
    </Centered>
  );
}
