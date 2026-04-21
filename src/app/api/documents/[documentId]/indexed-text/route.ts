import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isPlaceholderIndexChunk } from "@/lib/document-processing";

export const runtime = "nodejs";

const MAX_CHUNKS = 80;
const MAX_CHARS_PER_CHUNK = 12_000;

type RouteContext = { params: Promise<{ documentId: string }> };

/**
 * Returns text stored in `document_chunks` for the signed-in user (for debugging /
 * trust). Does not call OpenAI or Drive—only reads Supabase.
 */
export async function GET (_request: NextRequest, context: RouteContext) {
  const { documentId } = await context.params;

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: doc, error: docError } = await supabase
    .from("documents")
    .select("id, title, category, mime_type, created_at")
    .eq("id", documentId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (docError || !doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const { count: chunkCountExact, error: countError } = await supabase
    .from("document_chunks")
    .select("id", { count: "exact", head: true })
    .eq("document_id", documentId)
    .eq("user_id", user.id);

  if (countError) {
    return NextResponse.json({ error: countError.message }, { status: 500 });
  }

  const { data: rows, error: chunkError } = await supabase
    .from("document_chunks")
    .select("chunk_index, content")
    .eq("document_id", documentId)
    .eq("user_id", user.id)
    .order("chunk_index", { ascending: true })
    .limit(MAX_CHUNKS);

  if (chunkError) {
    return NextResponse.json({ error: chunkError.message }, { status: 500 });
  }

  const list = rows ?? [];
  const totalInDb = chunkCountExact ?? list.length;
  const chunks = list.map((row) => {
    const raw = row.content ?? "";
    const truncated = raw.length > MAX_CHARS_PER_CHUNK;
    const content = truncated
      ? `${raw.slice(0, MAX_CHARS_PER_CHUNK)}\n\n[…truncated in this preview only; full chunk is ${raw.length} characters in the database.]`
      : raw;
    return {
      chunkIndex: row.chunk_index,
      charCount: raw.length,
      truncated,
      content,
    };
  });

  const totalChars = list.reduce((s, r) => s + (r.content?.length ?? 0), 0);
  const looksLikePlaceholderNotice = list.some((r) =>
    isPlaceholderIndexChunk(r.content ?? ""),
  );

  return NextResponse.json({
    document: doc,
    chunks,
    summary: {
      totalChunks: list.length,
      totalChunksInDatabase: totalInDb,
      previewLimitedToChunks: totalInDb > MAX_CHUNKS ? MAX_CHUNKS : null,
      totalChars,
      looksLikePlaceholderNotice,
      truncatedChunkCount: chunks.filter((c) => c.truncated).length,
    },
  });
}
