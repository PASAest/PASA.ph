import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, ScrollView, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { Avatar, Badge, Button, Card, Chip, Empty, Field, Loading, Row, Text } from '@/components/ui';
import { CANCEL_CUTOFF_MIN, isMeetingLink } from '@/config';
import { confirm, notify, openChat } from '@/lib/actions';
import { useMe } from '@/lib/auth';
import { dateTime, fullName, peso, shortDate } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import type { Booking, BookingStatus, Order, Profile } from '@/lib/types';
import { useFocusLoad } from '@/lib/useFocusLoad';
import { useNow } from '@/lib/useNow';
import { colors, font } from '@/theme';

type Tab = 'sessions' | 'orders';

const BOOKING_STATUS: Record<BookingStatus, { label: string; tone: 'yellow' | 'blue' | 'green' | 'gray' | 'red' }> = {
  requested: { label: 'Waiting for tutor', tone: 'yellow' },
  accepted: { label: 'Accepted · pay to confirm', tone: 'blue' },
  paid: { label: 'Confirmed', tone: 'green' },
  completed: { label: 'Completed', tone: 'gray' },
  declined: { label: 'Declined', tone: 'red' },
  cancelled: { label: 'Cancelled', tone: 'red' },
};

const ORDER_STATUS: Record<Order['status'], { label: string; tone: 'yellow' | 'blue' | 'green' | 'gray' | 'red' }> = {
  paid: { label: 'Paid · meet to hand over', tone: 'blue' },
  completed: { label: 'Completed', tone: 'green' },
  returned: { label: 'Returned', tone: 'gray' },
  cancelled: { label: 'Cancelled', tone: 'red' },
};

// 3.6 · My Activity: tutoring sessions and item orders, with the next step for each
export default function Activity() {
  const { me } = useMe();
  const [tab, setTab] = useState<Tab>('sessions');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [reviewed, setReviewed] = useState<Set<string>>(new Set());

  const load = async () => {
    const [b, o, r] = await Promise.all([
      supabase
        .from('bookings')
        .select('*, student:profiles!bookings_student_id_fkey(*), tutor:profiles!bookings_tutor_id_fkey(*)')
        .order('starts_at', { ascending: false }),
      supabase
        .from('orders')
        .select('*, listing:listings(*), buyer:profiles!orders_buyer_id_fkey(*), seller:profiles!orders_seller_id_fkey(*)')
        .order('created_at', { ascending: false }),
      supabase.from('reviews').select('ref_id').eq('reviewer_id', me.id),
    ]);
    setBookings((b.data as Booking[]) ?? []);
    setOrders((o.data as Order[]) ?? []);
    setReviewed(new Set((r.data ?? []).map((x) => x.ref_id)));
    // Seeing your activity clears activity notifications.
    supabase.from('notifications').update({ read: true }).eq('user_id', me.id).eq('link', '/activity').then();
  };
  const { refreshing, refresh, loaded } = useFocusLoad(load);

  return (
    <Screen back title="My Activity" refreshing={refreshing} onRefresh={refresh}>
      <ScrollView horizontal contentContainerStyle={{ gap: 8 }} showsHorizontalScrollIndicator={false}>
        <Chip label="Tutoring sessions" icon="school-outline" selected={tab === 'sessions'} onPress={() => setTab('sessions')} />
        <Chip label="Items" icon="library-outline" selected={tab === 'orders'} onPress={() => setTab('orders')} />
      </ScrollView>
      {!loaded ? (
        <Loading />
      ) : tab === 'sessions' ? (
        bookings.length === 0 ? (
          <Empty
            icon="calendar-outline"
            title="No sessions yet"
            text="Find a tutor from the Home tab and book a face-to-face session."
            action={<Button title="Find tutors" small onPress={() => router.back()} />}
          />
        ) : (
          bookings.map((b) => <BookingCard key={b.id} booking={b} me={me} reviewed={reviewed.has(b.id)} onChange={load} />)
        )
      ) : orders.length === 0 ? (
        <Empty icon="bag-outline" title="No items yet" text="Books and calculators you buy, rent, or sell show up here." />
      ) : (
        orders.map((o) => <OrderCard key={o.id} order={o} me={me} reviewed={reviewed.has(o.id)} onChange={load} />)
      )}
    </Screen>
  );
}

async function setPaymentStatus(refId: string, status: 'released' | 'refunded') {
  await supabase.from('payments').update({ status }).eq('ref_id', refId).eq('status', 'held');
}

function Person({ label, person }: { label: string; person?: Profile }) {
  return (
    <Row>
      <Avatar profile={person} size={30} />
      <Text variant="muted">
        {label} <Text style={{ fontFamily: font.bold }}>{fullName(person)}</Text>
      </Text>
    </Row>
  );
}

function BookingCard({ booking: b, me, reviewed, onChange }: { booking: Booking; me: Profile; reviewed: boolean; onChange: () => void }) {
  const isTutor = b.tutor_id === me.id;
  const online = b.mode === 'online';
  const [link, setLink] = useState(b.meeting_link);
  const where = online ? `Online via ${b.platform}` : b.location;

  const saveLink = async () => {
    if (!isMeetingLink(b.platform, link)) return notify('Check the link', `Paste the ${b.platform} meeting link (it should start with https://).`);
    const { error } = await supabase.from('bookings').update({ meeting_link: link.trim() }).eq('id', b.id);
    if (error) return notify('Could not save link', error.message);
    onChange();
  };
  const other = isTutor ? b.student : b.tutor;
  const now = useNow();
  const minutesToStart = (new Date(b.starts_at).getTime() - now) / 60000;
  const canCancel = ['requested', 'accepted', 'paid'].includes(b.status) && minutesToStart > CANCEL_CUTOFF_MIN;
  const startsSoon = b.status === 'paid' && minutesToStart <= 60 && minutesToStart > -b.duration_min;
  const started = minutesToStart <= 0;
  const status = BOOKING_STATUS[b.status];

  const update = async (status: BookingStatus) => {
    const { error } = await supabase.from('bookings').update({ status }).eq('id', b.id);
    if (error) return notify('Something went wrong', error.message);
    if (status === 'completed') await setPaymentStatus(b.id, 'released');
    if (status === 'cancelled') await setPaymentStatus(b.id, 'refunded');
    onChange();
  };

  const cancel = async () => {
    const refund = b.status === 'paid' ? ' Your payment will be refunded.' : '';
    if (await confirm('Cancel this session?', `Free cancellation until ${CANCEL_CUTOFF_MIN} minutes before it starts.${refund}`, 'Cancel session')) update('cancelled');
  };

  return (
    <Card style={{ gap: 10 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Badge label={isTutor ? 'You are tutoring' : 'You are learning'} tone={isTutor ? 'green' : 'blue'} />
        <Badge label={status.label} tone={status.tone} />
      </Row>
      <Text variant="title">{b.subject}</Text>
      <Person label={isTutor ? 'Student:' : 'Tutor:'} person={other} />
      <Row>
        <Ionicons name="time-outline" size={16} color={colors.muted} />
        <Text variant="muted">
          {dateTime(b.starts_at)} · {b.duration_min} min
        </Text>
      </Row>
      <Row>
        <Ionicons name={online ? 'videocam-outline' : 'location-outline'} size={16} color={colors.muted} />
        <Text variant="muted">{where}</Text>
      </Row>
      <Row>
        <Ionicons name="cash-outline" size={16} color={colors.muted} />
        <Text variant="muted">
          {isTutor ? `You earn ${peso(b.amount)}` : `${peso(b.amount + b.fee)} total (incl. ${peso(b.fee)} fee)`}
        </Text>
      </Row>
      {!!b.notes && <Text variant="muted">“{b.notes}”</Text>}

      {startsSoon && (
        <View style={{ backgroundColor: colors.warningSoft, borderRadius: 10, padding: 10, flexDirection: 'row', gap: 8 }}>
          <Ionicons name="alarm-outline" size={18} color={colors.warning} />
          <Text style={{ color: colors.warning, fontFamily: font.bold, flex: 1 }}>
            {started ? 'Happening now' : `Starts in ${Math.ceil(minutesToStart)} min`} · {where}
          </Text>
        </View>
      )}

      {online && ['accepted', 'paid'].includes(b.status) && isTutor && !b.meeting_link && (
        <View style={{ gap: 8 }}>
          <Field label={`${b.platform} meeting link`} placeholder="https://…" value={link} onChangeText={setLink} autoCapitalize="none" icon="link-outline" />
          <Button title="Save link" small variant="outline" onPress={saveLink} />
        </View>
      )}
      {online && ['accepted', 'paid'].includes(b.status) && !isTutor && !b.meeting_link && (
        <Text variant="muted">{b.tutor?.first_name} will add the {b.platform} link before the session.</Text>
      )}
      <Row style={{ flexWrap: 'wrap' }}>
        {online && !!b.meeting_link && ['accepted', 'paid'].includes(b.status) && (
          <Button title={`Join ${b.platform}`} small icon="videocam" onPress={() => Linking.openURL(b.meeting_link)} />
        )}
        {isTutor && b.status === 'requested' && (
          <>
            <Button title="Accept" small icon="checkmark" onPress={() => update('accepted')} />
            <Button title="Decline" small variant="danger" onPress={() => update('declined')} />
          </>
        )}
        {!isTutor && b.status === 'accepted' && (
          <Button title="Pay now" small icon="wallet-outline" onPress={() => router.push({ pathname: '/checkout', params: { type: 'booking', id: b.id } })} />
        )}
        {!isTutor && b.status === 'paid' && (
          <>
            <Button
              title="Session done"
              small
              icon="checkmark-done"
              onPress={async () => {
                const early = started ? '' : "The session hasn't started yet. ";
                if (await confirm('Mark session as done?', `${early}${peso(b.amount)} will be released to ${other?.first_name}.`, 'Yes, done')) update('completed');
              }}
            />
            <Button title="Extend +30 min" small variant="outline" onPress={() => router.push({ pathname: '/checkout', params: { type: 'extend', id: b.id } })} />
          </>
        )}
        {b.status === 'completed' && !reviewed && other && (
          <Button
            title={`Rate ${other.first_name}`}
            small
            icon="star-outline"
            onPress={() =>
              router.push({ pathname: '/review', params: { refType: 'booking', refId: b.id, userId: other.id, role: isTutor ? 'student' : 'tutor' } })
            }
          />
        )}
        {other && ['requested', 'accepted', 'paid'].includes(b.status) && (
          <Button title="Message" small variant="outline" icon="chatbubble-outline" onPress={() => openChat(other.id)} />
        )}
        {canCancel && <Button title="Cancel" small variant="ghost" onPress={cancel} />}
      </Row>
    </Card>
  );
}

function OrderCard({ order: o, me, reviewed, onChange }: { order: Order; me: Profile; reviewed: boolean; onChange: () => void }) {
  const isSeller = o.seller_id === me.id;
  const other = isSeller ? o.buyer : o.seller;
  const rent = o.kind === 'rent';
  const now = useNow();
  const overdue = rent && o.status === 'completed' && o.due_at && new Date(o.due_at).getTime() < now;
  const status = ORDER_STATUS[o.status];

  const update = async (status: Order['status']) => {
    const { error } = await supabase.from('orders').update({ status }).eq('id', o.id);
    if (error) return notify('Something went wrong', error.message);
    if (status === 'completed') await setPaymentStatus(o.id, 'released');
    if (status === 'cancelled') await setPaymentStatus(o.id, 'refunded');
    onChange();
  };

  return (
    <Card style={{ gap: 10 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Badge label={isSeller ? (rent ? 'Rented out' : 'Sold') : rent ? 'Renting' : 'Bought'} tone={isSeller ? 'green' : 'blue'} />
        <Badge label={rent && o.status === 'completed' ? 'On loan' : status.label} tone={overdue ? 'red' : status.tone} />
      </Row>
      <Text variant="title" onPress={() => router.push(`/listing/${o.listing_id}`)}>
        {o.listing?.title}
      </Text>
      <Person label={isSeller ? 'Buyer:' : 'Seller:'} person={other} />
      <Row>
        <Ionicons name="cube-outline" size={16} color={colors.muted} />
        <Text variant="muted">Delivery by arrangement in chat</Text>
      </Row>
      <Row>
        <Ionicons name="cash-outline" size={16} color={colors.muted} />
        <Text variant="muted">
          {isSeller ? `You earn ${peso(o.amount)}` : `${peso(o.amount + o.fee + o.deposit)} total`}
          {rent && o.deposit ? ` · ${peso(o.deposit)} deposit` : ''}
        </Text>
      </Row>
      {rent && o.due_at && (
        <Row>
          <Ionicons name="calendar-outline" size={16} color={overdue ? colors.danger : colors.muted} />
          <Text style={{ color: overdue ? colors.danger : colors.muted, fontFamily: overdue ? font.bold : font.regular }}>
            {overdue ? 'Overdue! ' : ''}Return by {shortDate(o.due_at)}
          </Text>
        </Row>
      )}
      <Row style={{ flexWrap: 'wrap' }}>
        {!isSeller && o.status === 'paid' && (
          <Button
            title="I received it"
            small
            icon="checkmark-done"
            onPress={async () => {
              if (await confirm('Got the item?', `${peso(o.amount)} will be released to ${other?.first_name}.`, 'Yes, received')) update('completed');
            }}
          />
        )}
        {isSeller && rent && o.status === 'completed' && (
          <Button
            title="Mark returned"
            small
            icon="return-down-back"
            onPress={async () => {
              if (await confirm('Item returned in good condition?', `The ${peso(o.deposit)} deposit goes back to ${other?.first_name}.`, 'Yes, returned')) update('returned');
            }}
          />
        )}
        {(o.status === 'completed' || o.status === 'returned') && !reviewed && other && (
          <Button
            title={`Rate ${other.first_name}`}
            small
            icon="star-outline"
            onPress={() => router.push({ pathname: '/review', params: { refType: 'order', refId: o.id, userId: other.id, role: isSeller ? 'buyer' : 'seller' } })}
          />
        )}
        {other && o.status !== 'cancelled' && (
          <Button title="Message" small variant="outline" icon="chatbubble-outline" onPress={() => openChat(other.id)} />
        )}
        {o.status === 'paid' && (
          <Button
            title="Cancel"
            small
            variant="ghost"
            onPress={async () => {
              if (await confirm('Cancel this order?', 'The payment will be refunded and the item relisted.', 'Cancel order')) update('cancelled');
            }}
          />
        )}
      </Row>
    </Card>
  );
}
