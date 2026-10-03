import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { categoryOf } from '@/config';
import { peso } from '@/lib/format';
import { tap } from '@/lib/haptics';
import type { Listing, ListingStatus } from '@/lib/types';
import { colors, elevation, font, radius, themed } from '@/theme';
import { Badge, Text } from './ui';

export const LISTING_STATUS: Record<ListingStatus, { label: string; tone: 'green' | 'yellow' | 'gray' | 'blue' | 'red' }> = {
  pending_review: { label: 'Waiting for approval', tone: 'blue' },
  rejected: { label: 'Not approved', tone: 'red' },
  available: { label: 'Available Now', tone: 'green' },
  reserved: { label: 'Reserved', tone: 'yellow' },
  on_loan: { label: 'On Loan', tone: 'yellow' },
  sold: { label: 'Sold', tone: 'gray' },
};

export function ListingPhoto({ listing, height }: { listing: Listing; height: number }) {
  const [failed, setFailed] = useState(false);
  // Broken or missing photos fall back to the category icon instead of an empty box.
  if (listing.photo_url && !failed) {
    return <Image source={{ uri: listing.photo_url }} style={{ width: '100%', height, backgroundColor: colors.border }} resizeMode="cover" onError={() => setFailed(true)} />;
  }
  return (
    <View style={[styles.placeholder, { height }]}>
      <Ionicons name={categoryOf(listing.category).icon} size={height * 0.32} color={colors.brand} />
    </View>
  );
}

export function ListingCard({ listing, favorite, onToggleFavorite }: { listing: Listing; favorite?: boolean; onToggleFavorite?: () => void }) {
  const status = LISTING_STATUS[listing.status];
  const boosted = listing.boosted_until && new Date(listing.boosted_until) > new Date();
  const rent = listing.mode === 'rent';
  return (
    <Pressable onPress={() => router.push(`/listing/${listing.id}`)} style={({ pressed }) => [styles.card, pressed && { transform: [{ scale: 0.97 }] }]}>
      <View>
        <ListingPhoto listing={listing} height={128} />
        <View style={styles.tagRow}>
          <View style={[styles.tag, { backgroundColor: rent ? colors.warning : colors.primary }]}>
            <Text style={styles.tagText}>{rent ? 'RENT' : 'SALE'}</Text>
          </View>
          {boosted && (
            <View style={[styles.tag, { backgroundColor: colors.warningSoft }]}>
              <Ionicons name="flash" size={10} color={colors.warning} />
            </View>
          )}
        </View>
        {onToggleFavorite && (
          <Pressable
            onPress={() => {
              tap();
              onToggleFavorite();
            }}
            hitSlop={8}
            style={styles.heart}
            accessibilityLabel={favorite ? 'Remove from saved' : 'Save'}
          >
            <Ionicons name={favorite ? 'heart' : 'heart-outline'} size={17} color={favorite ? colors.danger : colors.text} />
          </Pressable>
        )}
        {listing.status !== 'available' && (
          <View style={styles.statusOverlay}>
            <Badge label={status.label} tone={status.tone} />
          </View>
        )}
      </View>
      <View style={{ padding: 10, gap: 3 }}>
        <Text style={{ fontFamily: font.display, fontSize: 18, color: colors.text }}>
          {peso(listing.price)}
          {rent && <Text variant="muted">/wk</Text>}
        </Text>
        <Text numberOfLines={2} style={{ fontFamily: font.semibold, fontSize: 13.5, lineHeight: 18, minHeight: 36 }}>
          {listing.title}
        </Text>
        <Text variant="muted" numberOfLines={1} style={{ fontSize: 12 }}>
          {categoryOf(listing.category).label} · {listing.condition}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = themed(() => StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    overflow: 'hidden',
    ...elevation(),
  },
  placeholder: { width: '100%', backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' },
  tagRow: { position: 'absolute', top: 8, left: 8, flexDirection: 'row', gap: 4 },
  tag: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3, flexDirection: 'row', alignItems: 'center' },
  tagText: { color: '#fff', fontFamily: font.black, fontSize: 10, letterSpacing: 0.6 },
  heart: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusOverlay: { position: 'absolute', bottom: 8, left: 8 },
}));
