-- =============================================================================
-- MediSage / medical-docs-web — full Supabase schema for SQL Editor (one paste)
-- Run this entire script once on a new project, OR after pulling the repo.
-- Order: base tables + RLS + vector RPC → stricter RPC + index → trigger
-- Safe to re-run: uses IF NOT EXISTS / CREATE OR REPLACE / DROP IF EXISTS where possible.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Part 1 — same as migrations/20260419000000_init.sql
-- -----------------------------------------------------------------------------
create extension if not exists vector;

create table if not exists public.google_credentials (
  user_id uuid primary key references auth.users (id) on delete cascade,
  refresh_token text not null,
  access_token text,
  expires_at timestamptz,
  updated_at timestamptz default now()
);

alter table public.google_credentials enable row level security;

drop policy if exists "Users manage own google credentials" on public.google_credentials;
create policy "Users manage own google credentials"
  on public.google_credentials
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists public.drive_roots (
  user_id uuid primary key references auth.users (id) on delete cascade,
  root_folder_id text not null,
  category_folder_ids jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

alter table public.drive_roots enable row level security;

drop policy if exists "Users manage own drive roots" on public.drive_roots;
create policy "Users manage own drive roots"
  on public.drive_roots
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  drive_file_id text not null,
  drive_folder_id text not null,
  title text not null,
  mime_type text,
  category text not null,
  created_at timestamptz default now()
);

create index if not exists documents_user_id_idx on public.documents (user_id);

alter table public.documents enable row level security;

drop policy if exists "Users manage own documents" on public.documents;
create policy "Users manage own documents"
  on public.documents
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists public.document_chunks (
  id uuid primary key default gen_random_uuid (),
  document_id uuid not null references public.documents (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  chunk_index int not null,
  content text not null,
  embedding vector (1536)
);

create index if not exists document_chunks_user_id_idx on public.document_chunks (user_id);

create index if not exists document_chunks_embedding_hnsw on public.document_chunks
  using hnsw (embedding vector_cosine_ops);

alter table public.document_chunks enable row level security;

drop policy if exists "Users manage own document chunks" on public.document_chunks;
create policy "Users manage own document chunks"
  on public.document_chunks
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.match_document_chunks (
  query_embedding vector (1536),
  match_count int default 8
)
returns table (
  chunk_id uuid,
  document_id uuid,
  chunk_content text,
  similarity double precision
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    dc.id as chunk_id,
    dc.document_id,
    dc.content as chunk_content,
    (1 - (dc.embedding <=> query_embedding))::double precision as similarity
  from public.document_chunks dc
  where dc.user_id = auth.uid()
  order by dc.embedding <=> query_embedding
  limit match_count;
end;
$$;

grant execute on function public.match_document_chunks (vector (1536), int) to authenticated;

-- -----------------------------------------------------------------------------
-- Part 2 — same as migrations/20260419100000_match_chunks_join_documents.sql
-- -----------------------------------------------------------------------------
create or replace function public.match_document_chunks (
  query_embedding vector (1536),
  match_count int default 8
)
returns table (
  chunk_id uuid,
  document_id uuid,
  chunk_content text,
  similarity double precision
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    dc.id as chunk_id,
    dc.document_id,
    dc.content as chunk_content,
    (1 - (dc.embedding <=> query_embedding))::double precision as similarity
  from public.document_chunks dc
  inner join public.documents d
    on d.id = dc.document_id
   and d.user_id = auth.uid()
  where dc.user_id = auth.uid()
  order by dc.embedding <=> query_embedding
  limit match_count;
end;
$$;

grant execute on function public.match_document_chunks (vector (1536), int) to authenticated;

create index if not exists document_chunks_user_document_idx
  on public.document_chunks (user_id, document_id);

-- -----------------------------------------------------------------------------
-- Part 3 — same as migrations/20260420090000_vector_per_user_isolation.sql
-- -----------------------------------------------------------------------------
create or replace function public.document_chunks_sync_user_id()
  returns trigger
  language plpgsql
  security invoker
  set search_path = public
as $$
declare
  doc_owner uuid;
begin
  select d.user_id
    into doc_owner
  from public.documents d
  where d.id = new.document_id;

  if doc_owner is null then
    raise exception 'document_chunks: document_id not found or not accessible';
  end if;

  if doc_owner is distinct from auth.uid() then
    raise exception 'document_chunks: document does not belong to the current user';
  end if;

  new.user_id := doc_owner;
  return new;
end;
$$;

drop trigger if exists document_chunks_sync_user_id_trg on public.document_chunks;

create trigger document_chunks_sync_user_id_trg
  before insert or update on public.document_chunks
  for each row
execute function public.document_chunks_sync_user_id();

comment on table public.document_chunks is
'pgvector chunks per upload; user_id must match parent documents.user_id (enforced by RLS + trigger). Vector search uses match_document_chunks() scoped to auth.uid().';
