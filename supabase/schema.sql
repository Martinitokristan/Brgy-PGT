-- Supabase schema for Barangay Portal
-- Run this inside Supabase (SQL editor) to create the core tables.

-- 1) Barangays
create table if not exists public.barangays (
  id bigserial primary key,
  name text not null,
  description text,
  created_at timestamptz default now()
);

-- 2) Profiles (1-1 with auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text, -- Added to match user schema
  role text not null default 'resident', -- 'resident' | 'admin'
  is_approved boolean not null default false,
  barangay_id bigint references public.barangays(id),
  phone text,
  purok_address text,
  sex text,
  birth_date date,
  age int,
  avatar text,
  cover_photo text,
  valid_id_path text,
  email text, -- Added for easier status tracking
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_profiles_barangay_id on public.profiles (barangay_id);

-- 3) Posts
create table if not exists public.posts (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  barangay_id bigint not null references public.barangays(id),
  title text not null,
  description text,
  purpose text, -- 'complaint' | 'problem' | 'emergency' | 'suggestion' | 'general'
  urgency_level text default 'low', -- 'low' | 'medium' | 'high'
  status text default 'pending', -- 'pending' | 'in_progress' | 'resolved'
  image text,
  admin_response text,
  responded_by uuid references auth.users(id),
  responded_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_posts_barangay_id on public.posts (barangay_id);
create index if not exists idx_posts_urgency_status on public.posts (urgency_level, status);

-- 4) Comments
create table if not exists public.comments (
  id bigserial primary key,
  post_id bigint not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  parent_id bigint references public.comments(id) on delete cascade,
  body text not null, -- Renamed from content to match old schema body
  liked_by jsonb not null default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_comments_post_id on public.comments (post_id);

-- 5) Reactions
create table if not exists public.reactions (
  id bigserial primary key,
  post_id bigint not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null, -- 'like' | 'heart' | 'support' | 'sad'
  created_at timestamptz default now()
);

create unique index if not exists uq_reactions_post_user
  on public.reactions (post_id, user_id);

-- 6) Notifications
create table if not exists public.notifications (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  post_id bigint references public.posts(id) on delete set null,
  type text not null,
  title text not null,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_notifications_user_id on public.notifications (user_id);

-- 7) Events
create table if not exists public.events (
  id bigserial primary key,
  barangay_id bigint not null references public.barangays(id),
  created_by uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  location text,
  event_date date not null,
  image text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_events_barangay_id on public.events (barangay_id);

-- 8) Followers
create table if not exists public.followers (
  id bigserial primary key,
  follower_id uuid not null references auth.users(id) on delete cascade,
  following_id uuid not null references auth.users(id) on delete cascade,
  notify boolean not null default true,
  snoozed_until timestamptz,
  created_at timestamptz default now()
);

create unique index if not exists uq_followers_pair
  on public.followers (follower_id, following_id);

-- 9) Trusted devices
create table if not exists public.trusted_devices (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  device_token text not null, -- hashed
  device_name text,
  ip_address text,
  last_used_at timestamptz default now()
);

create unique index if not exists uq_trusted_devices
  on public.trusted_devices (user_id, device_token);

-- 10) SMS logs
create table if not exists public.sms_logs (
  id bigserial primary key,
  admin_id uuid references auth.users(id) on delete set null,
  recipient_phone text not null,
  message_content text not null,
  status text not null,
  provider_message_id text,
  error_message text,
  created_at timestamptz default now()
);

-- 11) Pending registrations
create table if not exists public.pending_registrations (
  id bigserial primary key,
  email text not null,
  name text not null,
  password_hash text not null,
  barangay_id bigint references public.barangays(id),
  phone text,
  purok_address text,
  sex text,
  birth_date date,
  age int,
  valid_id_path text,
  otp_code text,
  otp_expires_at timestamptz,
  device_token text,
  created_at timestamptz default now()
);

create index if not exists idx_pending_regs_email on public.pending_registrations (email);

-- 12) Device OTPs (temporary codes for new device verification)
create table if not exists public.device_otps (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  device_token text not null,
  code text not null,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);

create index if not exists idx_device_otps_user_device
  on public.device_otps (user_id, device_token);

-- ============================================================
-- RLS POLICIES (basic starters; refine to your exact rules)
-- ============================================================

alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.reactions enable row level security;
alter table public.notifications enable row level security;
alter table public.events enable row level security;
alter table public.followers enable row level security;
alter table public.trusted_devices enable row level security;
alter table public.sms_logs enable row level security;
alter table public.pending_registrations enable row level security;
alter table public.device_otps enable row level security;

-- Helper: check if current user is admin
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

-- Profiles: users can see/update only their own profile; admins can see all in queries run with service role.
create policy "Profiles: select own" on public.profiles
  for select using (id = auth.uid());

create policy "Profiles: update own" on public.profiles
  for update using (id = auth.uid());

-- Additionally, allow admins to see and update any profile from the client.
create policy "Profiles: admin can select all" on public.profiles
  for select using (public.is_admin());

create policy "Profiles: admin can update all" on public.profiles
  for update using (public.is_admin());

-- Posts: users can see posts in their barangay; owners can modify their posts; admins can see all in service-role context.
create policy "Posts: select by barangay or owner" on public.posts
  for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and (p.barangay_id = posts.barangay_id or posts.user_id = auth.uid())
    )
  );

create policy "Posts: insert own" on public.posts
  for insert with check (user_id = auth.uid());

create policy "Posts: update/delete own" on public.posts
  for all
  using (user_id = auth.uid());

-- Comments: anyone who can see the post can see comments; owners can edit; admins via service role.
create policy "Comments: select if see post" on public.comments
  for select
  using (
    exists (
      select 1 from public.posts p
      join public.profiles prof on prof.id = auth.uid()
      where p.id = comments.post_id
        and (p.barangay_id = prof.barangay_id or p.user_id = auth.uid())
    )
  );

create policy "Comments: insert own" on public.comments
  for insert with check (user_id = auth.uid());

create policy "Comments: update/delete own" on public.comments
  for all using (user_id = auth.uid());

-- Reactions: one per user per post, user controls own reactions.
create policy "Reactions: select all for authenticated" on public.reactions
  for select using (auth.uid() is not null);

create policy "Reactions: upsert own" on public.reactions
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Notifications: only owner can see/update.
create policy "Notifications: owner only" on public.notifications
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Events: users see events in their barangay.
create policy "Events: select by barangay" on public.events
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.barangay_id = events.barangay_id
    )
  );

-- Followers: user controls rows where they are follower.
create policy "Followers: select own relations" on public.followers
  for select using (follower_id = auth.uid() or following_id = auth.uid());

create policy "Followers: insert/update/delete by follower" on public.followers
  for all using (follower_id = auth.uid()) with check (follower_id = auth.uid());

-- Trusted devices: user controls their own devices.
create policy "Trusted devices: owner only" on public.trusted_devices
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- SMS logs: visible to admins only (in client context usually hidden; use service role for admin console).
create policy "SMS logs: nobody by default" on public.sms_logs
  for select using (false);

-- Device OTPs: only owner can access their codes.
create policy "Device OTPs: owner only" on public.device_otps
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

