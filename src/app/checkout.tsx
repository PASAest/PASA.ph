import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { FakeWallet, METHODS, type PayMethod } from '@/components/FakeWallet';
import { Screen } from '@/components/Screen';
import { Button, Card, ChipSelect, DemoBanner, Divider, Loading, Row, Text } from '@/components/ui';
import { BOOST_DAYS, BOOST_PRICE, PLUS_PRICE } from '@/config';
import { notify } from '@/lib/actions';
import { useMe } from '@/lib/auth';
import { dateTime, daysFromNow, fullName, peso, referenceNo, serviceFee } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import type { Booking, Listing } from '@/lib/types';
import { colors, font, radius } from '@/theme';

type Params = { type: 'booking' | 'extend' | 'order' | 'boost' | 'plus'; id?: string; listingId?: string; target?: 'post' | 'listing' };

type Summary = {
  title: string;
  subtitle: string;
  lines: { label: string; amount: number }[];
  payeeId: string | null;
  refType: 'booking' | 'order' | 'boost' | 'plus';
  allowCash: boolean;
};

const WEEKS = [1, 2, 3, 4];

// 3.7 · Checkout with dummy e-wallet payment
export default function Checkout() {
  const params = useLocalSearchParams<Params>();
  const { me, refreshProfile } = useMe();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [listing, setListing] = useState<Listing | null>(null);
  const [weeks, setWeeks] = useState(1);
  const [method, setMethod] = useState<PayMethod>('gcash');
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if (params.type === 'booking' || params.type === 'extend') {
      supabase.from('bookings').select('*, tutor:profiles!bookings_tutor_id_fkey(*)').eq('id', params.id).single().then(({ data }) => setBooking(data as Booking));
    }
    if (params.type === 'order') {
      supabase.from('listings').select('*, seller:profiles!listings_seller_id_fkey(*)').eq('id', params.listingId).single().then(({ data }) => setListing(data as Listing));
    }
  }, [params.type, params.id, params.listingId]);

  const summary = ((): Summary | null => {
    switch (params.type) {
      case 'booking': {
        if (!booking) return null;
        return {
          title: `${booking.subject} with ${fullName(booking.tutor)}`,
          subtitle: `${dateTime(booking.starts_at)} · ${booking.location}`,
          lines: [
            { label: `Tutor fee (${booking.duration_min / 60} hr)`, amount: booking.amount },
            { label: 'PASA service fee', amount: booking.fee },
          ],
          payeeId: booking.tutor_id,
          refType: 'booking',
          allowCash: true,
        };
      }
      case 'extend': {
        if (!booking) return null;
        const extra = Math.round((booking.amount * 30) / booking.duration_min);
        return {
          title: `Extend ${booking.subject} by 30 minutes`,
          subtitle: `With ${fullName(booking.tutor)} · ${booking.location}`,
          lines: [
            { label: 'Extra 30 minutes', amount: extra },
            { label: 'PASA service fee', amount: serviceFee(extra, me) },
          ],
          payeeId: booking.tutor_id,
          refType: 'booking',
          allowCash: true,
        };
      }
      case 'order': {
        if (!listing) return null;
        const rent = listing.mode === 'rent';
        const amount = rent ? listing.price * weeks : listing.price;
        return {
          title: listing.title,
          subtitle: `${rent ? 'Rent' : 'Buy'} from ${fullName(listing.seller)} · Meetup at ${listing.meetup_spot}`,
          lines: [
            { label: rent ? `Rent (${weeks} week${weeks > 1 ? 's' : ''})` : 'Item price', amount },
            ...(rent && listing.deposit ? [{ label: 'Refundable deposit', amount: listing.deposit }] : []),
            { label: 'PASA service fee', amount: serviceFee(amount, me) },
          ],
          payeeId: listing.seller_id,
          refType: 'order',
          allowCash: true,
        };
      }
      case 'boost':
        return {
          title: `Boost your ${params.target}`,
          subtitle: `Stays at the top for ${BOOST_DAYS} days`,
          lines: [{ label: 'Boost', amount: BOOST_PRICE }],
          payeeId: null,
          refType: 'boost',
          allowCash: false,
        };
      case 'plus':
        return {
          title: 'PASA Plus · 1 month',
          subtitle: 'Lower service fee, free boosts, Plus badge',
          lines: [{ label: 'Subscription', amount: PLUS_PRICE }],
          payeeId: null,
          refType: 'plus',
          allowCash: false,
        };
    }
  })();

  if (!summary) return <Screen back title="Checkout"><Loading /></Screen>;
  const total = summary.lines.reduce((s, l) => s + l.amount, 0);
  const fee = summary.lines.find((l) => l.label === 'PASA service fee')?.amount ?? 0;
  const payMethod: PayMethod = summary.allowCash ? method : method === 'cash' ? 'gcash' : method;

  /** Runs after the fake wallet "succeeds". Returns the reference number, or null on failure. */
  const recordPayment = async (): Promise<string | null> => {
    const ref = referenceNo();
    let refId: string | null = params.id ?? null;
    try {
      if (params.type === 'booking' && booking) {
        const { error } = await supabase.from('bookings').update({ status: 'paid' }).eq('id', booking.id).eq('status', 'accepted');
        if (error) throw error;
      } else if (params.type === 'extend' && booking) {
        const extra = summary.lines[0].amount;
        const { error } = await supabase
          .from('bookings')
          .update({ duration_min: booking.duration_min + 30, amount: booking.amount + extra, fee: booking.fee + fee })
          .eq('id', booking.id);
        if (error) throw error;
      } else if (params.type === 'order' && listing) {
        // Someone else may have bought it while this screen was open.
        const { data: fresh } = await supabase.from('listings').select('status').eq('id', listing.id).single();
        if (fresh?.status !== 'available') throw new Error('Sorry, this item was just taken by someone else.');
        const rent = listing.mode === 'rent';
        const { data, error } = await supabase
          .from('orders')
          .insert({
            listing_id: listing.id,
            buyer_id: me.id,
            seller_id: listing.seller_id,
            kind: rent ? 'rent' : 'buy',
            weeks: rent ? weeks : 0,
            amount: summary.lines[0].amount,
            deposit: rent ? listing.deposit : 0,
            fee,
            due_at: rent ? daysFromNow(weeks * 7) : null,
          })
          .select('id')
          .single();
        if (error) throw error;
        refId = data.id;
      } else if (params.type === 'boost') {
        const until = daysFromNow(BOOST_DAYS);
        const table = params.target === 'post' ? 'posts' : 'listings';
        const { error } = await supabase.from(table).update({ boosted_until: until }).eq('id', params.id);
        if (error) throw error;
      } else if (params.type === 'plus') {
        const { error } = await supabase.from('profiles').update({ plus_until: daysFromNow(30) }).eq('id', me.id);
        if (error) throw error;
        await refreshProfile();
      }
      await supabase.from('payments').insert({
        payer_id: me.id,
        payee_id: summary.payeeId,
        ref_type: summary.refType,
        ref_id: refId,
        method: payMethod,
        amount: total,
        fee,
        reference_no: ref,
        status: summary.payeeId ? 'held' : 'paid',
      });
      return ref;
    } catch (e) {
      notify('Payment failed', (e as Error).message);
      return null;
    }
  };

  const done = (success: boolean) => {
    setPaying(false);
    if (!success) return;
    if (params.type === 'boost' || params.type === 'plus') router.back();
    else router.replace('/activity');
  };

  return (
    <Screen back title="Checkout" footer={<Button title={`Pay ${peso(total)}`} onPress={() => setPaying(true)} />}>
      <DemoBanner />
      <Card style={{ gap: 4 }}>
        <Text variant="title">{summary.title}</Text>
        <Text variant="muted">{summary.subtitle}</Text>
      </Card>
      {params.type === 'order' && listing?.mode === 'rent' && (
        <ChipSelect label="How many weeks?" options={WEEKS} value={weeks} onChange={setWeeks} format={(w) => `${w} week${w > 1 ? 's' : ''}`} />
      )}
      <Card style={{ gap: 8 }}>
        {summary.lines.map((l) => (
          <Row key={l.label} style={{ justifyContent: 'space-between' }}>
            <Text variant="muted">{l.label}</Text>
            <Text>{peso(l.amount)}</Text>
          </Row>
        ))}
        <Divider />
        <Row style={{ justifyContent: 'space-between' }}>
          <Text variant="title">Total</Text>
          <Text style={{ fontFamily: font.black, fontSize: 20, color: colors.primaryDark }}>{peso(total)}</Text>
        </Row>
      </Card>
      <Text variant="label">Pay with</Text>
      {(Object.keys(METHODS) as PayMethod[])
        .filter((k) => summary.allowCash || k !== 'cash')
        .map((k) => (
          <Pressable key={k} onPress={() => setMethod(k)}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                padding: 14,
                borderRadius: radius.md,
                backgroundColor: colors.white,
                borderWidth: payMethod === k ? 2 : 1,
                borderColor: payMethod === k ? colors.primary : colors.border,
              }}
            >
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: METHODS[k].color, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name={METHODS[k].icon} size={18} color={colors.white} />
              </View>
              <Text variant="title" style={{ flex: 1 }}>
                {METHODS[k].label}
              </Text>
              <Ionicons name={payMethod === k ? 'radio-button-on' : 'radio-button-off'} size={22} color={colors.primary} />
            </View>
          </Pressable>
        ))}
      {summary.payeeId && (
        <Row style={{ alignItems: 'flex-start' }}>
          <Ionicons name="shield-checkmark" size={18} color={colors.success} />
          <Text variant="muted" style={{ flex: 1 }}>
            PASA holds your payment and only releases it once you confirm the session happened or you received the item.
          </Text>
        </Row>
      )}
      {paying && <FakeWallet visible method={payMethod} amount={total} onPaid={recordPayment} onClose={done} />}
    </Screen>
  );
}
