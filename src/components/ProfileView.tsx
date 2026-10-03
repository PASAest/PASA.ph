import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { confirm, notify, openChat } from '@/lib/actions';
import { useMe } from '@/lib/auth';
import { toast } from '@/lib/toast';
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
  /** Between me and this student: none, a request I sent, a request they sent, or connected. */
  link: 'none' | 'sent' | 'received' | 'connected';
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
      supabase.from('connections').select('follower_id', { count: 'exact', head: true }).eq('status', 'accepted').or(`follower_id.eq.${userId},following_id.eq.${userId}`),
      supabase
        .from('connections')
        .select('follower_id, status')
        .or(`and(follower_id.eq.${me.id},following_id.eq.${userId}),and(follower_id.eq.${userId},following_id.eq.${me.id})`)
        .limit(1)
        .maybeSingle(),
    ]);
    if (!p.data) return;
    setData({
      profile: p.data,
      ratings: (r.data as Rating[]) ?? [],
      reviews: (rv.data as Review[]) ?? [],
      listings: (l.data as Listing[]) ?? [],
      connections: c.count ?? 0,
      link: !mine.data ? 'none' : mine.data.status === 'accepted' ? 'connected' : mine.data.follower_id === me.id ? 'sent' : 'received',
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
  const { profile: p, ratings, reviews, listings, connections, link } = data;
  const isMe = p.id === me.id;
  const tutorRating = ratings.find((r) => r.role === 'tutor');
  const sellerRating = ratings.find((r) => r.role === 'seller');

  // Removes the connection or request between us, whichever direction it was sent.
  const removeLink = () =>
    supabase.from('connections').delete().or(`and(follower_id.eq.${me.id},following_id.eq.${p.id}),and(follower_id.eq.${p.id},following_id.eq.${me.id})`);

  const connect = async () => {
    if (link === 'none') {
      const { error } = await supabase.from('connections').insert({ follower_id: me.id, following_id: p.id });
      if (error) return notify('Could not send request', error.message);
      toast(`Connection request sent to ${p.first_name}`);
    } else if (link === 'sent') {
      if (!(await confirm('Withdraw request?', `${p.first_name} won't see your connection request anymore.`, 'Withdraw'))) return;
      await removeLink();
    } else if (link === 'connected') {
      if (!(await confirm(`Remove ${p.first_name}?`, 'You can send a new request later.', 'Remove'))) return;
      await removeLink();
    }
    reload();
  };

  const respond = async (accept: boolean) => {
    const { error } = accept
      ? await supabase.from('connections').update({ status: 'accepted' }).eq('follower_id', p.id).eq('following_id', me.id)
      : await removeLink();
    if (error) return notify('Something went wrong', error.message);
    if (accept) toast(`You're now connected with ${p.first_name}`);
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
      {/* Header: photo, name, badges, quick stats, actions */}
      <Card style={{ gap: space(3), paddingTop: 0, overflow: 'hidden' }}>
        <View style={{ height: 64, marginHorizontal: -space(4), backgroundColor: colors.brandSoft }} />
        <View style={{ marginTop: -50, alignItems: 'center', gap: 6 }}>
          <View>
            <View style={{ borderRadius: 999, borderWidth: 4, borderColor: colors.surface }}>
              <Avatar profile={p} size={92} />
            </View>
            <StatusDot status={statuses[p.id]} size={20} />
          </View>
          <Text variant="h2" style={{ textAlign: 'center' }}>
            {fullName(p)}
          </Text>
          <Text variant="muted" style={{ textAlign: 'center' }}>
            {yearLabel(p.year_level)} · {p.program}
          </Text>
          <Text variant="muted" style={{ textAlign: 'center', fontSize: 12.5 }}>
            {p.school}
            {statuses[p.id] ? ` · ${PRESENCE_LABEL[statuses[p.id]]}` : ''}
          </Text>
          <Row style={{ flexWrap: 'wrap', justifyContent: 'center', marginTop: 2 }} gap={6}>
            {p.verification_status === 'verified' ? (
              <Badge label="Verified student" tone="green" icon="shield-checkmark" />
            ) : (
              <Badge label="Not verified" tone="gray" />
            )}
            {p.is_tutor && <Badge label="Tutor" tone="blue" icon="school" />}
            {isPlus(p) && <Badge label="PASA Plus" tone="yellow" icon="star" />}
          </Row>
        </View>
        {!!p.bio && <Text style={{ lineHeight: 21, textAlign: 'center' }}>{p.bio}</Text>}
        <View style={styles.stats}>
          <Stat value={tutorRating ? Number(tutorRating.avg_stars).toFixed(1) : sellerRating ? Number(sellerRating.avg_stars).toFixed(1) : '–'} label="Rating" />
          <Stat value={String((tutorRating?.review_count ?? 0) + (sellerRating?.review_count ?? 0))} label="Reviews" />
          <Stat value={String(connections)} label="Connections" />
          <Stat value={String(listings.length)} label="Listings" />
        </View>
        {isMe ? (
          <Row>
            <Button title="Edit profile" icon="create-outline" small style={{ flex: 1 }} onPress={() => router.push('/edit-profile')} />
            <Button title="Wallet" icon="wallet-outline" variant="outline" small style={{ flex: 1 }} onPress={() => router.push('/wallet')} />
            <Button title="" icon="settings-outline" variant="outline" small onPress={() => router.push('/settings')} />
          </Row>
        ) : (
          <View style={{ gap: space(2) }}>
            {link === 'received' && (
              <View style={styles.request}>
                <Text variant="label" style={{ textAlign: 'center' }}>
                  {p.first_name} wants to connect with you
                </Text>
                <Row>
                  <Button title="Accept" icon="checkmark" small style={{ flex: 1 }} onPress={() => respond(true)} />
                  <Button title="Ignore" variant="outline" small style={{ flex: 1 }} onPress={() => respond(false)} />
                </Row>
              </View>
            )}
            <Row>
              {link !== 'received' && (
                <Button
                  title={link === 'connected' ? 'Connected' : link === 'sent' ? 'Pending' : 'Connect'}
                  icon={link === 'connected' ? 'checkmark' : link === 'sent' ? 'time-outline' : 'person-add'}
                  variant={link === 'none' ? 'primary' : 'soft'}
                  small
                  style={{ flex: 1 }}
                  onPress={connect}
                />
              )}
              <Button title="Message" icon="paper-plane-outline" variant="outline" small style={{ flex: 1 }} onPress={() => openChat(p.id)} />
              <Button title="" icon="ellipsis-horizontal" variant="outline" small onPress={() => setMenu(true)} />
            </Row>
          </View>
        )}
        <Text variant="muted" style={{ textAlign: 'center', fontSize: 12 }}>
          Joined {shortDate(p.created_at)}
        </Text>
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
              <Text variant="muted">· Online via Zoom, Meet or Teams</Text>
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

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 2 }}>
      <Text style={{ fontFamily: font.display, fontSize: 20, color: colors.text }}>{value}</Text>
      <Text variant="muted" style={{ fontSize: 12 }}>
        {label}
      </Text>
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
  request: { gap: space(2), padding: space(3), borderRadius: 12, backgroundColor: colors.brandSoft },
  review: { gap: 4, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: space(3) },
  stats: { flexDirection: 'row', paddingVertical: space(3), borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: space(3) },
}));
