import { router } from 'expo-router';
import { useState } from 'react';
import { POST_TYPES } from '@/components/PostCard';
import { Screen } from '@/components/Screen';
import { Button, ChipSelect, Field, Text } from '@/components/ui';
import { SUBJECTS } from '@/config';
import { notify } from '@/lib/actions';
import { useMe } from '@/lib/auth';
import { checkText } from '@/lib/moderation';
import { supabase } from '@/lib/supabase';
import type { PostType } from '@/lib/types';

const TYPES: PostType[] = ['need_tutor', 'offer_tutoring', 'general'];
const PROMPTS: Record<PostType, string> = {
  need_tutor: 'e.g. Need help with Cost Accounting (job order costing) before Friday\'s quiz. Free Thu 3–5pm.',
  offer_tutoring: 'e.g. Dean\'s lister, can teach FAR and Cost Accounting. Available MWF afternoons at the library.',
  general: 'Share an announcement, tip, or question with your campus…',
};

// 3a · Create post
export default function NewPost() {
  const { me } = useMe();
  const [type, setType] = useState<PostType>('need_tutor');
  const [subject, setSubject] = useState<string | null>(null);
  const [budget, setBudget] = useState('');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  const tutoring = type !== 'general';

  const submit = async () => {
    if (tutoring && !subject) return notify('Pick a subject');
    if (body.trim().length < 10) return notify('Tell us a bit more', 'Write at least 10 characters.');
    const check = checkText(body);
    if (!check.ok) return notify('Post not published', check.reason);
    setSaving(true);
    const { error } = await supabase.from('posts').insert({
      author_id: me.id,
      type,
      subject: tutoring ? subject : '',
      body: body.trim(),
      budget: tutoring && budget ? Number(budget) : null,
    });
    setSaving(false);
    if (error) return notify('Could not post', error.message);
    router.back();
  };

  return (
    <Screen back title="Create post" footer={<Button title="Post" onPress={submit} loading={saving} />}>
      <ChipSelect label="What kind of post?" options={TYPES} value={type} onChange={setType} format={(t) => POST_TYPES[t].label} />
      {tutoring && <ChipSelect label="Subject" options={SUBJECTS} value={subject} onChange={setSubject} />}
      {tutoring && (
        <Field
          label={type === 'need_tutor' ? 'Budget per hour (optional)' : 'Your rate per hour (optional)'}
          placeholder="₱150"
          value={budget}
          onChangeText={(v) => setBudget(v.replace(/\D/g, ''))}
          keyboardType="number-pad"
          icon="cash-outline"
        />
      )}
      <Field label="Details" placeholder={PROMPTS[type]} value={body} onChangeText={setBody} multiline maxLength={1000} />
      <Text variant="muted">Keep it respectful. Posts with harsh or flirtatious words are blocked.</Text>
    </Screen>
  );
}
