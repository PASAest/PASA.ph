import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { AppBar } from '@/components/AppBar';
import { PostCard } from '@/components/PostCard';
import { StatusDot } from '@/components/StatusDot';
import { UpcomingSession } from '@/components/UpcomingSession';
import { VerifyBanner } from '@/components/VerifyBanner';
import { Avatar, Button, Empty, SkeletonList, Text, type IconName } from '@/components/ui';
import { requireVerified, useMe } from '@/lib/auth';
import { tap } from '@/lib/haptics';
import { fullName, peso } from '@/lib/format';
import { centered, WIDTH } from '@/lib/layout';
import { PRESENCE_LABEL, useStatuses } from '@/lib/presence';
import { supabase } from '@/lib/supabase';
import type { Post, PostType, Presence, Profile } from '@/lib/types';
import { useFocusLoad } from '@/lib/useFocusLoad';
import { colors, elevation, font, radius, space, themed } from '@/theme';

type Filter = 'all' | PostType | 'tutors';
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'For you' },
  { key: 'need_tutor', label: 'Needs help' },
  { key: 'offer_tutoring', label: 'Offering' },
  { key: 'tutors', label: 'Tutors' },
  { key: 'general', label: 'General' },
];

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
};

const POST_SELECT = '*, author:profiles!posts_author_id_fkey(*), comments(count)';

// 3 · Home: greeting, "Post something…", and the feed
export default function Home() {
  const { me } = useMe();
  const params = useLocalSearchParams<{ filter?: Filter }>();
  const [filter, setFilter] = useState<Filter>(params.filter ?? 'all');
  // "Find a tutor" from the ＋ menu opens Home on the Tutors tab (adjust state when the route param changes).
  const [appliedParam, setAppliedParam] = useState(params.filter);
  if (params.filter !== appliedParam) {
    setAppliedParam(params.filter);
    if (params.filter) setFilter(params.filter);
  }
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
  const statuses = useStatuses(tutors.map((t) => t.id));

  const header = (
    <View style={{ gap: space(4), paddingBottom: space(2) }}>
      <View style={{ gap: 2 }}>
        <Text variant="muted">{greeting()},</Text>
        <Text variant="h1">{me.first_name} 👋</Text>
      </View>
      <View style={styles.quick}>
        <Quick icon="school" label="Find a tutor" tint="#2A86C4" onPress={() => setFilter('tutors')} />
        <Quick icon="pricetag" label="Sell an item" tint="#2E9D5B" onPress={() => requireVerified(me) && router.push('/listing/new')} />
        <Quick icon="calendar" label="My sessions" tint="#B7791F" onPress={() => router.push('/activity')} />
        <Quick icon="wallet" label="Wallet" tint="#0F9D8F" onPress={() => router.push('/wallet')} />
      </View>
      <VerifyBanner />
      <UpcomingSession />
      <Pressable onPress={() => router.push('/post/new')} style={({ pressed }) => [styles.composer, pressed && { opacity: 0.9 }]}>
        <Avatar profile={me} size={36} />
        <Text variant="muted" style={{ flex: 1 }}>
          What do you need help with?
        </Text>
        <View style={styles.composerBtn}>
          <Ionicons name="create-outline" size={18} color={colors.white} />
        </View>
      </Pressable>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
        {FILTERS.map((f) => {
          const on = filter === f.key;
          return (
            <Pressable
              key={f.key}
              onPress={() => {
                tap();
                setFilter(f.key);
              }}
              style={styles.tabItem}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
            >
              <Text style={{ fontFamily: on ? font.bold : font.semibold, color: on ? colors.text : colors.muted, fontSize: 15 }}>{f.label}</Text>
              <View style={[styles.tabLine, on && { backgroundColor: colors.primary }]} />
            </Pressable>
          );
        })}
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
          contentContainerStyle={[centered(WIDTH.feed), { padding: space(4), gap: space(3) }]}
          ListHeaderComponent={header}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
          ListEmptyComponent={loaded ? <Empty icon="school-outline" title="No tutors yet" text="Be the first! Go to Profile → Become a tutor." /> : <SkeletonList count={3} />}
          renderItem={({ item }) => <TutorRow tutor={item} status={statuses[item.id]} />}
        />
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(p) => p.id}
          contentContainerStyle={[centered(WIDTH.feed), { padding: space(4), gap: space(3) }]}
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
              <SkeletonList count={3} />
            )
          }
          renderItem={({ item }) => <PostCard post={item} />}
        />
      )}
    </View>
  );
}

function Quick({ icon, label, tint, onPress }: { icon: IconName; label: string; tint: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [styles.quickItem, pressed && { transform: [{ scale: 0.95 }] }]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={[styles.quickIcon, { backgroundColor: `${tint}1F` }]}>
        <Ionicons name={icon} size={22} color={tint} />
      </View>
      <Text style={{ fontFamily: font.semibold, fontSize: 12, textAlign: 'center' }} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

function TutorRow({ tutor, status }: { tutor: Profile; status?: Presence }) {
  return (
    <Pressable onPress={() => router.push(`/user/${tutor.id}`)} style={styles.tutor}>
      <View>
        <Avatar profile={tutor} size={52} />
        <StatusDot status={status} size={14} />
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Text variant="title">{fullName(tutor)}</Text>
        <Text variant="muted" numberOfLines={1}>
          {tutor.tutor_subjects.join(' · ')}
        </Text>
        <Text style={{ fontFamily: font.bold, color: colors.primaryDark }}>
          {peso(tutor.tutor_rate)}/hr
          <Text variant="muted">
            {' · '}
            Online
            {status ? ` · ${PRESENCE_LABEL[status]}` : ''}
          </Text>
        </Text>
      </View>
      <Button title="Book" small onPress={() => router.push(`/book/${tutor.id}`)} />
    </Pressable>
  );
}

const styles = themed(() => StyleSheet.create({
  quick: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  quickItem: { flex: 1, alignItems: 'center', gap: 6, paddingVertical: 12, borderRadius: radius.md, backgroundColor: colors.surface, ...elevation() },
  quickIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 10,
    paddingLeft: 12,
    ...elevation(),
  },
  composerBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  tabs: { gap: 22, paddingTop: 4 },
  tabItem: { alignItems: 'center', gap: 6 },
  tabLine: { height: 3, width: 22, borderRadius: 2, backgroundColor: 'transparent' },
  tutor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space(3),
    ...elevation(),
  },
}));

