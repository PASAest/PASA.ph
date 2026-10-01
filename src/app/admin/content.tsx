import { router } from 'expo-router';
import { useState } from 'react';
import { AdminPage } from '@/components/admin/AdminShell';
import { DataTable, SearchBox } from '@/components/admin/widgets';
import { LISTING_STATUS } from '@/components/ListingCard';
import { POST_TYPES } from '@/components/PostCard';
import { Badge, Button, Chip, Loading, Row, Text } from '@/components/ui';
import { confirm, notify } from '@/lib/actions';
import { fullName, peso, shortDate } from '@/lib/format';
import { checkListing, checkText } from '@/lib/moderation';
import { supabase } from '@/lib/supabase';
import type { Listing, Post } from '@/lib/types';
import { useFocusLoad } from '@/lib/useFocusLoad';
import { font } from '@/theme';

type Tab = 'listings' | 'posts';

// /admin/content · All listings and posts, with remove
export default function Content() {
  const [tab, setTab] = useState<Tab>('listings');
  const [search, setSearch] = useState('');
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [listings, setListings] = useState<Listing[] | null>(null);
  const [posts, setPosts] = useState<Post[] | null>(null);

  const load = async () => {
    const [l, p] = await Promise.all([
      supabase.from('listings').select('*, seller:profiles!listings_seller_id_fkey(*)').order('created_at', { ascending: false }).limit(500),
      supabase.from('posts').select('*, author:profiles!posts_author_id_fkey(*)').order('created_at', { ascending: false }).limit(500),
    ]);
    setListings((l.data as Listing[]) ?? []);
    setPosts((p.data as Post[]) ?? []);
  };
  useFocusLoad(load);

  const remove = async (table: 'listings' | 'posts', id: string, label: string) => {
    if (!(await confirm(`Remove "${label.slice(0, 60)}"?`, 'It will be deleted for everyone. This cannot be undone.', 'Remove'))) return;
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) return notify('Could not remove', error.message);
    load();
  };

  if (!listings || !posts) return <Loading />;
  const q = search.trim().toLowerCase();
  // "Flagged" re-runs the app's own content rules, catching anything posted before a rule was added.
  const listingFlag = (l: Listing) => { const r = checkListing(l.title, l.description); return r.ok ? null : r.reason; };
  const postFlag = (p: Post) => { const r = checkText(p.body); return r.ok ? null : r.reason; };
  const shownListings = listings.filter(
    (l) => (!flaggedOnly || listingFlag(l)) && (!q || `${l.title} ${l.book_author} ${l.description} ${fullName(l.seller)}`.toLowerCase().includes(q)),
  );
  const shownPosts = posts.filter((p) => (!flaggedOnly || postFlag(p)) && (!q || `${p.body} ${p.subject} ${fullName(p.author)}`.toLowerCase().includes(q)));

  return (
    <AdminPage title="Listings & posts" subtitle="Search everything students published and remove what breaks the rules.">
      <Row style={{ flexWrap: 'wrap' }} gap={12}>
        <Chip label={`Listings (${listings.length})`} icon="library-outline" selected={tab === 'listings'} onPress={() => setTab('listings')} />
        <Chip label={`Posts (${posts.length})`} icon="newspaper-outline" selected={tab === 'posts'} onPress={() => setTab('posts')} />
        <Chip label="Flagged by filter" icon="warning-outline" selected={flaggedOnly} onPress={() => setFlaggedOnly((f) => !f)} />
        <SearchBox value={search} onChange={setSearch} placeholder={tab === 'listings' ? 'Search title, author, seller' : 'Search text, subject, author'} />
      </Row>

      {tab === 'listings' ? (
        <DataTable
          rows={shownListings}
          rowKey={(l) => l.id}
          empty="No listings match."
          columns={[
            {
              key: 'title',
              label: 'Item',
              flex: 2.2,
              render: (l) => (
                <Text>
                  <Text style={{ fontFamily: font.bold }}>{l.title}</Text>
                  {'\n'}
                  <Text variant="muted" style={{ fontSize: 12.5 }}>
                    {l.category === 'book' ? 'Book' : 'Calculator'} · {l.mode === 'rent' ? `${peso(l.price)}/week` : peso(l.price)}
                    {listingFlag(l) ? ' · ⚠ matches banned terms' : ''}
                  </Text>
                </Text>
              ),
            },
            { key: 'seller', label: 'Seller', flex: 1.2, render: (l) => <Text variant="muted">{fullName(l.seller)}</Text> },
            { key: 'status', label: 'Status', flex: 1, render: (l) => <Badge label={LISTING_STATUS[l.status].label} tone={LISTING_STATUS[l.status].tone} /> },
            { key: 'date', label: 'Posted', flex: 0.8, render: (l) => <Text variant="muted">{shortDate(l.created_at)}</Text> },
            {
              key: 'actions',
              label: '',
              width: 170,
              render: (l) => (
                <Row gap={6}>
                  <Button title="View" small variant="outline" onPress={() => router.push(`/listing/${l.id}`)} />
                  <Button title="Remove" small variant="danger" onPress={() => remove('listings', l.id, l.title)} />
                </Row>
              ),
            },
          ]}
        />
      ) : (
        <DataTable
          rows={shownPosts}
          rowKey={(p) => p.id}
          empty="No posts match."
          columns={[
            {
              key: 'body',
              label: 'Post',
              flex: 3,
              render: (p) => (
                <Text numberOfLines={3}>
                  {p.body}
                  {postFlag(p) ? <Text variant="muted">{'  '}⚠ flagged</Text> : null}
                </Text>
              ),
            },
            { key: 'type', label: 'Type', flex: 1.1, render: (p) => <Badge label={POST_TYPES[p.type].label} tone={POST_TYPES[p.type].tone} /> },
            { key: 'author', label: 'Author', flex: 1.1, render: (p) => <Text variant="muted">{fullName(p.author)}</Text> },
            { key: 'date', label: 'Posted', flex: 0.8, render: (p) => <Text variant="muted">{shortDate(p.created_at)}</Text> },
            {
              key: 'actions',
              label: '',
              width: 170,
              render: (p) => (
                <Row gap={6}>
                  <Button title="View" small variant="outline" onPress={() => router.push(`/post/${p.id}`)} />
                  <Button title="Remove" small variant="danger" onPress={() => remove('posts', p.id, p.body)} />
                </Row>
              ),
            },
          ]}
        />
      )}
    </AdminPage>
  );
}
