import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";
import { requireEnv } from "@/lib/env";
import { isPlaceholderIndexChunk } from "@/lib/document-processing";
import { retrieveMergedChunksForChat } from "@/lib/vector-search";

export const runtime = "nodejs";

const bodySchema = z.object({
  message: z.string().min(1).max(8000),
});

export async function POST (request: NextRequest) {
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { rows, qRows, bRows, error: retrievalError } =
    await retrieveMergedChunksForChat(supabase, parsed.data.message);

  if (retrievalError) {
    return NextResponse.json({ error: retrievalError }, { status: 500 });
  }

  const maxSimilarity =
    rows.length > 0 ? Math.max(...rows.map((r) => r.similarity)) : 0;

  console.info("[chat] retrieval", {
    chunkRows: rows.length,
    maxSimilarity,
    fromQuery: qRows.length,
    fromBroadProbe: bRows.length,
  });

  if (rows.length === 0) {
    const answer =
      "I could not find any indexed text from your vault yet, so I have nothing to search. " +
      "That usually means either no uploads finished successfully, or indexing did not run (watch for a warning after upload). " +
      "Try uploading a PDF or .txt again and wait for success, then ask again. " +
      "This assistant only reads text that was extracted and indexed from your files—it does not read Google Drive directly.";

    return NextResponse.json({
      answer,
      retrieval: { chunkCount: 0, maxSimilarity: null, weakExcerpts: false },
      citations: [] as { documentId: string; title: string; driveFileId: string }[],
    });
  }

  const docIds = [...new Set(rows.map((r) => r.document_id))];
  const { data: docMeta } = await supabase
    .from("documents")
    .select("id, title, drive_file_id")
    .in("id", docIds)
    .eq("user_id", user.id);

  const metaById = new Map(
    (docMeta ?? []).map((d) => [
      d.id,
      { title: d.title as string, driveFileId: d.drive_file_id as string },
    ]),
  );

  const citations = docIds
    .map((id) => {
      const m = metaById.get(id);
      return {
        documentId: id,
        title: m?.title ?? "Document",
        driveFileId: m?.driveFileId ?? "",
      };
    })
    .filter((c) => c.driveFileId);

  const contextBlocks = rows
    .map((m) => {
      const meta = metaById.get(m.document_id);
      const label = meta?.title ?? m.document_id;
      return `(source: "${label}", relevance ${m.similarity.toFixed(3)})\n${m.chunk_content}`;
    })
    .join("\n\n---\n\n");

  const weakExcerpts = rows.some((r) =>
    isPlaceholderIndexChunk(r.chunk_content),
  );

  const client = new OpenAI({ apiKey: requireEnv("OPENAI_API_KEY") });
  const completion = await client.chat.completions.create({
    model: process.env.OPENAI_CHAT_MODEL ?? "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You help the user understand their own uploaded medical documents. Answers must be grounded ONLY in the excerpts below—do not invent facts. " +
          "IMPORTANT: Non-empty excerpts were retrieved from the user's vault. If the user asks what you know, what is in their files, to summarize available information, or similar meta-questions, you MUST describe what those excerpts literally contain: topics, dates, test or medication names, values if present, and which source titles they come from. " +
          "Do not reply with a generic refusal like 'I do not have enough information' when excerpts are present; instead summarize what is and is not visible in the provided text. " +
          "If excerpts are only filenames or tiny fragments, say that explicitly. " +
          "For narrow factual questions, answer from excerpts when possible; if excerpts are silent on that exact point, say what IS in the excerpts instead of refusing outright. " +
          "Do not give medical diagnoses or personalized treatment instructions; you may explain what the text says and suggest a clinician for medical decisions." +
          (weakExcerpts
            ? " Some excerpts may begin with '[Indexed content unavailable': those mean the PDF had no extractable machine text (often scanned or image PDFs). Explain that clearly and suggest exporting text or using a .txt file; do not imply you can see hidden page content."
            : ""),
      },
      {
        role: "user",
        content:
          `Below are text excerpts retrieved from the user's indexed uploads (with source titles). Use them for the question.\n\n` +
          `${contextBlocks}\n\n` +
          `Question: ${parsed.data.message}`,
      },
    ],
    temperature: 0.3,
  });

  const answer =
    completion.choices[0]?.message?.content?.trim() ??
    "Sorry, I could not generate an answer.";

  return NextResponse.json({
    answer,
    retrieval: { chunkCount: rows.length, maxSimilarity, weakExcerpts },
    citations,
  });
}
