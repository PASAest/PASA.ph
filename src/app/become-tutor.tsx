import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { DocUpload } from '@/components/DocUpload';
import { Screen } from '@/components/Screen';
import { Select } from '@/components/Select';
import { Badge, Button, Card, Field, Row, Text } from '@/components/ui';
import { SUBJECTS } from '@/config';
import { confirm, notify } from '@/lib/actions';
import { requireVerified, useMe } from '@/lib/auth';
import { peso } from '@/lib/format';
import { checkText } from '@/lib/moderation';
import { useSettings } from '@/lib/settings';
import { supabase } from '@/lib/supabase';
import { uploadDocument, type Picked } from '@/lib/upload';
import { colors } from '@/theme';

const STATUS = {
  none: { label: 'Not applied', tone: 'gray' },
  pending: { label: 'Under review', tone: 'yellow' },
  approved: { label: 'Approved tutor', tone: 'green' },
  rejected: { label: 'Not approved', tone: 'red' },
} as const;

// Become a tutor / edit tutor profile. New tutors upload a CV; the PASA team approves them (ID + COR come from verification).
export default function BecomeTutor() {
  const { setup } = useLocalSearchParams<{ setup?: string }>();
  const { me, refreshProfile } = useMe();
  const { settings } = useSettings();
  const [subjects, setSubjects] = useState<string[]>(me.tutor_subjects);
  const [rate, setRate] = useState(String(me.tutor_rate || settings.min_tutor_rate));
  const [about, setAbout] = useState(me.tutor_about);
  const [cv, setCv] = useState<Picked | null>(null);
  const [saving, setSaving] = useState(false);
  const approved = me.tutor_status === 'approved';
  const leave = () => (setup ? router.replace('/(tabs)') : router.back());

  const save = async () => {
    if (!approved && !requireVerified(me)) return;
    if (!subjects.length) return notify('Pick at least one subject');
    if (!rate || Number(rate) < settings.min_tutor_rate) return notify('Set your hourly rate', `The minimum is ${peso(settings.min_tutor_rate)} per hour.`);
    const check = checkText(about);
    if (!check.ok) return notify('Please edit your intro', check.reason);
    if (!approved && !cv && !me.cv_doc_path) return notify('Add your CV', 'Upload your CV (photo or PDF) so the PASA team can review your application.');
    setSaving(true);
    try {
      const cv_doc_path = cv ? await uploadDocument(cv, me.id, 'cv') : me.cv_doc_path;
      const { error } = await supabase
        .from('profiles')
        .update({
          tutor_subjects: subjects,
          tutor_rate: Number(rate),
          tutor_about: about.trim(),
          tutor_modes: ['online'],
          cv_doc_path,
          ...(approved ? { is_tutor: true } : { tutor_status: 'pending' }),
        })
        .eq('id', me.id);
      if (error) throw error;
      await refreshProfile();
      if (!approved) notify('Application sent!', 'The PASA team will review your CV and documents. We\'ll notify you once you\'re approved.');
      leave();
    } catch (e) {
      notify('Could not save', (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const stop = async () => {
    if (!(await confirm('Stop tutoring?', "Students won't be able to book you. You'll need to apply again to come back.", 'Stop'))) return;
    await supabase.from('profiles').update({ is_tutor: false, tutor_status: 'none' }).eq('id', me.id);
    await refreshProfile();
    router.back();
  };

  return (
    <Screen
      back={!setup}
      title={approved ? 'Tutor profile' : 'Become a tutor'}
      footer={
        <>
          <Button
            title={approved ? 'Save' : me.tutor_status === 'pending' ? 'Update application' : 'Submit application'}
            onPress={save}
            loading={saving}
          />
          {setup && <Button title="Skip for now" variant="ghost" onPress={leave} />}
        </>
      }
    >
      <Row>
        <Text variant="label">Status:</Text>
        <Badge label={STATUS[me.tutor_status].label} tone={STATUS[me.tutor_status].tone} />
      </Row>
      {me.tutor_status === 'rejected' && !!me.rejection_note && (
        <Card style={{ backgroundColor: colors.dangerSoft, borderColor: colors.dangerSoft }}>
          <Text style={{ color: colors.danger }}>{me.rejection_note}</Text>
        </Card>
      )}
      <Text variant="muted">
        Tutoring on PASA is online, through Zoom, Google Meet or MS Teams. Students pay through PASA and you get your full rate.
      </Text>
      <Select label="Subjects you can teach" options={SUBJECTS} value={subjects} onChange={setSubjects} multiple icon="book-outline" />
      <Field
        label={`Rate per hour (minimum ${peso(settings.min_tutor_rate)})`}
        placeholder={String(settings.min_tutor_rate)}
        value={rate}
        onChangeText={(v) => setRate(v.replace(/\D/g, ''))}
        keyboardType="number-pad"
        icon="cash-outline"
      />
      <Field label="About you as a tutor" placeholder="Grades, awards, how you teach, when you're free…" value={about} onChangeText={setAbout} multiline maxLength={400} />
      {!approved && (
        <>
          <DocUpload label="CV / Resume" hint="Photo or PDF" file={cv} onPick={setCv} uploaded={!!me.cv_doc_path} />
          <Text variant="muted" style={{ fontSize: 12.5 }}>
            Your school ID and COR from verification are included in your application.
          </Text>
        </>
      )}
      {approved && !setup && <Button title="Stop tutoring" variant="danger" onPress={stop} />}
    </Screen>
  );
}
