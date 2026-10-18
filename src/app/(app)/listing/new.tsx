import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { PhotoPicker } from '@/components/PhotoPicker';
import { Screen } from '@/components/Screen';
import { SelectField } from '@/components/SelectField';
import { Button, Card, Field, type IconName, Row, Text } from '@/components/ui';
import { CATEGORIES, categoryOf, DELIVERY_NOTE, type CategoryKey } from '@/config';
import { notify } from '@/lib/actions';
import { requireVerified, useMe } from '@/lib/auth';
import { checkListing } from '@/lib/moderation';
import { supabase } from '@/lib/supabase';
import type { Listing } from '@/lib/types';
import { toast } from '@/lib/toast';
import { uploadImage, type Picked } from '@/lib/upload';
import { colors } from '@/theme';

const CONDITIONS = [
  { value: 'Brand new', label: 'Brand new', hint: 'Unused, still sealed or in its box' },
  { value: 'Like new', label: 'Like new', hint: 'Used briefly, no visible wear' },
  { value: 'Good', label: 'Good', hint: 'Normal use, minor marks' },
  { value: 'Fair', label: 'Fair', hint: 'Visible wear, works fine' },
  { value: 'Well-loved', label: 'Well-loved', hint: 'Heavily used, priced to match' },
];

// 3.1a · Create or edit a listing (academic items). Photos and flagged listings wait for admin approval.
export default function ListingForm() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { me } = useMe();
  const [category, setCategory] = useState<CategoryKey>('book');
  const [condition, setCondition] = useState<string>('Good');
  const [form, setForm] = useState({ title: '', author: '', description: '', price: '' });
  const [photo, setPhoto] = useState<Picked | null>(null);
  const [existingPhoto, setExistingPhoto] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const digits = (k: 'price') => (v: string) => set(k)(v.replace(/\D/g, ''));

  useEffect(() => {
    if (!id) return;
    supabase.from('listings').select('*').eq('id', id).single().then(({ data }) => {
      const l = data as Listing;
      if (!l) return;
      setCategory(categoryOf(l.category).key);
      setCondition(l.condition);
      setExistingPhoto(l.photo_url);
      setForm({ title: l.title, author: l.book_author, description: l.description, price: String(l.price) });
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
      let photo_url = existingPhoto;
      if (photo) {
        setUploading(true);
        photo_url = await uploadImage(photo, me.id);
        setUploading(false);
      }
      const row = {
        seller_id: me.id,
        category,
        mode: 'sale',
        title: form.title.trim(),
        book_author: category === 'book' ? form.author.trim() : '',
        description: form.description.trim(),
        condition,
        price: Number(form.price),
        deposit: 0,
        photo_url,
        // Photos and possible answer keys / quizzes go to the admin first (the database enforces the photo rule too).
        ...(check.needsReview || photo ? { status: 'pending_review', review_note: check.needsReview ?? '' } : {}),
      };
      const { data, error } = id
        ? await supabase.from('listings').update(row).eq('id', id).select('status').single()
        : await supabase.from('listings').insert(row).select('status').single();
      if (error) throw error;
      if (data?.status === 'pending_review') {
        notify(
          'Sent for approval',
          'Listings with photos are checked by the PASA team first, to keep answer keys and quizzes off PASA. You can see it under My listings on your profile, and you\'ll get a notification when it\'s live in Assets.',
        );
      } else {
        toast(id ? 'Listing updated' : 'Listing published');
      }
      router.back();
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  return (
    <Screen back title={id ? 'Edit listing' : 'List an item'} footer={<Button title={uploading ? 'Uploading photo…' : id ? 'Save changes' : 'Publish listing'} onPress={submit} loading={saving} />}>
      <Card style={{ backgroundColor: colors.brandSoft, borderColor: colors.brandSoft }}>
        <Row style={{ alignItems: 'flex-start' }}>
          <Ionicons name="information-circle" size={20} color={colors.primaryDark} />
          <Text style={{ flex: 1, color: colors.primaryDark, fontSize: 13.5 }}>
            Academic items only. Materials with answer keys, exercises, practice sets or quizzes need admin approval, and so do listings with photos.
          </Text>
        </Row>
      </Card>
      <PhotoPicker
        value={photo ?? existingPhoto}
        onChange={(p) => {
          setPhoto(p);
          if (!p) setExistingPhoto(null);
        }}
        uploading={uploading}
        allowRemove
      />
      <SelectField
        label="Category"
        value={category}
        onChange={setCategory}
        options={CATEGORIES.map((c) => ({ value: c.key, label: categoryOf(c.key).label, icon: `${c.icon}-outline` as IconName }))}
      />
      <Field label="Title" placeholder={category === 'book' ? 'Advanced Algebra, 4th Ed.' : category === 'calculator' ? 'Casio fx-991ES Plus' : 'e.g. Lab gown, medium'} value={form.title} onChangeText={set('title')} />
      {category === 'book' && <Field label="Author" placeholder="e.g. Valix, Peralta" value={form.author} onChangeText={set('author')} />}
      <Field label="Price" placeholder="₱" value={form.price} onChangeText={digits('price')} keyboardType="number-pad" />
      <SelectField label="Condition" icon="sparkles-outline" value={condition} onChange={setCondition} options={CONDITIONS} />
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
