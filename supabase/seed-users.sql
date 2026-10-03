-- Creates the 4 PASA demo users, 1 admin and the 11 group members, all with simple emails.
-- Run in Supabase → SQL Editor → New query → Run (after schema.sql).
-- Safe to re-run: users that already exist are skipped.
--
--   andrea@pasa.test   Andrea Santos   1st year BS Accountancy (student)
--   miguel@pasa.test   Miguel Reyes    3rd year BS Accountancy (tutor)
--   bea@pasa.test      Bea Cruz        4th year BS Computer Science (tutor)
--   carlo@pasa.test    Carlo Mendoza   2nd year BS Business Administration (seller)
--   admin@pasa.test    PASA Admin      admin account for the /admin web panel
--
-- Group members (first name @pasa.test, e.g. april@pasa.test). Programs and year levels are placeholders:
-- edit them below, or in the app under Profile → Edit profile. Michael, Niamh, Geneva and Graziela are tutors.
--
-- Password for all five: replace CHANGE-ME below before running, and put the same value in .env as
-- SEED_PASSWORD (used by scripts/seed.mjs). Never commit the real password: it also unlocks admin@pasa.test.
-- ".test" is a reserved domain, so these addresses can never belong to a real person.
-- Inserting directly skips Supabase's email-domain check, which rejects made-up domains on sign-up.

do $$
declare
  school text := 'PUP Sta Rosa';
  pw text := 'CHANGE-ME';
  u record;
  uid uuid;
begin
  if pw = 'CHANGE-ME' then raise exception 'Set the demo password (pw) at the top of this script first.'; end if;
  for u in
    select * from (values
      ('andrea@pasa.test', 'Andrea', 'Santos',  'BS Accountancy',             1),
      ('miguel@pasa.test', 'Miguel', 'Reyes',   'BS Accountancy',             3),
      ('bea@pasa.test',    'Bea',    'Cruz',    'BS Computer Science',        4),
      ('carlo@pasa.test',  'Carlo',  'Mendoza', 'BS Business Administration', 2),
      ('admin@pasa.test',  'PASA',   'Admin',   'Other',                      1),
      ('april@pasa.test',        'April Jean',         'Abellanosa', 'BS Accountancy',             2),
      ('chaelly@pasa.test',      'Chaelly Anne',       'Capil',      'AB Psychology',              3),
      ('michael@pasa.test',      'Michael Angelo',     'Davila',     'BS Information Technology',  4),
      ('niamh@pasa.test',        'Niamh Rylee',        'De Leon',    'BSEd English',               3),
      ('leejhen@pasa.test',      'Leejhen',            'Fortuno',    'BS Civil Engineering',       2),
      ('mishi@pasa.test',        'Mishi Nicole',       'Leonardo',   'BS Hospitality Management',  1),
      ('geneva@pasa.test',       'Geneva Andrey',      'Reyes',      'BS Accountancy',             4),
      ('karen@pasa.test',        'Karen Joy',          'Riñon',      'BS Nursing',                 3),
      ('janna@pasa.test',        'Miel Janna Shanelle','Sarcia',     'BS Computer Science',        1),
      ('mariekrystel@pasa.test', 'Mariekrystel',       'Senosin',    'BSBA Marketing Management',  2),
      ('graziela@pasa.test',     'Graziela',           'Villanueva', 'BS Mathematics',             4)
    ) as t(email, first_name, last_name, program, year_level)
  loop
    if exists (select 1 from auth.users where email = u.email) then
      raise notice 'skip % (already exists)', u.email;
      continue;
    end if;

    uid := gen_random_uuid();

    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change,
      email_change_token_current, reauthentication_token
    ) values (
      '00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated', u.email,
      extensions.crypt(pw, extensions.gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('first_name', u.first_name, 'last_name', u.last_name, 'school', school,
                         'program', u.program, 'year_level', u.year_level, 'email_verified', true),
      now(), now(), '', '', '', '', '', ''
    );

    insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
    values (
      gen_random_uuid(), uid, uid::text, 'email',
      jsonb_build_object('sub', uid::text, 'email', u.email, 'email_verified', true),
      now(), now(), now()
    );

    raise notice 'created %', u.email;
  end loop;
end $$;

-- Demo users are already verified students; Miguel, Bea, Michael, Niamh, Geneva and Graziela are approved tutors.
update public.profiles p set verification_status = 'verified'
from auth.users u where u.id = p.id and u.email like '%@pasa.test';
update public.profiles p set tutor_status = 'approved', is_tutor = true, tutor_modes = '{online}', tutor_rate = greatest(tutor_rate, 150)
from auth.users u where u.id = p.id and u.email in ('miguel@pasa.test', 'bea@pasa.test', 'michael@pasa.test', 'niamh@pasa.test', 'geneva@pasa.test', 'graziela@pasa.test');

-- Make admin@pasa.test an admin of the /admin panel.
insert into public.admins (user_id)
select id from auth.users where email = 'admin@pasa.test'
on conflict do nothing;

-- Check: should list all 16 profiles (created automatically by the sign-up trigger).
select u.email, p.first_name, p.last_name, p.program, p.year_level, p.school
from auth.users u join public.profiles p on p.id = u.id
where u.email like '%@pasa.test'
order by u.email;
