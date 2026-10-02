import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { FakeWallet, METHODS, type PayMethod } from '@/components/FakeWallet';
import { Screen } from '@/components/Screen';
import { Button, Card, ChipSelect, DemoBanner, Divider, Loading, Row, Text } from '@/components/ui';
import { notify } from '@/lib/actions';
import { requireVerified, useMe } from '@/lib/auth';
import { dateTime, daysFromNow, extendFrom, fullName, isPlus, peso, referenceNo } from '@/lib/format';
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

const WEEKS = [1, 2, 3, 4];

// 3.7 · Checkout with dummy GCash / Maya payment
export default function Checkout() {
  const params = useLocalSearchParams<Params>();
  const { me, refreshProfile } = useMe();
  const { settings } = useSettings();
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
          subtitle: `${dateTime(booking.starts_at)} · ${booking.mode === 'online' ? `Online via ${booking.platform}` : booking.location}`,
          lines: [
            { label: `Tutor fee (${booking.duration_min / 60} hr)`, amount: booking.amount },
            { label: 'PASA service fee', amount: booking.fee },
          ],
          fee: booking.fee,
          payeeAmount: booking.amount,
          payeeId: booking.tutor_id,
          refType: 'booking',
        };
      }
      case 'extend': {
        if (!booking) return null;
        const extra = Math.round((booking.amount * 30) / booking.duration_min);
        const fee = serviceFee(extra, settings, me);
        return {
          title: `Extend ${booking.subject} by 30 minutes`,
          subtitle: `With ${fullName(booking.tutor)}`,
          lines: [
            { label: 'Extra 30 minutes', amount: extra },
            { label: 'PASA service fee', amount: fee },
          ],
          fee,
          payeeAmount: extra,
          payeeId: booking.tutor_id,
          refType: 'booking',
        };
      }
      case 'order': {
        if (!listing) return null;
        const rent = listing.mode === 'rent';
        const amount = rent ? listing.price * weeks : listing.price;
        const fee = serviceFee(amount, settings, me);
        return {
          title: listing.title,
          subtitle: `${rent ? 'Rent' : 'Buy'} from ${fullName(listing.seller)} · delivery by arrangement`,
          lines: [
            { label: rent ? `Rent (${weeks} week${weeks > 1 ? 's' : ''})` : 'Item price', amount },
            ...(rent && listing.deposit ? [{ label: 'Refundable deposit', amount: listing.deposit }] : []),
            { label: 'PASA service fee', amount: fee },
          ],
          fee,
          payeeAmount: amount,
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
          subtitle: `${settings.plus_boosts * plan.months} boosts, ${settings.plus_discount}% lower service fee, Plus badge`,
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
          .update({ duration_min: booking.duration_min + 30, amount: booking.amount + (summary.payeeAmount ?? 0), fee: booking.fee + summary.fee })
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
            amount: summary.payeeAmount,
            deposit: rent ? listing.deposit : 0,
            fee: summary.fee,
            due_at: rent ? daysFromNow(weeks * 7) : null,
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
