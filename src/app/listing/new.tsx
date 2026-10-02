import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { Button, Card, ChipSelect, Field, Row, Text } from '@/components/ui';
import { CATEGORIES, categoryOf, DELIVERY_NOTE, type CategoryKey } from '@/config';
import { notify } from '@/lib/actions';
import { requireVerified, useMe } from '@/lib/auth';
import { checkListing } from '@/lib/moderation';
import { supabase } from '@/lib/supabase';
import type { Listing } from '@/lib/types';
import { pickMedia, uploadImage, type Picked } from '@/lib/upload';
import { colors, radius } from '@/theme';

const MODES = ['sale', 'rent'] as const;
const CONDITIONS = ['Brand new', 'Like new', 'Good', 'Fair', 'Well-loved'];

// 3.1a · Create or edit a listing (academic items). Photos and flagged listings wait for admin approval.
export default function ListingForm() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { me } = useMe();
  const [category, setCategory] = useState<CategoryKey>('book');
  const [mode, setMode] = useState<'sale' | 'rent'>('sale');
  const [condition, setCondition] = useState<string>('Good');
  const [form, setForm] = useState({ title: '', author: '', description: '', price: '', deposit: '' });
  const [photo, setPhoto] = useState<Picked | null>(null);
  const [existingPhoto, setExistingPhoto] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const digits = (k: 'price' | 'deposit') => (v: string) => set(k)(v.replace(/\D/g, ''));

  useEffect(() => {
    if (!id) return;
    supabase.from('listings').select('*').eq('id', id).single().then(({ data }) => {
      const l = data as Listing;
      if (!l) return;
      setCategory(categoryOf(l.category).key);
      setMode(l.mode);
      setCondition(l.condition);
      setExistingPhoto(l.photo_url);
      setForm({ title: l.title, author: l.book_author, description: l.description, price: String(l.price), deposit: String(l.deposit || '') });
    });
  }, [id]);

  const submit = async () => {
    if (!requireVerified(me)) return;
    if (!form.title.trim()) return notify('Add a title');
    if (!form.price || Number(form.price) <= 0) return notify('Add a price');
    const check = checkListing(form.title, form.description);
    if (!check.ok) return notify('This item can’t be listed', check.reason);
    setSaving(true);
    try {
      const photo_url = photo ? await uploadImage(photo.uri, me.id, photo.mimeType) : existingPhoto;
      const row = {
        seller_id: me.id,
        category,
        mode,
        title: form.title.trim(),
        book_author: category === 'book' ? form.author.trim() : '',
        description: form.description.trim(),
        condition,
        price: Number(form.price),
        deposit: mode === 'rent' ? Number(form.deposit || 0) : 0,
        photo_url,
        // Photos and possible answer keys / quizzes go to the admin first (the database enforces the photo rule too).
        ...(check.needsReview || photo ? { status: 'pending_review', review_note: check.needsReview ?? '' } : {}),
      };
      const { data, error } = id
        ? await supabase.from('listings').update(row).eq('id', id).select('status').single()
        : await supabase.from('listings').insert(row).select('status').single();
      if (error) throw error;
      if (data?.status === 'pending_review') {
        notify('Sent for approval', 'The PASA team checks listings with photos to keep answer keys, exercises and quizzes off PASA. You\'ll be notified when it\'s live.');
      }
      router.back();
    } catch (e) {
      notify('Could not save', (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const shownPhoto = photo?.uri ?? existingPhoto;

  return (
    <Screen back title={id ? 'Edit listing' : 'List an item'} footer={<Button title={id ? 'Save changes' : 'Publish listing'} onPress={submit} loading={saving} />}>
      <Card style={{ backgroundColor: colors.brandSoft, borderColor: colors.brandSoft }}>
        <Row style={{ alignItems: 'flex-start' }}>
          <Ionicons name="information-circle" size={20} color={colors.primaryDark} />
          <Text style={{ flex: 1, color: colors.primaryDark, fontSize: 13.5 }}>
            Academic items only. Materials with answer keys, exercises, practice sets or quizzes need admin approval, and so do listings with photos.
          </Text>
        </Row>
      </Card>
      <Pressable onPress={async () => setPhoto((await pickMedia({ aspect: [4, 3] })) ?? photo)}>
        {shownPhoto ? (
          <Image source={{ uri: shownPhoto }} style={{ width: '100%', height: 200, borderRadius: radius.md }} />
        ) : (
          <View style={{ height: 160, borderRadius: radius.md, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.brand, alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.surface }}>
            <Ionicons name="camera-outline" size={32} color={colors.primary} />
            <Text style={{ color: colors.primary }}>Add a photo</Text>
          </View>
        )}
      </Pressable>
      <ChipSelect label="Category" options={CATEGORIES.map((c) => c.key)} value={category} onChange={setCategory} format={(k) => categoryOf(k).label} />
      <ChipSelect label="Sell or rent out?" options={MODES} value={mode} onChange={setMode} format={(m) => (m === 'sale' ? 'For sale' : 'For rent')} />
      <Field label="Title" placeholder={category === 'book' ? 'Advanced Algebra, 4th Ed.' : category === 'calculator' ? 'Casio fx-991ES Plus' : 'e.g. Lab gown, medium'} value={form.title} onChangeText={set('title')} />
      {category === 'book' && <Field label="Author" placeholder="e.g. Valix, Peralta" value={form.author} onChangeText={set('author')} />}
      <Row gap={12} style={{ alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Field label={mode === 'rent' ? 'Rent per week' : 'Price'} placeholder="₱" value={form.price} onChangeText={digits('price')} keyboardType="number-pad" />
        </View>
        {mode === 'rent' && (
          <View style={{ flex: 1 }}>
            <Field label="Deposit (refundable)" placeholder="₱" value={form.deposit} onChangeText={digits('deposit')} keyboardType="number-pad" />
          </View>
        )}
      </Row>
      <ChipSelect label="Condition" options={CONDITIONS} value={condition} onChange={setCondition} />
      <Field label="Description" placeholder="Edition, size, what's included, any marks or wear…" value={form.description} onChangeText={set('description')} multiline />
      <Row style={{ alignItems: 'flex-start' }}>
        <Ionicons name="cube-outline" size={18} color={colors.muted} />
        <Text variant="muted" style={{ flex: 1 }}>
          {DELIVERY_NOTE}
        </Text>
      </Row>
    </Screen>
  );
}
