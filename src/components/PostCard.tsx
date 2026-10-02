import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { fullName, peso, timeAgo, yearLabel } from '@/lib/format';
import type { Post } from '@/lib/types';
import { colors, space, themed } from '@/theme';
import { Avatar, Badge, Card, Row, Text } from './ui';

export const POST_TYPES = {
  need_tutor: { label: 'Needs a tutor', tone: 'yellow', icon: 'help-buoy-outline' },
  offer_tutoring: { label: 'Offering tutoring', tone: 'green', icon: 'school-outline' },
  general: { label: 'General', tone: 'blue', icon: 'chatbubble-ellipses-outline' },
} as const;

export function PostCard({ post, full }: { post: Post; full?: boolean }) {
  const type = POST_TYPES[post.type];
  const boosted = post.boosted_until && new Date(post.boosted_until) > new Date();
  const commentCount = post.comments?.[0]?.count ?? 0;
  return (
    <Card onPress={full ? undefined : () => router.push(`/post/${post.id}`)} style={{ gap: space(3) }}>
      <Row>
        <Pressable onPress={() => router.push(`/user/${post.author_id}`)} accessibilityLabel="View profile">
          <Avatar profile={post.author} size={42} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text variant="label">{fullName(post.author)}</Text>
          <Text variant="muted" style={{ fontSize: 12 }}>
            {post.author ? `${yearLabel(post.author.year_level)} · ${post.author.program}` : ''} · {timeAgo(post.created_at)}
          </Text>
        </View>
        {boosted && <Badge label="Boosted" tone="yellow" icon="flash" />}
      </Row>
      <Row style={{ flexWrap: 'wrap' }}>
        <Badge label={type.label} tone={type.tone} icon={type.icon} />
        {!!post.subject && <Badge label={post.subject} tone="gray" />}
        {post.budget != null && <Badge label={`${peso(post.budget)}/hr`} tone="gray" icon="cash-outline" />}
      </Row>
      <Text numberOfLines={full ? undefined : 5} style={{ lineHeight: 21 }}>
        {post.body}
      </Text>
      {!full && (
        <Row style={styles.footer}>
          <Ionicons name="chatbubble-outline" size={16} color={colors.muted} />
          <Text variant="muted">{commentCount === 1 ? '1 comment' : `${commentCount} comments`}</Text>
        </Row>
      )}
    </Card>
  );
}

const styles = themed(() => StyleSheet.create({
  footer: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: space(3) },
}));
