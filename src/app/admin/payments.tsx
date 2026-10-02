import { useState } from 'react';
import { AdminPage } from '@/components/admin/AdminShell';
import { DataTable, StatTile, TileGrid } from '@/components/admin/widgets';
import { METHODS, methodLabel } from '@/components/FakeWallet';
import { Badge, Button, Chip, Loading, Row, Text } from '@/components/ui';
import { confirm, notify } from '@/lib/actions';
import { exportCsv } from '@/lib/admin';
import { dateTime, fullName, peso } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import type { Payout, Profile } from '@/lib/types';
import { useFocusLoad } from '@/lib/useFocusLoad';
import { font } from '@/theme';

type RefType = 'booking' | 'order' | 'boost' | 'plus';
type PayStatus = 'held' | 'released' | 'refunded' | 'paid';
type Payment = {
  id: string;
  ref_type: RefType;
  method: string;
  amount: number;
  fee: number;
  reference_no: string;
  status: PayStatus;
  created_at: string;
  payer?: Profile;
  payee?: Profile | null;
};

const TYPE_LABEL: Record<RefType, string> = { booking: 'Tutoring', order: 'Item', boost: 'Boost', plus: 'PASA Plus' };
const STATUS_TONE: Record<PayStatus, 'yellow' | 'green' | 'red' | 'blue'> = { held: 'yellow', released: 'green', refunded: 'red', paid: 'blue' };

/** PASA's revenue from one payment: the fee once released, or the whole boost/Plus price. */
const revenueOf = (p: Payment) =>
  p.ref_type === 'boost' || p.ref_type === 'plus' ? (p.status === 'paid' ? p.amount : 0) : p.status === 'released' ? p.fee : 0;

// /admin/payments · Every (demo) payment, with export for the financial study
export default function Payments() {
  const [payments, setPayments] = useState<Payment[] | null>(null);
  const [type, setType] = useState<RefType | 'all'>('all');
  const [status, setStatus] = useState<PayStatus | 'all'>('all');
  const [view, setView] = useState<'payments' | 'payouts'>('payments');
  const [payouts, setPayouts] = useState<Payout[]>([]);

  const load = async () => {
    const [p, w] = await Promise.all([
      supabase
        .from('payments')
        .select('*, payer:profiles!payments_payer_id_fkey(*), payee:profiles!payments_payee_id_fkey(*)')
        .order('created_at', { ascending: false })
        .limit(1000),
      supabase.from('payouts').select('*, user:profiles!payouts_user_id_fkey(*)').order('created_at', { ascending: false }),
    ]);
    setPayments((p.data as Payment[]) ?? []);
    setPayouts((w.data as Payout[]) ?? []);
  };
  useFocusLoad(load);

  const setPayout = async (p: Payout, next: 'paid' | 'rejected') => {
    const msg = next === 'paid' ? `Mark ${peso(p.amount)} as sent to ${p.account_name}'s ${METHODS[p.method].label} (${p.account_number})?` : 'The amount goes back to their wallet balance.';
    if (!(await confirm(next === 'paid' ? 'Mark as sent?' : 'Reject withdrawal?', msg, next === 'paid' ? 'Mark sent' : 'Reject'))) return;
    const { error } = await supabase.from('payouts').update({ status: next }).eq('id', p.id);
    if (error) return notify('Could not update', error.message);
    load();
  };

  if (!payments) return <Loading />;
  const requested = payouts.filter((p) => p.status === 'requested');

  if (view === 'payouts') {
    return (
      <AdminPage title="Payments & payouts" subtitle="Withdrawals tutors and sellers requested from their wallets (demo: send them manually).">
        <Row>
          <Chip label="Payments" selected={false} onPress={() => setView('payments')} />
          <Chip label={`Payouts (${requested.length} to send)`} selected onPress={() => setView('payouts')} />
        </Row>
        <DataTable
          rows={payouts}
          rowKey={(p) => p.id}
          empty="No withdrawal requests yet."
          columns={[
            { key: 'who', label: 'Tutor / seller', flex: 1.4, render: (p) => <Text style={{ fontFamily: font.bold }}>{fullName(p.user)}</Text> },
            { key: 'to', label: 'Send to', flex: 1.6, render: (p) => <Text variant="muted">{`${METHODS[p.method].label} · ${p.account_name} · ${p.account_number}`}</Text> },
            { key: 'amount', label: 'Amount', flex: 0.8, render: (p) => <Text style={{ fontFamily: font.semibold }}>{peso(p.amount)}</Text> },
            { key: 'date', label: 'Requested', flex: 1.1, render: (p) => <Text variant="muted">{dateTime(p.created_at)}</Text> },
            {
              key: 'status',
              label: 'Status',
              width: 200,
              render: (p) =>
                p.status === 'requested' ? (
                  <Row gap={6}>
                    <Button title="Mark sent" small onPress={() => setPayout(p, 'paid')} />
                    <Button title="Reject" small variant="ghost" onPress={() => setPayout(p, 'rejected')} />
                  </Row>
                ) : (
                  <Badge label={p.status === 'paid' ? 'Sent' : 'Rejected'} tone={p.status === 'paid' ? 'green' : 'red'} />
                ),
            },
          ]}
        />
      </AdminPage>
    );
  }
  const shown = payments.filter((p) => (type === 'all' || p.ref_type === type) && (status === 'all' || p.status === status));
  const sum = (f: (p: Payment) => number) => shown.reduce((s, p) => s + f(p), 0);

  return (
    <AdminPage
      title="Payments"
      subtitle="Demo payments only. Use the export for the financial study."
      actions={
        <Button
          title="Export CSV"
          small
          variant="outline"
          icon="download-outline"
          onPress={() =>
            exportCsv(
              'pasa-payments.csv',
              shown.map((p) => ({
                date: p.created_at,
                reference: p.reference_no,
                type: TYPE_LABEL[p.ref_type],
                method: methodLabel(p.method),
                payer: fullName(p.payer),
                payee: p.payee ? fullName(p.payee) : 'PASA',
                amount: p.amount,
                service_fee: p.fee,
                pasa_revenue: revenueOf(p),
                status: p.status,
              })),
            )
          }
        />
      }
    >
      <Row>
        <Chip label="Payments" selected onPress={() => setView('payments')} />
        <Chip label={`Payouts (${requested.length} to send)`} selected={false} onPress={() => setView('payouts')} />
      </Row>
      <TileGrid>
        <StatTile icon="receipt-outline" label="Payments" value={String(shown.length)} />
        <StatTile icon="swap-horizontal-outline" label="Total paid" value={peso(sum((p) => (p.status === 'refunded' ? 0 : p.amount)))} note="Excludes refunds" />
        <StatTile icon="cash-outline" label="PASA revenue" value={peso(sum(revenueOf))} />
        <StatTile icon="hourglass-outline" label="Fees still held" value={peso(sum((p) => (p.status === 'held' ? p.fee : 0)))} />
      </TileGrid>
      <Row style={{ flexWrap: 'wrap' }}>
        {(['all', 'booking', 'order', 'boost', 'plus'] as const).map((t) => (
          <Chip key={t} label={t === 'all' ? 'All types' : TYPE_LABEL[t]} selected={type === t} onPress={() => setType(t)} />
        ))}
      </Row>
      <Row style={{ flexWrap: 'wrap' }}>
        {(['all', 'held', 'released', 'refunded', 'paid'] as const).map((s) => (
          <Chip key={s} label={s === 'all' ? 'All statuses' : s[0].toUpperCase() + s.slice(1)} selected={status === s} onPress={() => setStatus(s)} />
        ))}
      </Row>
      <DataTable
        rows={shown}
        rowKey={(p) => p.id}
        empty="No payments match."
        columns={[
          {
            key: 'what',
            label: 'Payment',
            flex: 1.6,
            render: (p) => (
              <Text>
                <Text style={{ fontFamily: font.bold }}>{TYPE_LABEL[p.ref_type]}</Text>
                {'\n'}
                <Text variant="muted" style={{ fontSize: 12.5 }}>
                  {p.reference_no} · {methodLabel(p.method)}
                </Text>
              </Text>
            ),
          },
          { key: 'who', label: 'From → to', flex: 1.6, render: (p) => <Text variant="muted">{`${fullName(p.payer)} → ${p.payee ? fullName(p.payee) : 'PASA'}`}</Text> },
          { key: 'amount', label: 'Amount', flex: 0.8, render: (p) => <Text style={{ fontFamily: font.semibold }}>{peso(p.amount)}</Text> },
          { key: 'fee', label: 'PASA revenue', flex: 0.9, render: (p) => <Text>{peso(revenueOf(p))}</Text> },
          { key: 'status', label: 'Status', flex: 0.9, render: (p) => <Badge label={p.status} tone={STATUS_TONE[p.status]} /> },
          { key: 'date', label: 'Date', flex: 1.2, render: (p) => <Text variant="muted">{dateTime(p.created_at)}</Text> },
        ]}
      />
    </AdminPage>
  );
}
