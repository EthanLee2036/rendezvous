-- ══════════════════════════════════════════════════
-- RendezVous v2 — Multi-user Database Setup
-- ══════════════════════════════════════════════════
-- Run this in Supabase SQL Editor

create extension if not exists "uuid-ossp";

drop table if exists votes cascade;
drop table if exists polls cascade;

create table polls (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  title         text not null,
  description   text,
  duration      text not null default '60',
  location      text,
  timezone      text not null default 'Europe/London',
  dates         text[] not null default '{}',
  slot_keys     text[] not null default '{}',
  grid_data     jsonb not null default '{}',
  created_at    timestamptz not null default now()
);

create table votes (
  id              uuid primary key default uuid_generate_v4(),
  poll_id         uuid not null references polls(id) on delete cascade,
  voter_name      text not null,
  voter_timezone  text not null default 'Europe/London',
  choices         jsonb not null default '{}',
  created_at      timestamptz not null default now()
);

create index idx_votes_poll_id on votes(poll_id);
create index idx_polls_user_id on polls(user_id);

alter table polls enable row level security;

create policy "Users can view own polls"
  on polls for select to authenticated
  using (auth.uid() = user_id);

create policy "Users can create own polls"
  on polls for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users can delete own polls"
  on polls for delete to authenticated
  using (auth.uid() = user_id);

create policy "Anon can read any poll"
  on polls for select to anon
  using (true);

alter table votes enable row level security;

create policy "Anyone can read votes"
  on votes for select to anon, authenticated
  using (true);

create policy "Anyone can submit votes"
  on votes for insert to anon, authenticated
  with check (true);

alter publication supabase_realtime add table votes;
