-- Per-user vector storage (Supabase pgvector)
--
-- Isolation model: one logical "vector store" per user, implemented as rows in
-- public.document_chunks keyed by user_id, NOT a separate physical table per user.
-- Enforcement layers:
--   1) Row Level Security on document_chunks (auth.uid() = user_id)
--   2) match_document_chunks() filters WHERE user_id = auth.uid()
--   3) Trigger below forces chunk.user_id to match the parent documents.user_id
--      and rejects inserts for documents the caller cannot see (RLS).

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
execute procedure public.document_chunks_sync_user_id();

comment on table public.document_chunks is
'pgvector chunks per upload; user_id must match parent documents.user_id (enforced by RLS + trigger). Vector search uses match_document_chunks() scoped to auth.uid().';
