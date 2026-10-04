import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, TextInput, View } from 'react-native';
import { AppBar } from '@/components/AppBar';
import { CategoryDropdown } from '@/components/CategoryDropdown';
import { ListingCard } from '@/components/ListingCard';
import { Button, Empty, SkeletonList } from '@/components/ui';
import { FilterDropdown, type FilterOption } from '@/components/FilterDropdown';
import { useGridColumns } from '@/components/PhoneFrame';
import { useMe } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import type { Listing } from '@/lib/types';
import { useFocusLoad } from '@/lib/useFocusLoad';
import { colors, font, radius, space, themed } from '@/theme';

type Filter = 'all' | 'rent' | 'sale' | 'saved';
const FILTERS: FilterOption<Filter>[] = [
  { value: 'all', label: 'Sale & rent', icon: 'swap-vertical-outline' },
  { value: 'sale', label: 'For sale', icon: 'pricetag-outline' },
  { value: 'rent', label: 'For rent', icon: 'repeat-outline' },
  { value: 'saved', label: 'Saved', icon: 'heart-outline' },
];

// 3.1 · Assets: academic items for sale or rent, with category and type filters
export default function Assets() {
  const { me } = useMe();
  const cols = useGridColumns();
  const [filter, setFilter] = useState<Filter>('all');
  const [category, setCategory] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [listings, setListings] = useState<Listing[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const { refreshing, refresh, loaded } = useFocusLoad(async () => {
    const [{ data }, { data: favs }] = await Promise.all([
      supabase.from('listings').select('*').in('status', ['available', 'reserved', 'on_loan']).order('created_at', { ascending: false }).limit(200),
      supabase.from('favorites').select('listing_id').eq('user_id', me.id),
    ]);
    const now = new Date();
    const active = (l: Listing) => Number(!!l.boosted_until && new Date(l.boosted_until) > now);
    setListings(((data as Listing[]) ?? []).sort((a, b) => active(b) - active(a)));
    setFavorites(new Set((favs ?? []).map((f) => f.listing_id)));
  });

  const toggleFavorite = async (id: string) => {
    const next = new Set(favorites);
    if (next.has(id)) {
      next.delete(id);
      await supabase.from('favorites').delete().eq('user_id', me.id).eq('listing_id', id);
    } else {
      next.add(id);
      await supabase.from('favorites').insert({ user_id: me.id, listing_id: id });
    }
    setFavorites(next);
  };

  const q = search.trim().toLowerCase();
  // Everything except the category filter, so the dropdown can show how many items each category has.
  const matching = listings.filter((l) => {
    if (filter === 'rent' || filter === 'sale') { if (l.mode !== filter) return false; }
    if (filter === 'saved' && !favorites.has(l.id)) return false;
    return !q || `${l.title} ${l.book_author} ${l.description}`.toLowerCase().includes(q);
  });
  const counts: Record<string, number> = {};
  for (const l of matching) counts[l.category] = (counts[l.category] ?? 0) + 1;
  const shown = category ? matching.filter((l) => l.category === category) : matching;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <AppBar
        action={
          <Pressable onPress={() => router.push('/listing/new')} hitSlop={10} accessibilityLabel="List an item">
            <Ionicons name="add-circle" size={30} color={colors.primary} />
          </Pressable>
        }
      />
      <View style={{ paddingHorizontal: space(4), gap: space(3), paddingBottom: space(2) }}>
        <View style={styles.search}>
          <Ionicons name="search" size={18} color={colors.muted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search books, calculators, supplies…"
            placeholderTextColor={colors.muted}
            style={styles.searchInput}
            returnKeyType="search"
          />
          {!!search && <Ionicons name="close-circle" size={18} color={colors.muted} onPress={() => setSearch('')} />}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <CategoryDropdown value={category} onChange={setCategory} counts={counts} />
          <FilterDropdown title="Show" value={filter} allValue="all" onChange={setFilter} options={FILTERS} />
        </View>
      </View>
      <FlatList
        key={`cols-${cols}`} // FlatList can't change column count in place
        data={shown}
        keyExtractor={(l) => l.id}
        numColumns={cols}
        columnWrapperStyle={{ gap: space(3) }}
        contentContainerStyle={{ padding: space(4), paddingTop: space(2), gap: space(3) }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          loaded ? (
            <Empty
              icon="library-outline"
              title={q ? 'No matches' : 'No items yet'}
              text={q || category ? 'Try a different search or category.' : 'Got academic stuff you no longer need? List it for sale or rent.'}
              action={<Button title="List an item" small onPress={() => router.push('/listing/new')} />}
            />
          ) : (
            <SkeletonList count={2} media />
          )
        }
        renderItem={({ item, index }) => (
          <>
            <ListingCard listing={item} favorite={favorites.has(item.id)} onToggleFavorite={() => toggleFavorite(item.id)} />
            {/* keep cards in a short last row the same width as the others */}
            {index === shown.length - 1 && Array.from({ length: (cols - (shown.length % cols)) % cols }, (_, i) => <View key={i} style={{ flex: 1 }} />)}
          </>
        )}
      />
    </View>
  );
}

const styles = themed(() => StyleSheet.create({
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
  },
  searchInput: { flex: 1, minHeight: 44, fontFamily: font.regular, fontSize: 15, color: colors.text, outlineStyle: 'none' } as object,
}));
