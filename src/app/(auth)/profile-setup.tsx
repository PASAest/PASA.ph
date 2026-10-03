import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { PhotoPicker } from '@/components/PhotoPicker';
import { Button, Card, Field, Row, Text } from '@/components/ui';
import { notify } from '@/lib/actions';
import { useAuth } from '@/lib/auth';
import { toast } from '@/lib/toast';
import { uploadImage, type Picked } from '@/lib/upload';
import { supabase } from '@/lib/supabase';
import { colors } from '@/theme';

// 2b · Set up your profile (photo, bio, want to tutor?)
export default function ProfileSetup() {
  const { profile, session, refreshProfile } = useAuth();
  const [photo, setPhoto] = useState<Picked | string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Upload right away so the student sees it worked (or why it didn't) before continuing.
  const changePhoto = async (next: Picked | null) => {
    if (!session) return;
    setPhoto(next);
    if (!next) return;
    setUploading(true);
    try {
      const avatar_url = await uploadImage(next, session.user.id);
      const { error } = await supabase.from('profiles').update({ avatar_url }).eq('id', session.user.id);
      if (error) throw error;
      setPhoto(avatar_url);
      toast('Photo added');
    } catch (e) {
      setPhoto(null);
      toast((e as Error).message, 'error');
    } finally {
      setUploading(false);
    }
  };
  const [bio, setBio] = useState('');
  const [tutor, setTutor] = useState(false);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!session) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('profiles').update({ bio: bio.trim() }).eq('id', session.user.id);
      if (error) throw error;
      await refreshProfile();
      router.replace(tutor ? '/become-tutor?setup=1' : '/(tabs)');
    } catch (e) {
      notify('Could not save', (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen
      title="Set up your profile"
      footer={
        <>
          <Button title="Continue" onPress={save} loading={saving} disabled={uploading} />
          <Button title="Skip for now" variant="ghost" onPress={() => router.replace('/(tabs)')} />
        </>
      }
    >
      <Text variant="h2">Hi, {profile?.first_name || 'there'}! 👋</Text>
      <Text variant="muted">A friendly photo and short bio help classmates trust you.</Text>
      <PhotoPicker shape="avatar" value={photo} onChange={changePhoto} uploading={uploading} name={{ first_name: profile?.first_name ?? '', last_name: profile?.last_name ?? '' }} />
      <Field label="Short bio" placeholder="e.g. Loves numbers, coffee, and helping classmates pass FAR!" value={bio} onChangeText={setBio} multiline maxLength={200} />
      <Pressable onPress={() => setTutor((t) => !t)}>
        <Card style={{ borderColor: tutor ? colors.primary : colors.border, borderWidth: tutor ? 2 : 1 }}>
          <Row gap={12}>
            <Ionicons name={tutor ? 'checkbox' : 'square-outline'} size={24} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text variant="title">I want to tutor</Text>
              <Text variant="muted">Earn by helping other students in subjects you're good at. You can also do this later.</Text>
            </View>
          </Row>
        </Card>
      </Pressable>
    </Screen>
  );
}
