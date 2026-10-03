import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { AdminPage } from '@/components/admin/AdminShell';
import { Badge, Button, Card, Empty, Loading, Row, Text } from '@/components/ui';
import { FilterDropdown, type FilterOption } from '@/components/FilterDropdown';
import { confirm, notify } from '@/lib/actions';
import { ask, banUser } from '@/lib/admin';
import { useAuth } from '@/lib/auth';
import { dateTime, fullName } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/types';
import { useFocusLoad } from '@/lib/useFocusLoad';
import { colors, space } from '@/theme';

type Status = 'open' | 'resolved' | 'dismissed';
type Report = {
  id: string;
  target_type: 'user' | 'post' | 'listing' | 'message';
  target_id: string;
  reason: string;
  details: string;
  status: Status;
  created_at: string;
  reporter?: Profile;
};
type Target = { summary: string; ownerId: string | null; ownerName: string; href: Href | null; exists: boolean };

const FILTERS: FilterOption<Status | 'all'>[] = [
  { value: 'open', label: 'Open', icon: 'alert-circle-outline' },
  { value: 'resolved', label: 'Resolved', icon: 'checkmark-done-outline' },
  { value: 'dismissed', label: 'Dismissed', icon: 'close-circle-outline' },
  { value: 'all', label: 'All reports', icon: 'list-outline' },
];

// /admin/reports · Review what students reported
export default function Reports() {
  const { session } = useAuth();
  const [filter, setFilter] = useState<Status | 'all'>('open');
  const [reports, setReports] = useState<Report[] | null>(null);
  const [targets, setTargets] = useState<Record<string, Target>>({});

  const load = async () => {
    let q = supabase.from('reports').select('*, reporter:profiles!reports_reporter_id_fkey(*)').order('created_at', { ascending: false }).limit(200);
    if (filter !== 'all') q = q.eq('status', filter);
    const { data } = await q;
    const list = (data as Report[]) ?? [];
    const ids = (t: string) => list.filter((r) => r.target_type === t).map((r) => r.target_id);
    const [posts, listings, users] = await Promise.all([
      ids('post').length ? supabase.from('posts').select('id, body, author_id, author:profiles!posts_author_id_fkey(first_name, last_name)').in('id', ids('post')) : { data: [] },
      ids('listing').length ? supabase.from('listings').select('id, title, seller_id, seller:profiles!listings_seller_id_fkey(first_name, last_name)').in('id', ids('listing')) : { data: [] },
      ids('user').length ? supabase.from('profiles').select('id, first_name, last_name, program').in('id', ids('user')) : { data: [] },
    ]);
    const map: Record<string, Target> = {};
    for (const r of list) {
      const missing: Target = { summary: 'Already removed', ownerId: null, ownerName: '', href: null, exists: false };
      if (r.target_type === 'post') {
        const p = (posts.data as { id: string; body: string; author_id: string; author: Profile }[]).find((x) => x.id === r.target_id);
        map[r.id] = p ? { summary: `“${p.body.slice(0, 140)}”`, ownerId: p.author_id, ownerName: fullName(p.author), href: `/post/${p.id}`, exists: true } : missing;
      } else if (r.target_type === 'listing') {
        const l = (listings.data as { id: string; title: string; seller_id: string; seller: Profile }[]).find((x) => x.id === r.target_id);
        map[r.id] = l ? { summary: l.title, ownerId: l.seller_id, ownerName: fullName(l.seller), href: `/listing/${l.id}`, exists: true } : missing;
      } else if (r.target_type === 'user') {
        const u = (users.data as Profile[]).find((x) => x.id === r.target_id);
        map[r.id] = u ? { summary: `${fullName(u)} · ${u.program}`, ownerId: u.id, ownerName: fullName(u), href: `/user/${u.id}`, exists: true } : missing;
      } else {
        map[r.id] = { summary: 'Chat message (private, not visible to admins)', ownerId: null, ownerName: '', href: null, exists: false };
      }
    }
    setTargets(map);
    setReports(list);
  };
  useFocusLoad(load, [filter]);

  const setStatus = async (id: string, status: Status) => {
    const { error } = await supabase.from('reports').update({ status }).eq('id', id);
    if (error) return notify('Could not update report', error.message);
    load();
  };

  const removeContent = async (r: Report) => {
    if (!(await confirm(`Remove this ${r.target_type}?`, 'It will be deleted for everyone. This cannot be undone.', 'Remove'))) return;
    const { error } = await supabase.from(r.target_type === 'post' ? 'posts' : 'listings').delete().eq('id', r.target_id);
    if (error) return notify('Could not remove', error.message);
    await setStatus(r.id, 'resolved');
  };

  const ban = async (r: Report, t: Target) => {
    if (!t.ownerId || !session) return;
    const reason = await ask(`Ban ${t.ownerName}? Reason:`, r.reason);
    if (reason == null) return;
    const { error } = await banUser(t.ownerId, reason, session.user.id);
    if (error && !error.message.includes('duplicate')) return notify('Could not ban', error.message);
    await setStatus(r.id, 'resolved');
  };

  return (
    <AdminPage title="Reports" subtitle="Things students flagged. Remove content, ban the person, or dismiss.">
      <Row>
        <FilterDropdown title="Status" value={filter} onChange={setFilter} options={FILTERS} />
      </Row>
      {!reports ? (
        <Loading />
      ) : reports.length === 0 ? (
        <Empty icon="checkmark-done-outline" title="Nothing here" text={filter === 'open' ? 'No open reports right now.' : undefined} />
      ) : (
        reports.map((r) => {
          const t = targets[r.id];
          return (
            <Card key={r.id} style={{ gap: space(3) }}>
              <Row style={{ flexWrap: 'wrap' }}>
                <Badge label={r.target_type.toUpperCase()} tone="blue" />
                <Badge label={r.status} tone={r.status === 'open' ? 'yellow' : r.status === 'resolved' ? 'green' : 'gray'} />
                <Text variant="muted">
                  Reported by {fullName(r.reporter)} · {dateTime(r.created_at)}
                </Text>
              </Row>
              <Text variant="title">{r.reason}</Text>
              {!!r.details && <Text>{r.details}</Text>}
              <View style={{ backgroundColor: colors.bg, borderRadius: 10, padding: space(3), gap: 2 }}>
                <Text variant="muted" style={{ fontSize: 12 }}>
                  Reported {r.target_type}
                  {t?.ownerName && r.target_type !== 'user' ? ` by ${t.ownerName}` : ''}
                </Text>
                <Text style={!t?.exists ? { color: colors.muted } : undefined}>{t?.summary}</Text>
              </View>
              <Row style={{ flexWrap: 'wrap' }}>
                {t?.href && <Button title="View" small variant="outline" icon="open-outline" onPress={() => router.push(t.href!)} />}
                {r.status === 'open' && t?.exists && (r.target_type === 'post' || r.target_type === 'listing') && (
                  <Button title={`Remove ${r.target_type}`} small variant="danger" icon="trash-outline" onPress={() => removeContent(r)} />
                )}
                {r.status === 'open' && t?.ownerId && (
                  <Button title={`Ban ${t.ownerName.split(' ')[0]}`} small variant="danger" icon="ban-outline" onPress={() => ban(r, t)} />
                )}
                {r.status === 'open' && <Button title="Mark resolved" small icon="checkmark" onPress={() => setStatus(r.id, 'resolved')} />}
                {r.status === 'open' && <Button title="Dismiss" small variant="ghost" onPress={() => setStatus(r.id, 'dismissed')} />}
                {r.status !== 'open' && <Button title="Reopen" small variant="ghost" onPress={() => setStatus(r.id, 'open')} />}
              </Row>
            </Card>
          );
        })
      )}
    </AdminPage>
  );
}
