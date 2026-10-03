import { router } from 'expo-router';
import { useState } from 'react';
import { PhotoPicker } from '@/components/PhotoPicker';
import { Screen } from '@/components/Screen';
import { Select } from '@/components/Select';
import { Button, ChipSelect, Field } from '@/components/ui';
import { PROGRAMS, YEAR_LEVELS } from '@/config';
import { notify } from '@/lib/actions';
import { useMe } from '@/lib/auth';
import { yearLabel } from '@/lib/format';
import { checkText } from '@/lib/moderation';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';
import { uploadImage, type Picked } from '@/lib/upload';

export default function EditProfile() {
  const { me, refreshProfile } = useMe();
  const [first, setFirst] = useState(me.first_name);
  const [last, setLast] = useState(me.last_name);
  const [program, setProgram] = useState<string | null>(me.program);
  const [year, setYear] = useState<number | null>(me.year_level);
  const [bio, setBio] = useState(me.bio);
  const [photo, setPhoto] = useState<Picked | string | null>(me.avatar_url);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  // The photo uploads as soon as it's picked, so any problem shows up right away.
  const changePhoto = async (next: Picked | null) => {
    const previous = photo;
    setPhoto(next);
    setUploading(true);
    try {
      const avatar_url = next ? await uploadImage(next, me.id) : null;
      const { error } = await supabase.from('profiles').update({ avatar_url }).eq('id', me.id);
      if (error) throw error;
      setPhoto(avatar_url);
      await refreshProfile();
      toast(next ? 'Profile photo updated' : 'Profile photo removed');
    } catch (e) {
      setPhoto(previous);
      toast((e as Error).message, 'error');
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!first.trim() || !last.trim()) return notify('Name is required');
    const check = checkText(bio);
    if (!check.ok) return notify('Please edit your bio', check.reason);
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ first_name: first.trim(), last_name: last.trim(), program, year_level: year, bio: bio.trim() })
      .eq('id', me.id);
    setSaving(false);
    if (error) return toast(error.message, 'error');
    await refreshProfile();
    toast('Profile saved');
    router.back();
  };

  return (
    <Screen back title="Edit profile" footer={<Button title="Save changes" onPress={save} loading={saving} disabled={uploading} />}>
      <PhotoPicker shape="avatar" value={photo} onChange={changePhoto} uploading={uploading} name={{ first_name: first, last_name: last }} allowRemove />
      <Field label="First name" value={first} onChangeText={setFirst} />
      <Field label="Last name" value={last} onChangeText={setLast} />
      <Select label="Program / Course" options={PROGRAMS} value={program} onChange={setProgram} icon="ribbon-outline" />
      <ChipSelect label="Year level" options={YEAR_LEVELS} value={year} onChange={setYear} format={yearLabel} />
      <Field label="Bio" value={bio} onChangeText={setBio} multiline maxLength={200} />
    </Screen>
  );
}
