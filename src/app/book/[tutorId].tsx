import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { Screen } from '@/components/Screen';
import { Avatar, Button, Card, ChipSelect, Divider, Field, Loading, Row, Text } from '@/components/ui';
import { CANCEL_CUTOFF_MIN, PLATFORMS } from '@/config';
import { notify } from '@/lib/actions';
import { requireVerified, useMe } from '@/lib/auth';
import { fullName, peso } from '@/lib/format';
import { checkText } from '@/lib/moderation';
import { serviceFee, useSettings } from '@/lib/settings';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/types';
import { colors, font } from '@/theme';

const DURATIONS = [60, 90, 120];
const TIMES = ['8:00', '9:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];

const nextDays = () =>
  Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + i);
    return d.toISOString();
  });

const dayLabel = (iso: string, i: number) =>
  i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : new Date(iso).toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' });

const timeLabel = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
};

// 3.5 · Book a tutor: subject, platform (Zoom / Google Meet / MS Teams), date/time, duration. Tutoring is online only.
export default function BookTutor() {
  const { tutorId } = useLocalSearchParams<{ tutorId: string }>();
  const { me } = useMe();
  const [tutor, setTutor] = useState<Profile | null>(null);
  const days = useMemo(() => nextDays(), []);
  const [subject, setSubject] = useState<string | null>(null);
  const [day, setDay] = useState<string>(days[1]);
  const [time, setTime] = useState<string | null>(null);
  const [duration, setDuration] = useState(60);
  const { settings } = useSettings();
  const [platform, setPlatform] = useState<string>(PLATFORMS[0]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from('profiles').select('*').eq('id', tutorId).single().then(({ data }) => {
      setTutor(data);
      if (data?.tutor_subjects?.length === 1) setSubject(data.tutor_subjects[0]);
    });
  }, [tutorId]);

  if (!tutor) return <Screen back title="Book a session"><Loading /></Screen>;

  const amount = Math.round((tutor.tutor_rate * duration) / 60);
  const fee = serviceFee(amount, settings, me);

  const startsAt = () => {
    if (!time) return null;
    const d = new Date(day);
    const [h, m] = time.split(':').map(Number);
    d.setHours(h, m);
    return d;
  };

  const submit = async () => {
    const start = startsAt();
    if (!requireVerified(me)) return;
    if (!subject) return notify('Pick a subject');
    const placeCheck = checkText(notes);
    if (!placeCheck.ok) return notify('Please edit your request', placeCheck.reason);
    if (!start) return notify('Pick a time');
    if (start.getTime() < Date.now() + CANCEL_CUTOFF_MIN * 60000) return notify('Pick a later time', 'Sessions must start at least 15 minutes from now.');
    setSaving(true);
    const { error } = await supabase.from('bookings').insert({
      student_id: me.id,
      tutor_id: tutor.id,
      subject,
      starts_at: start.toISOString(),
      duration_min: duration,
      mode: 'online',
      platform,
      location: '',
      notes: notes.trim(),
      amount,
      fee,
    });
    setSaving(false);
    if (error) return notify('Could not book', error.message);
    notify('Request sent!', `${tutor.first_name} will accept or decline. You'll pay once it's accepted.`);
    router.replace('/activity');
  };

  return (
    <Screen back title="Book a session" footer={<Button title="Send booking request" onPress={submit} loading={saving} />}>
      <Card>
        <Row gap={12}>
          <Avatar profile={tutor} size={50} />
          <View style={{ flex: 1 }}>
            <Text variant="title">{fullName(tutor)}</Text>
            <Text variant="muted">
              {peso(tutor.tutor_rate)}/hr · Online
            </Text>
          </View>
        </Row>
      </Card>
      <ChipSelect label="Subject" options={tutor.tutor_subjects} value={subject} onChange={setSubject} />
      <ChipSelect label="Day" options={days} value={day} onChange={setDay} format={(d) => dayLabel(d, days.indexOf(d))} />
      <ChipSelect label="Start time" options={TIMES} value={time} onChange={setTime} format={timeLabel} />
      <ChipSelect label="Duration" options={DURATIONS} value={duration} onChange={setDuration} format={(m) => (m === 60 ? '1 hour' : `${m / 60} hours`)} />
      <ChipSelect label="Platform" options={PLATFORMS} value={platform} onChange={setPlatform} />
      <Text variant="muted" style={{ marginTop: -8 }}>
        {tutor.first_name} will add the meeting link after accepting.
      </Text>
      <Field label="Notes for your tutor (optional)" placeholder="Topics you're stuck on, your exam date…" value={notes} onChangeText={setNotes} multiline />
      <Card style={{ gap: 8 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Text variant="muted">Tutor fee ({duration / 60} hr)</Text>
          <Text>{peso(amount)}</Text>
        </Row>
        <Row style={{ justifyContent: 'space-between' }}>
          <Text variant="muted">PASA service fee</Text>
          <Text>{peso(fee)}</Text>
        </Row>
        <Divider />
        <Row style={{ justifyContent: 'space-between' }}>
          <Text variant="title">Total</Text>
          <Text style={{ fontFamily: font.black, fontSize: 18, color: colors.primaryDark }}>{peso(amount + fee)}</Text>
        </Row>
        <Text variant="muted" style={{ fontSize: 12.5 }}>
          You won't be charged yet. Free cancellation until {CANCEL_CUTOFF_MIN} minutes before the session.
        </Text>
      </Card>
    </Screen>
  );
}
