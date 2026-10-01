import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { Pressable, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { Card, Text, type IconName } from '@/components/ui';
import { confirm } from '@/lib/actions';
import { useMe } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { colors, space } from '@/theme';

export default function Settings() {
  const { me } = useMe();
  const items: { icon: IconName; label: string; href: Href }[] = [
    { icon: 'person-outline', label: 'Edit profile', href: '/edit-profile' },
    { icon: 'school-outline', label: me.is_tutor ? 'Tutor profile' : 'Become a tutor', href: '/become-tutor' },
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
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </Pressable>
        ))}
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
        PASA prototype v1.0 · Turn Potential Into PASAbilities
      </Text>
    </Screen>
  );
}
