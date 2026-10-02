import { router } from 'expo-router';
import { useState } from 'react';
import { Image, Linking, ScrollView, View } from 'react-native';
import { AdminPage } from '@/components/admin/AdminShell';
import { ListingPhoto } from '@/components/ListingCard';
import { Avatar, Badge, Button, Card, Chip, Empty, Loading, Row, Text } from '@/components/ui';
import { categoryOf } from '@/config';
import { confirm, notify } from '@/lib/actions';
import { ask } from '@/lib/admin';
import { dateTime, fullName, peso, yearLabel } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import type { Listing, Profile } from '@/lib/types';
import { signedUrls } from '@/lib/upload';
import { useFocusLoad } from '@/lib/useFocusLoad';
import { colors, font, space } from '@/theme';

type Tab = 'students' | 'tutors' | 'listings';

// /admin/approvals · Verify students (ID + COR), approve tutors (+ CV), approve listings with photos or flagged words
export default function Approvals() {
  const [tab, setTab] = useState<Tab>('students');
  const [students, setStudents] = useState<Profile[] | null>(null);
  const [tutors, setTutors] = useState<Profile[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [docs, setDocs] = useState<Record<string, string>>({});

  const load = async () => {
    const [s, t, l] = await Promise.all([
      supabase.from('profiles').select('*').eq('verification_status', 'pending').order('created_at'),
      supabase.from('profiles').select('*').eq('tutor_status', 'pending').order('created_at'),
      supabase.from('listings').select('*, seller:profiles!listings_seller_id_fkey(*)').eq('status', 'pending_review').order('created_at'),
    ]);
    const people = [...((s.data as Profile[]) ?? []), ...((t.data as Profile[]) ?? [])];
    const paths = people.flatMap((p) => [p.id_doc_path, p.cor_doc_path, p.cv_doc_path]).filter((x): x is string => !!x);
    setDocs(await signedUrls('documents', [...new Set(paths)]));
    setStudents((s.data as Profile[]) ?? []);
    setTutors((t.data as Profile[]) ?? []);
    setListings((l.data as Listing[]) ?? []);
  };
  useFocusLoad(load);

  const review = async (table: 'profiles' | 'listings', id: string, values: Record<string, unknown>) => {
    const { error } = await supabase.from(table).update(values).eq('id', id);
    if (error) return notify('Could not save', error.message);
    load();
  };

  const reject = async (what: string, onReason: (reason: string) => void, fallback: string) => {
    const reason = await ask(`Reject ${what}? Tell them why:`, fallback);
    if (reason != null) onReason(reason);
  };

  if (!students) return <Loading />;

  const docLinks = (p: Profile, withCv = false) => (
    <Row style={{ flexWrap: 'wrap' }} gap={8}>
      <DocLink label="School ID" url={p.id_doc_path ? docs[p.id_doc_path] : undefined} />
      <DocLink label="COR" url={p.cor_doc_path ? docs[p.cor_doc_path] : undefined} />
      {withCv && <DocLink label="CV" url={p.cv_doc_path ? docs[p.cv_doc_path] : undefined} />}
    </Row>
  );

  return (
    <AdminPage title="Approvals" subtitle="Students waiting for verification, tutor applications, and listings that need a check.">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        <Chip label={`Students (${students.length})`} icon="id-card-outline" selected={tab === 'students'} onPress={() => setTab('students')} />
        <Chip label={`Tutors (${tutors.length})`} icon="school-outline" selected={tab === 'tutors'} onPress={() => setTab('tutors')} />
        <Chip label={`Listings (${listings.length})`} icon="library-outline" selected={tab === 'listings'} onPress={() => setTab('listings')} />
      </ScrollView>

      {tab === 'students' &&
        (students.length === 0 ? (
          <Empty icon="checkmark-done-outline" title="No students waiting" />
        ) : (
          students.map((p) => (
            <Card key={p.id} style={{ gap: space(3) }}>
              <PersonHeader p={p} />
              {docLinks(p)}
              <DocPreviews urls={[p.id_doc_path, p.cor_doc_path].map((x) => (x ? docs[x] : undefined))} />
              <Row style={{ flexWrap: 'wrap' }}>
                <Button title="Verify student" small icon="checkmark" onPress={() => review('profiles', p.id, { verification_status: 'verified', rejection_note: '' })} />
                <Button
                  title="Reject"
                  small
                  variant="danger"
                  onPress={() =>
                    reject(`${p.first_name}'s documents`, (note) => review('profiles', p.id, { verification_status: 'rejected', rejection_note: note }), 'Your ID or COR is unclear or not for the current term. Please upload new photos.')
                  }
                />
              </Row>
            </Card>
          ))
        ))}

      {tab === 'tutors' &&
        (tutors.length === 0 ? (
          <Empty icon="checkmark-done-outline" title="No tutor applications" />
        ) : (
          tutors.map((p) => (
            <Card key={p.id} style={{ gap: space(3) }}>
              <PersonHeader p={p} />
              <Row style={{ flexWrap: 'wrap' }} gap={6}>
                {p.tutor_subjects.map((s) => (
                  <Badge key={s} label={s} tone="blue" />
                ))}
              </Row>
              <Text>
                <Text style={{ fontFamily: font.bold }}>{peso(p.tutor_rate)}/hr</Text> ·{' '}
                {(p.tutor_modes ?? []).map((m) => (m === 'online' ? 'Online' : 'In person')).join(' / ')}
              </Text>
              {!!p.tutor_about && <Text variant="muted">{p.tutor_about}</Text>}
              {docLinks(p, true)}
              {p.verification_status !== 'verified' && <Text style={{ color: colors.warning }}>⚠ Not a verified student yet. Verify their ID and COR first.</Text>}
              <Row style={{ flexWrap: 'wrap' }}>
                <Button title="Approve tutor" small icon="checkmark" onPress={() => review('profiles', p.id, { tutor_status: 'approved', is_tutor: true, rejection_note: '' })} />
                <Button
                  title="Reject"
                  small
                  variant="danger"
                  onPress={() =>
                    reject(`${p.first_name}'s tutor application`, (note) => review('profiles', p.id, { tutor_status: 'rejected', is_tutor: false, rejection_note: note }), 'Please upload a complete CV with your relevant grades or experience.')
                  }
                />
              </Row>
            </Card>
          ))
        ))}

      {tab === 'listings' &&
        (listings.length === 0 ? (
          <Empty icon="checkmark-done-outline" title="No listings waiting" />
        ) : (
          listings.map((l) => (
            <Card key={l.id} style={{ gap: space(3) }}>
              <View style={{ flexDirection: 'row', gap: space(3), flexWrap: 'wrap' }}>
                <View style={{ width: 220, borderRadius: 12, overflow: 'hidden' }}>
                  <ListingPhoto listing={l} height={165} />
                </View>
                <View style={{ flex: 1, minWidth: 220, gap: 4 }}>
                  <Text variant="title">{l.title}</Text>
                  <Text variant="muted">
                    {categoryOf(l.category).label} · {l.mode === 'rent' ? `${peso(l.price)}/week` : peso(l.price)} · by {fullName(l.seller)}
                  </Text>
                  {!!l.description && <Text>{l.description}</Text>}
                  {!!l.review_note && <Badge label={`Flagged: ${l.review_note}`} tone="yellow" icon="warning" />}
                  <Text variant="muted" style={{ fontSize: 12 }}>
                    Submitted {dateTime(l.created_at)}
                  </Text>
                </View>
              </View>
              <Text variant="muted" style={{ fontSize: 12.5 }}>
                Check the photo and text: no answer keys, filled-in exercises, practice sets or quizzes.
              </Text>
              <Row style={{ flexWrap: 'wrap' }}>
                <Button title="Approve" small icon="checkmark" onPress={() => review('listings', l.id, { status: 'available', review_note: '' })} />
                <Button
                  title="Reject"
                  small
                  variant="danger"
                  onPress={() => reject(`"${l.title}"`, (note) => review('listings', l.id, { status: 'rejected', review_note: note }), 'Answer keys, exercises, practice sets and quizzes can\'t be sold on PASA.')}
                />
                <Button
                  title="Delete"
                  small
                  variant="ghost"
                  onPress={async () => {
                    if (!(await confirm('Delete this listing?', 'It will be removed for good.', 'Delete'))) return;
                    await supabase.from('listings').delete().eq('id', l.id);
                    load();
                  }}
                />
                <Button title="View" small variant="outline" onPress={() => router.push(`/listing/${l.id}`)} />
              </Row>
            </Card>
          ))
        ))}
    </AdminPage>
  );
}

function PersonHeader({ p }: { p: Profile }) {
  return (
    <Row gap={12}>
      <Avatar profile={p} size={44} />
      <View style={{ flex: 1 }}>
        <Text variant="title">{fullName(p)}</Text>
        <Text variant="muted">
          {p.school} · {p.program} · {yearLabel(p.year_level)}
        </Text>
      </View>
      <Button title="Profile" small variant="ghost" onPress={() => router.push(`/user/${p.id}`)} />
    </Row>
  );
}

function DocLink({ label, url }: { label: string; url?: string }) {
  if (!url) return <Badge label={`${label}: missing`} tone="red" />;
  return <Button title={`Open ${label}`} small variant="outline" icon="document-text-outline" onPress={() => Linking.openURL(url)} />;
}

/** Inline thumbnails of image documents (PDFs open via the buttons). */
function DocPreviews({ urls }: { urls: (string | undefined)[] }) {
  const images = urls.filter((u): u is string => !!u && !/\.pdf(\?|$)/i.test(u));
  if (!images.length) return null;
  return (
    <Row style={{ flexWrap: 'wrap' }} gap={10}>
      {images.map((u) => (
        <Image key={u} source={{ uri: u }} style={{ width: 200, height: 130, borderRadius: 10, backgroundColor: colors.bg }} resizeMode="contain" />
      ))}
    </Row>
  );
}
