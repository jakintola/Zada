-- Messages table and realtime setup for ZADA

-- Create table (if not already present)
create extension if not exists pgcrypto;

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  order_id text,
  type text not null default 'order' check (type in ('order','support')),
  sender_role text not null check (sender_role in ('customer','admin')),
  sender_id text,
  content text not null,
  created_at timestamptz not null default now()
);

-- Make order_id nullable (support chats)
alter table public.messages
  alter column order_id drop not null;

-- Ensure type column exists and has constraint/default
alter table public.messages
  add column if not exists type text;

alter table public.messages
  alter column type set default 'order';

do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'messages_type_check'
  ) then
    alter table public.messages
      add constraint messages_type_check check (type in ('order','support'));
  end if;
end $$;

-- Helpful indexes
create index if not exists idx_messages_order_id_created_at
  on public.messages (order_id, created_at);

create index if not exists idx_messages_type_sender_created_at
  on public.messages (type, sender_id, created_at);

-- Enable RLS and open dev policies (tighten later)
alter table public.messages enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where policyname='messages_select_all_dev') then
    create policy "messages_select_all_dev" on public.messages for select using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname='messages_insert_all_dev') then
    create policy "messages_insert_all_dev" on public.messages for insert with check (true);
  end if;
end $$;

-- Add table to realtime publication (UI toggle works too)
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end $$;

-- Add table to publication (ignore if already exists)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' 
    and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;

-- Smoke test insert (optional)
-- insert into public.messages (type, sender_role, sender_id, content)
-- values ('support', 'customer', 'test@example.com', 'Hello from SQL');


