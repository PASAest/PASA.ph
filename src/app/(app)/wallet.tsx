import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { View } from 'react-native';
import { METHODS } from '@/components/FakeWallet';
import { Screen } from '@/components/Screen';
import { Badge, Button, Card, ChipSelect, DemoBanner, Empty, Field, Loading, Row, Text } from '@/components/ui';
import { notify } from '@/lib/actions';
import { useMe } from '@/lib/auth';
import { dateTime, fullName, peso } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';
import type { Payout, Profile } from '@/lib/types';
import { useFocusLoad } from '@/lib/useFocusLoad';
import { colors, font, space } from '@/theme';

type Earning = {
  id: string;
  ref_type: 'booking' | 'order';
  amount: number;
  fee: number;
  payee_amount: number | null;
  status: 'held' | 'released' | 'refunded' | 'paid';
  created_at: string;
  payer?: Profile;
};

/** What the tutor/seller earns from one payment (older payments didn't store it, so estimate). */
const earned = (p: Earning) => p.payee_amount ?? p.amount - p.fee;

// Tutor's / seller's wallet: earnings released by PASA, pending payments, and withdrawals to GCash or Maya (demo)
export default function Wallet() {
  const { me } = useMe();
  const [earnings, setEarnings] = useState<Earning[] | null>(null);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [withdrawing, setWithdrawing] = useState(false);
  const [method, setMethod] = useState<'gcash' | 'maya'>('gcash');
  const [form, setForm] = useState({ amount: '', name: `${me.first_name} ${me.last_name}`, number: '' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [e, p] = await Promise.all([
      supabase
        .from('payments')
        .select('id, ref_type, amount, fee, payee_amount, status, created_at, payer:profiles!payments_payer_id_fkey(*)')
        .eq('payee_id', me.id)
        .order('created_at', { ascending: false }),
      supabase.from('payouts').select('*').eq('user_id', me.id).order('created_at', { ascending: false }),
    ]);
    setEarnings((e.data as unknown as Earning[]) ?? []);
    setPayouts((p.data as Payout[]) ?? []);
  };
  useFocusLoad(load);

  if (!earnings) return <Screen back title="Wallet"><Loading /></Screen>;
  const released = earnings.filter((e) => e.status === 'released').reduce((s, e) => s + earned(e), 0);
  const pending = earnings.filter((e) => e.status === 'held').reduce((s, e) => s + earned(e), 0);
  const withdrawn = payouts.filter((p) => p.status !== 'rejected').reduce((s, p) => s + p.amount, 0);
  const available = Math.max(0, released - withdrawn);

  const withdraw = async () => {
    const amount = Number(form.amount);
    if (!amount || amount < 100) return notify('Minimum withdrawal is ₱100');
    if (amount > available) return notify('Not enough balance', `You can withdraw up to ${peso(available)}.`);
    if (!form.name.trim() || !/^09\d{9}$/.test(form.number.replace(/\s/g, ''))) return notify('Check your account', `Enter the name and 11-digit mobile number on your ${METHODS[method].label} account.`);
    setSaving(true);
    const { error } = await supabase
      .from('payouts')
      .insert({ user_id: me.id, amount, method, account_name: form.name.trim(), account_number: form.number.replace(/\s/g, '') });
    setSaving(false);
    if (error) return notify('Could not request withdrawal', error.message);
    setWithdrawing(false);
    setForm((f) => ({ ...f, amount: '' }));
    toast(`Withdrawal of ${peso(amount)} requested`);
    load();
  };

  return (
    <Screen back title="Wallet">
      <DemoBanner />
      <Card style={{ gap: 6, backgroundColor: colors.primary, borderColor: colors.primary }}>
        <Text style={{ color: colors.white, opacity: 0.9 }}>Available balance</Text>
        <Text style={{ fontFamily: font.black, fontSize: 34, color: colors.white }}>{peso(available)}</Text>
        <Text style={{ color: colors.white, opacity: 0.9 }}>
          {peso(pending)} pending · {peso(released)} earned in total
        </Text>
      </Card>
      {!withdrawing ? (
        <Button title="Withdraw to GCash or Maya" icon="arrow-up-circle-outline" onPress={() => setWithdrawing(true)} disabled={available < 100} />
      ) : (
        <Card style={{ gap: space(3) }}>
          <Text variant="title">Withdraw</Text>
          <ChipSelect label="Send to" options={['gcash', 'maya'] as const} value={method} onChange={setMethod} format={(m) => METHODS[m].label} />
          <Field label="Amount" placeholder={`Up to ${peso(available)}`} value={form.amount} onChangeText={(v) => setForm((f) => ({ ...f, amount: v.replace(/\D/g, '') }))} keyboardType="number-pad" icon="cash-outline" />
          <Field label="Account name" value={form.name} onChangeText={(v) => setForm((f) => ({ ...f, name: v }))} />
          <Field label="Mobile number" placeholder="09XX XXX XXXX" value={form.number} onChangeText={(v) => setForm((f) => ({ ...f, number: v }))} keyboardType="phone-pad" />
          <Row>
            <Button title="Request" style={{ flex: 1 }} onPress={withdraw} loading={saving} />
            <Button title="Cancel" variant="ghost" onPress={() => setWithdrawing(false)} />
          </Row>
        </Card>
      )}
      <Text variant="muted" style={{ fontSize: 12.5 }}>
        Money from a session or sale is "pending" until the student confirms the session or the buyer confirms they got the item. Then it moves to your balance.
      </Text>

      {payouts.length > 0 && (
        <View style={{ gap: space(2) }}>
          <Text variant="title">Withdrawals</Text>
          {payouts.map((p) => (
            <Card key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Ionicons name="arrow-up-circle" size={26} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: font.bold }}>
                  {peso(p.amount)} to {METHODS[p.method].label}
                </Text>
                <Text variant="muted">{dateTime(p.created_at)}</Text>
              </View>
              <Badge label={p.status === 'requested' ? 'Processing' : p.status === 'paid' ? 'Sent' : 'Rejected'} tone={p.status === 'paid' ? 'green' : p.status === 'requested' ? 'yellow' : 'red'} />
            </Card>
          ))}
        </View>
      )}

      <View style={{ gap: space(2) }}>
        <Text variant="title">Earnings</Text>
        {earnings.length === 0 ? (
          <Empty icon="wallet-outline" title="No earnings yet" text="Tutor sessions and items you sell will show up here." />
        ) : (
          earnings.map((e) => (
            <Card key={e.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Ionicons name={e.ref_type === 'booking' ? 'school' : 'bag-handle'} size={24} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: font.bold }}>
                  {e.ref_type === 'booking' ? 'Tutoring' : 'Item'} · {fullName(e.payer)}
                </Text>
                <Text variant="muted">{dateTime(e.created_at)}</Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <Text style={{ fontFamily: font.bold, color: e.status === 'refunded' ? colors.muted : colors.success }}>+{peso(earned(e))}</Text>
                <Badge
                  label={e.status === 'held' ? 'Pending' : e.status === 'released' ? 'Released' : 'Refunded'}
                  tone={e.status === 'held' ? 'yellow' : e.status === 'released' ? 'green' : 'gray'}
                />
              </View>
            </Card>
          ))
        )}
      </View>
    </Screen>
  );
}
