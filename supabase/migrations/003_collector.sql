-- DEALMAP 003 — Real Data Collector + Smart Deal Engine.
-- New tables only. Never alters 001/002. Extensible: add retailers, APIs,
-- feeds and countries as rows in `stores`/`sources`, never schema rebuilds.

create table if not exists stores (
  id text primary key,
  name text not null,
  homepage text not null,
  country text not null default 'MA',
  reliability numeric null,
  allow_recheck boolean not null default false,
  notes text null,
  created_at timestamptz not null default now()
);

create table if not exists sources (
  id text primary key,
  kind text not null,            -- retailer_api | retailer_page | user_submission | link_analysis | manual
  label text not null,
  allows_use boolean not null default true,
  notes text null,
  created_at timestamptz not null default now()
);

create table if not exists products (
  ref text primary key,          -- dealmap product ref (p_...) or generated c_...
  name text not null,
  brand text null,
  model text null,
  category text null default 'smartphones',
  ram_gb int null,
  storage_gb int null,
  ean text null,
  model_number text null,
  created_at timestamptz not null default now()
);
create index if not exists idx_products_ean on products (ean);
create index if not exists idx_products_brand_model on products (brand, model);

create table if not exists product_variants (
  id text primary key,
  product_ref text not null references products (ref) on delete cascade,
  label text not null,
  ram_gb int null,
  storage_gb int null,
  region text null,
  condition text null,
  created_at timestamptz not null default now()
);

create table if not exists offers (
  id text primary key,
  product_ref text null references products (ref) on delete set null,
  product_name text null,
  store_id text null references stores (id) on delete set null,
  store_name text not null,
  source text not null,
  source_url text not null,
  price numeric null,
  currency text not null default 'MAD',
  availability text not null default 'unknown',
  condition text not null default 'unknown',
  warranty_months int null,
  return_policy text null,
  specs jsonb not null default '{}',
  verification_status text not null default 'pending',
  last_checked timestamptz null,
  created_at timestamptz not null default now()
);
create index if not exists idx_offers_product on offers (product_ref);
create index if not exists idx_offers_status on offers (verification_status);

create table if not exists price_history (
  id bigserial primary key,
  product_ref text not null,
  offer_id text null,
  price numeric not null,
  at timestamptz not null default now()
);
create index if not exists idx_history_product_at on price_history (product_ref, at);

create table if not exists user_submissions (
  id text primary key,
  url text null,
  product_name text null,
  store_name text null,
  price numeric null,
  currency text not null default 'MAD',
  condition text null,
  notes text null,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists data_collection_runs (
  id text primary key,
  started_at timestamptz not null default now(),
  finished_at timestamptz null,
  status text not null default 'running',
  checked int not null default 0,
  updated int not null default 0,
  skipped int not null default 0,
  failed_sources jsonb not null default '[]',
  errors jsonb not null default '[]',
  notes jsonb not null default '[]'
);

create table if not exists deal_weights (
  key text primary key,
  weight numeric not null,
  updated_at timestamptz not null default now()
);
