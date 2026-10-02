import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { AppBar } from '@/components/AppBar';
import { ListingCard } from '@/components/ListingCard';
import { Button, Chip, Empty, Loading } from '@/components/ui';
import { CATEGORIES } from '@/config';
import { useMe } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import type { Listing } from '@/lib/types';
import { useFocusLoad } from '@/lib/useFocusLoad';
import { colors, font, radius, space, themed } from '@/theme';

type Filter = 'all' | 'rent' | 'sale' | 'saved';
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'sale', label: 'For Sale' },
  { key: 'rent', label: 'For Rent' },
  { key: 'saved', label: 'Saved' },
];

// 3.1 · Assets: academic items for sale or rent, with category and type filters
export default function Assets() {
  const { me } = useMe();
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
  const shown = listings.filter((l) => {
    if (category && l.category !== category) return false;
    if (filter === 'rent' || filter === 'sale') { if (l.mode !== filter) return false; }
    if (filter === 'saved' && !favorites.has(l.id)) return false;
    return !q || `${l.title} ${l.book_author} ${l.description}`.toLowerCase().includes(q);
  });

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
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          <Chip label="All categories" selected={!category} onPress={() => setCategory(null)} />
          {CATEGORIES.map((c) => (
            <Chip key={c.key} label={c.label} icon={`${c.icon}-outline`} selected={category === c.key} onPress={() => setCategory(category === c.key ? null : c.key)} />
          ))}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {FILTERS.map((f) => (
            <Chip key={f.key} label={f.label} selected={filter === f.key} onPress={() => setFilter(f.key)} />
          ))}
        </ScrollView>
      </View>
      <FlatList
        data={shown}
        keyExtractor={(l) => l.id}
        numColumns={2}
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
            <Loading />
          )
        }
        renderItem={({ item, index }) => (
          <>
            <ListingCard listing={item} favorite={favorites.has(item.id)} onToggleFavorite={() => toggleFavorite(item.id)} />
            {/* keep the last odd card half-width */}
            {index === shown.length - 1 && shown.length % 2 === 1 && <View style={{ flex: 1 }} />}
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
