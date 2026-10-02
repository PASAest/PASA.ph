import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { Button, Empty, Loading, Text } from '@/components/ui';
import { useMe } from '@/lib/auth';
import { timeAgo } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import type { Notification } from '@/lib/types';
import { useFocusLoad } from '@/lib/useFocusLoad';
import { colors, radius, space } from '@/theme';

const iconFor = (n: Notification) =>
  n.link?.startsWith('/chat') ? 'chatbubble' : n.link?.startsWith('/post') || n.link?.startsWith('/listing') ? 'chatbox-ellipses' : n.link?.startsWith('/user') ? 'person-add' : 'calendar';

// 3.9 · Notifications
export default function Notifications() {
  const { me } = useMe();
  const [items, setItems] = useState<Notification[]>([]);
  const load = async () => {
    const { data } = await supabase.from('notifications').select('*').eq('user_id', me.id).order('created_at', { ascending: false }).limit(60);
    setItems(data ?? []);
  };
  const { refreshing, refresh, loaded } = useFocusLoad(load);

  const markAll = async () => {
    await supabase.from('notifications').update({ read: true }).eq('user_id', me.id).eq('read', false);
    load();
  };

  const open = async (n: Notification) => {
    if (!n.read) await supabase.from('notifications').update({ read: true }).eq('id', n.id);
    if (n.link) router.push(n.link as Href);
  };

  return (
    <Screen
      back
      title="Notifications"
      refreshing={refreshing}
      onRefresh={refresh}
      padded={false}
      right={items.some((n) => !n.read) ? <Button title="Read all" variant="ghost" small onPress={markAll} /> : undefined}
    >
      {!loaded ? (
        <Loading />
      ) : items.length === 0 ? (
        <Empty icon="notifications-outline" title="All caught up" text="Booking updates, messages and comments show up here." />
      ) : (
        items.map((n) => (
          <Pressable
            key={n.id}
            onPress={() => open(n)}
            style={({ pressed }) => ({
              flexDirection: 'row',
              gap: 12,
              padding: space(4),
              backgroundColor: pressed ? colors.brandSoft : n.read ? 'transparent' : colors.surface,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            })}
          >
            <View style={{ width: 40, height: 40, borderRadius: radius.pill, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={iconFor(n)} size={19} color={colors.primary} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant={n.read ? 'body' : 'label'}>{n.title}</Text>
              {!!n.body && (
                <Text variant="muted" numberOfLines={2}>
                  {n.body}
                </Text>
              )}
              <Text variant="muted" style={{ fontSize: 12 }}>
                {timeAgo(n.created_at)}
              </Text>
            </View>
            {!n.read && <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: colors.primary, marginTop: 6 }} />}
          </Pressable>
        ))
      )}
    </Screen>
  );
}
