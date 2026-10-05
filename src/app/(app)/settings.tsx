import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { Pressable, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { Badge, Card, Text, type IconName } from '@/components/ui';
import { SelectField } from '@/components/SelectField';
import { confirm } from '@/lib/actions';
import { useMe } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/themeMode';
import type { ThemeMode } from '@/theme';
import { colors, space } from '@/theme';

const VERIFY = {
  unverified: { label: 'Not verified', tone: 'gray' },
  pending: { label: 'In review', tone: 'yellow' },
  verified: { label: 'Verified', tone: 'green' },
  rejected: { label: 'Re-upload needed', tone: 'red' },
} as const;

export default function Settings() {
  const { me } = useMe();
  const { mode, setMode } = useTheme();
  const items: { icon: IconName; label: string; href: Href; badge?: { label: string; tone: 'gray' | 'yellow' | 'green' | 'red' } }[] = [
    { icon: 'shield-checkmark-outline', label: 'Student verification', href: '/verify', badge: VERIFY[me.verification_status] },
    { icon: 'person-outline', label: 'Edit profile', href: '/edit-profile' },
    { icon: 'key-outline', label: 'Change password', href: '/change-password' },
    { icon: 'wallet-outline', label: 'Wallet', href: '/wallet' },
    { icon: 'school-outline', label: me.tutor_status === 'approved' ? 'Tutor profile' : 'Become a tutor', href: '/become-tutor' },
    { icon: 'calendar-outline', label: 'My activity', href: '/activity' },
    { icon: 'star-outline', label: 'PASA Plus', href: '/plus' },
    { icon: 'document-text-outline', label: 'Terms, community rules & privacy', href: '/terms' },
  ];

  const logOut = async () => {
    if (!(await confirm('Log out?', 'You can log back in anytime.', 'Log out'))) return;
    await supabase.auth.signOut();
    router.replace('/welcome');
  };

  return (
    <Screen back title="Settings">
      <Card style={{ padding: 0 }}>
        {items.map((it, i) => (
          <Pressable
            key={it.label}
            onPress={() => router.push(it.href)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: space(4), borderTopWidth: i ? 1 : 0, borderTopColor: colors.border }}
          >
            <Ionicons name={it.icon} size={21} color={colors.primary} />
            <Text style={{ flex: 1 }}>{it.label}</Text>
            {it.badge && <Badge label={it.badge.label} tone={it.badge.tone} />}
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </Pressable>
        ))}
      </Card>
      <Card style={{ gap: space(3) }}>
        <Text variant="title">Appearance</Text>
        <SelectField<ThemeMode>
          sheetTitle="Appearance"
          value={mode}
          onChange={setMode}
          options={(
            [
              ['light', 'Light', 'sunny-outline'],
              ['dark', 'Dark', 'moon-outline'],
              ['system', 'Match phone', 'phone-portrait-outline'],
            ] as [ThemeMode, string, IconName][]
          ).map(([m, label, icon]) => ({ value: m, label, icon }))}
        />
      </Card>
      <Pressable onPress={logOut}>
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Ionicons name="log-out-outline" size={21} color={colors.danger} />
            <Text style={{ color: colors.danger }}>Log out</Text>
          </View>
        </Card>
      </Pressable>
      <Text variant="muted" style={{ textAlign: 'center' }}>
        PASA prototype v2.0 · Turn Potential Into PASAbilities
      </Text>
    </Screen>
  );
}
