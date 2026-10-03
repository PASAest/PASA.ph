import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { CalendarPicker } from '@/components/CalendarPicker';
import { Screen } from '@/components/Screen';
import { SelectField } from '@/components/SelectField';
import { TimeField } from '@/components/TimeField';
import { Avatar, Button, Card, Divider, Field, type IconName, Loading, Row, Text } from '@/components/ui';
import { CANCEL_CUTOFF_MIN, PLATFORMS } from '@/config';
import { notify } from '@/lib/actions';
import { requireVerified, useMe } from '@/lib/auth';
import { fullName, peso } from '@/lib/format';
import { checkText } from '@/lib/moderation';
import { serviceFee, useSettings } from '@/lib/settings';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';
import type { Profile } from '@/lib/types';
import { colors, font } from '@/theme';

const DURATIONS = [60, 90, 120, 180];
const durationLabel = (m: number) => (m === 60 ? '1 hour' : `${m / 60} hours`);
const PLATFORM_ICONS: Record<string, IconName> = { Zoom: 'videocam-outline', 'Google Meet': 'logo-google', 'MS Teams': 'people-outline' };

const tomorrow = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
};
const isToday = (d: Date) => d.toDateString() === new Date().toDateString();

// 3.5 · Book a tutor: subject, platform (Zoom / Google Meet / MS Teams), date/time, duration. Tutoring is online only.
export default function BookTutor() {
  const { tutorId } = useLocalSearchParams<{ tutorId: string }>();
  const { me } = useMe();
  const [tutor, setTutor] = useState<Profile | null>(null);
  const [subject, setSubject] = useState<string | null>(null);
  const [day, setDay] = useState<Date>(tomorrow);
  const [time, setTime] = useState<string | null>(null);
  const [customTime, setCustomTime] = useState(false);
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

  // On today, times earlier than the booking cut-off are shown as passed.
  const now = new Date();
  const earliest = isToday(day) ? now.getHours() * 60 + now.getMinutes() + CANCEL_CUTOFF_MIN : 0;

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
    toast(`Request sent to ${tutor.first_name}. You'll pay once it's accepted.`);
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
      <SelectField
        label="Subject"
        icon="book-outline"
        placeholder="Choose a subject"
        value={subject}
        onChange={setSubject}
        options={tutor.tutor_subjects.map((s) => ({ value: s, label: s, icon: 'book-outline' as IconName }))}
      />
      <View style={{ gap: 6 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Text variant="label">Day</Text>
          <Text variant="muted" style={{ fontSize: 13 }}>
            {isToday(day) ? 'Today, ' : ''}
            {day.toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' })}
          </Text>
        </Row>
        <CalendarPicker value={day} onChange={setDay} />
      </View>
      <TimeField label="Start time" value={time} onChange={setTime} earliest={earliest} custom={customTime} onCustomChange={setCustomTime} />
      <Row gap={12} style={{ alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <SelectField
            label="Duration"
            icon="hourglass-outline"
            value={duration}
            onChange={setDuration}
            options={DURATIONS.map((m) => ({ value: m, label: durationLabel(m), hint: peso(Math.round((tutor.tutor_rate * m) / 60)) }))}
          />
        </View>
        <View style={{ flex: 1 }}>
          <SelectField
            label="Platform"
            value={platform}
            onChange={setPlatform}
            options={PLATFORMS.map((p) => ({ value: p, label: p, icon: PLATFORM_ICONS[p] }))}
          />
        </View>
      </Row>
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
