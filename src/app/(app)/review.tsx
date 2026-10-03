import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { Avatar, Button, Field, Row, Text } from '@/components/ui';
import { notify } from '@/lib/actions';
import { useMe } from '@/lib/auth';
import { fullName } from '@/lib/format';
import { checkText } from '@/lib/moderation';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/types';

const LABELS = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent!'];

// 3.8 · Leave a review after a session or order
export default function Review() {
  const { refType, refId, userId, role } = useLocalSearchParams<{ refType: string; refId: string; userId: string; role: string }>();
  const { me } = useMe();
  const [person, setPerson] = useState<Profile | null>(null);
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from('profiles').select('*').eq('id', userId).single().then(({ data }) => setPerson(data));
  }, [userId]);

  const submit = async () => {
    if (!stars) return notify('Tap the stars to rate');
    const check = checkText(comment);
    if (!check.ok) return notify('Review not posted', check.reason);
    setSaving(true);
    const { error } = await supabase
      .from('reviews')
      .insert({ reviewer_id: me.id, reviewee_id: userId, role, ref_type: refType, ref_id: refId, stars, comment: comment.trim() });
    setSaving(false);
    if (error) return notify('Could not save review', error.message);
    router.back();
  };

  return (
    <Screen back title="Leave a review" footer={<Button title="Submit review" onPress={submit} loading={saving} />}>
      <View style={{ alignItems: 'center', gap: 10, marginTop: 12 }}>
        <Avatar profile={person} size={80} />
        <Text variant="h2">How was {person?.first_name ?? '…'}?</Text>
        <Text variant="muted">Rate {fullName(person)} as a {role}</Text>
        <Row gap={6} style={{ marginTop: 8 }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <Pressable key={i} onPress={() => setStars(i)} hitSlop={6} accessibilityLabel={`${i} stars`}>
              <Ionicons name={stars >= i ? 'star' : 'star-outline'} size={40} color="#F5B301" />
            </Pressable>
          ))}
        </Row>
        <Text variant="title">{LABELS[stars]}</Text>
      </View>
      <Field label="Comment (optional)" placeholder="What went well? Anything to improve?" value={comment} onChangeText={setComment} multiline />
    </Screen>
  );
}
