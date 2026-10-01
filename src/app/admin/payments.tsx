import { useState } from 'react';
import { AdminPage } from '@/components/admin/AdminShell';
import { DataTable, StatTile, TileGrid } from '@/components/admin/widgets';
import { METHODS, type PayMethod } from '@/components/FakeWallet';
import { Badge, Button, Chip, Loading, Row, Text } from '@/components/ui';
import { exportCsv } from '@/lib/admin';
import { dateTime, fullName, peso } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/types';
import { useFocusLoad } from '@/lib/useFocusLoad';
import { font } from '@/theme';

type RefType = 'booking' | 'order' | 'boost' | 'plus';
type PayStatus = 'held' | 'released' | 'refunded' | 'paid';
type Payment = {
  id: string;
  ref_type: RefType;
  method: PayMethod;
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

  useFocusLoad(async () => {
    const { data } = await supabase
      .from('payments')
      .select('*, payer:profiles!payments_payer_id_fkey(*), payee:profiles!payments_payee_id_fkey(*)')
      .order('created_at', { ascending: false })
      .limit(1000);
    setPayments((data as Payment[]) ?? []);
  });

  if (!payments) return <Loading />;
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
                method: METHODS[p.method].label,
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
                  {p.reference_no} · {METHODS[p.method].label}
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
