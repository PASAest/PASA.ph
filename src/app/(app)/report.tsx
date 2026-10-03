import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Screen } from '@/components/Screen';
import { SelectField } from '@/components/SelectField';
import { Button, Field, Text } from '@/components/ui';
import { notify } from '@/lib/actions';
import { useMe } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';

const REASONS = {
  user: ['Harassment or flirting', 'Scam or fraud', 'No-show', 'Fake account', 'Offensive language', 'Other'],
  post: ['Offensive language', 'Spam', 'Selling banned material', 'Misleading', 'Other'],
  listing: ['Answer keys / exercises / quizzes', 'Not a book or calculator', 'Scam or fake item', 'Wrong price or photo', 'Other'],
  message: ['Harassment or flirting', 'Offensive language', 'Scam', 'Other'],
} as const;

// Report a user, post, listing or message to the PASA admins
export default function Report() {
  const { type, id } = useLocalSearchParams<{ type: keyof typeof REASONS; id: string }>();
  const { me } = useMe();
  const [reason, setReason] = useState<string | null>(null);
  const [details, setDetails] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!reason) return notify('Pick a reason');
    setSaving(true);
    const { error } = await supabase.from('reports').insert({ reporter_id: me.id, target_type: type, target_id: id, reason, details: details.trim() });
    setSaving(false);
    if (error) return notify('Could not send report', error.message);
    toast('Report sent. The PASA team will review it.');
    router.back();
  };

  return (
    <Screen back title={`Report ${type}`} footer={<Button title="Send report" variant="primary" onPress={submit} loading={saving} />}>
      <Text variant="muted">Reports are private. The person won't know who reported them.</Text>
      <SelectField
        label="What's wrong?"
        icon="flag-outline"
        placeholder="Choose a reason"
        value={reason}
        onChange={setReason}
        options={(REASONS[type] ?? REASONS.user).map((r) => ({ value: r as string, label: r }))}
      />
      <Field label="Details (optional)" placeholder="Tell us what happened…" value={details} onChangeText={setDetails} multiline />
    </Screen>
  );
}
