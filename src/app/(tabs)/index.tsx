import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { AppBar } from '@/components/AppBar';
import { Mascot } from '@/components/Mascot';
import { PostCard } from '@/components/PostCard';
import { UpcomingSession } from '@/components/UpcomingSession';
import { Avatar, Button, Chip, Empty, Loading, Text } from '@/components/ui';
import { useMe } from '@/lib/auth';
import { fullName, peso } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import type { Post, PostType, Profile } from '@/lib/types';
import { useFocusLoad } from '@/lib/useFocusLoad';
import { colors, font, radius, space } from '@/theme';

type Filter = 'all' | PostType | 'tutors';
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'need_tutor', label: 'Need a Tutor' },
  { key: 'offer_tutoring', label: 'Offering Tutoring' },
  { key: 'tutors', label: 'Find Tutors' },
  { key: 'general', label: 'General' },
];

const POST_SELECT = '*, author:profiles!posts_author_id_fkey(*), comments(count)';

// 3 · Home: greeting, "Post something…", and the feed
export default function Home() {
  const { me } = useMe();
  const [filter, setFilter] = useState<Filter>('all');
  const [posts, setPosts] = useState<Post[]>([]);
  const [tutors, setTutors] = useState<Profile[]>([]);

  const { refreshing, refresh, loaded } = useFocusLoad(async () => {
    if (filter === 'tutors') {
      const { data } = await supabase.from('profiles').select('*').eq('is_tutor', true).neq('id', me.id).order('created_at', { ascending: false });
      setTutors(data ?? []);
      return;
    }
    let q = supabase.from('posts').select(POST_SELECT).order('created_at', { ascending: false }).limit(50);
    if (filter !== 'all') q = q.eq('type', filter);
    const { data } = await q;
    const now = new Date();
    // Boosted posts float to the top while their boost is active.
    const sorted = ((data as Post[]) ?? []).sort(
      (a, b) => Number(!!b.boosted_until && new Date(b.boosted_until) > now) - Number(!!a.boosted_until && new Date(a.boosted_until) > now),
    );
    setPosts(sorted);
  }, [filter]);

  const header = (
    <View style={{ gap: space(4), paddingBottom: space(2) }}>
      <View style={styles.hello}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ fontFamily: font.black, fontSize: 24, color: colors.white }}>Hi, {me.first_name}!</Text>
          <Text style={{ color: colors.white, opacity: 0.95 }}>What do you want to learn or share today?</Text>
        </View>
        <Mascot size={70} waving />
      </View>
      <UpcomingSession />
      <Pressable onPress={() => router.push('/post/new')} style={styles.composer}>
        <Avatar profile={me} size={38} />
        <View style={styles.composerInput}>
          <Text variant="muted">Post something…</Text>
        </View>
        <Ionicons name="image-outline" size={22} color={colors.primary} />
      </Pressable>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {FILTERS.map((f) => (
          <Chip key={f.key} label={f.label} selected={filter === f.key} onPress={() => setFilter(f.key)} />
        ))}
      </ScrollView>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <AppBar action={<Ionicons name="calendar-outline" size={24} color={colors.text} onPress={() => router.push('/activity')} accessibilityLabel="My activity" />} />
      {filter === 'tutors' ? (
        <FlatList
          data={tutors}
          keyExtractor={(t) => t.id}
          contentContainerStyle={{ padding: space(4), gap: space(3) }}
          ListHeaderComponent={header}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
          ListEmptyComponent={loaded ? <Empty icon="school-outline" title="No tutors yet" text="Be the first! Go to Profile → Become a tutor." /> : <Loading />}
          renderItem={({ item }) => <TutorRow tutor={item} />}
        />
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ padding: space(4), gap: space(3) }}
          ListHeaderComponent={header}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            loaded ? (
              <Empty
                icon="newspaper-outline"
                title="Nothing here yet"
                text="Ask for help or offer to tutor. Your post shows up here."
                action={<Button title="Post something" small onPress={() => router.push('/post/new')} />}
              />
            ) : (
              <Loading />
            )
          }
          renderItem={({ item }) => <PostCard post={item} />}
        />
      )}
    </View>
  );
}

function TutorRow({ tutor }: { tutor: Profile }) {
  return (
    <Pressable onPress={() => router.push(`/user/${tutor.id}`)} style={styles.tutor}>
      <Avatar profile={tutor} size={52} />
      <View style={{ flex: 1, gap: 3 }}>
        <Text variant="title">{fullName(tutor)}</Text>
        <Text variant="muted" numberOfLines={1}>
          {tutor.tutor_subjects.join(' · ')}
        </Text>
        <Text style={{ fontFamily: font.bold, color: colors.primaryDark }}>{peso(tutor.tutor_rate)}/hr</Text>
      </View>
      <Button title="Book" small onPress={() => router.push(`/book/${tutor.id}`)} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hello: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: space(4),
    paddingRight: space(2),
    overflow: 'hidden',
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.white,
    borderRadius: radius.pill,
    padding: 6,
    paddingRight: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  composerInput: { flex: 1, backgroundColor: colors.bg, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 9 },
  tutor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space(3),
  },
});

