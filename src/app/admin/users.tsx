import { router } from 'expo-router';
import { useState } from 'react';
import { AdminPage } from '@/components/admin/AdminShell';
import { DataTable, SearchBox } from '@/components/admin/widgets';
import { Avatar, Badge, Button, Loading, Row, Text } from '@/components/ui';
import { FilterDropdown } from '@/components/FilterDropdown';
import { confirm, notify } from '@/lib/actions';
import { ask, banUser, exportCsv, unbanUser, type AdminUser } from '@/lib/admin';
import { useAuth } from '@/lib/auth';
import { shortDate, timeAgo, yearLabel } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { useFocusLoad } from '@/lib/useFocusLoad';
import { font } from '@/theme';

type Filter = 'all' | 'tutors' | 'plus' | 'banned';

// /admin/users · Everyone on PASA, with ban/unban
export default function Users() {
  const { session } = useAuth();
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const load = async () => {
    const { data, error } = await supabase.rpc('admin_list_users');
    if (error) notify('Could not load users', error.message);
    setUsers((data as AdminUser[]) ?? []);
  };
  useFocusLoad(load);

  const ban = async (u: AdminUser) => {
    if (!session) return;
    const reason = await ask(`Ban ${u.first_name} ${u.last_name}? Reason:`, 'Broke the community rules');
    if (reason == null) return;
    const { error } = await banUser(u.id, reason, session.user.id);
    if (error) return notify('Could not ban', error.message);
    load();
  };

  const unban = async (u: AdminUser) => {
    if (!(await confirm(`Unban ${u.first_name}?`, 'They will be able to use PASA again.', 'Unban'))) return;
    const { error } = await unbanUser(u.id);
    if (error) return notify('Could not unban', error.message);
    load();
  };

  if (!users) return <Loading />;
  const now = new Date();
  const q = search.trim().toLowerCase();
  const shown = users.filter((u) => {
    if (filter === 'tutors' && !u.is_tutor) return false;
    if (filter === 'plus' && !(u.plus_until && new Date(u.plus_until) > now)) return false;
    if (filter === 'banned' && !u.banned) return false;
    return !q || `${u.first_name} ${u.last_name} ${u.email} ${u.program} ${u.school}`.toLowerCase().includes(q);
  });

  const counts = {
    all: users.length,
    tutors: users.filter((u) => u.is_tutor).length,
    plus: users.filter((u) => u.plus_until && new Date(u.plus_until) > now).length,
    banned: users.filter((u) => u.banned).length,
  };

  return (
    <AdminPage
      title="Users"
      subtitle={`${users.length} accounts`}
      actions={
        <Button
          title="Export CSV"
          small
          variant="outline"
          icon="download-outline"
          onPress={() =>
            exportCsv(
              'pasa-users.csv',
              shown.map((u) => ({
                name: `${u.first_name} ${u.last_name}`,
                email: u.email,
                school: u.school,
                program: u.program,
                verification: u.verification_status,
                year: u.year_level,
                tutor: u.is_tutor ? 'yes' : 'no',
                joined: u.created_at,
                banned: u.banned ? 'yes' : 'no',
              })),
            )
          }
        />
      }
    >
      <Row style={{ flexWrap: 'wrap' }} gap={12}>
        <SearchBox value={search} onChange={setSearch} placeholder="Search name, email or program" />
        <FilterDropdown
          title="Show"
          icon="people-outline"
          value={filter}
          allValue="all"
          onChange={setFilter}
          options={(['all', 'tutors', 'plus', 'banned'] as Filter[]).map((f) => ({
            value: f,
            label: f === 'all' ? 'All users' : f === 'plus' ? 'PASA Plus' : f[0].toUpperCase() + f.slice(1),
            count: counts[f],
          }))}
        />
      </Row>
      <DataTable
        rows={shown}
        rowKey={(u) => u.id}
        empty="No users match."
        columns={[
          {
            key: 'name',
            label: 'Student',
            flex: 2,
            render: (u) => (
              <Row gap={10}>
                <Avatar profile={{ first_name: u.first_name, last_name: u.last_name, avatar_url: null }} size={34} />
                <Text style={{ flex: 1 }}>
                  <Text style={{ fontFamily: font.bold }}>
                    {u.first_name} {u.last_name}
                  </Text>
                  {'\n'}
                  <Text variant="muted" style={{ fontSize: 12.5 }}>
                    {u.email}
                  </Text>
                </Text>
              </Row>
            ),
          },
          { key: 'program', label: 'School · program', flex: 1.8, render: (u) => <Text variant="muted">{`${u.school}\n${u.program} · ${yearLabel(u.year_level)}`}</Text> },
          {
            key: 'tags',
            label: 'Tags',
            flex: 1.2,
            render: (u) => (
              <Row gap={4} style={{ flexWrap: 'wrap' }}>
                {u.is_admin && <Badge label="Admin" tone="blue" />}
                {u.verification_status === 'verified' && <Badge label="Verified" tone="green" />}
                {u.verification_status === 'pending' && <Badge label="To verify" tone="yellow" />}
                {u.tutor_status === 'pending' && <Badge label="Tutor applicant" tone="yellow" />}
                {u.is_tutor && <Badge label="Tutor" tone="green" />}
                {u.plus_until && new Date(u.plus_until) > now && <Badge label="Plus" tone="yellow" />}
                {u.banned && <Badge label="Banned" tone="red" />}
              </Row>
            ),
          },
          {
            key: 'activity',
            label: 'Joined · last seen',
            flex: 1.2,
            render: (u) => <Text variant="muted">{`${shortDate(u.created_at)} · ${u.last_sign_in_at ? timeAgo(u.last_sign_in_at) : 'never'}`}</Text>,
          },
          {
            key: 'actions',
            label: '',
            width: 190,
            render: (u) => (
              <Row gap={6}>
                <Button title="View" small variant="outline" onPress={() => router.push(`/user/${u.id}`)} />
                {u.is_admin ? null : u.banned ? (
                  <Button title="Unban" small variant="soft" onPress={() => unban(u)} />
                ) : (
                  <Button title="Ban" small variant="danger" onPress={() => ban(u)} />
                )}
              </Row>
            ),
          },
        ]}
      />
    </AdminPage>
  );
}
