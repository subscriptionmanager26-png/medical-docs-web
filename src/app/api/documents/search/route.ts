import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { retrieveChunksForQuery } from "@/lib/vector-search";

export const runtime = "nodejs";

const querySchema = z.object({
  q: z.string().min(1).max(2000),
  limit: z.coerce.number().int().min(1).max(40).optional().default(20),
});

const SNIPPET_LEN = 480;

export async function GET (request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = querySchema.safeParse({
    q: request.nextUrl.searchParams.get("q") ?? "",
    limit: request.nextUrl.searchParams.get("limit") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { rows, error } = await retrieveChunksForQuery(
    supabase,
    parsed.data.q,
    parsed.data.limit,
  );

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  const docIds = [...new Set(rows.map((r) => r.document_id))];
  const { data: docMeta } = await supabase
    .from("documents")
    .select("id, title, category, drive_file_id, mime_type, created_at")
    .in("id", docIds)
    .eq("user_id", user.id);

  const metaById = new Map(
    (docMeta ?? []).map((d) => [
      d.id,
      {
        title: d.title as string,
        category: d.category as string,
        driveFileId: d.drive_file_id as string,
        mimeType: d.mime_type as string | null,
        createdAt: d.created_at as string,
      },
    ]),
  );

  const results = rows.map((r) => {
    const meta = metaById.get(r.document_id);
    const text = r.chunk_content;
    const snippet =
      text.length <= SNIPPET_LEN
        ? text
        : `${text.slice(0, SNIPPET_LEN).trimEnd()}…`;
    return {
      chunkId: r.chunk_id || null,
      documentId: r.document_id,
      title: meta?.title ?? "Document",
      category: meta?.category ?? null,
      mimeType: meta?.mimeType ?? null,
      createdAt: meta?.createdAt ?? null,
      similarity: r.similarity,
      snippet,
      downloadUrl: meta?.driveFileId
        ? `/api/drive/download/${meta.driveFileId}`
        : null,
    };
  });

  return NextResponse.json(
    {
      query: parsed.data.q,
      count: results.length,
      results,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
