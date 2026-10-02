import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { confirm, notify, openChat } from '@/lib/actions';
import { useMe } from '@/lib/auth';
import { fullName, isPlus, peso, shortDate, yearLabel } from '@/lib/format';
import { PRESENCE_LABEL, useStatuses } from '@/lib/presence';
import { supabase } from '@/lib/supabase';
import type { Listing, Profile, Rating, Review } from '@/lib/types';
import { useFocusLoad } from '@/lib/useFocusLoad';
import { colors, font, space, themed } from '@/theme';
import { ListingCard } from './ListingCard';
import { MenuSheet } from './MenuSheet';
import { StatusDot } from './StatusDot';
import { Avatar, Badge, Button, Card, Empty, Loading, Row, Stars, Text } from './ui';

type Data = {
  profile: Profile;
  ratings: Rating[];
  reviews: Review[];
  listings: Listing[];
  connections: number;
  connected: boolean;
};

// 3.4 · Profile (yours or another student's)
export function useProfileData(userId: string) {
  const { me } = useMe();
  const [data, setData] = useState<Data | null>(null);
  const load = async () => {
    const [p, r, rv, l, c, mine] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('profile_ratings').select('*').eq('user_id', userId),
      supabase.from('reviews').select('*, reviewer:profiles!reviews_reviewer_id_fkey(*)').eq('reviewee_id', userId).order('created_at', { ascending: false }).limit(5),
      supabase.from('listings').select('*').eq('seller_id', userId).order('created_at', { ascending: false }),
      supabase.from('connections').select('follower_id', { count: 'exact', head: true }).eq('following_id', userId),
      supabase.from('connections').select('follower_id').eq('follower_id', me.id).eq('following_id', userId).maybeSingle(),
    ]);
    if (!p.data) return;
    setData({
      profile: p.data,
      ratings: (r.data as Rating[]) ?? [],
      reviews: (rv.data as Review[]) ?? [],
      listings: (l.data as Listing[]) ?? [],
      connections: c.count ?? 0,
      connected: !!mine.data,
    });
  };
  const state = useFocusLoad(load, [userId]);
  return { data, reload: load, ...state };
}

export function ProfileView({ data, reload }: { data: Data | null; reload: () => Promise<void> }) {
  const { me } = useMe();
  const [menu, setMenu] = useState(false);
  const statuses = useStatuses([data?.profile.id]);
  if (!data) return <Loading />;
  const { profile: p, ratings, reviews, listings, connections, connected } = data;
  const isMe = p.id === me.id;
  const tutorRating = ratings.find((r) => r.role === 'tutor');
  const sellerRating = ratings.find((r) => r.role === 'seller');

  const toggleConnect = async () => {
    if (connected) await supabase.from('connections').delete().eq('follower_id', me.id).eq('following_id', p.id);
    else await supabase.from('connections').insert({ follower_id: me.id, following_id: p.id });
    reload();
  };

  const block = async () => {
    if (!(await confirm(`Block ${p.first_name}?`, "They won't be able to message you, and you won't see their posts.", 'Block'))) return;
    await supabase.from('blocks').insert({ blocker_id: me.id, blocked_id: p.id });
    notify('Blocked', `${p.first_name} has been blocked.`);
    router.back();
  };

  return (
    <View style={{ gap: space(4) }}>
      {/* Name and bio on the left, display photo on the right */}
      <Card style={{ gap: space(3) }}>
        <Row gap={14} style={{ alignItems: 'flex-start' }}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text variant="h2">{fullName(p)}</Text>
            <Row style={{ flexWrap: 'wrap' }} gap={6}>
              {p.verification_status === 'verified' ? (
                <Badge label="Verified student" tone="green" icon="shield-checkmark" />
              ) : (
                <Badge label="Not verified" tone="gray" />
              )}
              {p.is_tutor && <Badge label="Tutor" tone="blue" icon="school" />}
              {isPlus(p) && <Badge label="PASA Plus" tone="yellow" icon="star" />}
            </Row>
            <Text variant="muted">
              {yearLabel(p.year_level)} · {p.program}
            </Text>
            <Text variant="muted">{p.school}</Text>
            {statuses[p.id] && (
              <Text variant="muted" style={{ fontSize: 12.5 }}>
                ● {PRESENCE_LABEL[statuses[p.id]]}
              </Text>
            )}
          </View>
          <View>
            <Avatar profile={p} size={84} />
            <StatusDot status={statuses[p.id]} size={18} />
          </View>
        </Row>
        {!!p.bio && <Text style={{ lineHeight: 21 }}>{p.bio}</Text>}
        <Text variant="muted">
          <Text style={{ fontFamily: font.bold }}>{connections}</Text> connections · Joined {shortDate(p.created_at)}
        </Text>
        {isMe ? (
          <Row>
            <Button title="Edit profile" icon="create-outline" small style={{ flex: 1 }} onPress={() => router.push('/edit-profile')} />
            <Button title="Wallet" icon="wallet-outline" variant="outline" small style={{ flex: 1 }} onPress={() => router.push('/wallet')} />
            <Button title="" icon="settings-outline" variant="outline" small onPress={() => router.push('/settings')} />
          </Row>
        ) : (
          <Row>
            <Button
              title={connected ? 'Connected' : 'Connect'}
              icon={connected ? 'checkmark' : 'person-add'}
              variant={connected ? 'soft' : 'primary'}
              small
              style={{ flex: 1 }}
              onPress={toggleConnect}
            />
            <Button title="Message" icon="paper-plane-outline" variant="outline" small style={{ flex: 1 }} onPress={() => openChat(p.id)} />
            <Button title="More" variant="outline" small onPress={() => setMenu(true)} />
          </Row>
        )}
      </Card>

      {/* Ratings */}
      <Card style={{ gap: space(3) }}>
        <Text variant="title">Ratings</Text>
        {tutorRating || sellerRating ? (
          <Row gap={24}>
            {tutorRating && <RatingBlock label="As tutor" rating={tutorRating} />}
            {sellerRating && <RatingBlock label="As seller" rating={sellerRating} />}
          </Row>
        ) : (
          <Text variant="muted">No ratings yet.</Text>
        )}
        {reviews.map((r) => (
          <View key={r.id} style={styles.review}>
            <Row>
              <Avatar profile={r.reviewer} size={28} />
              <Text variant="label" style={{ flex: 1 }}>
                {fullName(r.reviewer)}
              </Text>
              <Stars value={r.stars} size={12} />
            </Row>
            {!!r.comment && <Text variant="muted">{r.comment}</Text>}
          </View>
        ))}
      </Card>

      {/* About + tutoring services */}
      <Card style={{ gap: space(3) }}>
        <Text variant="title">Tutoring</Text>
        {p.is_tutor ? (
          <>
            {!!p.tutor_about && <Text style={{ lineHeight: 21 }}>{p.tutor_about}</Text>}
            <Row style={{ flexWrap: 'wrap' }} gap={6}>
              {p.tutor_subjects.map((s) => (
                <Badge key={s} label={s} tone="blue" />
              ))}
            </Row>
            <Row>
              <Ionicons name="cash-outline" size={18} color={colors.primary} />
              <Text style={{ fontFamily: font.bold }}>{peso(p.tutor_rate)} / hour</Text>
              <Text variant="muted">
                · {(p.tutor_modes ?? ['in_person']).map((m) => (m === 'online' ? 'Online' : 'In person')).join(' or ')}
              </Text>
            </Row>
            {isMe ? (
              <Button title="Edit tutor profile" variant="outline" small onPress={() => router.push('/become-tutor')} />
            ) : (
              <Button title={`Book ${p.first_name}`} icon="calendar" onPress={() => router.push(`/book/${p.id}`)} />
            )}
          </>
        ) : isMe ? (
          <>
            <Text variant="muted">
              {p.tutor_status === 'pending'
                ? 'Your tutor application is being reviewed by the PASA team.'
                : "Share what you're good at and earn by tutoring classmates."}
            </Text>
            <Button title={p.tutor_status === 'pending' ? 'View application' : 'Become a tutor'} icon="school-outline" small onPress={() => router.push('/become-tutor')} />
          </>
        ) : (
          <Text variant="muted">{p.first_name} doesn't offer tutoring yet.</Text>
        )}
      </Card>

      {isMe && !isPlus(p) && (
        <Card onPress={() => router.push('/plus')} style={{ backgroundColor: colors.warningSoft, borderColor: colors.warningSoft }}>
          <Row>
            <Ionicons name="star" size={22} color={colors.warning} />
            <View style={{ flex: 1 }}>
              <Text variant="title">Get PASA Plus</Text>
              <Text variant="muted">Lower fees, free boosts and a Plus badge.</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.warning} />
          </Row>
        </Card>
      )}

      {/* Listings */}
      <View style={{ gap: space(3) }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Text variant="title">Listings</Text>
          {isMe && <Button title="Add" icon="add" small variant="ghost" onPress={() => router.push('/listing/new')} />}
        </Row>
        {listings.length === 0 ? (
          <Empty icon="library-outline" title="No listings" text={isMe ? 'Sell or rent out books and calculators you no longer need.' : undefined} />
        ) : (
          <View style={styles.grid}>
            {listings.map((l) => (
              <View key={l.id} style={{ width: '48%' }}>
                <ListingCard listing={l} />
              </View>
            ))}
          </View>
        )}
      </View>

      <MenuSheet
        visible={menu}
        onClose={() => setMenu(false)}
        items={[
          { label: 'Report', icon: 'flag-outline', onPress: () => router.push({ pathname: '/report', params: { type: 'user', id: p.id } }) },
          { label: 'Block', icon: 'ban-outline', onPress: block, danger: true },
        ]}
      />
    </View>
  );
}

function RatingBlock({ label, rating }: { label: string; rating: Rating }) {
  return (
    <View style={{ gap: 2 }}>
      <Text style={{ fontFamily: font.black, fontSize: 26 }}>{Number(rating.avg_stars).toFixed(1)}</Text>
      <Stars value={Number(rating.avg_stars)} />
      <Text variant="muted" style={{ fontSize: 12 }}>
        {label} · {rating.review_count} review{rating.review_count === 1 ? '' : 's'}
      </Text>
    </View>
  );
}

const styles = themed(() => StyleSheet.create({
  review: { gap: 4, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: space(3) },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: space(3) },
}));
