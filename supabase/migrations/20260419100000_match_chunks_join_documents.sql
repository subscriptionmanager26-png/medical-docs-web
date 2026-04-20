-- Defense in depth: chunks must belong to a document owned by the caller.
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
