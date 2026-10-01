import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable } from 'react-native';
import { Screen } from '@/components/Screen';
import { Avatar, Button, ChipSelect, Field, Text } from '@/components/ui';
import { PROGRAMS, YEAR_LEVELS } from '@/config';
import { notify } from '@/lib/actions';
import { useMe } from '@/lib/auth';
import { yearLabel } from '@/lib/format';
import { checkText } from '@/lib/moderation';
import { supabase } from '@/lib/supabase';
import { pickImage, uploadImage } from '@/lib/upload';
import { colors } from '@/theme';

export default function EditProfile() {
  const { me, refreshProfile } = useMe();
  const [first, setFirst] = useState(me.first_name);
  const [last, setLast] = useState(me.last_name);
  const [program, setProgram] = useState<string | null>(me.program);
  const [year, setYear] = useState<number | null>(me.year_level);
  const [bio, setBio] = useState(me.bio);
  const [photo, setPhoto] = useState<string | null>(me.avatar_url);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!first.trim() || !last.trim()) return notify('Name is required');
    const check = checkText(bio);
    if (!check.ok) return notify('Please edit your bio', check.reason);
    setSaving(true);
    try {
      const avatar_url = photo && !photo.startsWith('http') ? await uploadImage(photo, me.id) : photo;
      const { error } = await supabase
        .from('profiles')
        .update({ first_name: first.trim(), last_name: last.trim(), program, year_level: year, bio: bio.trim(), avatar_url })
        .eq('id', me.id);
      if (error) throw error;
      await refreshProfile();
      router.back();
    } catch (e) {
      notify('Could not save', (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen back title="Edit profile" footer={<Button title="Save" onPress={save} loading={saving} />}>
      <Pressable onPress={async () => setPhoto((await pickImage()) ?? photo)} style={{ alignSelf: 'center', alignItems: 'center', gap: 8 }}>
        <Avatar profile={{ first_name: first, last_name: last, avatar_url: photo }} size={100} />
        <Text style={{ color: colors.primary }}>Change photo</Text>
      </Pressable>
      <Field label="First name" value={first} onChangeText={setFirst} />
      <Field label="Last name" value={last} onChangeText={setLast} />
      <ChipSelect label="Program / Course" options={PROGRAMS} value={program} onChange={setProgram} />
      <ChipSelect label="Year level" options={YEAR_LEVELS} value={year} onChange={setYear} format={yearLabel} />
      <Field label="Bio" value={bio} onChangeText={setBio} multiline maxLength={200} />
    </Screen>
  );
}
