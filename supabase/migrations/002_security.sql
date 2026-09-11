-- DEALMAP migration 002: contributions, moderation, audit, settings, RLS
create table if not exists contributions (
  id uuid primary key default gen_random_uuid(), user_id uuid references profiles(id),
  product_id text references products(id), price numeric not null, currency char(3) default 'MAD',
  condition text default 'used_good', source_type text default 'user_report',
  location text default '', status text default 'pending',
  created_at timestamptz not null default now()
);
create table if not exists reports (
  id uuid primary key default gen_random_uuid(), reporter_id uuid references profiles(id),
  target_type text not null, target_id text not null, reason text not null,
  status text not null default 'open', created_at timestamptz not null default now()
);
create table if not exists owner_security_events (
  id uuid primary key default gen_random_uuid(), actor_id uuid,
  action text not null, target text, result text default 'ok',
  metadata jsonb default '{}', created_at timestamptz not null default now()
);
create table if not exists admin_actions (
  id uuid primary key default gen_random_uuid(), actor_id uuid,
  action text not null, target text, created_at timestamptz not null default now()
);
create table if not exists system_settings (
  key text primary key, value text not null, updated_at timestamptz not null default now()
);
create table if not exists notification_preferences (
  user_id uuid primary key references profiles(id) on delete cascade,
  price_alerts boolean default true, warranty_reminders boolean default true,
  return_reminders boolean default true, marketing boolean default false
);
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(), user_id uuid references profiles(id) on delete cascade,
  kind text not null, title text not null, body text default '',
  read boolean default false, created_at timestamptz not null default now()
);

-- RLS
alter table profiles enable row level security;
alter table purchases enable row level security;
alter table notifications enable row level security;

drop policy if exists "own profile" on profiles;
create policy "own profile" on profiles for all using (auth.uid() = id) with check (auth.uid() = id);
drop policy if exists "own purchases" on purchases;
create policy "own purchases" on purchases for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own notifications" on notifications;
create policy "own notifications" on notifications for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Public read for catalog/market aggregates; writes via service role only.
alter table products enable row level security;
drop policy if exists "public products" on products;
create policy "public products" on products for select using (true);
alter table price_observations enable row level security;
drop policy if exists "public observations" on price_observations;
create policy "public observations" on price_observations for select using (true);
