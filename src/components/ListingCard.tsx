import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { peso } from '@/lib/format';
import type { Listing, ListingStatus } from '@/lib/types';
import { colors, font, radius } from '@/theme';
import { Badge, Text } from './ui';

export const LISTING_STATUS: Record<ListingStatus, { label: string; tone: 'green' | 'yellow' | 'gray' | 'blue' }> = {
  available: { label: 'Available Now', tone: 'green' },
  reserved: { label: 'Reserved', tone: 'yellow' },
  on_loan: { label: 'On Loan', tone: 'yellow' },
  sold: { label: 'Sold', tone: 'gray' },
};

export function ListingPhoto({ listing, height }: { listing: Listing; height: number }) {
  if (listing.photo_url) {
    return <Image source={{ uri: listing.photo_url }} style={{ width: '100%', height }} resizeMode="cover" />;
  }
  return (
    <View style={[styles.placeholder, { height }]}>
      <Ionicons name={listing.category === 'book' ? 'book' : 'calculator'} size={height * 0.35} color={colors.brand} />
    </View>
  );
}

export function ListingCard({ listing, favorite, onToggleFavorite }: { listing: Listing; favorite?: boolean; onToggleFavorite?: () => void }) {
  const status = LISTING_STATUS[listing.status];
  const boosted = listing.boosted_until && new Date(listing.boosted_until) > new Date();
  return (
    <Pressable onPress={() => router.push(`/listing/${listing.id}`)} style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}>
      <View>
        <ListingPhoto listing={listing} height={120} />
        {onToggleFavorite && (
          <Pressable onPress={onToggleFavorite} hitSlop={8} style={styles.heart} accessibilityLabel="Save">
            <Ionicons name={favorite ? 'heart' : 'heart-outline'} size={18} color={favorite ? colors.danger : colors.muted} />
          </Pressable>
        )}
        {boosted && (
          <View style={styles.boost}>
            <Ionicons name="flash" size={11} color={colors.warning} />
          </View>
        )}
      </View>
      <View style={{ padding: 10, gap: 4 }}>
        <Text numberOfLines={2} style={{ fontFamily: font.bold, fontSize: 13.5, lineHeight: 18 }}>
          {listing.title} ({listing.mode === 'rent' ? 'Rent' : 'Sale'})
        </Text>
        <Text style={{ fontFamily: font.black, color: colors.primaryDark }}>
          {peso(listing.price)}
          {listing.mode === 'rent' && <Text variant="muted">/week</Text>}
        </Text>
        <Badge label={status.label} tone={status.tone} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  placeholder: { width: '100%', backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' },
  heart: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  boost: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: colors.warningSoft,
    borderRadius: 10,
    padding: 4,
  },
});
