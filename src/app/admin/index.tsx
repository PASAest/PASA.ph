import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { AdminPage } from '@/components/admin/AdminShell';
import { RevenueChart, type DayValue } from '@/components/admin/RevenueChart';
import { StatTile, TileGrid } from '@/components/admin/widgets';
import { Button, Card, Loading, Row, Text } from '@/components/ui';
import { peso, timeAgo } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { useFocusLoad } from '@/lib/useFocusLoad';
import { colors, font, space } from '@/theme';

type Payment = { ref_type: string; status: string; amount: number; fee: number; created_at: string };
type Report = { id: string; target_type: string; reason: string; created_at: string };

const DAYS = 14;

/** PASA's own revenue from one payment: the service fee once released, or the full price of a boost/Plus. */
const revenueOf = (p: Payment) =>
  p.ref_type === 'boost' || p.ref_type === 'plus' ? (p.status === 'paid' ? p.amount : 0) : p.status === 'released' ? p.fee : 0;

// /admin · Dashboard
export default function Dashboard() {
  const [stats, setStats] = useState<null | {
    users: number;
    tutors: number;
    listings: number;
    posts: number;
    sessions: number;
    completedSessions: number;
    orders: number;
    openReports: number;
    payments: Payment[];
    reports: Report[];
  }>(null);

  useFocusLoad(async () => {
    const count = (q: PromiseLike<{ count: number | null }>) => Promise.resolve(q).then((r) => r.count ?? 0);
    const [users, tutors, listings, posts, sessions, completedSessions, orders, openReports, payments, reports] = await Promise.all([
      count(supabase.from('profiles').select('id', { count: 'exact', head: true })),
      count(supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('is_tutor', true)),
      count(supabase.from('listings').select('id', { count: 'exact', head: true }).neq('status', 'sold')),
      count(supabase.from('posts').select('id', { count: 'exact', head: true })),
      count(supabase.from('bookings').select('id', { count: 'exact', head: true })),
      count(supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('status', 'completed')),
      count(supabase.from('orders').select('id', { count: 'exact', head: true }).neq('status', 'cancelled')),
      count(supabase.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'open')),
      supabase.from('payments').select('ref_type, status, amount, fee, created_at').then((r) => (r.data as Payment[]) ?? []),
      supabase.from('reports').select('id, target_type, reason, created_at').eq('status', 'open').order('created_at', { ascending: false }).limit(5).then((r) => (r.data as Report[]) ?? []),
    ]);
    setStats({ users, tutors, listings, posts, sessions, completedSessions, orders, openReports, payments, reports });
  });

  if (!stats) return <Loading />;

  const p = stats.payments;
  const earned = p.reduce((s, x) => s + revenueOf(x), 0);
  const pendingFees = p.filter((x) => x.status === 'held').reduce((s, x) => s + x.fee, 0);
  const paidIn = p.filter((x) => x.status !== 'refunded').reduce((s, x) => s + x.amount, 0);
  const bySource = [
    { label: 'Tutoring fees', value: p.filter((x) => x.ref_type === 'booking').reduce((s, x) => s + revenueOf(x), 0) },
    { label: 'Item fees', value: p.filter((x) => x.ref_type === 'order').reduce((s, x) => s + revenueOf(x), 0) },
    { label: 'Boosts', value: p.filter((x) => x.ref_type === 'boost').reduce((s, x) => s + revenueOf(x), 0) },
    { label: 'PASA Plus', value: p.filter((x) => x.ref_type === 'plus').reduce((s, x) => s + revenueOf(x), 0) },
  ];

  const daily: DayValue[] = Array.from({ length: DAYS }, (_, i) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (DAYS - 1 - i));
    const key = d.toDateString();
    return {
      day: key,
      label: d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }),
      value: p.filter((x) => new Date(x.created_at).toDateString() === key).reduce((s, x) => s + revenueOf(x), 0),
    };
  });

  return (
    <AdminPage title="Dashboard" subtitle="How PASA is doing. All payments are demo payments.">
      <TileGrid>
        <StatTile icon="cash-outline" label="PASA revenue" value={peso(earned)} note="Fees on completed deals + boosts + Plus" />
        <StatTile icon="hourglass-outline" label="Fees pending" value={peso(pendingFees)} note="Held until the session or item is confirmed" />
        <StatTile icon="swap-horizontal-outline" label="Paid in by students" value={peso(paidIn)} note="Excludes refunds" />
        <StatTile icon="flag-outline" label="Open reports" value={String(stats.openReports)} note={stats.openReports ? 'Needs review' : 'All clear'} />
      </TileGrid>
      <TileGrid>
        <StatTile icon="people-outline" label="Students" value={String(stats.users)} />
        <StatTile icon="school-outline" label="Tutors" value={String(stats.tutors)} />
        <StatTile icon="calendar-outline" label="Tutoring sessions" value={String(stats.sessions)} note={`${stats.completedSessions} completed`} />
        <StatTile icon="bag-outline" label="Item orders" value={String(stats.orders)} />
        <StatTile icon="library-outline" label="Active listings" value={String(stats.listings)} />
        <StatTile icon="newspaper-outline" label="Posts" value={String(stats.posts)} />
      </TileGrid>

      <RevenueChart title="PASA revenue per day" subtitle={`Last ${DAYS} days, by payment date`} data={daily} />

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space(4) }}>
        <Card style={{ flexGrow: 1, flexBasis: 320, gap: space(3) }}>
          <Text variant="title">Revenue by source</Text>
          {bySource.map((s) => (
            <Row key={s.label} style={{ justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: space(2) }}>
              <Text>{s.label}</Text>
              <Text style={{ fontFamily: font.bold }}>{peso(s.value)}</Text>
            </Row>
          ))}
        </Card>
        <Card style={{ flexGrow: 1, flexBasis: 320, gap: space(3) }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Text variant="title">Latest open reports</Text>
            <Button title="View all" small variant="ghost" onPress={() => router.replace('/admin/reports')} />
          </Row>
          {stats.reports.length === 0 ? (
            <Text variant="muted">No open reports. 🎉</Text>
          ) : (
            stats.reports.map((r) => (
              <Row key={r.id} style={{ justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: space(2) }}>
                <Text style={{ flex: 1 }}>
                  <Text style={{ fontFamily: font.bold, textTransform: 'capitalize' }}>{r.target_type}</Text> · {r.reason}
                </Text>
                <Text variant="muted">{timeAgo(r.created_at)}</Text>
              </Row>
            ))
          )}
        </Card>
      </View>
    </AdminPage>
  );
}
