-- PASA database schema
-- Run this whole file once in Supabase → SQL Editor → New query → Run.
-- Safe to re-run: tables are kept, functions/triggers/policies are recreated.

-- ─────────────────────────────────────────────────────────────
-- Profiles (one per auth user, created automatically on sign-up)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  first_name text not null default '',
  last_name text not null default '',
  school text not null default '',
  program text not null default '',
  year_level int not null default 1,
  bio text not null default '',
  avatar_url text,
  is_tutor boolean not null default false,
  tutor_subjects text[] not null default '{}',
  tutor_rate int not null default 0,          -- PHP per hour
  tutor_about text not null default '',
  plus_until timestamptz,                     -- PASA Plus subscription
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, first_name, last_name, school, program, year_level)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    coalesce(new.raw_user_meta_data->>'school', ''),
    coalesce(new.raw_user_meta_data->>'program', ''),
    coalesce((new.raw_user_meta_data->>'year_level')::int, 1)
  );
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────────────────────
-- Home feed
-- ─────────────────────────────────────────────────────────────
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles on delete cascade,
  type text not null check (type in ('need_tutor', 'offer_tutoring', 'general')),
  subject text not null default '',
  body text not null,
  budget int,                                 -- PHP per hour, optional
  boosted_until timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.posts on delete cascade,
  listing_id uuid,                            -- FK added below
  author_id uuid not null references public.profiles on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- Assets (books and calculators only)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles on delete cascade,
  category text not null check (category in ('book', 'calculator')),
  mode text not null check (mode in ('sale', 'rent')),
  title text not null,
  book_author text not null default '',
  description text not null default '',
  condition text not null default 'Good',
  price int not null,                         -- sale price, or rent per week
  deposit int not null default 0,             -- rent only
  photo_url text,
  meetup_spot text not null default '',
  status text not null default 'available'
    check (status in ('available', 'reserved', 'on_loan', 'sold')),
  boosted_until timestamptz,
  created_at timestamptz not null default now()
);

alter table public.comments drop constraint if exists comments_listing_id_fkey;
alter table public.comments add constraint comments_listing_id_fkey
  foreign key (listing_id) references public.listings on delete cascade;

create table if not exists public.favorites (
  user_id uuid not null references public.profiles on delete cascade,
  listing_id uuid not null references public.listings on delete cascade,
  primary key (user_id, listing_id)
);

-- ─────────────────────────────────────────────────────────────
-- Transactions: tutoring bookings and item orders
-- ─────────────────────────────────────────────────────────────
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles on delete cascade,
  tutor_id uuid not null references public.profiles on delete cascade,
  subject text not null,
  starts_at timestamptz not null,
  duration_min int not null default 60,
  location text not null,
  notes text not null default '',
  amount int not null,                        -- tutor's price
  fee int not null,                           -- PASA service fee
  status text not null default 'requested'
    check (status in ('requested', 'accepted', 'paid', 'completed', 'declined', 'cancelled')),
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings on delete cascade,
  buyer_id uuid not null references public.profiles on delete cascade,
  seller_id uuid not null references public.profiles on delete cascade,
  kind text not null check (kind in ('buy', 'rent')),
  weeks int not null default 0,
  amount int not null,
  deposit int not null default 0,
  fee int not null,
  status text not null default 'paid'
    check (status in ('paid', 'completed', 'returned', 'cancelled')),
  due_at timestamptz,                         -- rent return date
  created_at timestamptz not null default now()
);

-- Dummy payments: nothing real is charged. Shows the escrow and commission flow.
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  payer_id uuid not null references public.profiles on delete cascade,
  payee_id uuid references public.profiles on delete cascade,  -- null = paid to PASA (boost, Plus)
  ref_type text not null check (ref_type in ('booking', 'order', 'boost', 'plus')),
  ref_id uuid,
  method text not null check (method in ('gcash', 'maya', 'cash')),
  amount int not null,
  fee int not null default 0,
  reference_no text not null,
  status text not null default 'held' check (status in ('held', 'released', 'refunded', 'paid')),
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- Messaging
-- ─────────────────────────────────────────────────────────────
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references public.profiles on delete cascade,
  user_b uuid not null references public.profiles on delete cascade,
  last_message text not null default '',
  last_message_at timestamptz not null default now(),
  check (user_a < user_b),
  unique (user_a, user_b)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations on delete cascade,
  sender_id uuid not null references public.profiles on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- Social, trust and safety
-- ─────────────────────────────────────────────────────────────
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  reviewer_id uuid not null references public.profiles on delete cascade,
  reviewee_id uuid not null references public.profiles on delete cascade,
  role text not null check (role in ('tutor', 'seller', 'student', 'buyer')),
  ref_type text not null check (ref_type in ('booking', 'order')),
  ref_id uuid not null,
  stars int not null check (stars between 1 and 5),
  comment text not null default '',
  created_at timestamptz not null default now(),
  unique (reviewer_id, ref_type, ref_id)
);

create table if not exists public.connections (
  follower_id uuid not null references public.profiles on delete cascade,
  following_id uuid not null references public.profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id)
);

create table if not exists public.blocks (
  blocker_id uuid not null references public.profiles on delete cascade,
  blocked_id uuid not null references public.profiles on delete cascade,
  primary key (blocker_id, blocked_id)
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles on delete cascade,
  target_type text not null check (target_type in ('user', 'post', 'listing', 'message')),
  target_id uuid not null,
  reason text not null,
  details text not null default '',
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  title text not null,
  body text not null default '',
  link text,                                  -- in-app route, e.g. /chat/<id>
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- Admins and bans (managed from the /admin web panel)
-- ─────────────────────────────────────────────────────────────
-- Add an admin from the SQL Editor:
--   insert into public.admins (user_id) select id from auth.users where email = 'admin@pasa.test';
create table if not exists public.admins (
  user_id uuid primary key references auth.users on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.bans (
  user_id uuid primary key references public.profiles on delete cascade,
  reason text not null default '',
  banned_by uuid references public.profiles on delete set null,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from admins where user_id = auth.uid());
$$;

create or replace function public.is_banned()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from bans where user_id = auth.uid());
$$;

-- Users list for the admin panel, including email and last sign-in from auth.users.
create or replace function public.admin_list_users()
returns table (
  id uuid, email text, first_name text, last_name text, program text, year_level int,
  is_tutor boolean, plus_until timestamptz, created_at timestamptz, last_sign_in_at timestamptz,
  banned boolean, ban_reason text, is_admin boolean
) language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'admins only'; end if;
  return query
    select p.id, u.email::text, p.first_name, p.last_name, p.program, p.year_level,
           p.is_tutor, p.plus_until, p.created_at, u.last_sign_in_at,
           b.user_id is not null, coalesce(b.reason, ''), a.user_id is not null
    from profiles p
    join auth.users u on u.id = p.id
    left join bans b on b.user_id = p.id
    left join admins a on a.user_id = p.id
    order by p.created_at desc;
end $$;

-- Average ratings per user and role
create or replace view public.profile_ratings with (security_invoker = true) as
  select reviewee_id as user_id, role, round(avg(stars)::numeric, 1) as avg_stars, count(*)::int as review_count
  from public.reviews group by reviewee_id, role;

-- ─────────────────────────────────────────────────────────────
-- Helpers
-- ─────────────────────────────────────────────────────────────
-- Get or create the 1:1 conversation between the caller and another user.
create or replace function public.start_conversation(other uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare a uuid; b uuid; cid uuid;
begin
  if auth.uid() is null or other = auth.uid() then raise exception 'invalid'; end if;
  a := least(auth.uid(), other); b := greatest(auth.uid(), other);
  select id into cid from conversations where user_a = a and user_b = b;
  if cid is null then
    insert into conversations (user_a, user_b) values (a, b) returning id into cid;
  end if;
  return cid;
end $$;

create or replace function public.notify(uid uuid, t text, b text, l text)
returns void language sql security definer set search_path = public as $$
  insert into notifications (user_id, title, body, link) values (uid, t, b, l);
$$;

create or replace function public.display_name(uid uuid)
returns text language sql stable security definer set search_path = public as $$
  select coalesce(nullif(first_name, ''), 'Someone') from profiles where id = uid;
$$;

-- Keep conversation preview fresh and notify the other person on a new message
create or replace function public.on_message()
returns trigger language plpgsql security definer set search_path = public as $$
declare c conversations; recipient uuid;
begin
  update conversations set last_message = left(new.body, 120), last_message_at = new.created_at
    where id = new.conversation_id returning * into c;
  recipient := case when c.user_a = new.sender_id then c.user_b else c.user_a end;
  perform notify(recipient, display_name(new.sender_id) || ' sent you a message', left(new.body, 80), '/chat/' || c.id);
  return new;
end $$;
drop trigger if exists messages_after_insert on public.messages;
create trigger messages_after_insert after insert on public.messages
  for each row execute function public.on_message();

create or replace function public.on_booking()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform notify(new.tutor_id, 'New tutoring request',
      display_name(new.student_id) || ' wants help in ' || new.subject, '/activity');
  elsif new.status <> old.status then
    if new.status = 'accepted' then
      perform notify(new.student_id, 'Booking accepted',
        display_name(new.tutor_id) || ' accepted. Pay to confirm your ' || new.subject || ' session.', '/activity');
    elsif new.status = 'declined' then
      perform notify(new.student_id, 'Booking declined', display_name(new.tutor_id) || ' can''t make it this time.', '/activity');
    elsif new.status = 'paid' then
      perform notify(new.tutor_id, 'Session confirmed',
        display_name(new.student_id) || ' paid. Meet at ' || new.location || '.', '/activity');
    elsif new.status = 'completed' then
      perform notify(new.tutor_id, 'Payment released',
        'PHP ' || new.amount || ' for ' || new.subject || ' is now yours. Leave a review!', '/activity');
    elsif new.status = 'cancelled' then
      perform notify(case when auth.uid() = new.tutor_id then new.student_id else new.tutor_id end,
        'Booking cancelled', new.subject || ' session was cancelled.', '/activity');
    end if;
  end if;
  return new;
end $$;
drop trigger if exists bookings_after_change on public.bookings;
create trigger bookings_after_change after insert or update on public.bookings
  for each row execute function public.on_booking();

create or replace function public.on_order()
returns trigger language plpgsql security definer set search_path = public as $$
declare t text;
begin
  select title into t from listings where id = new.listing_id;
  if tg_op = 'INSERT' then
    update listings set status = case when new.kind = 'rent' then 'on_loan' else 'reserved' end where id = new.listing_id;
    perform notify(new.seller_id, case when new.kind = 'rent' then 'Your item was rented' else 'Your item was bought' end,
      display_name(new.buyer_id) || ' paid for "' || t || '". Arrange the meetup in chat.', '/activity');
  elsif new.status <> old.status then
    if new.status = 'completed' and new.kind = 'buy' then
      update listings set status = 'sold' where id = new.listing_id;
      perform notify(new.seller_id, 'Payment released', 'PHP ' || new.amount || ' for "' || t || '" is now yours.', '/activity');
    elsif new.status = 'returned' then
      update listings set status = 'available' where id = new.listing_id;
      perform notify(new.buyer_id, 'Deposit refunded', '"' || t || '" was returned. Your deposit is back.', '/activity');
    elsif new.status = 'cancelled' then
      update listings set status = 'available' where id = new.listing_id;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists orders_after_change on public.orders;
create trigger orders_after_change after insert or update on public.orders
  for each row execute function public.on_order();

create or replace function public.on_comment()
returns trigger language plpgsql security definer set search_path = public as $$
declare owner uuid;
begin
  if new.post_id is not null then
    select author_id into owner from posts where id = new.post_id;
    if owner <> new.author_id then
      perform notify(owner, display_name(new.author_id) || ' commented on your post', left(new.body, 80), '/post/' || new.post_id);
    end if;
  elsif new.listing_id is not null then
    select seller_id into owner from listings where id = new.listing_id;
    if owner <> new.author_id then
      perform notify(owner, display_name(new.author_id) || ' commented on your listing', left(new.body, 80), '/listing/' || new.listing_id);
    end if;
  end if;
  return new;
end $$;
drop trigger if exists comments_after_insert on public.comments;
create trigger comments_after_insert after insert on public.comments
  for each row execute function public.on_comment();

create or replace function public.on_connection()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform notify(new.following_id, display_name(new.follower_id) || ' connected with you', '', '/user/' || new.follower_id);
  return new;
end $$;
drop trigger if exists connections_after_insert on public.connections;
create trigger connections_after_insert after insert on public.connections
  for each row execute function public.on_connection();

-- ─────────────────────────────────────────────────────────────
-- Row level security
-- ─────────────────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.listings enable row level security;
alter table public.favorites enable row level security;
alter table public.bookings enable row level security;
alter table public.orders enable row level security;
alter table public.payments enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.reviews enable row level security;
alter table public.connections enable row level security;
alter table public.blocks enable row level security;
alter table public.reports enable row level security;
alter table public.notifications enable row level security;
alter table public.admins enable row level security;
alter table public.bans enable row level security;

do $$ declare r record; begin
  for r in select policyname, tablename from pg_policies where schemaname = 'public' loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- Readable by any signed-in student
create policy "read" on public.profiles for select to authenticated using (true);
create policy "read" on public.posts for select to authenticated using (true);
create policy "read" on public.comments for select to authenticated using (true);
create policy "read" on public.listings for select to authenticated using (true);
create policy "read" on public.reviews for select to authenticated using (true);
create policy "read" on public.connections for select to authenticated using (true);

-- Own rows
create policy "update own" on public.profiles for update to authenticated using (id = auth.uid());
create policy "write own" on public.posts for all to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid() and not is_banned());
create policy "write own" on public.comments for all to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid() and not is_banned());
create policy "write own" on public.listings for all to authenticated using (seller_id = auth.uid()) with check (seller_id = auth.uid() and not is_banned());
create policy "own" on public.favorites for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own" on public.connections for insert to authenticated with check (follower_id = auth.uid());
create policy "delete own" on public.connections for delete to authenticated using (follower_id = auth.uid());
create policy "either side reads" on public.blocks for select to authenticated using (auth.uid() in (blocker_id, blocked_id));
create policy "own" on public.blocks for insert to authenticated with check (blocker_id = auth.uid());
create policy "delete own" on public.blocks for delete to authenticated using (blocker_id = auth.uid());
create policy "own" on public.reports for insert to authenticated with check (reporter_id = auth.uid());
create policy "write own" on public.reviews for insert to authenticated with check (reviewer_id = auth.uid() and not is_banned());
create policy "own" on public.notifications for select to authenticated using (user_id = auth.uid());
create policy "update own" on public.notifications for update to authenticated using (user_id = auth.uid());

-- Transactions: only the two people involved
create policy "parties" on public.bookings for select to authenticated using (auth.uid() in (student_id, tutor_id));
create policy "student creates" on public.bookings for insert to authenticated with check (student_id = auth.uid() and not is_banned());
create policy "parties update" on public.bookings for update to authenticated using (auth.uid() in (student_id, tutor_id));

create policy "parties" on public.orders for select to authenticated using (auth.uid() in (buyer_id, seller_id));
create policy "buyer creates" on public.orders for insert to authenticated with check (buyer_id = auth.uid() and not is_banned());
create policy "parties update" on public.orders for update to authenticated using (auth.uid() in (buyer_id, seller_id));

create policy "parties" on public.payments for select to authenticated using (auth.uid() in (payer_id, payee_id));
create policy "payer creates" on public.payments for insert to authenticated with check (payer_id = auth.uid());
create policy "parties update" on public.payments for update to authenticated using (auth.uid() in (payer_id, payee_id));

create policy "members" on public.conversations for select to authenticated using (auth.uid() in (user_a, user_b));
create policy "members" on public.messages for select to authenticated using (
  exists (select 1 from conversations c where c.id = conversation_id and auth.uid() in (c.user_a, c.user_b)));
create policy "members send" on public.messages for insert to authenticated with check (
  sender_id = auth.uid() and not is_banned()
  and exists (select 1 from conversations c where c.id = conversation_id and auth.uid() in (c.user_a, c.user_b)));

-- Admin panel: read everything except private chats, moderate content, manage bans
create policy "self" on public.admins for select to authenticated using (user_id = auth.uid());
create policy "own or admin" on public.bans for select to authenticated using (user_id = auth.uid() or is_admin());
create policy "admin" on public.bans for insert to authenticated with check (is_admin());
create policy "admin delete" on public.bans for delete to authenticated using (is_admin());
create policy "admin" on public.reports for select to authenticated using (is_admin());
create policy "admin update" on public.reports for update to authenticated using (is_admin());
create policy "admin" on public.bookings for select to authenticated using (is_admin());
create policy "admin" on public.orders for select to authenticated using (is_admin());
create policy "admin" on public.payments for select to authenticated using (is_admin());
create policy "admin delete" on public.posts for delete to authenticated using (is_admin());
create policy "admin delete" on public.comments for delete to authenticated using (is_admin());
create policy "admin delete" on public.listings for delete to authenticated using (is_admin());

-- ─────────────────────────────────────────────────────────────
-- Realtime (live chat and notification badge)
-- ─────────────────────────────────────────────────────────────
do $$ begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null; end $$;

-- ─────────────────────────────────────────────────────────────
-- Photo storage (public bucket, users upload into their own folder)
-- ─────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public) values ('photos', 'photos', true)
  on conflict (id) do nothing;

drop policy if exists "photos read" on storage.objects;
drop policy if exists "photos upload own" on storage.objects;
drop policy if exists "photos update own" on storage.objects;
create policy "photos read" on storage.objects for select using (bucket_id = 'photos');
create policy "photos upload own" on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "photos update own" on storage.objects for update to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
