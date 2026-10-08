import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, TextInput, View } from 'react-native';
import { AppBar } from '@/components/AppBar';
import { StatusDot } from '@/components/StatusDot';
import { Avatar, Empty, Loading, Text } from '@/components/ui';
import { useMe } from '@/lib/auth';
import { fullName, timeAgo } from '@/lib/format';
import { centered, WIDTH } from '@/lib/layout';
import { useStatuses } from '@/lib/presence';
import { supabase } from '@/lib/supabase';
import type { Conversation, Profile } from '@/lib/types';
import { useFocusLoad } from '@/lib/useFocusLoad';
import { colors, font, radius, space, themed } from '@/theme';
import { Name } from '@/components/Name';

type Thread = Conversation & { other?: Profile };
type Found = { id: string; conversation_id: string; sender_id: string; body: string; created_at: string };
type Row = { kind: 'header'; title: string } | { kind: 'thread'; thread: Thread } | { kind: 'message'; message: Found; thread?: Thread };

/** Short excerpt around the first match, so the matched words are visible in one line. */
const excerpt = (body: string, q: string) => {
  const i = body.toLowerCase().indexOf(q);
  if (i <= 30) return body;
  const from = body.lastIndexOf(' ', i - 20) + 1; // start on a whole word
  return `…${body.slice(from)}`;
};

/** Text with the matched part in bold. */
function Highlight({ text, q, muted }: { text: string; q: string; muted?: boolean }) {
  const i = q ? text.toLowerCase().indexOf(q) : -1;
  if (i < 0) return <Text variant={muted ? 'muted' : 'title'} numberOfLines={1}>{text}</Text>;
  return (
    <Text variant={muted ? 'muted' : 'title'} numberOfLines={1}>
      {text.slice(0, i)}
      <Text variant={muted ? 'muted' : 'title'} style={{ fontFamily: font.bold, color: colors.primaryDark }}>
        {text.slice(i, i + q.length)}
      </Text>
      {text.slice(i + q.length)}
    </Text>
  );
}

// 3.3 · Messages: normal chat list
export default function Messages() {
  const { me } = useMe();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [search, setSearch] = useState('');
  const [found, setFound] = useState<Found[]>([]);
  const q = search.trim().toLowerCase();

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

  // Search inside messages (only my own conversations are readable), shortly after typing stops.
  useEffect(() => {
    if (q.length < 2) return;
    let live = true;
    const timer = setTimeout(async () => {
      const pattern = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
      const { data } = await supabase
        .from('messages')
        .select('id, conversation_id, sender_id, body, created_at')
        .ilike('body', pattern)
        .order('created_at', { ascending: false })
        .limit(30);
      if (live) setFound((data as Found[]) ?? []);
    }, 250);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [q]);

  const byConvo = new Map(threads.map((t) => [t.id, t]));
  const people = q ? threads.filter((t) => fullName(t.other).toLowerCase().includes(q)) : threads;
  const rows: Row[] = q
    ? [
        ...(people.length ? [{ kind: 'header', title: 'People' } as Row, ...people.map((t) => ({ kind: 'thread', thread: t }) as Row)] : []),
        ...(q.length >= 2 && found.length
          ? [{ kind: 'header', title: 'Messages' } as Row, ...found.map((m) => ({ kind: 'message', message: m, thread: byConvo.get(m.conversation_id) }) as Row)]
          : []),
      ]
    : threads.map((t) => ({ kind: 'thread', thread: t }));

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <AppBar />
      <View style={centered(WIDTH.feed)}>
      <Text variant="h2" style={{ paddingHorizontal: space(4), paddingBottom: space(2) }}>
        Messages
      </Text>
      {threads.length > 0 && (
        <View style={styles.search}>
          <Ionicons name="search" size={18} color={colors.muted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search names and messages"
            placeholderTextColor={colors.muted}
            style={styles.searchInput}
            returnKeyType="search"
            autoCorrect={false}
          />
          {!!search && <Ionicons name="close-circle" size={18} color={colors.muted} onPress={() => setSearch('')} accessibilityLabel="Clear search" />}
        </View>
      )}
      </View>
      <FlatList
        contentContainerStyle={centered(WIDTH.feed)}
        data={rows}
        keyExtractor={(r, i) => (r.kind === 'thread' ? r.thread.id : r.kind === 'message' ? r.message.id : `h${i}`)}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          !loaded ? (
            <Loading />
          ) : q ? (
            <Empty icon="search-outline" title="No results" text={`Nothing matches “${search.trim()}” in your messages.`} />
          ) : (
            <Empty icon="chatbubbles-outline" title="No messages yet" text="Message a tutor or seller from their profile or listing." />
          )
        }
        renderItem={({ item }) => {
          if (item.kind === 'header') {
            return <Text style={styles.section}>{item.title}</Text>;
          }
          if (item.kind === 'message') {
            const m = item.message;
            const mine = m.sender_id === me.id;
            return (
              <Pressable onPress={() => router.push(`/chat/${m.conversation_id}`)} style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.brandSoft }]}>
                <Avatar profile={item.thread?.other} size={50} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Name profile={item.thread?.other} />
                  <Highlight text={(mine ? 'You: ' : '') + excerpt(m.body, q)} q={q} muted />
                </View>
                <Text variant="muted" style={{ fontSize: 12 }}>
                  {timeAgo(m.created_at)}
                </Text>
              </Pressable>
            );
          }
          const t = item.thread;
          return (
            <Pressable onPress={() => router.push(`/chat/${t.id}`)} style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.brandSoft }]}>
              <View>
                <Avatar profile={t.other} size={50} />
                <StatusDot status={statuses[t.other?.id ?? '']} size={14} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Highlight text={fullName(t.other)} q={q} />
                <Text variant="muted" numberOfLines={1}>
                  {t.last_message || 'Say hi 👋'}
                </Text>
              </View>
              <Text variant="muted" style={{ fontSize: 12 }}>
                {timeAgo(t.last_message_at)}
              </Text>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = themed(() => StyleSheet.create({
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: space(4),
    marginBottom: space(2),
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
  },
  searchInput: { flex: 1, minHeight: 44, fontFamily: font.regular, fontSize: 15, color: colors.text, outlineStyle: 'none' } as object,
  section: { fontFamily: font.bold, fontSize: 12.5, letterSpacing: 0.6, textTransform: 'uppercase', color: colors.muted, paddingHorizontal: space(4), paddingTop: space(3), paddingBottom: space(1) },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: space(4), paddingVertical: space(3) },
}));
