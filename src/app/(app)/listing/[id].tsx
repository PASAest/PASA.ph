import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Image, Modal, Pressable, View } from 'react-native';
import { Comments } from '@/components/Comments';
import { LISTING_STATUS, ListingPhoto } from '@/components/ListingCard';
import { MenuSheet, type MenuItem } from '@/components/MenuSheet';
import { Screen } from '@/components/Screen';
import { Avatar, Badge, Button, Card, Loading, Row, Text } from '@/components/ui';
import { confirm, openChat } from '@/lib/actions';
import { categoryOf, DELIVERY_NOTE } from '@/config';
import { requireVerified, useMe } from '@/lib/auth';
import { peso, yearLabel } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import type { Comment, Listing } from '@/lib/types';
import { useFocusLoad } from '@/lib/useFocusLoad';
import { colors, elevation, font, radius, space } from '@/theme';
import { Name } from '@/components/Name';

// 3.2 · Item detail: photo, price, title, author, description, seller, comments
export default function ListingDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { me } = useMe();
  const [listing, setListing] = useState<Listing | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [menu, setMenu] = useState(false);
  const [viewer, setViewer] = useState(false);

  const load = async () => {
    const [l, c] = await Promise.all([
      supabase.from('listings').select('*, seller:profiles!listings_seller_id_fkey(*)').eq('id', id).single(),
      supabase.from('comments').select('*, author:profiles!comments_author_id_fkey(*)').eq('listing_id', id).order('created_at'),
    ]);
    setListing(l.data as Listing);
    setComments((c.data as Comment[]) ?? []);
  };
  const { refreshing, refresh } = useFocusLoad(load, [id]);

  if (!listing) return <Screen back title="Item"><Loading /></Screen>;
  const mine = listing.seller_id === me.id;
  const status = LISTING_STATUS[listing.status];
  const available = listing.status === 'available';
  const rent = listing.mode === 'rent';

  const menuItems: MenuItem[] = mine
    ? [
        { label: 'Edit listing', icon: 'create-outline', onPress: () => router.push({ pathname: '/listing/new', params: { id: listing.id } }) },
        { label: 'Boost listing', icon: 'flash-outline', onPress: () => router.push({ pathname: '/plus', params: { boost: 'listing', id: listing.id } }) },
        {
          label: 'Delete listing',
          icon: 'trash-outline',
          danger: true,
          onPress: async () => {
            if (!(await confirm('Delete this listing?', 'This cannot be undone.', 'Delete'))) return;
            await supabase.from('listings').delete().eq('id', listing.id);
            router.back();
          },
        },
      ]
    : [{ label: 'Report listing', icon: 'flag-outline', onPress: () => router.push({ pathname: '/report', params: { type: 'listing', id: listing.id } }) }];

  return (
    <Screen
      back
      title={categoryOf(listing.category).label}
      refreshing={refreshing}
      onRefresh={refresh}
      right={<Button title="•••" variant="ghost" small onPress={() => setMenu(true)} />}
      footer={
        mine ? (
          <Button title="Edit listing" variant="outline" onPress={() => router.push({ pathname: '/listing/new', params: { id: listing.id } })} />
        ) : (
          <Row>
            <Button
              title="Message"
              icon="chatbubble-outline"
              variant="outline"
              style={{ flex: 1 }}
              onPress={() => openChat(listing.seller_id, `Hi! Is "${listing.title}" still available?`)}
            />
            <Button
              title={available ? (rent ? 'Rent' : 'Buy') : status.label}
              icon={available ? 'bag-check-outline' : undefined}
              disabled={!available}
              style={{ flex: 1 }}
              onPress={() => requireVerified(me) && router.push({ pathname: '/checkout', params: { type: 'order', listingId: listing.id } })}
            />
          </Row>
        )
      }
    >
      <Pressable onPress={() => listing.photo_url && setViewer(true)} style={{ borderRadius: radius.lg, overflow: 'hidden', ...elevation() }} accessibilityLabel="View photo">
        <ListingPhoto listing={listing} height={300} />
        {!!listing.photo_url && (
          <View style={{ position: 'absolute', right: 12, bottom: 12, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 999, padding: 8 }}>
            <Ionicons name="expand" size={16} color="#fff" />
          </View>
        )}
      </Pressable>
      <Modal visible={viewer} transparent animationType="fade" onRequestClose={() => setViewer(false)}>
        <Pressable style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center' }} onPress={() => setViewer(false)}>
          {!!listing.photo_url && <Image source={{ uri: listing.photo_url }} style={{ width: '100%', height: '80%' }} resizeMode="contain" />}
          <View style={{ position: 'absolute', top: 50, right: 20 }}>
            <Ionicons name="close" size={30} color="#fff" />
          </View>
        </Pressable>
      </Modal>
      {mine && (listing.status === 'pending_review' || listing.status === 'rejected') && (
        <Card style={{ backgroundColor: listing.status === 'rejected' ? colors.dangerSoft : colors.brandSoft, borderColor: 'transparent', gap: 4 }}>
          <Text variant="title">{listing.status === 'rejected' ? 'Not approved' : 'Waiting for admin approval'}</Text>
          <Text variant="muted">
            {listing.status === 'rejected'
              ? listing.review_note || 'This listing breaks the Assets rules. Edit it and save to send it for review again.'
              : 'Only you can see this listing until the PASA team approves it.'}
          </Text>
        </Card>
      )}
      <View style={{ gap: 6 }}>
        <Text style={{ fontFamily: font.display, fontSize: 32, color: colors.text, letterSpacing: -0.5 }}>
          {peso(listing.price)}
          {rent && <Text variant="muted"> / week</Text>}
        </Text>
        {rent && listing.deposit > 0 && <Text variant="muted">+ {peso(listing.deposit)} refundable deposit</Text>}
        <Text variant="h2">{listing.title}</Text>
        {!!listing.book_author && <Text variant="muted">by {listing.book_author}</Text>}
        <Row style={{ flexWrap: 'wrap', marginTop: 4 }} gap={6}>
          <Badge label={status.label} tone={status.tone} />
          <Badge label={rent ? 'For rent' : 'For sale'} tone="blue" />
          <Badge label={listing.condition} tone="gray" />
          <Badge label={categoryOf(listing.category).label} tone="gray" />
        </Row>
      </View>
      <Pressable onPress={() => router.push(`/user/${listing.seller_id}`)}>
        <Card>
          <Row gap={12}>
            <Avatar profile={listing.seller} size={46} />
            <View style={{ flex: 1 }}>
              <Text variant="muted" style={{ fontSize: 12 }}>
                Sold by
              </Text>
              <Name profile={listing.seller} />
              <Text variant="muted">{listing.seller ? `${yearLabel(listing.seller.year_level)} · ${listing.seller.program}` : ''}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.muted} />
          </Row>
        </Card>
      </Pressable>
      {!!listing.description && (
        <Card style={{ gap: 6 }}>
          <Text variant="title">Description</Text>
          <Text style={{ lineHeight: 21 }}>{listing.description}</Text>
        </Card>
      )}
      <Card style={{ gap: 6 }}>
        <Row style={{ alignItems: 'flex-start' }}>
          <Ionicons name="cube-outline" size={18} color={colors.primary} />
          <Text style={{ flex: 1 }}>{DELIVERY_NOTE}</Text>
        </Row>
        <Row>
          <Ionicons name="shield-checkmark-outline" size={18} color={colors.success} />
          <Text variant="muted" style={{ flex: 1 }}>
            PASA holds your payment until you confirm you got the item.
          </Text>
        </Row>
      </Card>
      <Comments comments={comments} target={{ listing_id: listing.id }} onPosted={load} />
      <View style={{ height: space(2) }} />
      <MenuSheet visible={menu} onClose={() => setMenu(false)} items={menuItems} />
    </Screen>
  );
}
