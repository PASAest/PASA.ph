import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { notify } from '@/lib/actions';
import { useMe } from '@/lib/auth';
import { timeAgo } from '@/lib/format';
import { checkText } from '@/lib/moderation';
import { supabase } from '@/lib/supabase';
import type { Comment } from '@/lib/types';
import { colors, font, radius, space, themed } from '@/theme';
import { Avatar, Row, Text } from './ui';
import { Name } from './Name';

/** Comment thread for a post or a listing. */
export function Comments({ comments, target, onPosted }: { comments: Comment[]; target: { post_id: string } | { listing_id: string }; onPosted: () => void }) {
  const { me } = useMe();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const send = async () => {
    const body = text.trim();
    if (!body) return;
    const check = checkText(body);
    if (!check.ok) return notify('Comment not posted', check.reason);
    setSending(true);
    const { error } = await supabase.from('comments').insert({ ...target, author_id: me.id, body });
    setSending(false);
    if (error) return notify('Could not comment', error.message);
    setText('');
    onPosted();
  };

  return (
    <View style={{ gap: space(3) }}>
      <Text variant="title">Comments ({comments.length})</Text>
      {comments.map((c) => (
        <Row key={c.id} style={{ alignItems: 'flex-start' }} gap={10}>
          <Pressable onPress={() => router.push(`/user/${c.author_id}`)}>
            <Avatar profile={c.author} size={34} />
          </Pressable>
          <View style={styles.bubble}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Name profile={c.author} variant="body" style={{ fontFamily: font.bold, fontSize: 13.5 }} />
              <Text variant="muted" style={{ fontSize: 12 }}>· {timeAgo(c.created_at)}</Text>
            </View>
            <Text>{c.body}</Text>
          </View>
        </Row>
      ))}
      <Row gap={10}>
        <Avatar profile={me} size={34} />
        <View style={styles.input}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Write a comment…"
            placeholderTextColor={colors.muted}
            style={{ flex: 1, minHeight: 40, fontFamily: font.regular, fontSize: 15, color: colors.text, outlineStyle: 'none' } as object}
            onSubmitEditing={send}
            returnKeyType="send"
          />
          <Pressable onPress={send} disabled={sending || !text.trim()} accessibilityLabel="Send comment">
            <Ionicons name="send" size={20} color={text.trim() ? colors.primary : colors.border} />
          </Pressable>
        </View>
      </Row>
    </View>
  );
}

const styles = themed(() => StyleSheet.create({
  bubble: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.md, padding: 10, gap: 2, borderWidth: 1, borderColor: colors.border },
  input: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
  },
}));
