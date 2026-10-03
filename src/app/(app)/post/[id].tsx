import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Comments } from '@/components/Comments';
import { MenuSheet, type MenuItem } from '@/components/MenuSheet';
import { PostCard } from '@/components/PostCard';
import { Screen } from '@/components/Screen';
import { Button, Loading, Row } from '@/components/ui';
import { confirm, openChat } from '@/lib/actions';
import { requireVerified, useMe } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import type { Comment, Post } from '@/lib/types';
import { useFocusLoad } from '@/lib/useFocusLoad';

// 3b · Post detail with comments
export default function PostDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { me } = useMe();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [menu, setMenu] = useState(false);

  const load = async () => {
    const [p, c] = await Promise.all([
      supabase.from('posts').select('*, author:profiles!posts_author_id_fkey(*)').eq('id', id).single(),
      supabase.from('comments').select('*, author:profiles!comments_author_id_fkey(*)').eq('post_id', id).order('created_at'),
    ]);
    setPost(p.data as Post);
    setComments((c.data as Comment[]) ?? []);
  };
  const { refreshing, refresh } = useFocusLoad(load, [id]);

  if (!post) return <Screen back title="Post"><Loading /></Screen>;
  const mine = post.author_id === me.id;

  const menuItems: MenuItem[] = mine
    ? [
        { label: 'Boost this post', icon: 'flash-outline', onPress: () => router.push({ pathname: '/plus', params: { boost: 'post', id: post.id } }) },
        {
          label: 'Delete post',
          icon: 'trash-outline',
          danger: true,
          onPress: async () => {
            if (!(await confirm('Delete this post?', 'This cannot be undone.', 'Delete'))) return;
            await supabase.from('posts').delete().eq('id', post.id);
            router.back();
          },
        },
      ]
    : [{ label: 'Report post', icon: 'flag-outline', onPress: () => router.push({ pathname: '/report', params: { type: 'post', id: post.id } }) }];

  return (
    <Screen
      back
      title="Post"
      refreshing={refreshing}
      onRefresh={refresh}
      right={<Button title="•••" variant="ghost" small onPress={() => setMenu(true)} />}
    >
      <PostCard post={post} full />
      {!mine && post.type === 'need_tutor' && (
        <Button
          title="Offer to help"
          icon="hand-left-outline"
          onPress={() => requireVerified(me) && openChat(post.author_id, `Hi ${post.author?.first_name}! I saw your post about ${post.subject}. I can help you with it.`)}
        />
      )}
      {!mine && post.type === 'offer_tutoring' && (
        <Row>
          {post.author?.is_tutor && (
            <Button title="Book session" icon="calendar" style={{ flex: 1 }} onPress={() => router.push(`/book/${post.author_id}`)} />
          )}
          <Button title="Message" variant="outline" style={{ flex: 1 }} onPress={() => openChat(post.author_id)} />
        </Row>
      )}
      <Comments comments={comments} target={{ post_id: post.id }} onPosted={load} />
      <MenuSheet visible={menu} onClose={() => setMenu(false)} items={menuItems} />
    </Screen>
  );
}
