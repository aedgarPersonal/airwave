-- Airwave core schema: stations + child content + custom domains + AI ledger.
-- Written against Postgres 17. All mutations gated by Clerk userId stored in
-- owner_user_id. RLS lets the anon key read published station rows only.

create extension if not exists pgcrypto;

-- Station rows ----------------------------------------------------------------
create table stations (
  id uuid primary key default gen_random_uuid(),
  owner_user_id text not null,             -- Clerk user id (no FK — we don't sync users table)
  slug text not null unique,
  name text not null,
  tagline text,
  description text,
  origin text,
  timezone text not null default 'America/Toronto',
  stream_url text not null,
  status_url text,
  copyright_since int,
  theme_tokens jsonb,
  logo_url text,
  favicon_url text,
  contact jsonb not null default '{}'::jsonb,
  donate jsonb not null default '{}'::jsonb,
  chat jsonb not null default '{}'::jsonb,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index stations_owner_idx on stations (owner_user_id);
create index stations_published_idx on stations (published) where published = true;

-- Keep updated_at accurate on every UPDATE.
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger stations_set_updated_at
  before update on stations
  for each row execute function set_updated_at();

-- Shows -----------------------------------------------------------------------
create table shows (
  id uuid primary key default gen_random_uuid(),
  station_id uuid not null references stations(id) on delete cascade,
  day text not null check (day in ('Sun','Mon','Tue','Wed','Thu','Fri','Sat','Daily')),
  start_min int not null check (start_min between 0 and 1439),
  end_min int not null check (end_min between 0 and 1439),
  title text not null,
  host text,
  description text,
  crosses_midnight boolean not null default false,
  display_order int not null default 0
);

create index shows_station_idx on shows (station_id);

-- Sponsors / Community Spotlight ---------------------------------------------
create table sponsors (
  id uuid primary key default gen_random_uuid(),
  station_id uuid not null references stations(id) on delete cascade,
  name text not null,
  category text,
  location text,
  link text,
  accent text not null default 'green' check (accent in ('green','gold','red','sun')),
  display_order int not null default 0
);

create index sponsors_station_idx on sponsors (station_id);

-- Custom domains --------------------------------------------------------------
create table custom_domains (
  id uuid primary key default gen_random_uuid(),
  station_id uuid not null references stations(id) on delete cascade,
  domain text not null unique,
  verified_at timestamptz,
  vercel_domain_id text,
  created_at timestamptz not null default now()
);

create index custom_domains_station_idx on custom_domains (station_id);

-- AI generation ledger --------------------------------------------------------
create table ai_generations (
  id uuid primary key default gen_random_uuid(),
  station_id uuid not null references stations(id) on delete cascade,
  kind text not null,                      -- 'theme' | 'copy' | 'parse_schedule' | 'parse_sponsors' | 'logo' | ...
  prompt_hash text,
  cost_cents int not null default 0,
  created_at timestamptz not null default now()
);

create index ai_generations_station_created_idx on ai_generations (station_id, created_at desc);

-- RLS -------------------------------------------------------------------------
-- The app uses the service-role key for all dashboard mutations and reads,
-- and the anon key only for public reads on the tenant landing page / embed.
-- So RLS needs to (a) allow anon to read published stations and their
-- children, and (b) deny everything else to anon. The service-role key
-- bypasses RLS and is gated by our own auth middleware.
alter table stations enable row level security;
alter table shows enable row level security;
alter table sponsors enable row level security;
alter table custom_domains enable row level security;
alter table ai_generations enable row level security;

create policy "public stations readable" on stations
  for select to anon using (published = true);

create policy "public shows readable" on shows
  for select to anon using (
    exists (select 1 from stations s where s.id = station_id and s.published = true)
  );

create policy "public sponsors readable" on sponsors
  for select to anon using (
    exists (select 1 from stations s where s.id = station_id and s.published = true)
  );

-- custom_domains and ai_generations: no anon access. Default deny.
