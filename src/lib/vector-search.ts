import type { SupabaseClient } from "@supabase/supabase-js";
import { embedTexts } from "@/lib/document-processing";

/** Generic probe so broad / meta questions still surface medical text. */
export const BROAD_RETRIEVAL_PROBE =
  "Medical record document: patient history, chief complaint, visit notes, laboratory results, blood test values, imaging report, radiology, prescription medications, diagnosis, treatment, allergies, vital signs, dates, clinic and provider names, insurance, discharge summary.";

export type ChunkMatchRow = {
  chunk_id: string;
  chunk_content: string;
  similarity: number;
  document_id: string;
};

export function normalizeRpcChunkRows (raw: unknown): ChunkMatchRow[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => {
      const r = row as Record<string, unknown>;
      const content = String(
        r.chunk_content ?? r.chunkContent ?? r.content ?? "",
      ).trim();
      const documentId = String(r.document_id ?? r.documentId ?? "");
      const chunkId = String(r.chunk_id ?? r.chunkId ?? "");
      const sim = Number(r.similarity ?? r.Similarity ?? 0);
      return {
        chunk_id: chunkId,
        chunk_content: content,
        similarity: Number.isFinite(sim) ? sim : 0,
        document_id: documentId,
      };
    })
    .filter((m) => m.chunk_content.length > 0);
}

export function mergeChunkRows (
  a: ChunkMatchRow[],
  b: ChunkMatchRow[],
  cap: number,
): ChunkMatchRow[] {
  const combined = [...a, ...b].sort((x, y) => y.similarity - x.similarity);
  const seen = new Set<string>();
  const out: ChunkMatchRow[] = [];
  for (const row of combined) {
    const key = row.chunk_id
      ? row.chunk_id
      : `${row.document_id}:${row.chunk_content.slice(0, 160)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
    if (out.length >= cap) break;
  }
  return out;
}

const DEFAULT_PER_QUERY = 16;
const DEFAULT_MERGED_CAP = 28;

export type MergedRetrievalResult = {
  rows: ChunkMatchRow[];
  qRows: ChunkMatchRow[];
  bRows: ChunkMatchRow[];
  error: string | null;
};

/**
 * Embeds the user message plus a broad medical probe, runs match_document_chunks
 * twice, merges and dedupes. RPC must filter with auth.uid() (see migration).
 *
 * Tenant isolation: all users share one `document_chunks` table. Rows are scoped
 * with `user_id`, enforced by RLS and by the RPC joining `documents` so only the
 * caller's chunks return. This is the usual Postgres/Supabase pattern — not a
 * separate database or physical table per tenant.
 */
export async function retrieveMergedChunksForChat (
  supabase: SupabaseClient,
  userMessage: string,
  options?: { matchPerQuery?: number; mergedCap?: number },
): Promise<MergedRetrievalResult> {
  const matchPerQuery = options?.matchPerQuery ?? DEFAULT_PER_QUERY;
  const mergedCap = options?.mergedCap ?? DEFAULT_MERGED_CAP;

  const [queryEmbedding, broadEmbedding] = await embedTexts([
    userMessage,
    BROAD_RETRIEVAL_PROBE,
  ]);

  const [qRes, bRes] = await Promise.all([
    supabase.rpc("match_document_chunks", {
      query_embedding: queryEmbedding,
      match_count: matchPerQuery,
    }),
    supabase.rpc("match_document_chunks", {
      query_embedding: broadEmbedding,
      match_count: matchPerQuery,
    }),
  ]);

  const err = qRes.error ?? bRes.error;
  if (err) {
    return {
      rows: [],
      qRows: [],
      bRows: [],
      error: err.message,
    };
  }

  const qRows = normalizeRpcChunkRows(qRes.data);
  const bRows = normalizeRpcChunkRows(bRes.data);
  const rows = mergeChunkRows(qRows, bRows, mergedCap);
  return { rows, qRows, bRows, error: null };
}

export type SingleRetrievalResult = {
  rows: ChunkMatchRow[];
  error: string | null;
};

/** Semantic search for a single natural-language query (no broad probe merge). */
export async function retrieveChunksForQuery (
  supabase: SupabaseClient,
  queryText: string,
  matchCount: number,
): Promise<SingleRetrievalResult> {
  const [embedding] = await embedTexts([queryText]);
  const { data, error } = await supabase.rpc("match_document_chunks", {
    query_embedding: embedding,
    match_count: matchCount,
  });
  if (error) {
    return { rows: [], error: error.message };
  }
  return { rows: normalizeRpcChunkRows(data), error: null };
}
