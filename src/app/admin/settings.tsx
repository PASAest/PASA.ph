import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { AdminPage } from '@/components/admin/AdminShell';
import { Button, Card, Field, Text } from '@/components/ui';
import { notify } from '@/lib/actions';
import { DEFAULT_SETTINGS, useSettings, type AppSettings } from '@/lib/settings';
import { supabase } from '@/lib/supabase';
import { space } from '@/theme';

type Key = keyof AppSettings;
const GROUPS: { title: string; note: string; fields: { key: Key; label: string; suffix: string }[] }[] = [
  {
    title: 'Commission and pricing',
    note: 'The service fee is added on top of the tutor’s or seller’s price. Tutors set their own rate but can’t go below the minimum.',
    fields: [
      { key: 'commission_rate', label: 'Service fee (commission)', suffix: '%' },
      { key: 'min_tutor_rate', label: 'Minimum tutor rate', suffix: '₱ / hour' },
    ],
  },
  {
    title: 'Boosts',
    note: 'A boost pins a post or listing at the top.',
    fields: [
      { key: 'boost_price', label: 'Price per boost', suffix: '₱' },
      { key: 'boost_days', label: 'Boost length', suffix: 'days' },
    ],
  },
  {
    title: 'PASA Plus',
    note: 'Members get a lower service fee and free boosts each month. New members can try it free for 1 month.',
    fields: [
      { key: 'plus_discount', label: 'Service fee discount', suffix: 'percentage points' },
      { key: 'plus_boosts', label: 'Boosts per month', suffix: 'boosts' },
      { key: 'plus_price_1m', label: '1 month', suffix: '₱' },
      { key: 'plus_price_3m', label: '3 months', suffix: '₱' },
      { key: 'plus_price_6m', label: '6 months', suffix: '₱' },
      { key: 'plus_price_12m', label: '1 year', suffix: '₱' },
    ],
  },
];

// /admin/settings · Business rules the app reads at startup
export default function AdminSettings() {
  const { settings, reload } = useSettings();
  const [form, setForm] = useState<Record<Key, string>>(() => toForm(settings));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    reload();
  }, [reload]);

  const save = async () => {
    const values: Partial<AppSettings> = {};
    for (const k of Object.keys(DEFAULT_SETTINGS) as Key[]) {
      const n = Number(form[k]);
      if (form[k] === '' || Number.isNaN(n) || n < 0) return notify('Check the numbers', `"${k}" must be 0 or more.`);
      values[k] = n;
    }
    if ((values.commission_rate ?? 0) > 50) return notify('Service fee looks too high', 'Use 50% or less.');
    setSaving(true);
    const { error } = await supabase.from('app_settings').update({ ...values, updated_at: new Date().toISOString() }).eq('id', 1);
    setSaving(false);
    if (error) return notify('Could not save', error.message);
    await reload();
    notify('Saved', 'New prices apply to new bookings, orders and subscriptions.');
  };

  return (
    <AdminPage title="Settings" subtitle="Prices and fees used across the app." actions={<Button title="Save changes" small onPress={save} loading={saving} />}>
      {GROUPS.map((g) => (
        <Card key={g.title} style={{ gap: space(3) }}>
          <Text variant="title">{g.title}</Text>
          <Text variant="muted">{g.note}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space(3) }}>
            {g.fields.map((f) => (
              <View key={f.key} style={{ flexBasis: 220, flexGrow: 1 }}>
                <Field
                  label={`${f.label} (${f.suffix})`}
                  value={form[f.key]}
                  onChangeText={(v) => setForm((cur) => ({ ...cur, [f.key]: v.replace(/[^\d.]/g, '') }))}
                  keyboardType="decimal-pad"
                />
              </View>
            ))}
          </View>
        </Card>
      ))}
    </AdminPage>
  );
}

function toForm(s: AppSettings) {
  return Object.fromEntries(Object.entries(s).map(([k, v]) => [k, String(v)])) as Record<Key, string>;
}
