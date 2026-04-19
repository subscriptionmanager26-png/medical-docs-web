-- Run in Supabase SQL editor or via CLI after linking a project.
-- Enable pgvector (usually enabled on Supabase; safe if already on)
create extension if not exists vector;

-- Google OAuth refresh token for Drive API (same Google OAuth client as Supabase Auth)
create table if not exists public.google_credentials (
  user_id uuid primary key references auth.users (id) on delete cascade,
  refresh_token text not null,
  access_token text,
  expires_at timestamptz,
  updated_at timestamptz default now()
);

alter table public.google_credentials enable row level security;

create policy "Users manage own google credentials"
  on public.google_credentials
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Cached Drive folder structure
create table if not exists public.drive_roots (
  user_id uuid primary key references auth.users (id) on delete cascade,
  root_folder_id text not null,
  category_folder_ids jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

alter table public.drive_roots enable row level security;

create policy "Users manage own drive roots"
  on public.drive_roots
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Document metadata (files live in user's Google Drive)
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

create policy "Users manage own documents"
  on public.documents
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- RAG chunks (OpenAI text-embedding-3-small = 1536 dimensions by default)
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

create policy "Users manage own document chunks"
  on public.document_chunks
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Vector search (called with user JWT)
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
