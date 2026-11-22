-- Living Memory Capsule — Idempotent Supabase Schema
-- Paste and run once in Supabase SQL Editor.

create extension if not exists pgcrypto;

-- 1. Core tables
create table if not exists public.memories (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  caption text,
  image_url text not null,
  storage_path text not null,
  category text not null,
  author text not null,
  memory_date date not null default current_date,
  unlock_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists public.memory_notes (
  id uuid primary key default gen_random_uuid(),
  memory_id uuid not null references public.memories(id) on delete cascade,
  author text not null,
  content text not null,
  created_at timestamptz default now()
);

create table if not exists public.gifted_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  image_url text,
  storage_path text,
  lore_note text not null,
  gifted_date date default current_date,
  created_at timestamptz default now()
);

create table if not exists public.chat_highlights (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  messages jsonb not null,
  created_at timestamptz default now()
);

-- Helpful query indexes
create index if not exists idx_memories_date_created
  on public.memories (memory_date desc, created_at desc);

create index if not exists idx_memory_notes_memory_created
  on public.memory_notes (memory_id, created_at asc);

create index if not exists idx_gifted_items_date_created
  on public.gifted_items (gifted_date desc, created_at desc);

create index if not exists idx_chat_highlights_created
  on public.chat_highlights (created_at desc);

-- 2. Strict Row Level Security & Explicit Server-Only Grants
-- No client-side policies are defined on purpose: all reads and writes route
-- through Next.js server handlers using SUPABASE_SERVICE_ROLE_KEY.
alter table public.memories enable row level security;
alter table public.memory_notes enable row level security;
alter table public.gifted_items enable row level security;
alter table public.chat_highlights enable row level security;

revoke all on table
  public.memories,
  public.memory_notes,
  public.gifted_items,
  public.chat_highlights
from anon, authenticated;

grant usage on schema public to service_role;
grant all on table
  public.memories,
  public.memory_notes,
  public.gifted_items,
  public.chat_highlights
to service_role;

-- 3. Public-read / server-write Storage Bucket
insert into storage.buckets (id, name, public)
values ('capsule-media', 'capsule-media', true)
on conflict (id) do update
set public = excluded.public;

drop policy if exists "Public read capsule-media" on storage.objects;

create policy "Public read capsule-media"
  on storage.objects
  for select
  to public
  using (bucket_id = 'capsule-media');
