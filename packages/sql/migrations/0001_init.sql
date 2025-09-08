-- Enable extensions (run with a superuser/owner role)
create extension if not exists postgis;
create extension if not exists pg_trgm;
create extension if not exists pgcrypto;

-- Profiles (link to auth.users in Supabase env)
create table if not exists public.profiles (
  id uuid primary key,
  handle text unique,
  display_name text not null,
  avatar_url text,
  role text not null default 'diner' check (role in ('diner','owner','admin')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Restaurants
create table if not exists public.restaurants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  cuisine_tags text[] default '{}',
  price_level int check (price_level between 1 and 4),
  phone text, website text,
  address_line1 text, address_line2 text,
  city text, region text, postal_code text, country_code char(2),
  location geography(Point,4326) not null,
  verified_local boolean default false,
  owner_user_id uuid references public.profiles(id),
  chain_flag boolean default false,
  status text not null default 'active' check (status in ('active','pending','rejected')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists restaurants_loc_gix on public.restaurants using gist (location);
create index if not exists restaurants_name_trgm on public.restaurants using gin (name gin_trgm_ops);

-- Media (photos/videos)
create table if not exists public.media (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('image','video')),
  image_id text,
  mux_asset_id text,
  mux_playback_id text,
  caption text,
  moderation_status text default 'pending' check (moderation_status in ('pending','approved','rejected')),
  created_at timestamptz default now()
);
create index if not exists media_by_restaurant on public.media(restaurant_id);

-- Reviews
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  body text,
  details jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);
create index if not exists reviews_restaurant_idx on public.reviews(restaurant_id);

-- Trips
create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  city text, country_code char(2),
  start_date date, end_date date,
  created_at timestamptz default now()
);
create table if not exists public.trip_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  day_index int not null,
  note text,
  sort_order int default 0,
  created_at timestamptz default now()
);

-- Offers & redemptions
create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  title text not null,
  description text,
  kind text not null check (kind in ('percent','fixed','bogo')),
  value numeric(6,2) not null check (value > 0),
  start_at timestamptz not null, end_at timestamptz not null,
  daily_limit int, per_user_limit int default 1,
  status text not null default 'scheduled' check (status in ('scheduled','active','paused','expired')),
  qr_secret uuid default gen_random_uuid(),
  created_by uuid references public.profiles(id)
);
create table if not exists public.offer_redemptions (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.offers(id) on delete cascade,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  redeemed_at timestamptz default now(),
  status text not null default 'completed' check (status in ('completed','reversed'))
);
create unique index if not exists offer_per_user_once on public.offer_redemptions(offer_id, user_id);

-- Basic RLS
alter table public.restaurants enable row level security;
create policy if not exists restaurants_read on public.restaurants for select using (true);
create policy if not exists restaurants_owner_update on public.restaurants for update using (auth.uid() = owner_user_id);

alter table public.reviews enable row level security;
create policy if not exists reviews_read on public.reviews for select using (true);
create policy if not exists reviews_mine on public.reviews for all using (auth.uid() = user_id);
