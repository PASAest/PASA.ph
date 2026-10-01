import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Screen } from '@/components/Screen';
import { Button, Card, Chip, Field, Text } from '@/components/ui';
import { SUBJECTS } from '@/config';
import { confirm, notify } from '@/lib/actions';
import { useMe } from '@/lib/auth';
import { checkText } from '@/lib/moderation';
import { supabase } from '@/lib/supabase';
import { colors } from '@/theme';

// Become a tutor / edit tutor profile: subjects, hourly rate, about
export default function BecomeTutor() {
  const { setup } = useLocalSearchParams<{ setup?: string }>();
  const { me, refreshProfile } = useMe();
  const [subjects, setSubjects] = useState<string[]>(me.tutor_subjects);
  const [rate, setRate] = useState(me.tutor_rate ? String(me.tutor_rate) : '');
  const [about, setAbout] = useState(me.tutor_about);
  const [saving, setSaving] = useState(false);

  const toggle = (s: string) => setSubjects((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));

  const save = async () => {
    if (!subjects.length) return notify('Pick at least one subject');
    if (!rate || Number(rate) < 50) return notify('Set your hourly rate', 'Minimum is ₱50 per hour.');
    const check = checkText(about);
    if (!check.ok) return notify('Please edit your intro', check.reason);
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ is_tutor: true, tutor_subjects: subjects, tutor_rate: Number(rate), tutor_about: about.trim() })
      .eq('id', me.id);
    setSaving(false);
    if (error) return notify('Could not save', error.message);
    await refreshProfile();
    if (setup) router.replace('/(tabs)');
    else router.back();
  };

  const stop = async () => {
    if (!(await confirm('Stop tutoring?', "Students won't be able to book you. You can turn it back on anytime.", 'Stop'))) return;
    await supabase.from('profiles').update({ is_tutor: false }).eq('id', me.id);
    await refreshProfile();
    router.back();
  };

  return (
    <Screen
      back={!setup}
      title={me.is_tutor ? 'Tutor profile' : 'Become a tutor'}
      footer={
        <>
          <Button title={me.is_tutor ? 'Save' : 'Start tutoring'} onPress={save} loading={saving} />
          {setup && <Button title="Skip for now" variant="ghost" onPress={() => router.replace('/(tabs)')} />}
        </>
      }
    >
      <Text variant="muted">Tutoring on PASA is face-to-face on campus. Students book a time and place, pay through PASA, and you get paid after the session.</Text>
      <View style={{ gap: 8 }}>
        <Text variant="label">Subjects you can teach</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {SUBJECTS.map((s) => (
            <Chip key={s} label={s} selected={subjects.includes(s)} onPress={() => toggle(s)} />
          ))}
        </View>
      </View>
      <Field label="Rate per hour" placeholder="₱150" value={rate} onChangeText={(v) => setRate(v.replace(/\D/g, ''))} keyboardType="number-pad" icon="cash-outline" />
      <Field
        label="About you as a tutor"
        placeholder="Grades, awards, how you teach, when you're free…"
        value={about}
        onChangeText={setAbout}
        multiline
        maxLength={400}
      />
      <Card style={{ backgroundColor: colors.brandSoft, borderColor: colors.brandSoft }}>
        <Text style={{ color: colors.primaryDark, fontSize: 13.5 }}>
          Students pay your rate plus a small PASA service fee. You receive your full rate.
        </Text>
      </Card>
      {me.is_tutor && !setup && <Button title="Stop tutoring" variant="danger" onPress={stop} />}
    </Screen>
  );
}
