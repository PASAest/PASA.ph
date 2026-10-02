import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { AppBar } from '@/components/AppBar';
import { StatusDot } from '@/components/StatusDot';
import { Avatar, Empty, Loading, Text } from '@/components/ui';
import { useMe } from '@/lib/auth';
import { fullName, timeAgo } from '@/lib/format';
import { useStatuses } from '@/lib/presence';
import { supabase } from '@/lib/supabase';
import type { Conversation, Profile } from '@/lib/types';
import { useFocusLoad } from '@/lib/useFocusLoad';
import { colors, space, themed } from '@/theme';

type Thread = Conversation & { other?: Profile };

// 3.3 · Messages: normal chat list
export default function Messages() {
  const { me } = useMe();
  const [threads, setThreads] = useState<Thread[]>([]);

  const load = async () => {
    const { data } = await supabase.from('conversations').select('*').order('last_message_at', { ascending: false });
    const convos = (data as Conversation[]) ?? [];
    const otherIds = convos.map((c) => (c.user_a === me.id ? c.user_b : c.user_a));
    const { data: people } = otherIds.length ? await supabase.from('profiles').select('*').in('id', otherIds) : { data: [] };
    const byId = new Map((people as Profile[]).map((p) => [p.id, p]));
    setThreads(convos.map((c) => ({ ...c, other: byId.get(c.user_a === me.id ? c.user_b : c.user_a) })));
  };
  const { refreshing, refresh, loaded } = useFocusLoad(load);
  const statuses = useStatuses(threads.map((t) => t.other?.id));

  // Refresh the list when a new message arrives in any of my conversations.
  useEffect(() => {
    const channel = supabase
      .channel(`inbox-${me.id}-${Math.random()}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me.id]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <AppBar />
      <Text variant="h2" style={{ paddingHorizontal: space(4), paddingBottom: space(2) }}>
        Messages
      </Text>
      <FlatList
        data={threads}
        keyExtractor={(t) => t.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          loaded ? <Empty icon="chatbubbles-outline" title="No messages yet" text="Message a tutor or seller from their profile or listing." /> : <Loading />
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(`/chat/${item.id}`)} style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.brandSoft }]}>
            <View>
              <Avatar profile={item.other} size={50} />
              <StatusDot status={statuses[item.other?.id ?? '']} size={14} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="title">{fullName(item.other)}</Text>
              <Text variant="muted" numberOfLines={1}>
                {item.last_message || 'Say hi 👋'}
              </Text>
            </View>
            <Text variant="muted" style={{ fontSize: 12 }}>
              {timeAgo(item.last_message_at)}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = themed(() => StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: space(4), paddingVertical: space(3) },
}));
