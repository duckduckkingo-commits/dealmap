-- DEALMAP migration 001: core schema (Postgres / Supabase)
-- Run: supabase db push  (or paste into Supabase SQL editor)

create extension if not exists "pgcrypto";

-- Profiles (linked to auth.users)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text not null default '',
  language text not null default 'fr',
  theme text not null default 'system',
  accent text not null default 'blue',
  reputation int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Roles: single-owner enforced by partial unique index
create table if not exists user_roles (
  user_id uuid primary key references profiles(id) on delete cascade,
  role text not null check (role in ('USER','ADMIN','OWNER')),
  created_at timestamptz not null default now()
);
create unique index if not exists one_owner_only on user_roles (role) where role = 'OWNER';

create table if not exists categories (
  id text primary key, slug text unique not null, name jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create table if not exists brands (
  id text primary key, slug text unique not null, name text not null,
  aliases text[] not null default '{}'
);
create table if not exists products (
  id text primary key, brand_id text references brands(id),
  model text not null, name text not null, category_id text references categories(id),
  specs jsonb not null default '{}', image text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists idx_products_search on products using gin (to_tsvector('simple', name || ' ' || model));
create index if not exists idx_products_category on products (category_id);
create index if not exists idx_products_brand on products (brand_id);

create table if not exists product_variants (
  id text primary key, product_id text references products(id) on delete cascade,
  label text not null, storage text, ram text, color text
);

create table if not exists price_observations (
  id uuid primary key default gen_random_uuid(),
  product_id text references products(id) on delete cascade,
  variant_id text references product_variants(id),
  price numeric not null check (price > 0),
  currency char(3) not null default 'MAD',
  condition text not null default 'used_good',
  seller_type text not null default 'individual',
  location text not null default '',
  source_type text not null default 'user_report',
  observed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  quality text not null default 'LOW',
  verification_status text not null default 'pending',
  contributor_id uuid references profiles(id),
  is_demo boolean not null default false
);
create index if not exists idx_obs_product on price_observations (product_id, observed_at desc);
create index if not exists idx_obs_date on price_observations (observed_at desc);

create table if not exists watchlists (
  id uuid primary key default gen_random_uuid(), user_id uuid references profiles(id) on delete cascade,
  product_id text references products(id) on delete cascade,
  target_price numeric, target_score int,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);
create table if not exists alerts (
  id uuid primary key default gen_random_uuid(), user_id uuid references profiles(id) on delete cascade,
  product_id text references products(id) on delete cascade,
  type text not null, target_price numeric, target_score int,
  active boolean not null default true, expires_at timestamptz,
  triggered_at timestamptz, created_at timestamptz not null default now()
);
create index if not exists idx_alerts_user on alerts (user_id, active);

create table if not exists purchases (
  id uuid primary key default gen_random_uuid(), user_id uuid references profiles(id) on delete cascade,
  product_id text references products(id), price numeric not null, currency char(3) default 'MAD',
  purchased_at date not null, seller text, store text, serial_number text,
  warranty_months int, return_deadline date, notes text,
  created_at timestamptz not null default now()
);
create index if not exists idx_purchases_user on purchases (user_id, purchased_at desc);
