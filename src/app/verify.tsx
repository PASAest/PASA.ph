import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { DocUpload } from '@/components/DocUpload';
import { Screen } from '@/components/Screen';
import { Badge, Button, Card, Row, Text } from '@/components/ui';
import { notify } from '@/lib/actions';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';
import { uploadDocument, type Picked } from '@/lib/upload';
import { colors } from '@/theme';

const STATUS = {
  unverified: { label: 'Not verified yet', tone: 'gray' },
  pending: { label: 'Being reviewed', tone: 'yellow' },
  verified: { label: 'Verified', tone: 'green' },
  rejected: { label: 'Needs a new upload', tone: 'red' },
} as const;

// 2a · Verify you're a student: school ID + COR (Certificate of Registration), reviewed by the PASA team
export default function Verify() {
  const { next } = useLocalSearchParams<{ next?: string }>();
  const { profile, session, refreshProfile } = useAuth();
  const [idDoc, setIdDoc] = useState<Picked | null>(null);
  const [cor, setCor] = useState<Picked | null>(null);
  const [saving, setSaving] = useState(false);
  const status = profile?.verification_status ?? 'unverified';
  const done = () => (next === 'setup' ? router.replace('/profile-setup') : router.back());

  const submit = async () => {
    if (!session || !profile) return;
    if (!(idDoc || profile.id_doc_path) || !(cor || profile.cor_doc_path)) return notify('Add both documents', 'We need your school ID and your COR.');
    setSaving(true);
    try {
      const id_doc_path = idDoc ? await uploadDocument(idDoc, session.user.id, 'id') : profile.id_doc_path;
      const cor_doc_path = cor ? await uploadDocument(cor, session.user.id, 'cor') : profile.cor_doc_path;
      const { error } = await supabase.from('profiles').update({ id_doc_path, cor_doc_path, verification_status: 'pending' }).eq('id', session.user.id);
      if (error) throw error;
      await refreshProfile();
      toast('Documents sent. We’ll review them within a day.');
      done();
    } catch (e) {
      notify('Upload failed', (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen
      back={next !== 'setup'}
      title="Verify you're a student"
      footer={
        status === 'verified' ? (
          <Button title="Done" onPress={done} />
        ) : (
          <>
            <Button title="Submit for review" onPress={submit} loading={saving} />
            {next === 'setup' && <Button title="Do this later" variant="ghost" onPress={done} />}
          </>
        )
      }
    >
      <Row>
        <Text variant="label">Status:</Text>
        <Badge label={STATUS[status].label} tone={STATUS[status].tone} />
      </Row>
      {status === 'rejected' && !!profile?.rejection_note && (
        <Card style={{ backgroundColor: colors.dangerSoft, borderColor: colors.dangerSoft }}>
          <Text style={{ color: colors.danger }}>{profile.rejection_note}</Text>
        </Card>
      )}
      {status === 'verified' ? (
        <Card style={{ alignItems: 'center', gap: 8 }}>
          <Ionicons name="shield-checkmark" size={48} color={colors.success} />
          <Text variant="title">You're a verified student</Text>
          <Text variant="muted" style={{ textAlign: 'center' }}>
            You can book tutors, buy, rent and sell on PASA.
          </Text>
        </Card>
      ) : (
        <>
          <Text variant="muted">
            PASA is only for enrolled college students in Santa Rosa. Upload clear photos or PDFs. Only the PASA team can see them.
          </Text>
          <DocUpload label="School ID" hint="Front of your current school ID" file={idDoc} onPick={setIdDoc} uploaded={!!profile?.id_doc_path} />
          <DocUpload label="COR" hint="Certificate of Registration for this term" file={cor} onPick={setCor} uploaded={!!profile?.cor_doc_path} />
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
            <Ionicons name="lock-closed-outline" size={16} color={colors.muted} />
            <Text variant="muted" style={{ flex: 1, fontSize: 12.5 }}>
              Stored privately and used only to verify your enrollment, under the Data Privacy Act of 2012.
            </Text>
          </View>
        </>
      )}
    </Screen>
  );
}
