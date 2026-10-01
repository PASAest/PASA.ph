import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { Button, Card, ChipSelect, Field, Row, Text } from '@/components/ui';
import { CAMPUS_SPOTS } from '@/config';
import { notify } from '@/lib/actions';
import { useMe } from '@/lib/auth';
import { checkListing } from '@/lib/moderation';
import { supabase } from '@/lib/supabase';
import type { Listing } from '@/lib/types';
import { pickImage, uploadImage } from '@/lib/upload';
import { colors, radius } from '@/theme';

const CATEGORIES = ['book', 'calculator'] as const;
const MODES = ['sale', 'rent'] as const;
const CONDITIONS = ['Like new', 'Good', 'Fair', 'Well-loved'];

// 3.1a · Create or edit a listing (books and calculators only)
export default function ListingForm() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { me } = useMe();
  const [category, setCategory] = useState<'book' | 'calculator'>('book');
  const [mode, setMode] = useState<'sale' | 'rent'>('sale');
  const [condition, setCondition] = useState<string>('Good');
  const [spot, setSpot] = useState<string>(CAMPUS_SPOTS[0]);
  const [form, setForm] = useState({ title: '', author: '', description: '', price: '', deposit: '' });
  const [photo, setPhoto] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const digits = (k: 'price' | 'deposit') => (v: string) => set(k)(v.replace(/\D/g, ''));

  useEffect(() => {
    if (!id) return;
    supabase.from('listings').select('*').eq('id', id).single().then(({ data }) => {
      const l = data as Listing;
      if (!l) return;
      setCategory(l.category);
      setMode(l.mode);
      setCondition(l.condition);
      setSpot(l.meetup_spot || CAMPUS_SPOTS[0]);
      setPhoto(l.photo_url);
      setForm({ title: l.title, author: l.book_author, description: l.description, price: String(l.price), deposit: String(l.deposit || '') });
    });
  }, [id]);

  const submit = async () => {
    if (!form.title.trim()) return notify('Add a title');
    if (!form.price || Number(form.price) <= 0) return notify('Add a price');
    const check = checkListing(form.title, form.description);
    if (!check.ok) return notify('This item can’t be listed', check.reason);
    setSaving(true);
    try {
      const photo_url = photo && !photo.startsWith('http') ? await uploadImage(photo, me.id) : photo;
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
        meetup_spot: spot,
      };
      const { error } = id ? await supabase.from('listings').update(row).eq('id', id) : await supabase.from('listings').insert(row);
      if (error) throw error;
      router.back();
    } catch (e) {
      notify('Could not save', (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen back title={id ? 'Edit listing' : 'List an item'} footer={<Button title={id ? 'Save changes' : 'Publish listing'} onPress={submit} loading={saving} />}>
      <Card style={{ backgroundColor: colors.brandSoft, borderColor: colors.brandSoft }}>
        <Row style={{ alignItems: 'flex-start' }}>
          <Ionicons name="information-circle" size={20} color={colors.primaryDark} />
          <Text style={{ flex: 1, color: colors.primaryDark, fontSize: 13.5 }}>
            Only books and calculators can be listed. No answer keys, exercises, practice sets, quizzes or reviewers.
          </Text>
        </Row>
      </Card>
      <Pressable onPress={async () => setPhoto((await pickImage([4, 3])) ?? photo)}>
        {photo ? (
          <Image source={{ uri: photo }} style={{ width: '100%', height: 200, borderRadius: radius.md }} />
        ) : (
          <View style={{ height: 160, borderRadius: radius.md, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.brand, alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.white }}>
            <Ionicons name="camera-outline" size={32} color={colors.primary} />
            <Text style={{ color: colors.primary }}>Add a photo</Text>
          </View>
        )}
      </Pressable>
      <ChipSelect label="Category" options={CATEGORIES} value={category} onChange={setCategory} format={(c) => (c === 'book' ? 'Book' : 'Calculator')} />
      <ChipSelect label="Sell or rent out?" options={MODES} value={mode} onChange={setMode} format={(m) => (m === 'sale' ? 'For sale' : 'For rent')} />
      <Field label="Title" placeholder={category === 'book' ? 'Advanced Algebra, 4th Ed.' : 'Casio fx-991ES Plus'} value={form.title} onChangeText={set('title')} />
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
      <ChipSelect label="Meetup spot" options={CAMPUS_SPOTS} value={spot} onChange={setSpot} />
      <Field label="Description" placeholder="Edition, highlights or notes inside, what's included…" value={form.description} onChangeText={set('description')} multiline />
    </Screen>
  );
}
