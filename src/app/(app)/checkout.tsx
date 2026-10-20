import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { FakeWallet, METHODS, type PayMethod } from '@/components/FakeWallet';
import { Screen } from '@/components/Screen';
import { Button, Card, DemoBanner, Divider, Loading, Row, Text } from '@/components/ui';
import { notify } from '@/lib/actions';
import { requireVerified, useMe } from '@/lib/auth';
import { dateTime, daysFromNow, extendFrom, fullName, isPlus, peso, referenceNo, takeHome } from '@/lib/format';
import { PLUS_PLANS, serviceFee, useSettings } from '@/lib/settings';
import { supabase } from '@/lib/supabase';
import type { Booking, Listing } from '@/lib/types';
import { colors, font, radius } from '@/theme';

type Params = {
  type: 'booking' | 'extend' | 'order' | 'boost' | 'plus';
  id?: string;
  listingId?: string;
  target?: 'post' | 'listing';
  months?: string;
};

type Summary = {
  title: string;
  subtitle: string;
  lines: { label: string; amount: number }[];
  fee: number;
  /** What the tutor/seller receives; null when the money goes to PASA (boost, Plus). */
  payeeAmount: number | null;
  payeeId: string | null;
  refType: 'booking' | 'order' | 'boost' | 'plus';
};

// 3.7 · Checkout with dummy GCash / Maya payment
export default function Checkout() {
  const params = useLocalSearchParams<Params>();
  const { me, refreshProfile } = useMe();
  const { settings } = useSettings();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [listing, setListing] = useState<Listing | null>(null);
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

  // The price of 30 more minutes with this tutor.
  const extendBy = booking ? Math.round((booking.amount * 30) / booking.duration_min) : 0;

  const summary = ((): Summary | null => {
    switch (params.type) {
      case 'booking': {
        if (!booking) return null;
        return {
          title: `${booking.subject} with ${fullName(booking.tutor)}`,
          subtitle: `${dateTime(booking.starts_at)} · ${booking.mode === 'online' ? `Online via ${booking.platform}` : booking.location}`,
          lines: [
            { label: `Tutor fee (${booking.duration_min / 60} hr)`, amount: booking.amount },
            ...(booking.fee_on_top === false ? [] : [{ label: 'PASA service fee', amount: booking.fee }]),
          ],
          fee: booking.fee,
          payeeAmount: takeHome(booking),
          payeeId: booking.tutor_id,
          refType: 'booking',
        };
      }
      case 'extend': {
        if (!booking) return null;
        const extra = extendBy;
        const fee = serviceFee(extra, settings, booking.tutor);
        const onTop = booking.fee_on_top !== false;
        return {
          title: `Extend ${booking.subject} by 30 minutes`,
          subtitle: `With ${fullName(booking.tutor)}`,
          lines: [{ label: 'Extra 30 minutes', amount: extra }, ...(onTop ? [{ label: 'PASA service fee', amount: fee }] : [])],
          fee,
          payeeAmount: onTop ? extra : extra - fee,
          payeeId: booking.tutor_id,
          refType: 'booking',
        };
      }
      case 'order': {
        if (!listing) return null;
        const amount = listing.price;
        const fee = serviceFee(amount, settings, listing.seller);
        return {
          title: listing.title,
          subtitle: `Buy from ${fullName(listing.seller)} · delivery by arrangement`,
          lines: [{ label: 'Item price', amount }],
          fee,
          payeeAmount: amount - fee,
          payeeId: listing.seller_id,
          refType: 'order',
        };
      }
      case 'boost':
        return {
          title: `Boost your ${params.target}`,
          subtitle: `Stays at the top for ${settings.boost_days} days`,
          lines: [{ label: 'Boost', amount: settings.boost_price }],
          fee: 0,
          payeeAmount: null,
          payeeId: null,
          refType: 'boost',
        };
      case 'plus': {
        const plan = PLUS_PLANS.find((p) => String(p.months) === params.months) ?? PLUS_PLANS[0];
        return {
          title: `PASA Plus · ${plan.label}`,
          subtitle: `${settings.plus_boosts * plan.months} boosts, ${settings.plus_discount}% lower commission, Plus badge`,
          lines: [{ label: 'Subscription', amount: settings[plan.key] }],
          fee: 0,
          payeeAmount: null,
          payeeId: null,
          refType: 'plus',
        };
      }
    }
  })();

  if (!summary) return <Screen back title="Checkout"><Loading /></Screen>;
  const total = summary.lines.reduce((s, l) => s + l.amount, 0);

  /** Runs after the fake wallet "succeeds". Returns the reference number, or null on failure. */
  const recordPayment = async (): Promise<string | null> => {
    const ref = referenceNo();
    let refId: string | null = params.id ?? null;
    try {
      if (params.type === 'booking' && booking) {
        const { error } = await supabase.from('bookings').update({ status: 'paid' }).eq('id', booking.id).eq('status', 'accepted');
        if (error) throw error;
      } else if (params.type === 'extend' && booking) {
        const { error } = await supabase
          .from('bookings')
          .update({ duration_min: booking.duration_min + 30, amount: booking.amount + extendBy, fee: booking.fee + summary.fee })
          .eq('id', booking.id);
        if (error) throw error;
      } else if (params.type === 'order' && listing) {
        // Someone else may have bought it while this screen was open.
        const { data: fresh } = await supabase.from('listings').select('status').eq('id', listing.id).single();
        if (fresh?.status !== 'available') throw new Error('Sorry, this item was just taken by someone else.');
        const { data, error } = await supabase
          .from('orders')
          .insert({
            listing_id: listing.id,
            buyer_id: me.id,
            seller_id: listing.seller_id,
            kind: 'buy',
            weeks: 0,
            amount: listing.price,
            deposit: 0,
            fee: summary.fee,
            fee_on_top: false,
          })
          .select('id')
          .single();
        if (error) throw error;
        refId = data.id;
      } else if (params.type === 'boost') {
        const { error } = await supabase
          .from(params.target === 'post' ? 'posts' : 'listings')
          .update({ boosted_until: daysFromNow(settings.boost_days) })
          .eq('id', params.id);
        if (error) throw error;
      } else if (params.type === 'plus') {
        const plan = PLUS_PLANS.find((p) => String(p.months) === params.months) ?? PLUS_PLANS[0];
        // Extend from the current end date if already a member.
        const { error } = await supabase
          .from('profiles')
          .update({
            plus_until: extendFrom(me.plus_until, plan.months * 30),
            plus_boosts_left: (isPlus(me) ? me.plus_boosts_left : 0) + settings.plus_boosts * plan.months,
          })
          .eq('id', me.id);
        if (error) throw error;
        await refreshProfile();
      }
      await supabase.from('payments').insert({
        payer_id: me.id,
        payee_id: summary.payeeId,
        ref_type: summary.refType,
        ref_id: refId,
        method,
        amount: total,
        fee: summary.fee,
        payee_amount: summary.payeeAmount,
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

  const pay = () => {
    if ((params.type === 'order' || params.type === 'booking') && !requireVerified(me)) return;
    setPaying(true);
  };

  return (
    <Screen back title="Checkout" footer={<Button title={`Pay ${peso(total)}`} onPress={pay} />}>
      <DemoBanner />
      <Card style={{ gap: 4 }}>
        <Text variant="title">{summary.title}</Text>
        <Text variant="muted">{summary.subtitle}</Text>
      </Card>
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
      {summary.payeeId && (params.type === 'order' || (booking && booking.fee_on_top === false)) && (
        <Text variant="muted" style={{ fontSize: 12.5 }}>
          You pay the listed price. PASA’s commission comes out of the {params.type === 'order' ? 'seller' : 'tutor'}’s earnings.
        </Text>
      )}
      <Text variant="label">Pay with</Text>
      {(Object.keys(METHODS) as PayMethod[]).map((k) => (
        <Pressable key={k} onPress={() => setMethod(k)}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              padding: 14,
              borderRadius: radius.md,
              backgroundColor: colors.surface,
              borderWidth: method === k ? 2 : 1,
              borderColor: method === k ? colors.primary : colors.border,
            }}
          >
            <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: METHODS[k].color, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={METHODS[k].icon} size={18} color={colors.white} />
            </View>
            <Text variant="title" style={{ flex: 1 }}>
              {METHODS[k].label}
            </Text>
            <Ionicons name={method === k ? 'radio-button-on' : 'radio-button-off'} size={22} color={colors.primary} />
          </View>
        </Pressable>
      ))}
      {summary.payeeId && (
        <Row style={{ alignItems: 'flex-start' }}>
          <Ionicons name="shield-checkmark" size={18} color={colors.success} />
          <Text variant="muted" style={{ flex: 1 }}>
            PASA holds your payment and releases it to the {summary.refType === 'booking' ? 'tutor' : 'seller'}'s wallet once you confirm the session happened or you received the item.
          </Text>
        </Row>
      )}
      {paying && <FakeWallet visible method={method} amount={total} onPaid={recordPayment} onClose={done} />}
    </Screen>
  );
}
