import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChatMedia } from '@/components/ChatMedia';
import { MenuSheet } from '@/components/MenuSheet';
import { StatusDot } from '@/components/StatusDot';
import { Avatar, Row, Text } from '@/components/ui';
import { confirm, notify } from '@/lib/actions';
import { useMe } from '@/lib/auth';
import { fullName } from '@/lib/format';
import { centered, WIDTH } from '@/lib/layout';
import { checkText } from '@/lib/moderation';
import { PRESENCE_LABEL, useStatuses } from '@/lib/presence';
import { supabase } from '@/lib/supabase';
import type { Conversation, Message, Profile } from '@/lib/types';
import { pickMedia, signedUrls, uploadChatMedia } from '@/lib/upload';
import { colors, font, radius, space, themed } from '@/theme';

// 3.3 · Chat thread (live via Supabase Realtime) with photo and video attachments
/** Where my message is: saved, received by their app, or opened by them. */
const receipt = (m: Message) => (m.seen_at ? 'Seen' : m.delivered_at ? 'Delivered' : 'Sent');

export default function Chat() {
  const { id, draft } = useLocalSearchParams<{ id: string; draft?: string }>();
  const { me } = useMe();
  const insets = useSafeAreaInsets();
  const [other, setOther] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState(draft ?? '');
  const [blocked, setBlocked] = useState(false);
  const [menu, setMenu] = useState(false);
  const [mediaUrls, setMediaUrls] = useState<Record<string, string>>({});
  const [sendingMedia, setSendingMedia] = useState(false);
  const list = useRef<FlatList<Message>>(null);
  const { width } = useWindowDimensions();
  const status = useStatuses([other?.id])[other?.id ?? ''];

  // Private attachments need short-lived signed links.
  useEffect(() => {
    const missing = messages.map((m) => m.attachment_path).filter((p): p is string => !!p && !mediaUrls[p]);
    if (!missing.length) return;
    signedUrls('chat', missing).then((urls) => setMediaUrls((cur) => ({ ...cur, ...urls })));
  }, [messages, mediaUrls]);

  useEffect(() => {
    (async () => {
      const { data: c } = await supabase.from('conversations').select('*').eq('id', id).single();
      const convo = c as Conversation | null;
      if (!convo) return;
      const otherId = convo.user_a === me.id ? convo.user_b : convo.user_a;
      const [{ data: p }, { data: m }, { data: b }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', otherId).single(),
        supabase.from('messages').select('*').eq('conversation_id', id).order('created_at'),
        supabase.from('blocks').select('blocker_id').or(`and(blocker_id.eq.${me.id},blocked_id.eq.${otherId}),and(blocker_id.eq.${otherId},blocked_id.eq.${me.id})`),
      ]);
      setOther(p);
      setMessages(m ?? []);
      setBlocked((b ?? []).length > 0);
      supabase.rpc('mark_messages_seen', { conv: id }).then();
    })();

    const channel = supabase
      .channel(`chat-${id}-${Math.random()}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${id}` }, (payload) => {
        const msg = payload.new as Message;
        setMessages((prev) => (prev.some((x) => x.id === msg.id) ? prev : [...prev, msg]));
        // I'm looking at the chat, so their new message is seen right away.
        if (msg.sender_id !== me.id) supabase.rpc('mark_messages_seen', { conv: id }).then();
      })
      // Delivered / seen updates on my messages.
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${id}` }, (payload) => {
        const msg = payload.new as Message;
        setMessages((prev) => prev.map((x) => (x.id === msg.id ? { ...x, delivered_at: msg.delivered_at, seen_at: msg.seen_at } : x)));
      })
      .subscribe();

    // Opening the chat marks its notifications as read.
    supabase.from('notifications').update({ read: true }).eq('user_id', me.id).eq('link', `/chat/${id}`).then();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, me.id]);

  // The "Sent / Delivered / Seen" line goes under my latest message only.
  const lastMineId = [...messages].reverse().find((m) => m.sender_id === me.id)?.id;

  const send = async () => {
    const body = text.trim();
    if (!body) return;
    const check = checkText(body);
    if (!check.ok) return notify('Message not sent', check.reason);
    setText('');
    const { data, error } = await supabase.from('messages').insert({ conversation_id: id, sender_id: me.id, body }).select().single();
    if (error) {
      setText(body);
      return notify('Could not send', error.message);
    }
    setMessages((prev) => (prev.some((x) => x.id === data.id) ? prev : [...prev, data]));
  };

  const sendMedia = async () => {
    const file = await pickMedia({ video: true, crop: false });
    if (!file) return;
    setSendingMedia(true);
    try {
      const path = await uploadChatMedia(file, id);
      const { data, error } = await supabase
        .from('messages')
        .insert({ conversation_id: id, sender_id: me.id, body: '', attachment_path: path, attachment_type: file.kind === 'video' ? 'video' : 'image' })
        .select()
        .single();
      if (error) throw error;
      setMessages((prev) => (prev.some((x) => x.id === data.id) ? prev : [...prev, data]));
    } catch (e) {
      notify('Could not send', (e as Error).message);
    } finally {
      setSendingMedia(false);
    }
  };

  const block = async () => {
    if (!other || !(await confirm(`Block ${other.first_name}?`, "You won't receive messages from them.", 'Block'))) return;
    await supabase.from('blocks').insert({ blocker_id: me.id, blocked_id: other.id });
    setBlocked(true);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/messages'))} hitSlop={12} accessibilityLabel="Go back">
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Pressable>
        <Pressable style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }} onPress={() => other && router.push(`/user/${other.id}`)}>
          <View>
            <Avatar profile={other} size={38} />
            <StatusDot status={status} />
          </View>
          <View>
            <Text variant="title">{fullName(other)}</Text>
            <Text variant="muted" style={{ fontSize: 12 }}>
              {status ? `${PRESENCE_LABEL[status]} · ` : ''}
              {other?.is_tutor ? 'Tutor' : other?.program}
            </Text>
          </View>
        </Pressable>
        <Pressable onPress={() => setMenu(true)} hitSlop={12} accessibilityLabel="More">
          <Ionicons name="ellipsis-horizontal" size={24} color={colors.text} />
        </Pressable>
      </View>

      <FlatList
        ref={list}
        extraData={lastMineId}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={[centered(WIDTH.feed), { padding: space(4), gap: 6 }]}
        onContentSizeChange={() => list.current?.scrollToEnd({ animated: false })}
        ListHeaderComponent={
          <View style={styles.notice}>
            <Ionicons name="shield-checkmark-outline" size={14} color={colors.primaryDark} />
            <Text style={{ fontSize: 12, color: colors.primaryDark, flex: 1 }}>
              Pay through PASA so your money is protected. Keep chats respectful; offensive words and links are blocked.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const mine = item.sender_id === me.id;
          const status = receipt(item);
          return (
            <View style={{ gap: 3 }}>
              <View style={[styles.bubble, mine ? styles.mine : styles.theirs, !!item.attachment_path && { padding: 4 }]}>
                {item.attachment_path && item.attachment_type && <ChatMedia url={mediaUrls[item.attachment_path]} type={item.attachment_type} />}
                {!!item.body && <Text style={{ color: mine ? colors.white : colors.text }}>{item.body}</Text>}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-end' }}>
                  <Text style={{ fontSize: 10.5, color: mine ? 'rgba(255,255,255,0.8)' : colors.muted }}>
                    {new Date(item.created_at).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })}
                  </Text>
                  {mine && (
                    <Ionicons
                      name={status === 'Sent' ? 'checkmark' : 'checkmark-done'}
                      size={14}
                      color={status === 'Seen' ? colors.white : 'rgba(255,255,255,0.65)'}
                      accessibilityLabel={status}
                    />
                  )}
                </View>
              </View>
              {mine && item.id === lastMineId && <Text style={styles.receipt}>{status === 'Seen' && item.seen_at ? `Seen ${new Date(item.seen_at).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })}` : status}</Text>}
            </View>
          );
        }}
      />

      {blocked ? (
        <View style={[styles.composer, { paddingBottom: insets.bottom + 10, justifyContent: 'center' }]}>
          <Text variant="muted">You can't message this person.</Text>
        </View>
      ) : (
        <Row style={[styles.composer, { paddingBottom: insets.bottom + 10, paddingHorizontal: Math.max(space(3), (width - WIDTH.feed) / 2) }]}>
          <Pressable onPress={sendMedia} disabled={sendingMedia} hitSlop={8} accessibilityLabel="Send a photo or video">
            {sendingMedia ? <ActivityIndicator color={colors.primary} /> : <Ionicons name="image-outline" size={26} color={colors.primary} />}
          </Pressable>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Message…"
            placeholderTextColor={colors.muted}
            style={styles.input}
            multiline
            onSubmitEditing={send}
            blurOnSubmit={Platform.OS === 'web'}
          />
          <Pressable onPress={send} style={[styles.send, !text.trim() && { opacity: 0.4 }]} disabled={!text.trim()} accessibilityLabel="Send">
            <Ionicons name="send" size={18} color={colors.white} />
          </Pressable>
        </Row>
      )}

      <MenuSheet
        visible={menu}
        onClose={() => setMenu(false)}
        items={[
          ...(other?.is_tutor ? [{ label: `Book ${other.first_name}`, icon: 'calendar-outline' as const, onPress: () => router.push(`/book/${other.id}`) }] : []),
          { label: 'View profile', icon: 'person-outline', onPress: () => other && router.push(`/user/${other.id}`) },
          { label: 'Report', icon: 'flag-outline', onPress: () => other && router.push({ pathname: '/report', params: { type: 'user', id: other.id } }) },
          { label: 'Block', icon: 'ban-outline', danger: true, onPress: block },
        ]}
      />
    </KeyboardAvoidingView>
  );
}

const styles = themed(() => StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: space(3),
    paddingBottom: space(2),
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  notice: { flexDirection: 'row', gap: 6, backgroundColor: colors.brandSoft, borderRadius: radius.sm, padding: 8, marginBottom: 8 },
  bubble: { maxWidth: '80%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8, gap: 2 },
  receipt: { alignSelf: 'flex-end', fontSize: 11.5, color: colors.muted, marginRight: 4 },
  mine: { alignSelf: 'flex-end', backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  theirs: { alignSelf: 'flex-start', backgroundColor: colors.surface, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: colors.border },
  composer: { paddingHorizontal: space(3), paddingTop: 10, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 120,
    backgroundColor: colors.bg,
    borderRadius: 21,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    fontFamily: font.regular,
    fontSize: 15,
    color: colors.text,
    outlineStyle: 'none',
  } as object,
  send: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
}));
